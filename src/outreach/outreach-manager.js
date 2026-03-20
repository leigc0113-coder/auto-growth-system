/**
 * ============================================================
* 推广管理器 - 处理所有 outreach 活动
 * ============================================================
 */

const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/logger');

class OutreachManager {
    constructor() {
        this.bots = [];
        this.currentBotIndex = 0;
        this.pendingQueue = [];
    }

    async initialize() {
        logger.info('🔧 Initializing Outreach Manager...');

        // 初始化多个 Bot（轮换使用）
        const tokens = [
            process.env.TELEGRAM_BOT_TOKEN_1,
            process.env.TELEGRAM_BOT_TOKEN_2,
            process.env.TELEGRAM_BOT_TOKEN_3
        ].filter(Boolean);

        for (const token of tokens) {
            try {
                const bot = new TelegramBot(token, { polling: false });
                const me = await bot.getMe();
                this.bots.push({ bot, username: me.username });
                logger.info(`  - Bot @${me.username} initialized`);
            } catch (error) {
                logger.error('Failed to initialize bot:', error.message);
            }
        }

        if (this.bots.length === 0) {
            logger.warn('⚠️  No bots initialized. Outreach features disabled.');
        } else {
            logger.info(`✅ ${this.bots.length} bots ready for outreach`);
        }
    }

    /**
     * 获取下一个 Bot（轮换）
     */
    getNextBot() {
        if (this.bots.length === 0) return null;
        const bot = this.bots[this.currentBotIndex];
        this.currentBotIndex = (this.currentBotIndex + 1) % this.bots.length;
        return bot;
    }

    /**
     * 发送到群组
     */
    async sendToGroup(group, content) {
        const botInfo = this.getNextBot();
        if (!botInfo) {
            throw new Error('No bots available');
        }

        try {
            await botInfo.bot.sendMessage(group.id, content, {
                parse_mode: 'Markdown'
            });

            logger.info(`✅ Sent to group ${group.name}`);
            return { success: true, platform: 'telegram', target: group.name };
        } catch (error) {
            logger.error(`Failed to send to group ${group.name}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 保存到待审核队列
     */
    async saveForApproval(item) {
        this.pendingQueue.push({
            ...item,
            savedAt: new Date(),
            status: 'pending'
        });

        logger.info(`💾 Saved for approval: ${item.type}`);
    }

    /**
     * 通知管理员
     */
    async notifyAdmin(items) {
        const adminId = process.env.ADMIN_TELEGRAM_ID;
        if (!adminId || this.bots.length === 0) return;

        const bot = this.bots[0].bot;

        let message = '📋 Pending Approval Queue\n';
        message += '━━━━━━━━━━━━━━━━━━━━\n\n';

        items.forEach((item, index) => {
            message += `${index + 1}. ${item.type}\n`;
            message += `   ${item.content?.substring(0, 50)}...\n\n`;
        });

        message += '\nUse /approve command to review.';

        try {
            await bot.sendMessage(adminId, message);
        } catch (error) {
            logger.error('Failed to notify admin:', error.message);
        }
    }

    /**
     * 发送给管理员
     */
    async sendToAdmin(message) {
        const adminId = process.env.ADMIN_TELEGRAM_ID;
        if (!adminId || this.bots.length === 0) return;

        const bot = this.bots[0].bot;
        
        try {
            await bot.sendMessage(adminId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Failed to send to admin:', error.message);
        }
    }

    /**
     * 获取待审核列表
     */
    getPendingQueue() {
        return this.pendingQueue.filter(item => item.status === 'pending');
    }

    /**
     * 批准发送
     */
    async approve(itemId) {
        const item = this.pendingQueue.find(i => i.id === itemId);
        if (!item) return false;

        // 执行发送
        if (item.type === 'telegram_dm') {
            // 发送私信
        } else if (item.type === 'reddit_post') {
            // 发布 Reddit
        }

        item.status = 'sent';
        item.sentAt = new Date();
        return true;
    }
}

module.exports = OutreachManager;
