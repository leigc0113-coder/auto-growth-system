/**
 * ============================================================
 * 消息模板配置
 * ============================================================
 * 
 * 预定义的推广文案模板
 * 当 AI API 失败时自动使用
 */

const messageTemplates = {
    /**
     * 私信推广模板 - 英文
     */
    directMessage: {
        EN: [
            `Hi {name}! 👋 I came across your channel and really appreciate your content about {topic}.

We run a Teen Patti gaming community (@TeenpattiMastetClub) with 5000+ active players, daily tips, and ₹5000 cash giveaways.

Would you be interested in cross-promotion or collaboration? Let me know! 🤝`,

            `Hello {name}! 👋 Love your {topic} content!

We have a growing Teen Patti community (@TeenpattiMastetClub) where players share tips and win daily prizes. Would love to connect and explore how we can help each other grow.

What do you think? 😊`,

            `Hey {name}! 👋 Big fan of your work in {topic}.

I manage @TeenpattiMastetClub - India's fastest-growing Teen Patti community. We're always looking for quality partners. Interested in a shoutout exchange or collaboration?

Looking forward to hearing from you! 🎰`
        ],
        
        HI: [
            `नमस्ते {name}! 👋 मैंने आपका चैनल देखा और {topic} के बारे में आपकी सामग्री बहुत पसंद आई।

हम Teen Patti गेमिंग समुदाय चलाते हैं (@TeenpattiMastetClub) जहाँ 5000+ सक्रिय खिलाड़ी, रोजाना टिप्स और ₹5000 कैश Giveaway होती है।

क्या आप क्रॉस-प्रमोशन में रुचि रखते हैं? बताएं! 🤝`,

            `हेलो {name}! 👋 आपकी {topic} सामग्री बहुत अच्छी है!

हमारा बढ़ता Teen Patti समुदाय है (@TeenpattiMastetClub) जहाँ खिलाड़ी टिप्स साझा करते हैं और रोजाना पुरस्कार जीतते हैं। आपसे जुड़कर अच्छा लगेगा।

क्या कहते हैं? 😊`,

            `हाय {name}! 👋 {topic} में आपके काम के बड़े प्रशंसक हैं हम।

मैं @TeenpattiMastetClub प्रबंधित करता हूं - भारत का सबसे तेजी से बढ़ता Teen Patti समुदाय। गुणवत्तापूर्ण भागीदारों की तलाश में हैं। शoutout एक्सचेंज में रुचि है?

आपके उत्तर की प्रतीक्षा है! 🎰`
        ]
    },

    /**
     * 邀请消息模板
     */
    invite: {
        EN: [
            `🎰 Join @TeenpattiMastetClub - India's #1 Teen Patti Community!

✅ Daily Winning Tips
✅ ₹5000 Cash Giveaways  
✅ 5000+ Active Players
✅ 24/7 Support

💰 Start earning today! Click to join 👇
@TeenpattiMastetClub`,

            `💸 Want to earn money playing Teen Patti?

Join @TeenpattiMastetClub NOW!

🎯 Daily Tips from Pros
🎁 ₹5000 Giveaways Every Day
👥 Join 5000+ Winners
📱 Easy to Start

👉 @TeenpattiMastetClub`,

            `🔥 Teen Patti Masters Unite! 

Join @TeenpattiMastetClub for:
• Expert Strategies
• Daily ₹5000 Prizes
• Active Community
• Real Cash Wins

Don't miss out! Join now 👇
@TeenpattiMastetClub`
        ],
        
        HI: [
            `🎰 @TeenpattiMastetClub से जुड़ें - भारत की #1 Teen Patti Community!

✅ रोजाना जीतने के टिप्स
✅ ₹5000 कैश Giveaway
✅ 5000+ सक्रिय खिलाड़ी
✅ 24/7 सपोर्ट

💰 आज ही कमाई शुरू करें! जुड़ने के लिए क्लिक करें 👇
@TeenpattiMastetClub`,

            `💸 Teen Patti खेलकर पैसा कमाना चाहते हैं?

अभी @TeenpattiMastetClub से जुड़ें!

🎯 प्रोफेशनल्स से रोजाना टिप्स
🎁 हर दिन ₹5000 Giveaway
👥 5000+ विजेताओं से जुड़ें
📱 शुरू करना आसान

👉 @TeenpattiMastetClub`,

            `🔥 Teen Patti Masters एकत्रित हों!

@TeenpattiMastetClub में शामिल हों:
• एक्सपर्ट रणनीतियां
• रोजाना ₹5000 पुरस्कार
• सक्रिय समुदाय
• असली कैश जीत

 miss मत करें! अभी join करें 👇
@TeenpattiMastetClub`
        ]
    },

    /**
     * 评论模板
     */
    comment: {
        EN: [
            `Great post! 🙌 If you're looking for another way to earn online, check out Teen Patti gaming. I've been using @TeenpattiMastetClub and the daily tips really help! 💯`,

            `Thanks for sharing! 👍 Btw, if anyone's interested in card games, @TeenpattiMastetClub is legit. Daily giveaways and helpful community. Just saying! 😊`,

            `Solid advice! 💪 Also, Teen Patti has been great for side income. @TeenpattiMastetClub has a good setup with daily tips and prizes. Worth checking out! 🎰`
        ],
        
        HI: [
            `बढ़िया पोस्ट! 🙌 अगर आप ऑनलाइन कमाने का और तरीका ढूंढ रहे हैं तो Teen Patti गेमिंग देखें। मैं @TeenpattiMastetClub का उपयोग कर रहा हूं और रोजाना टिप्स बहुत मददगार हैं! 💯`,

            `साझा करने के लिए धन्यवाद! 👍 वैसे, अगर किसी को कार्ड गेम में दिलचस्पी है तो @TeenpattiMastetClub असली है। रोजाना Giveaway और मददगार समुदाय। बस कह रहा हूं! 😊`,

            `बढ़िया सलाह! 💪 इसके अलावा, Teen Patti से side income अच्छी हो रही है। @TeenpattiMastetClub में रोजाना टिप्स और पुरस्कार हैं। एक बार देखें! 🎰`
        ]
    },

    /**
     * 回复模板
     */
    reply: {
        EN: [
            `Thanks for reaching out! 😊 Join our community @TeenpattiMastetClub for daily tips and cash prizes. Feel free to ask any questions!`,

            `Hello! 👋 Welcome! Check out @TeenpattiMastetClub - we share winning strategies daily and have ₹5000 giveaways. What would you like to know?`,

            `Hi there! 🎰 Yes, you can earn real money playing Teen Patti! Join @TeenpattiMastetClub to learn from 5000+ players. I'm here to help!`
        ],
        
        HI: [
            `संपर्क करने के लिए धन्यवाद! 😊 रोजाना टिप्स और कैश पुरस्कारों के लिए हमारे समुदाय @TeenpattiMastetClub से जुड़ें। कोई सवाल हो तो पूछें!`,

            `नमस्ते! 👋 स्वागत है! @TeenpattiMastetClub देखें - हम रोजाना जीतने की रणनीतियां साझा करते हैं और ₹5000 Giveaway होती है। क्या जानना चाहेंगे?`,

            `नमस्ते! 🎰 हां, आप Teen Patti खेलकर असली पैसा कमा सकते हैं! 5000+ खिलाड़ियों से सीखने के लिए @TeenpattiMastetClub से जुड़ें। मदद के लिए यहां हूं!`
        ]
    }
};

/**
 * 获取随机模板
 */
function getRandomTemplate(type, language = 'EN') {
    const templates = messageTemplates[type]?.[language];
    if (!templates || templates.length === 0) {
        return getRandomTemplate(type, 'EN'); // 回退到英文
    }
    
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
}

/**
 * 填充模板变量
 */
function fillTemplate(template, variables = {}) {
    let filled = template;
    
    for (const [key, value] of Object.entries(variables)) {
        filled = filled.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    
    return filled;
}

module.exports = {
    messageTemplates,
    getRandomTemplate,
    fillTemplate
};
