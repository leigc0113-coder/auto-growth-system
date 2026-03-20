/**
 * ============================================================
 * 任务调度器 - 定时执行增长任务
 * ============================================================
 */

const cron = require('node-cron');
const logger = require('../utils/logger');

class TaskScheduler {
    constructor(growthEngine) {
        this.engine = growthEngine;
        this.tasks = [];
    }

    /**
     * 启动所有定时任务
     */
    startAllTasks() {
        logger.info('⏰ Starting task scheduler...');

        // 06:00 - 数据采集
        this.scheduleTask('data-collection', '0 6 * * *', async () => {
            logger.info('[06:00] Starting data collection...');
            await this.engine.collectTargets();
        });

        // 08:00 - 智能筛选
        this.scheduleTask('ai-filtering', '0 8 * * *', async () => {
            logger.info('[08:00] Starting AI filtering...');
            const targets = await this.engine.db.getNewTargets();
            await this.engine.filterTargets(targets);
        });

        // 09:00 - 频道互推（需人工审核）
        this.scheduleTask('channel-outreach', '0 9 * * *', async () => {
            logger.info('[09:00] Preparing channel outreach...');
            await this.engine.executeDailyGrowth();
        });

        // 11:00 - 群组分享第1轮（自动）
        this.scheduleTask('group-sharing-1', '0 11 * * *', async () => {
            logger.info('[11:00] Group sharing round 1...');
            await this.shareToGroups(5); // 5个群
        });

        // 14:00 - Reddit帖子（需人工审核）
        this.scheduleTask('reddit-post', '0 14 * * *', async () => {
            logger.info('[14:00] Preparing Reddit post...');
            await this.prepareRedditPost();
        });

        // 16:00 - 群组分享第2轮（自动）
        this.scheduleTask('group-sharing-2', '0 16 * * *', async () => {
            logger.info('[16:00] Group sharing round 2...');
            await this.shareToGroups(5); // 5个群
        });

        // 18:00 - 数据统计
        this.scheduleTask('analytics-update', '0 18 * * *', async () => {
            logger.info('[18:00] Updating analytics...');
            await this.engine.analytics.updateDailyStats();
        });

        // 20:00 - 日报发送
        this.scheduleTask('daily-report', '0 20 * * *', async () => {
            logger.info('[20:00] Generating daily report...');
            const report = await this.engine.generateDailyReport();
            await this.sendReportToAdmin(report);
        });

        logger.info('✅ All scheduled tasks started');
        logger.info('📅 Timezone: Asia/Kolkata (IST)');
    }

    /**
     * 调度单个任务
     */
    scheduleTask(name, cronExpression, handler) {
        logger.info(`  - Scheduling: ${name} (${cronExpression})`);
        
        const task = cron.schedule(cronExpression, async () => {
            try {
                logger.info(`[TASK] Executing: ${name}`);
                await handler();
                logger.info(`[TASK] Completed: ${name}`);
            } catch (error) {
                logger.error(`[TASK] Failed: ${name}`, error);
            }
        }, {
            timezone: 'Asia/Kolkata',
            scheduled: true
        });

        this.tasks.push({ name, task });
    }

    /**
     * 群组分享
     */
    async shareToGroups(count) {
        const groups = await this.engine.db.getActiveGroups();
        const selected = this.shuffle(groups).slice(0, count);

        for (const group of selected) {
            const content = await this.engine.ai.generateGroupPost();
            await this.engine.outreach.sendToGroup(group, content);
            
            // 随机延迟
            await this.delay(30000 + Math.random() * 90000);
        }
    }

    /**
     * 准备 Reddit 帖子
     */
    async prepareRedditPost() {
        const targets = await this.engine.db.getRedditTargets();
        const content = await this.engine.ai.generateRedditPost(targets[0]);
        
        // 保存到待审核队列
        await this.engine.outreach.saveForApproval({
            platform: 'reddit',
            content,
            preparedAt: new Date()
        });

        // 通知管理员
        await this.engine.outreach.notifyAdmin([{
            type: 'reddit_post',
            content: content.substring(0, 100) + '...'
        }]);
    }

    /**
     * 发送日报给管理员
     */
    async sendReportToAdmin(report) {
        const adminId = process.env.ADMIN_TELEGRAM_ID;
        if (!adminId) {
            logger.warn('Admin Telegram ID not configured');
            return;
        }

        const message = `
📊 Daily Growth Report
━━━━━━━━━━━━━━━━━━━━

📅 Date: ${report.date}
👥 New Users: ${report.newUsers}
📈 Conversion Rate: ${report.conversionRate}%

📢 Outreach Summary:
├ Channels Contacted: ${report.channelsContacted}
├ Groups Shared: ${report.groupsShared}
├ Reddit Posts: ${report.redditPosts}
└ Pending Approval: ${report.pendingApproval}

💰 Revenue:
├ Recharges: ₹${report.rechargeAmount}
└ Total Pool: ₹${report.poolAmount}

🎯 Tomorrow's Target: ${report.tomorrowTarget} users
        `;

        // 通过 Bot 发送给管理员
        await this.engine.outreach.sendToAdmin(message);
    }

    /**
     * 随机打乱数组
     */
    shuffle(array) {
        return [...array].sort(() => Math.random() - 0.5);
    }

    /**
     * 延迟
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 停止所有任务
     */
    stopAll() {
        logger.info('🛑 Stopping all scheduled tasks...');
        this.tasks.forEach(({ name, task }) => {
            task.stop();
            logger.info(`  - Stopped: ${name}`);
        });
        this.tasks = [];
    }
}

module.exports = TaskScheduler;
