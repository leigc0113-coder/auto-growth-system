/**
 * ============================================================
 * AI 内容生成器 - 基于 Kimi API (修复版)
 * ============================================================
 */

const https = require('https');
const logger = require('../utils/logger');

class AIGenerator {
    constructor() {
        this.apiKey = process.env.KIMI_API_KEY;
        this.apiUrl = process.env.KIMI_API_URL || 'https://api.moonshot.cn/v1/chat/completions';
        this.model = process.env.KIMI_MODEL || 'moonshot-v1-8k';
    }

    /**
     * 生成内容主入口
     */
    async generate(type, data) {
        try {
            logger.info(`[AIGenerator] Generating ${type} content...`);

            const prompt = this.buildPrompt(type, data);
            const response = await this.callKimiAPI(prompt);
            
            if (!response || !response.choices || !response.choices[0]) {
                throw new Error('Invalid API response structure');
            }

            const content = response.choices[0].message?.content?.trim();
            
            if (!content) {
                throw new Error('Empty content from API');
            }

            logger.info(`[AIGenerator] Content generated: ${content.length} chars`);
            
            return {
                type,
                content,
                language: data.language || 'EN',
                generatedAt: new Date(),
                isAI: true,
                metadata: {
                    target: data.targetName,
                    topic: data.topic,
                    model: this.model
                }
            };

        } catch (error) {
            logger.error(`[AIGenerator] Error: ${error.message}`);
            return this.getFallbackTemplate(type, data);
        }
    }

    /**
     * 构建提示词
     */
    buildPrompt(type, data) {
        const prompts = {
            directMessage: {
                system: `You are a professional marketing copywriter. Write personalized, friendly direct messages for Telegram channel promotion.
Tone: Professional but warm, not spammy.
Keep it short (2-3 sentences) with a clear call-to-action.`,
                user: `Write a personalized message to promote a Teen Patti gaming channel.

Target Channel: ${data.targetName || 'Channel Admin'}
Topic: ${data.topic || 'gaming'}
Our Channel: @TeenpattiMastetClub
Features: Daily tips, ₹5000 giveaways, 5000+ players
Language: ${data.language || 'EN'}

Requirements:
1. Start with a friendly greeting
2. Mention their channel/topic briefly
3. Introduce our Teen Patti community
4. Include call-to-action
5. Keep under 150 words`
            },
            
            invite: {
                system: `You are writing exciting invitation messages for a gaming community. Create urgency and FOMO.`,
                user: `Write an invitation to join @TeenpattiMastetClub

Highlights:
- Daily winning tips
- ₹5000 cash prizes
- 5000+ active players
Language: ${data.language || 'EN'}

Make it punchy, exciting, and action-oriented!`
            },
            
            comment: {
                system: `Write natural, helpful comments that blend into discussions.`,
                user: `Write a comment on a post about ${data.topic || 'making money online'}.

Naturally mention Teen Patti as an option.
Include @TeenpattiMastetClub reference.
Language: ${data.language || 'EN'}

Should sound helpful, not promotional.`
            },
            
            reply: {
                system: `You are a helpful community assistant for a Teen Patti channel.`,
                user: `Reply to: "${data.userMessage || 'Tell me about Teen Patti'}"

Context: ${data.context || 'user inquiry'}
Channel: @TeenpattiMastetClub
Language: ${data.language || 'EN'}

Be friendly, helpful, and encourage them to join.`
            }
        };

        return prompts[type] || prompts.directMessage;
    }

    /**
     * 调用 Kimi API - 使用 Promise 封装
     */
    callKimiAPI(prompt) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: prompt.system },
                    { role: 'user', content: prompt.user }
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

            let responseData = '';

            const req = https.request(options, (res) => {
                res.setEncoding('utf8');
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        // 检查 HTTP 状态
                        if (res.statusCode !== 200) {
                            reject(new Error(`HTTP ${res.statusCode}: ${responseData.substring(0, 200)}`));
                            return;
                        }
                        
                        // 解析 JSON
                        const json = JSON.parse(responseData);
                        
                        // 检查 API 错误
                        if (json.error) {
                            reject(new Error(`API Error: ${json.error.message || JSON.stringify(json.error)}`));
                            return;
                        }
                        
                        resolve(json);
                        
                    } catch (parseError) {
                        reject(new Error(`JSON Parse Error: ${parseError.message}. Data: ${responseData.substring(0, 200)}`));
                    }
                });
            });

            req.on('error', (err) => {
                reject(new Error(`Request Error: ${err.message}`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout after 30s'));
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * 备用模板
     */
    getFallbackTemplate(type, data) {
        const lang = data.language || 'EN';
        
        const templates = {
            directMessage: {
                EN: `Hi there! 👋 I came across your channel and really appreciate your content about ${data.topic || 'gaming'}.

We run a Teen Patti community (@TeenpattiMastetClub) with 5000+ active players, daily tips, and ₹5000 cash giveaways.

Would you be interested in cross-promotion? Let me know! 🤝`,
                
                HI: `नमस्ते! 👋 मैंने आपका चैनल देखा और ${data.topic || 'gaming'} के बारे में आपकी सामग्री बहुत पसंद आई।

हम Teen Patti समुदाय चलाते हैं (@TeenpattiMastetClub) जहाँ 5000+ सक्रिय खिलाड़ी, रोजाना टिप्स और ₹5000 कैश Giveaway होती है।

क्या आप क्रॉस-प्रमोशन में रुचि रखते हैं? 🤝`
            },
            
            invite: {
                EN: `🎰 Join @TeenpattiMastetClub - India's #1 Teen Patti Community!

✅ Daily Winning Tips
✅ ₹5000 Cash Giveaways  
✅ 5000+ Active Players

💰 Start earning today! 👇
@TeenpattiMastetClub`,
                
                HI: `🎰 @TeenpattiMastetClub से जुड़ें - भारत की #1 Teen Patti Community!

✅ रोजाना जीतने के टिप्स
✅ ₹5000 कैश Giveaway
✅ 5000+ सक्रिय खिलाड़ी

💰 आज ही कमाई शुरू करें! 👇
@TeenpattiMastetClub`
            },
            
            comment: {
                EN: `Great post! 🙌 If you're looking for another way to earn online, check out Teen Patti gaming. I've been using @TeenpattiMastetClub and it's legit! 💯`,
                
                HI: `बढ़िया पोस्ट! 🙌 अगर आप ऑनलाइन कमाने का और तरीका ढूंढ रहे हैं तो Teen Patti देखें। मैं @TeenpattiMastetClub का उपयोग कर रहा हूं और यह असली है! 💯`
            },
            
            reply: {
                EN: `Thanks for your message! 😊 Join our community @TeenpattiMastetClub for daily tips and cash prizes. Feel free to ask any questions!`,
                
                HI: `संदेश के लिए धन्यवाद! 😊 रोजाना टिप्स और कैश पुरस्कारों के लिए हमारे समुदाय @TeenpattiMastetClub से जुड़ें। कोई सवाल हो तो पूछें!`
            }
        };

        const content = templates[type]?.[lang] || templates[type]?.EN || 
            `Hi! Check out our Teen Patti channel @TeenpattiMastetClub for daily tips and prizes! 🎰`;

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
