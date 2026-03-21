/**
 * ============================================================
 * 转化追踪系统 - Conversion Tracking
 * ============================================================
 * 
 * 功能：
 * - 完整转化漏斗
 * - 点击追踪
 * - 加入追踪
 * - ROI 计算
 */

const Database = require('../utils/database');
const logger = require('../utils/logger');

class ConversionTracker {
    constructor() {
        this.db = new Database();
        
        // 转化阶段定义
        this.funnelStages = [
            'exposed',      // 曝光（看到推广）
            'clicked',      // 点击（点击链接）
            'engaged',      // 互动（查看频道）
            'joined',       // 加入（成功加入）
            'active'        // 活跃（参与互动）
        ];
    }

    /**
     * 初始化
     */
    async initialize() {
        await this.db.connect();
        logger.info('[ConversionTracker] Initialized');
    }

    /**
     * 记录曝光
     */
    async recordExposure(targetUsername, outreachId) {
        await this.recordEvent({
            type: 'exposure',
            target: targetUsername,
            outreachId,
            timestamp: new Date()
        });
    }

    /**
     * 记录点击（通过短链接或邀请链接）
     */
    async recordClick(targetUsername, linkId, metadata = {}) {
        await this.recordEvent({
            type: 'click',
            target: targetUsername,
            linkId,
            ...metadata,
            timestamp: new Date()
        });
        
        // 更新转化状态
        await this.updateConversionStatus(targetUsername, 'clicked');
    }

    /**
     * 记录加入
     */
    async recordJoin(userId, channelId, source = 'outreach') {
        await this.recordEvent({
            type: 'join',
            userId,
            channelId,
            source,
            timestamp: new Date()
        });
        
        // 标记为成功转化
        await this.markConverted(userId, channelId);
    }

    /**
     * 记录事件
     */
    async recordEvent(event) {
        await this.db.insert('conversion_events', event);
        logger.info(`[ConversionTracker] Event recorded: ${event.type}`);
    }

    /**
     * 更新转化状态
     */
    async updateConversionStatus(target, stage) {
        await this.db.update('conversion_tracking',
            { target },
            { 
                currentStage: stage,
                [`stage_${stage}`]: new Date(),
                updatedAt: new Date()
            }
        );
    }

    /**
     * 标记成功转化
     */
    async markConverted(userId, channelId) {
        await this.db.update('conversion_tracking',
            { userId, channelId },
            {
                converted: true,
                convertedAt: new Date()
            }
        );
    }

    /**
     * 获取转化漏斗统计
     */
    async getFunnelStats(startDate, endDate) {
        try {
            const query = {
                timestamp: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
            
            const events = await this.db.findAll('conversion_events', query);
            
            const stats = {
                exposed: events.filter(e => e.type === 'exposure').length,
                clicked: events.filter(e => e.type === 'click').length,
                engaged: events.filter(e => e.type === 'engaged').length,
                joined: events.filter(e => e.type === 'join').length,
                active: events.filter(e => e.type === 'active').length
            };
            
            // 计算转化率
            const conversionRates = {
                clickThrough: stats.exposed > 0 
                    ? ((stats.clicked / stats.exposed) * 100).toFixed(2)
                    : 0,
                joinRate: stats.clicked > 0
                    ? ((stats.joined / stats.clicked) * 100).toFixed(2)
                    : 0,
                overall: stats.exposed > 0
                    ? ((stats.joined / stats.exposed) * 100).toFixed(2)
                    : 0
            };
            
            return {
                counts: stats,
                rates: conversionRates
            };
            
        } catch (error) {
            logger.error('[ConversionTracker] Funnel stats error:', error.message);
            return null;
        }
    }

    /**
     * 获取每日转化报告
     */
    async getDailyReport(date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const stats = await this.getFunnelStats(startOfDay, endOfDay);
        
        // 获取发送数据
        const outreachCount = await this.db.count('outreach_logs', {
            sentAt: { $gte: startOfDay, $lte: endOfDay },
            status: 'sent'
        });
        
        return {
            date: date.toISOString().split('T')[0],
            outreachSent: outreachCount,
            ...stats,
            efficiency: stats?.counts?.joined > 0
                ? (outreachCount / stats.counts.joined).toFixed(1)
                : 'N/A'
        };
    }

    /**
     * 追踪特定推广活动
     */
    async trackCampaign(campaignId) {
        const events = await this.db.findAll('conversion_events', { campaignId });
        
        const uniqueTargets = new Set(events.map(e => e.target)).size;
        const clicks = events.filter(e => e.type === 'click').length;
        const joins = events.filter(e => e.type === 'join').length;
        
        return {
            campaignId,
            reach: uniqueTargets,
            clicks,
            joins,
            conversionRate: uniqueTargets > 0
                ? ((joins / uniqueTargets) * 100).toFixed(2)
                : 0
        };
    }

    /**
     * 计算 ROI
     */
    calculateROI(cost, conversions, valuePerConversion = 1) {
        const revenue = conversions * valuePerConversion;
        const roi = cost > 0 ? ((revenue - cost) / cost * 100).toFixed(2) : 0;
        
        return {
            cost,
            revenue,
            profit: revenue - cost,
            roi: `${roi}%`,
            costPerConversion: conversions > 0 ? (cost / conversions).toFixed(2) : 'N/A'
        };
    }

    /**
     * 获取最佳转化来源
     */
    async getTopSources(limit = 5) {
        try {
            const joins = await this.db.findAll('conversion_events', 
                { type: 'join' },
                1000
            );
            
            const sourceStats = {};
            
            for (const join of joins) {
                const source = join.source || 'unknown';
                sourceStats[source] = (sourceStats[source] || 0) + 1;
            }
            
            return Object.entries(sourceStats)
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit)
                .map(([source, count]) => ({ source, conversions: count }));
                
        } catch (error) {
            logger.error('[ConversionTracker] Top sources error:', error.message);
            return [];
        }
    }

    /**
     * 关闭连接
     */
    async close() {
        await this.db.disconnect();
    }
}

module.exports = ConversionTracker;
