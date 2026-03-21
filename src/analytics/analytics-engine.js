/**
 * ============================================================
 * 数据分析模块 - Analytics Engine
 * ============================================================
 * 
 * 功能：
 * - 全面数据统计
 * - 趋势分析
 * - 增长报告
 * - 可视化数据导出
 */

const Database = require('../utils/database');
const ConversionTracker = require('./conversion-tracker');
const logger = require('../utils/logger');

class AnalyticsEngine {
    constructor() {
        this.db = new Database();
        this.tracker = new ConversionTracker();
    }

    /**
     * 初始化
     */
    async initialize() {
        await this.db.connect();
        await this.tracker.initialize();
        logger.info('[AnalyticsEngine] Initialized');
    }

    /**
     * 生成完整数据报告
     */
    async generateFullReport() {
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const report = {
            generatedAt: now,
            period: {
                start: weekAgo,
                end: now
            },
            acquisition: await this.getAcquisitionStats(weekAgo, now),
            engagement: await this.getEngagementStats(weekAgo, now),
            conversion: await this.getConversionStats(weekAgo, now),
            system: await this.getSystemStats()
        };
        
        return report;
    }

    /**
     * 获取获取统计（Acquisition）
     */
    async getAcquisitionStats(startDate, endDate) {
        const totalTargets = await this.db.count('targets');
        
        const newTargets = await this.db.count('targets', {
            scrapedAt: { $gte: startDate, $lte: endDate }
        });
        
        const bySource = await this.db.findAll('targets', {});
        const sourceBreakdown = {};
        
        for (const target of bySource) {
            const source = target.source || 'unknown';
            sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
        }
        
        return {
            total: totalTargets,
            newThisPeriod: newTargets,
            bySource: sourceBreakdown,
            avgDaily: Math.round(newTargets / 7)
        };
    }

    /**
     * 获取互动统计（Engagement）
     */
    async getEngagementStats(startDate, endDate) {
        const outreachLogs = await this.db.findAll('outreach_logs', {
            sentAt: { $gte: startDate, $lte: endDate }
        });
        
        const sent = outreachLogs.filter(l => l.status === 'sent').length;
        const failed = outreachLogs.filter(l => l.status === 'failed').length;
        const pending = await this.db.count('approval_queue', { status: 'pending' });
        
        const byType = {};
        for (const log of outreachLogs) {
            byType[log.type] = (byType[log.type] || 0) + 1;
        }
        
        return {
            totalSent: sent,
            failed: failed,
            pendingApproval: pending,
            successRate: sent + failed > 0 
                ? ((sent / (sent + failed)) * 100).toFixed(1)
                : 100,
            byType
        };
    }

    /**
     * 获取转化统计（Conversion）
     */
    async getConversionStats(startDate, endDate) {
        return await this.tracker.getFunnelStats(startDate, endDate);
    }

    /**
     * 获取系统统计
     */
    async getSystemStats() {
        const queueStats = await this.db.count('approval_queue');
        const jobStats = await this.db.count('scheduled_jobs');
        
        // 获取最近的任务
        const recentJobs = await this.db.findAll('scheduled_jobs', {}, 5);
        
        return {
            queueSize: queueStats,
            totalJobs: jobStats,
            recentActivity: recentJobs.map(j => ({
                type: j.type,
                status: j.status,
                time: j.startedAt
            }))
        };
    }

    /**
     * 生成趋势报告
     */
    async generateTrendReport(days = 7) {
        const trends = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            const dailyStats = await this.tracker.getDailyReport(date);
            trends.push(dailyStats);
        }
        
        return {
            period: `${days} days`,
            trends,
            summary: {
                totalOutreach: trends.reduce((sum, t) => sum + (t.outreachSent || 0), 0),
                totalJoins: trends.reduce((sum, t) => sum + (t.counts?.joined || 0), 0),
                avgConversionRate: trends.length > 0
                    ? (trends.reduce((sum, t) => sum + parseFloat(t.rates?.overall || 0), 0) / trends.length).toFixed(2)
                    : 0
            }
        };
    }

    /**
     * 导出数据为 JSON
     */
    async exportToJSON(startDate, endDate) {
        const data = {
            targets: await this.db.findAll('targets', {
                scrapedAt: { $gte: startDate, $lte: endDate }
            }),
            outreach: await this.db.findAll('outreach_logs', {
                sentAt: { $gte: startDate, $lte: endDate }
            }),
            conversions: await this.db.findAll('conversion_events', {
                timestamp: { $gte: startDate, $lte: endDate }
            })
        };
        
        return JSON.stringify(data, null, 2);
    }

    /**
     * 导出为 CSV
     */
    async exportToCSV(startDate, endDate) {
        const targets = await this.db.findAll('targets', {
            scrapedAt: { $gte: startDate, $lte: endDate }
        });
        
        const headers = ['Username', 'Name', 'Subscribers', 'Source', 'Status', 'ScrapedAt'];
        const rows = targets.map(t => [
            t.username,
            t.name,
            t.subscribers,
            t.source,
            t.status,
            t.scrapedAt
        ]);
        
        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    /**
     * 生成 Telegram 格式的报告
     */
    async generateTelegramReport() {
        const report = await this.generateFullReport();
        
        return `📊 <b>系统数据报告</b>

<b>📈 获取统计</b>
• 总目标: ${report.acquisition.total}
• 本周新增: ${report.acquisition.newThisPeriod}
• 日均新增: ${report.acquisition.avgDaily}

<b>📤 推广统计</b>
• 本周发送: ${report.engagement.totalSent}
• 成功率: ${report.engagement.successRate}%
• 待审核: ${report.engagement.pendingApproval}

<b>🎯 转化统计</b>
• 总曝光: ${report.conversion?.counts?.exposed || 0}
• 点击数: ${report.conversion?.counts?.clicked || 0}
• 加入数: ${report.conversion?.counts?.joined || 0}
• 总转化率: ${report.conversion?.rates?.overall || 0}%

<b>⚙️ 系统状态</b>
• 任务队列: ${report.system.queueSize}
• 最近活动: ${report.system.recentActivity.length} 次

<i>生成时间: ${report.generatedAt.toLocaleString('en-IN')}</i>`;
    }

    /**
     * 获取增长预测
     */
    async getGrowthPrediction() {
        const trend = await this.generateTrendReport(7);
        
        const dailyAvg = trend.summary.totalJoins / 7;
        const weeklyProjection = dailyAvg * 7;
        const monthlyProjection = dailyAvg * 30;
        
        return {
            currentRate: {
                daily: dailyAvg.toFixed(1),
                weekly: trend.summary.totalJoins
            },
            projection: {
                weekly: Math.round(weeklyProjection),
                monthly: Math.round(monthlyProjection)
            },
            trend: dailyAvg > 5 ? 'upward' : 'stable'
        };
    }

    /**
     * 关闭连接
     */
    async close() {
        await this.tracker.close();
        await this.db.disconnect();
    }
}

module.exports = AnalyticsEngine;
