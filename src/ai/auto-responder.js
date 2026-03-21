/**
 * ============================================================
 * 自动回复系统 - 智能对话管理
 * ============================================================
 * 
 * 功能：
 * - 监听用户消息
 * - AI 智能回复
 * - 关键词触发
 * - 对话上下文管理
 */

const TelegramCollector = require('../scraper/telegram-collector');
const AIGenerator = require('./ai-generator');
const logger = require('../utils/logger');

class AutoResponder {
    constructor() {
        this.collector = new TelegramCollector();
        this.ai = new AIGenerator();
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        
        // 关键词回复规则
        this.keywordRules = [
            {
                keywords: ['hi', 'hello', 'hey', 'नमस्ते'],
                response: '👋 Welcome! How can I help you today?'
            },
            {
                keywords: ['how to play', 'rules', 'खेलने का तरीका'],
                response: '🎮 Check out our guide: Send "guide" or visit @TeenpattiMastetClub'
            },
            {
                keywords: ['money', 'earn', 'cash', 'पैसा', 'कमाई'],
                response: '💰 Yes! You can earn real cash playing Teen Patti. Join @TeenpattiMastetClub for daily tips!'
            },
            {
                keywords: ['bonus', 'free', 'giveaway', 'बोनस'],
                response: '🎁 We have ₹5000 daily giveaways! Join @TeenpattiMastetClub and check the pinned message.'
            },
            {
                keywords: ['help', 'support', 'मदद'],
                response: '🆘 For support, contact @Winbiginsta or join @WinBigInstaOfficial'
            }
        ];
        
        // 对话上下文存储（内存，可改为 Redis）
        this.conversations = new Map();
    }

    /**
     * 处理收到的消息
     */
    async handleMessage(message) {
        try {
            const chatId = message.chat?.id;
            const userId = message.from?.id;
            const text = message.text || '';
            const username = message.from?.username;
            
            if (!text) return;
            
            logger.info(`[AutoResponder] Message from @${username}: ${text.substring(0, 50)}`);
            
            // 1. 检查关键词匹配
            const keywordReply = this.matchKeyword(text);
            if (keywordReply) {
                await this.sendReply(chatId, keywordReply, { 
                    reply_to_message_id: message.message_id 
                });
                return;
            }
            
            // 2. 获取对话上下文
            const context = this.getConversationContext(userId);
            
            // 3. AI 生成回复
            const aiResponse = await this.ai.generate('reply', {
                userMessage: text,
                context: context.lastTopic || 'general',
                language: this.detectLanguage(text),
                ourChannel: process.env.CHANNEL_USERNAME
            });
            
            // 4. 发送回复
            await this.sendReply(chatId, aiResponse.content, {
                reply_to_message_id: message.message_id
            });
            
            // 5. 更新上下文
            this.updateContext(userId, {
                lastMessage: text,
                lastReply: aiResponse.content,
                lastTopic: this.extractTopic(text),
                messageCount: (context.messageCount || 0) + 1
            });
            
        } catch (error) {
            logger.error('[AutoResponder] Handle message error:', error.message);
        }
    }

    /**
     * 关键词匹配
     */
    matchKeyword(text) {
        const lowerText = text.toLowerCase();
        
        for (const rule of this.keywordRules) {
            for (const keyword of rule.keywords) {
                if (lowerText.includes(keyword.toLowerCase())) {
                    return rule.response;
                }
            }
        }
        
        return null;
    }

    /**
     * 发送回复
     */
    async sendReply(chatId, text, options = {}) {
        try {
            const TelegramBot = require('node-telegram-bot-api');
            const bot = new TelegramBot(this.botToken, { polling: false });
            
            await bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                ...options
            });
            
            logger.info(`[AutoResponder] Reply sent to ${chatId}`);
        } catch (error) {
            logger.error('[AutoResponder] Send reply error:', error.message);
        }
    }

    /**
     * 获取对话上下文
     */
    getConversationContext(userId) {
        return this.conversations.get(userId) || {};
    }

    /**
     * 更新对话上下文
     */
    updateContext(userId, data) {
        const existing = this.conversations.get(userId) || {};
        this.conversations.set(userId, {
            ...existing,
            ...data,
            updatedAt: new Date()
        });
        
        // 清理旧数据（超过 100 条时）
        if (this.conversations.size > 100) {
            const oldest = this.conversations.entries().next().value;
            this.conversations.delete(oldest[0]);
        }
    }

    /**
     * 检测语言
     */
    detectLanguage(text) {
        // 简单的印地语检测
        const hindiPattern = /[\u0900-\u097F]/;
        if (hindiPattern.test(text)) return 'HI';
        return 'EN';
    }

    /**
     * 提取话题
     */
    extractTopic(text) {
        const topics = {
            'game': ['play', 'game', 'card', 'win', 'lose'],
            'money': ['money', 'earn', 'cash', 'payment', 'withdraw'],
            'bonus': ['bonus', 'free', 'giveaway', 'prize'],
            'help': ['help', 'support', 'problem', 'issue']
        };
        
        const lowerText = text.toLowerCase();
        for (const [topic, keywords] of Object.entries(topics)) {
            if (keywords.some(k => lowerText.includes(k))) {
                return topic;
            }
        }
        
        return 'general';
    }

    /**
     * 启动消息监听（轮询模式）
     */
    async startPolling() {
        try {
            // 使用已存在的 bot 实例或创建新的
            const TelegramBot = require('node-telegram-bot-api');
            const bot = new TelegramBot(this.botToken, { polling: true });
            
            logger.info('[AutoResponder] Started polling for messages...');
            
            bot.on('message', async (msg) => {
                // 只处理私聊和群组消息
                if (msg.chat.type === 'private' || msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
                    await this.handleMessage(msg);
                }
            });
            
            // 错误处理
            bot.on('polling_error', (error) => {
                logger.error('[AutoResponder] Polling error:', error.message);
            });
            
        } catch (error) {
            logger.error('[AutoResponder] Start polling error:', error.message);
        }
    }

    /**
     * 生成欢迎消息
     */
    async generateWelcomeMessage(userData) {
        const welcome = await this.ai.generate('invite', {
            ourChannel: process.env.CHANNEL_USERNAME,
            language: userData.language || 'EN'
        });
        
        return welcome.content;
    }
}

module.exports = AutoResponder;
