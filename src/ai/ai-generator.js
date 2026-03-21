/**
 * ============================================================
 * AI 内容生成器 - 基于 Kimi API
 * ============================================================
 * 
 * 功能：
 * - 生成个性化推广文案
 * - 多语言支持（英文/印地语）
 * - 多模板类型（私信/邀请/评论）
 * - A/B 测试支持
 */

const https = require('https');
const logger = require('../utils/logger');

class AIGenerator {
    constructor() {
        this.apiKey = process.env.KIMI_API_KEY;
        this.apiUrl = process.env.KIMI_API_URL || 'https://api.moonshot.cn/v1/chat/completions';
        this.model = process.env.KIMI_MODEL || 'moonshot-v1-8k';
        
        // 预定义提示模板
        this.prompts = {
            directMessage: {
                system: `You are a professional marketing copywriter specializing in Telegram channel promotion.
Your task is to write personalized, engaging direct messages to channel admins.
Tone: Friendly, professional, not spammy.
Language: Use the language specified by the user (EN for English, HI for Hindi).
Keep it short (2-3 sentences max). Include a call-to-action.`,
                
                template: (data) => `Write a personalized direct message to promote a Teen Patti gaming channel.

Target Channel: ${data.targetName || 'Unknown'}
Target Topic: ${data.topic || 'gaming'}
Our Channel: ${data.ourChannel || '@TeenpattiMastetClub'}
Our Features: Daily tips, ₹5000 giveaways, 5000+ active players
Language: ${data.language || 'EN'}

The message should:
1. Compliment their channel
2. Briefly introduce our Teen Patti community
3. Suggest collaboration or cross-promotion
4. Include our channel link
5. Be friendly and professional

Return ONLY the message text, nothing else.`
            },
            
            invite: {
                system: `You are writing invitation messages for a Teen Patti gaming community.
Tone: Exciting, engaging, welcoming.
Keep it short and punchy.`,
                
                template: (data) => `Write an invitation message to join a Teen Patti gaming channel.

Channel: ${data.ourChannel || '@TeenpattiMastetClub'}
Highlights: Daily tips, Cash prizes, Active community
Language: ${data.language || 'EN'}

The message should:
1. Hook the reader immediately
2. Mention key benefits
3. Create urgency or FOMO
4. Include channel link

Return ONLY the message text.`
            },
            
            comment: {
                system: `You are writing comments on Telegram posts to naturally promote a gaming channel.
Tone: Casual, helpful, not obviously promotional.
Blend in with the conversation.`,
                
                template: (data) => `Write a comment on a post about ${data.topic || 'online gaming'}.

Post Topic: ${data.postTopic || 'make money online'}
Our Channel: ${data.ourChannel || '@TeenpattiMastetClub'}
Language: ${data.language || 'EN'}

The comment should:
1. Add value to the discussion
2. Naturally mention Teen Patti as an option
3. Not look like spam
4. Be conversational

Return ONLY the comment text.`
            },
            
            reply: {
                system: `You are an AI assistant for a Teen Patti gaming channel.
Answer user questions about the game, tips, earnings, and community.
Tone: Helpful, friendly, encouraging.`,
                
                template: (data) => `Generate a reply to this user message:

User Message: "${data.userMessage}"
User Context: ${data.context || 'asking about Teen Patti'}
Channel: ${data.ourChannel || '@TeenpattiMastetClub'}
Language: ${data.language || 'EN'}

Reply should:
1. Answer their question
2. Be friendly and helpful
3. Encourage them to join/play
4. Include relevant tips if applicable

Return ONLY the reply text.`
            }
        };
    }

    /**
     * 调用 Kimi API 生成内容
     */
    async generate(type, data) {
        try {
            const prompt = this.prompts[type];
            if (!prompt) {
                throw new Error(`Unknown content type: ${type}`);
            }

            logger.info(`[AIGenerator] Generating ${type} content...`);

            const response = await this.callKimiAPI({
                system: prompt.system,
                user: prompt.template(data)
            });

            const content = response.choices?.[0]?.message?.content?.trim();
            
            if (!content) {
                throw new Error('Empty response from Kimi API');
            }

            logger.info(`[AIGenerator] Content generated (${content.length} chars)`);
            
            return {
                type,
                content,
                language: data.language || 'EN',
                generatedAt: new Date(),
                metadata: {
                    target: data.targetName,
                    topic: data.topic
                }
            };

        } catch (error) {
            logger.error('[AIGenerator] Generation failed:', error.message);
            
            // 返回备用模板
            return this.getFallbackTemplate(type, data);
        }
    }

    /**
     * 调用 Kimi API
     */
    async callKimiAPI(messages) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: messages.system },
                    { role: 'user', content: messages.user }
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            const options = {
                hostname: 'api.moonshot.cn',
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 30000
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * 备用模板（API失败时使用）
     */
    getFallbackTemplate(type, data) {
        const templates = {
            directMessage: {
                EN: `Hi there! 👋 I came across your channel and really like your content about ${data.topic || 'gaming'}. 

We run a Teen Patti community (@TeenpattiMastetClub) with daily tips and ₹5000 giveaways. Would love to explore collaboration! 

Let me know if you're interested. 🤝`,
                
                HI: `नमस्ते! 👋 मैंने आपका चैनल देखा और ${data.topic || 'gaming'} के बारे में आपकी सामग्री बहुत पसंद आई।

हम Teen Patti समुदाय चलाते हैं (@TeenpattiMastetClub) जहाँ रोजाना टिप्स और ₹5000 की Giveaway होती है। सहयोग करने में रुचि हो तो बताएं! 🤝`
            },
            
            invite: {
                EN: `🎰 Join @TeenpattiMastetClub - India's #1 Teen Patti Community!

✅ Daily Winning Tips
✅ ₹5000 Cash Giveaways
✅ 5000+ Active Players

💰 Start earning today: @TeenpattiMastetClub`,
                
                HI: `🎰 @TeenpattiMastetClub से जुड़ें - भारत की #1 Teen Patti Community!

✅ रोजाना जीतने के टिप्स
✅ ₹5000 कैश Giveaway
✅ 5000+ एक्टिव प्लेयर्स

💰 आज ही कमाई शुरू करें: @TeenpattiMastetClub`
            },
            
            comment: {
                EN: `Great post! 🙌 If you're looking for another way to earn online, check out Teen Patti. I've been playing on @TeenpattiMastetClub and it's legit. They have daily tips that really help!`,
                
                HI: `बढ़िया पोस्ट! 🙌 अगर आप ऑनलाइन कमाने का और तरीका ढूंढ रहे हैं तो Teen Patti देखें। मैं @TeenpattiMastetClub पर खेल रहा हूं और यह असली है। उनके रोजाना टिप्स बहुत मददगार हैं!`
            },
            
            reply: {
                EN: `Thanks for your message! 😊 

You can join our Teen Patti community @TeenpattiMastetClub. We share daily tips and have active discussions about winning strategies.

Feel free to ask if you have any questions!`,
                
                HI: `आपके संदेश के लिए धन्यवाद! 😊

आप हमारे Teen Patti समुदाय @TeenpattiMastetClub से जुड़ सकते हैं। हम रोजाना टिप्स साझा करते हैं और जीतने की रणनीतियों पर चर्चा होती है।

कोई सवाल हो तो पूछें!`
            }
        };

        const lang = data.language || 'EN';
        const content = templates[type]?.[lang] || templates[type]?.EN || 'Welcome to our channel!';

        return {
            type,
            content,
            language: lang,
            generatedAt: new Date(),
            isFallback: true,
            metadata: {
                target: data.targetName,
                topic: data.topic
            }
        };
    }

    /**
     * 批量生成 A/B 测试版本
     */
    async generateABTest(type, data, count = 2) {
        const versions = [];
        
        for (let i = 0; i < count; i++) {
            // 稍微修改提示词生成不同版本
            const variant = await this.generate(type, {
                ...data,
                variant: i + 1
            });
            versions.push(variant);
        }
        
        return versions;
    }
}

module.exports = AIGenerator;
