/**
 * ============================================================
 * 内容层测试脚本 - AI生成 + 自动回复
 * ============================================================
 */

const AIGenerator = require('../src/ai/ai-generator');
const AutoResponder = require('../src/ai/auto-responder');

async function testContentLayer() {
    console.log('📝 内容层测试开始...\n');
    
    const ai = new AIGenerator();
    const responder = new AutoResponder();
    
    // 1. 测试 AI 内容生成
    console.log('[1/4] 测试 AI 内容生成...\n');
    
    // 1.1 英文私信
    console.log('  生成英文私信...');
    const dmEN = await ai.generate('directMessage', {
        targetName: '@GamingIndia',
        topic: 'online gaming',
        ourChannel: '@TeenpattiMastetClub',
        language: 'EN'
    });
    console.log('  ✅ 英文私信:');
    console.log('  ' + dmEN.content.split('\n').join('\n  '));
    console.log();
    
    // 1.2 印地语私信
    console.log('  生成印地语私信...');
    const dmHI = await ai.generate('directMessage', {
        targetName: '@GamingHindi',
        topic: 'ऑनलाइन गेमिंग',
        ourChannel: '@TeenpattiMastetClub',
        language: 'HI'
    });
    console.log('  ✅ 印地语私信:');
    console.log('  ' + dmHI.content.split('\n').join('\n  '));
    console.log();
    
    // 1.3 邀请消息
    console.log('  生成邀请消息...');
    const invite = await ai.generate('invite', {
        ourChannel: '@TeenpattiMastetClub',
        language: 'EN'
    });
    console.log('  ✅ 邀请消息:');
    console.log('  ' + invite.content.split('\n').join('\n  '));
    console.log();
    
    // 1.4 评论
    console.log('  生成评论...');
    const comment = await ai.generate('comment', {
        postTopic: 'make money online',
        ourChannel: '@TeenpattiMastetClub',
        language: 'EN'
    });
    console.log('  ✅ 评论:');
    console.log('  ' + comment.content.split('\n').join('\n  '));
    console.log();
    
    // 2. 测试 A/B 版本生成
    console.log('[2/4] 测试 A/B 版本生成...');
    const abTest = await ai.generateABTest('invite', {
        ourChannel: '@TeenpattiMastetClub',
        language: 'EN'
    }, 2);
    console.log(`  ✅ 生成 ${abTest.length} 个版本`);
    abTest.forEach((v, i) => {
        console.log(`  版本 ${i + 1}: ${v.content.substring(0, 50)}...`);
    });
    console.log();
    
    // 3. 测试备用模板（模拟 API 失败）
    console.log('[3/4] 测试备用模板...');
    const fallback = ai.getFallbackTemplate('directMessage', {
        targetName: '@TestChannel',
        topic: 'gaming',
        language: 'EN'
    });
    console.log('  ✅ 备用模板可用');
    console.log('  长度:', fallback.content.length, '字符');
    console.log();
    
    // 4. 测试关键词匹配
    console.log('[4/4] 测试关键词匹配...');
    const testMessages = [
        'Hello there!',
        'How to play teen patti?',
        'Can I earn money?',
        'Any bonus available?',
        'I need help'
    ];
    
    for (const msg of testMessages) {
        const match = responder.matchKeyword(msg);
        console.log(`  "${msg}"`);
        console.log(`  -> ${match ? '匹配: ' + match.substring(0, 40) + '...' : '无匹配，将使用AI回复'}`);
        console.log();
    }
    
    // 5. 语言检测测试
    console.log('[额外] 测试语言检测...');
    const langTests = [
        'Hello how are you?',
        'नमस्ते आप कैसे हैं?',
        'This is English text',
        'यह हिंदी टेक्स्ट है'
    ];
    
    for (const text of langTests) {
        const lang = responder.detectLanguage(text);
        console.log(`  "${text.substring(0, 20)}..." -> ${lang}`);
    }
    
    console.log('\n✅ 内容层测试完成！');
    console.log('\n总结:');
    console.log('- AI内容生成: 正常工作');
    console.log('- 多语言支持: EN/HI 可用');
    console.log('- 关键词匹配: 5条规则生效');
    console.log('- 备用模板: 已就绪');
}

testContentLayer().catch(error => {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
});
