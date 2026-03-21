/**
 * ============================================================
 * 组合测试：Stealth + Bot API
 * ============================================================
 */

const StealthScraper = require('../src/scraper/stealth-scraper');
const TelegramCollector = require('../src/scraper/telegram-collector');
const Database = require('../src/utils/database');

async function combinedTest() {
    console.log('🚀 组合测试开始...\n');
    
    const db = new Database();
    await db.connect();
    
    // 1. Stealth 采集 Telemetr
    console.log('[1/2] Stealth 采集 Telemetr...');
    const stealthScraper = new StealthScraper();
    
    const keywords = ['teen patti', 'online earning', 'make money india'];
    const allChannels = [];
    
    for (const keyword of keywords) {
        console.log(`  搜索: ${keyword}`);
        const channels = await stealthScraper.scrapeTelemetr(keyword);
        allChannels.push(...channels);
        console.log(`  找到 ${channels.length} 个频道\n`);
        
        // 间隔 5 秒
        await new Promise(r => setTimeout(r, 5000));
    }
    
    console.log(`\n✅ Stealth 采集完成: ${allChannels.length} 个频道\n`);
    
    // 保存到数据库
    for (const channel of allChannels) {
        const exists = await db.findOne('targets', { username: channel.username });
        if (!exists) {
            await db.insert('targets', { ...channel, status: 'new' });
        }
    }
    console.log(`  新数据已保存到数据库\n`);
    
    // 2. Telegram Bot API 验证
    console.log('[2/2] Telegram Bot API 验证...');
    const telegramCollector = new TelegramCollector();
    
    // 从前 5 个结果中验证
    const topChannels = allChannels.slice(0, 5).filter(c => c.username);
    
    for (const channel of topChannels) {
        console.log(`  验证: @${channel.username}`);
        const info = await telegramCollector.getChannelInfo(channel.username);
        
        if (info) {
            console.log(`    ✅ 标题: ${info.title}`);
            console.log(`    ✅ 成员: ${info.members}`);
            
            // 更新数据库
            await db.insert('telegram_channels', info);
        } else {
            console.log(`    ❌ 无法获取信息`);
        }
        
        await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log('\n✅ 测试完成！');
    
    await db.disconnect();
}

combinedTest().catch(console.error);
