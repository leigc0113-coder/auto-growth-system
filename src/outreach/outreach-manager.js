/**
 * ============================================================
 * 推广管理器 - Phase 3 核心
 * ============================================================
 * 
 * 功能：
 * - 私信推广 (Direct Message)
 * - 群组互动 (Group Engagement)
 * - 帖子评论 (Comment)
 * - 频道邀请 (Channel Invite)
 */

const https = require('https');
const AIGenerator = require('../ai/ai-generator');
const Database = require('../utils/database');
const logger = require('../utils/logger');

class OutreachManager {
    constructor() {
        this.ai = new AIGenerator();
        this.db = new Database();
        
        // 多账号配置
        this.botAccounts = [
            {
                name: 'Bot_1',
                token: process.env.TELEGRAM_BOT_TOKEN,
                dailyLimit: 20,
                usedToday: 0,
                cooldown: false
            }
        ];
        
        // 如果需要多账号，添加更多
        if (process.env.TELEGRAM_BOT_TOKEN_2) {
            this.botAccounts.push({
                name: 'Bot_2',
                token: process.env.TELEGRAM_BOT_TOKEN_2,
                dailyLimit: 20,
                usedToday: 0,
                cooldown: false
            });
        }
        
        // 推广配置
        this.config = {
            maxDailyOutreach: parseInt(process.env.MAX_DAILY_OUTREACH) || 50,
            intervalMin: parseInt(process.env.OUTREACH_INTERVAL_MIN) || 30000,
            intervalMax: parseInt(process.env.OUTREACH_INTERVAL_MAX) || 120000,
            requireApproval: process.env.REQUIRE_APPROVAL !== 'false',
            autoApproveTrusted: process.env.AUTO_APPROVE_TRUSTED === 'true'
        };
        
        this.currentAccountIndex = 0;
    }

    /**
     * 初始化数据库连接
     */
    async initialize() {
        await this.db.connect();
        logger.info('[OutreachManager] Initialized with', this.botAccounts.length, 'bot accounts');
    }

    /**
     * ==================== 1. 私信推广 ====================
     */
    
    /**
     * 发送私信给目标用户/频道
     */
    async sendDirectMessage(targetUsername, options = {}) {
        try {
            // 检查是否需要审核
            if (this.config.requireApproval && !options.approved) {
                await this.addToQueue('directMessage', { targetUsername, ...options });
                logger.info(`[OutreachManager] DM queued for approval: ${targetUsername}`);
                return { status: 'pending', message: '等待人工审核' };
            }
            
            // 获取当前可用账号
            const account = this.getNextAvailableAccount();
            if (!account) {
                throw new Error('No available bot accounts');
            }
            
            // 生成个性化消息
            const content = await this.generateMessage('directMessage', {
                targetName: targetUsername,
                topic: options.topic || 'gaming',
                language: options.language || 'EN'
            });
            
            // 发送消息
            const result = await this.callTelegramAPI(account.token, 'sendMessage', {
                chat_id: `@${targetUsername.replace('@', '')}`,
                text: content,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });
            
            // 记录结果
            await this.logOutreach({
                type: 'directMessage',
                target: targetUsername,
                account: account.name,
                content,
                status: result.ok ? 'sent' : 'failed',
                error: result.ok ? null : result.description,
                sentAt: new Date()
            });
            
            // 更新账号使用计数
            if (result.ok) {
                account.usedToday++;
            }
            
            logger.info(`[OutreachManager] DM sent to ${targetUsername} via ${account.name}`);
            
            return {
                status: result.ok ? 'success' : 'failed',
                messageId: result.result?.message_id,
                error: result.description
            };
            
        } catch (error) {
            logger.error('[OutreachManager] Send DM error:', error.message);
            return { status: 'error', error: error.message };
        }
    }

    /**
     * 批量私信推广
     */
    async batchDirectMessage(targets, options = {}) {
        const results = [];
        
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            
            // 检查每日限额
            if (this.getTotalSentToday() >= this.config.maxDailyOutreach) {
                logger.warn('[OutreachManager] Daily limit reached');
                results.push({ target, status: 'skipped', reason: 'daily_limit' });
                continue;
            }
            
            // 发送私信
            const result = await this.sendDirectMessage(target.username, {
                ...options,
                topic: target.topic
            });
            
            results.push({ target: target.username, ...result });
            
            // 间隔等待（最后一个不等待）
            if (i < targets.length - 1) {
                await this.randomDelay();
            }
        }
        
        return results;
    }

    /**
     * ==================== 2. 群组互动 ====================
     */
    
    /**
     * 加入群组并互动
     */
    async engageWithGroup(groupUsername, options = {}) {
        try {
            const account = this.getNextAvailableAccount();
            
            // 1. 加入群组
            const joinResult = await this.callTelegramAPI(account.token, 'joinChat', {
                chat_id: `@${groupUsername.replace('@', '')}`
            });
            
            if (!joinResult.ok) {
                logger.warn(`[OutreachManager] Failed to join ${groupUsername}:`, joinResult.description);
            }
            
            // 2. 发送欢迎/互动消息
            const messages = [
                "Hello everyone! 👋 Excited to be part of this community!",
                "Hi all! Just joined. Looking forward to connecting with fellow gamers! 🎮",
                "Hey! Great to be here. Anyone into Teen Patti? 😊"
            ];
            
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            
            await this.randomDelay(30000, 60000); // 等待 30-60 秒
            
            const sendResult = await this.callTelegramAPI(account.token, 'sendMessage', {
                chat_id: `@${groupUsername.replace('@', '')}`,
                text: randomMessage
            });
            
            // 3. 记录互动
            await this.logOutreach({
                type: 'groupEngagement',
                target: groupUsername,
                account: account.name,
                content: randomMessage,
                joined: joinResult.ok,
                messageSent: sendResult.ok,
                sentAt: new Date()
            });
            
            logger.info(`[OutreachManager] Group engagement: ${groupUsername}`);
            
            return {
                joined: joinResult.ok,
                messageSent: sendResult.ok,
                error: joinResult.ok ? null : joinResult.description
            };
            
        } catch (error) {
            logger.error('[OutreachManager] Group engagement error:', error.message);
            return { joined: false, error: error.message };
        }
    }

    /**
     * ==================== 3. 帖子评论 ====================
     */
    
    /**
     * 在频道帖子下评论
     */
    async postComment(channelUsername, messageId, options = {}) {
        try {
            const account = this.getNextAvailableAccount();
            
            // 生成评论内容
            const content = await this.generateMessage('comment', {
                postTopic: options.topic || 'online earning',
                language: options.language || 'EN'
            });
            
            // 发送回复（作为评论）
            const result = await this.callTelegramAPI(account.token, 'sendMessage', {
                chat_id: `@${channelUsername.replace('@', '')}`,
                text: content,
                reply_to_message_id: messageId,
                parse_mode: 'HTML'
            });
            
            await this.logOutreach({
                type: 'comment',
                target: channelUsername,
                messageId,
                account: account.name,
                content,
                status: result.ok ? 'sent' : 'failed',
                sentAt: new Date()
            });
            
            logger.info(`[OutreachManager] Comment posted on ${channelUsername}`);
            
            return {
                status: result.ok ? 'success' : 'failed',
                commentId: result.result?.message_id
            };
            
        } catch (error) {
            logger.error('[OutreachManager] Post comment error:', error.message);
            return { status: 'error', error: error.message };
        }
    }

    /**
     * ==================== 4. 频道邀请 ====================
     */
    
    /**
     * 邀请用户加入频道
     */
    async inviteToChannel(userId, channelId = null) {
        try {
            const account = this.getNextAvailableAccount();
            const targetChannel = channelId || process.env.CHANNEL_ID;
            
            // 获取邀请链接
            const inviteLinkResult = await this.callTelegramAPI(account.token, 'createChatInviteLink', {
                chat_id: targetChannel,
                member_limit: 1 // 一次性链接
            });
            
            if (!inviteLinkResult.ok) {
                throw new Error('Failed to create invite link');
            }
            
            const inviteLink = inviteLinkResult.result?.invite_link;
            
            // 生成邀请消息
            const content = await this.generateMessage('invite', {
                ourChannel: process.env.CHANNEL_USERNAME,
                language: 'EN'
            });
            
            const fullMessage = `${content}\n\n👉 Join here: ${inviteLink}`;
            
            // 发送邀请
            const result = await this.callTelegramAPI(account.token, 'sendMessage', {
                chat_id: userId,
                text: fullMessage,
                parse_mode: 'HTML'
            });
            
            await this.logOutreach({
                type: 'invite',
                target: userId,
                channel: targetChannel,
                account: account.name,
                content: fullMessage,
                inviteLink,
                status: result.ok ? 'sent' : 'failed',
                sentAt: new Date()
            });
            
            logger.info(`[OutreachManager] Invite sent to ${userId}`);
            
            return {
                status: result.ok ? 'success' : 'failed',
                inviteLink
            };
            
        } catch (error) {
            logger.error('[OutreachManager] Invite error:', error.message);
            return { status: 'error', error: error.message };
        }
    }

    /**
     * ==================== 辅助方法 ====================
     */
    
    /**
     * 生成推广消息
     */
    async generateMessage(type, data) {
        try {
            const result = await this.ai.generate(type, data);
            return result.content;
        } catch (error) {
            // 如果 AI 失败，使用备用模板
            const { getRandomTemplate } = require('../ai/message-templates');
            return getRandomTemplate(type, data.language || 'EN');
        }
    }

    /**
     * 获取下一个可用账号
     */
    getNextAvailableAccount() {
        for (let i = 0; i < this.botAccounts.length; i++) {
            const index = (this.currentAccountIndex + i) % this.botAccounts.length;
            const account = this.botAccounts[index];
            
            if (!account.cooldown && account.usedToday < account.dailyLimit) {
                this.currentAccountIndex = (index + 1) % this.botAccounts.length;
                return account;
            }
        }
        
        return null; // 所有账号都不可用
    }

    /**
     * 获取今日已发送总数
     */
    getTotalSentToday() {
        return this.botAccounts.reduce((sum, acc) => sum + acc.usedToday, 0);
    }

    /**
     * 随机延迟（模拟真人行为）
     */
    async randomDelay(min = null, max = null) {
        const minTime = min || this.config.intervalMin;
        const maxTime = max || this.config.intervalMax;
        const delay = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
        
        logger.info(`[OutreachManager] Waiting ${Math.round(delay/1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * 添加到审核队列
     */
    async addToQueue(type, data) {
        await this.db.insert('outreach_queue', {
            type,
            data: JSON.stringify(data),
            status: 'pending',
            createdAt: new Date()
        });
    }

    /**
     * 记录推广日志
     */
    async logOutreach(data) {
        await this.db.insert('outreach_logs', data);
    }

    /**
     * 调用 Telegram Bot API
     */
    async callTelegramAPI(token, method, params) {
        return new Promise((resolve, reject) => {
            const queryString = Object.entries(params)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join('&');
            
            const url = `https://api.telegram.org/bot${token}/${method}?${queryString}`;
            
            https.get(url, { timeout: 30000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Invalid JSON'));
                    }
                });
            }).on('error', reject);
        });
    }

    /**
     * 关闭连接
     */
    async close() {
        await this.db.disconnect();
    }
}

module.exports = OutreachManager;
