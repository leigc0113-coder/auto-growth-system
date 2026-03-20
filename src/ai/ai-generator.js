/**
 * ============================================================
 * AI 内容生成器
 * ============================================================
 */

const axios = require('axios');
const logger = require('../utils/logger');

class AIGenerator {
    constructor() {
        this.apiKey = process.env.KIMI_API_KEY;
        this.apiUrl = process.env.KIMI_API_URL || 'https://api.moonshot.cn/v1/chat/completions';
        this.model = process.env.KIMI_MODEL || 'moonshot-v1-8k';
    }

    async initialize() {
        logger.info('🔧 Initializing AI Generator...');
        if (!this.apiKey) {
            logger.warn('⚠️  KIMI_API_KEY not set, using fallback templates');
        } else {
            logger.info('✅ AI Generator initialized with Kimi API');
        }
    }

    /**
     * 生成私信内容
     */
    async generateDM(target) {
        const prompt = this.buildDMPrompt(target);
        return await this.callAI(prompt);
    }

    /**
     * 生成群组帖子
     */
    async generateGroupPost() {
        const prompt = this.buildGroupPostPrompt();
        return await this.callAI(prompt);
    }

    /**
     * 生成 Reddit 帖子
     */
    async generateRedditPost(target) {
        const prompt = this.buildRedditPrompt(target);
        return await this.callAI(prompt);
    }

    /**
     * 目标评分
     */
    async scoreTarget(target) {
        const prompt = `
请评估以下 Telegram 频道作为推广渠道的质量：

频道名: ${target.name}
订阅数: ${target.subscribers}
描述: ${target.description}
分类: ${target.category}

请从以下维度评分（0-100分）：
1. 活跃度（发帖频率）
2. 受众匹配度（与游戏/赚钱的关联度）
3. 转化潜力（用户参与度）
4. 合作可能性（商业合作历史）

只返回总分（0-100之间的数字），不要解释。
        `;

        try {
            const response = await this.callAI(prompt);
            const score = parseInt(response.trim());
            return isNaN(score) ? 50 : score / 100;
        } catch (error) {
            logger.error('AI scoring failed:', error);
            return 0.5; // 默认中等分数
        }
    }

    /**
     * 调用 AI API
     */
    async callAI(prompt) {
        if (!this.apiKey) {
            return this.fallbackTemplate(prompt);
        }

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a professional marketing copywriter for Indian gaming market.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.8,
                    max_tokens: 800
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            return response.data.choices[0].message.content;
        } catch (error) {
            logger.error('AI API call failed:', error.message);
            return this.fallbackTemplate(prompt);
        }
    }

    /**
     * 备用模板
     */
    fallbackTemplate(prompt) {
        // 简单的备用模板
        return `Hi! I run a Teen Patti Lucky Draw with real cash prizes (₹1,000-₹20,000 daily). Would you be open to a mutual shoutout? We have 1,500+ active users.`;
    }

    buildDMPrompt(target) {
        return `
为以下 Telegram 频道生成一条私信文案：

频道名: ${target.name}
订阅数: ${target.subscribers}
描述: ${target.description}

要求:
1. 友好专业的语气
2. 介绍 Teen Patti Lucky Draw (每日抽奖，真实UPI支付，₹1,000-₹20,000奖池)
3. 提议互推合作
4. 提及我们有1,500+活跃用户
5. 长度适中，适合 Telegram
6. 印度英语风格

直接输出生成的文案，不要解释。
        `;
    }

    buildGroupPostPrompt() {
        return `
生成一条 Telegram 群组分享消息，推广 Teen Patti 每日抽奖。

要求:
1. 像普通用户分享，不像广告
2. 自然、口语化
3. 提及真实UPI支付
4. 包含免费参与选项
5. 鼓励互动（问问题）
6. 印度英语风格

示例风格:
"Hey everyone! Just found this cool daily lottery bot... Anyone else playing?"

直接输出生成的文案。
        `;
    }

    buildRedditPrompt(target) {
        return `
为 r/${target.subreddit || 'beermoneyindia'} 生成一篇帖子。

类型: 经验分享
主题: Teen Patti 每日抽奖的真实体验

要求:
1. 真实分享风格，不像广告
2. 提到真的赢过钱（UPI支付）
3. 提及免费参与选项
4. 邀请其他人分享经验
5. 符合 Reddit 社区规范
6. 包含 Bot 链接: @TeenPattiLuckyBot

直接输出生成的帖子内容。
        `;
    }
}

module.exports = AIGenerator;
