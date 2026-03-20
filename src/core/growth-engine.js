/**
 * ============================================================
 * 增长引擎 - 核心控制器
 * ============================================================
 */

const ScraperManager = require('../scraper/scraper-manager');
const OutreachManager = require('../outreach/outreach-manager');
const AnalyticsManager = require('../analytics/analytics-manager');
const AIGenerator = require('../ai/ai-generator');
const Database = require('../utils/database');
const logger = require('../utils/logger');

class GrowthEngine {
    constructor() {
        this.scraper = new ScraperManager();
        this.outreach = new OutreachManager();
        this.analytics = new AnalyticsManager();
        this.ai = new AIGenerator();
        this.db = new Database();
        this.isRunning = false;
    }

    async initialize() {
        logger.info('🔧 Initializing Growth Engine...');

        // 初始化数据库
        await this.db.connect();
        logger.info('✅ Database connected');

        // 初始化各模块
        await this.scraper.initialize();
        await this.outreach.initialize();
        await this.analytics.initialize();
        await this.ai.initialize();

        logger.info('✅ All modules initialized');
        this.isRunning = true;
    }

    /**
     * 执行每日增长任务
     */
    async executeDailyGrowth() {
        logger.info('📈 Starting daily growth cycle...');

        try {
            // 1. 数据采集
            const newTargets = await this.collectTargets();
            logger.info(`📊 Collected ${newTargets.length} new targets`);

            // 2. 智能筛选
            const qualifiedTargets = await this.filterTargets(newTargets);
            logger.info(`🎯 Qualified ${qualifiedTargets.length} targets`);

            // 3. 保存到数据库
            await this.saveTargets(qualifiedTargets);

            // 4. 生成推广内容
            const content = await this.generateContent(qualifiedTargets);

            // 5. 执行推广（混合模式：简单任务自动，复杂任务人工审核）
            const results = await this.executeOutreach(content);

            // 6. 记录效果
            await this.recordResults(results);

            logger.info('✅ Daily growth cycle completed');
            return results;

        } catch (error) {
            logger.error('❌ Daily growth cycle failed:', error);
            throw error;
        }
    }

    /**
     * 数据采集
     */
    async collectTargets() {
        logger.info('🔍 Collecting targets from multiple platforms...');

        const targets = [];

        // 并行采集多个平台
        const [tgChannels, redditUsers, telegramGroups] = await Promise.allSettled([
            this.scraper.scrapeTGStat(),
            this.scraper.scrapeReddit(),
            this.scraper.findTelegramGroups()
        ]);

        if (tgChannels.status === 'fulfilled') {
            targets.push(...tgChannels.value);
        }
        if (redditUsers.status === 'fulfilled') {
            targets.push(...redditUsers.value);
        }
        if (telegramGroups.status === 'fulfilled') {
            targets.push(...telegramGroups.value);
        }

        return targets;
    }

    /**
     * 智能筛选
     */
    async filterTargets(targets) {
        logger.info('🤖 AI filtering targets...');

        const filtered = [];

        for (const target of targets) {
            // AI评分
            const score = await this.ai.scoreTarget(target);
            
            // 检查去重
            const exists = await this.db.checkExists(target);
            
            // 检查历史记录
            const history = await this.db.getOutreachHistory(target.id);

            if (score >= 0.7 && !exists && history.length === 0) {
                filtered.push({
                    ...target,
                    quality_score: score,
                    priority: this.calculatePriority(target, score)
                });
            }
        }

        // 按优先级排序
        return filtered.sort((a, b) => b.priority - a.priority);
    }

    /**
     * 计算优先级
     */
    calculatePriority(target, score) {
        let priority = score * 100;

        // 高订阅数加分（但不是越高越好）
        if (target.subscribers >= 1000 && target.subscribers <= 50000) {
            priority += 20;
        }

        // 高活跃度加分
        if (target.activity_score > 0.8) {
            priority += 15;
        }

        // 精准匹配加分
        if (target.category === 'gaming' || target.category === 'earning') {
            priority += 10;
        }

        return priority;
    }

    /**
     * 生成推广内容
     */
    async generateContent(targets) {
        logger.info('✍️ Generating outreach content with AI...');

        const content = {
            telegram_dm: [],
            telegram_post: [],
            reddit_post: []
        };

        for (const target of targets.slice(0, 20)) { // 每天最多20个
            // 根据目标类型生成不同内容
            if (target.platform === 'telegram') {
                const dm = await this.ai.generateDM(target);
                content.telegram_dm.push({ target, content: dm });
            } else if (target.platform === 'reddit') {
                const post = await this.ai.generateRedditPost(target);
                content.reddit_post.push({ target, content: post });
            }
        }

        return content;
    }

    /**
     * 执行推广（混合模式）
     */
    async executeOutreach(content) {
        logger.info('📤 Executing outreach (hybrid mode)...');

        const results = {
            auto: [],      // 自动发送
            pending: [],   // 待人工审核
            failed: []
        };

        // 简单任务：自动发送
        for (const item of content.telegram_post) {
            try {
                const result = await this.outreach.sendToGroup(item.target, item.content);
                results.auto.push(result);
            } catch (error) {
                results.failed.push({ item, error: error.message });
            }
        }

        // 复杂任务：人工审核
        for (const item of content.telegram_dm) {
            // 保存到待审核队列
            await this.outreach.saveForApproval(item);
            results.pending.push(item);
        }

        // Reddit帖子：人工审核
        for (const item of content.reddit_post) {
            await this.outreach.saveForApproval(item);
            results.pending.push(item);
        }

        // 通知管理员有待审核内容
        if (results.pending.length > 0) {
            await this.outreach.notifyAdmin(results.pending);
        }

        return results;
    }

    /**
     * 记录结果
     */
    async recordResults(results) {
        await this.analytics.recordOutreachResults(results);
        await this.analytics.updateDailyStats();
    }

    /**
     * 保存目标
     */
    async saveTargets(targets) {
        for (const target of targets) {
            await this.db.saveTarget(target);
        }
    }

    /**
     * 生成日报
     */
    async generateDailyReport() {
        return await this.analytics.generateDailyReport();
    }

    /**
     * 关闭系统
     */
    async shutdown() {
        logger.info('🔌 Shutting down Growth Engine...');
        this.isRunning = false;
        await this.db.disconnect();
        logger.info('✅ Shutdown complete');
    }
}

module.exports = GrowthEngine;
