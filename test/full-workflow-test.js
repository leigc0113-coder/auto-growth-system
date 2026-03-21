/**
 * ============================================================
 * 完整流程测试 - 从采集到推广
 * ============================================================
 */

const StealthScraper = require('../src/scraper/stealth-scraper');
const TelegramCollector = require('../src/scraper/telegram-collector');
const AIGenerator = require('../src/ai/ai-generator');
const OutreachManager = require('../src/outreach/outreach-manager');
const ApprovalQueue = require('../src/outreach/approval-queue');
const Database = require('../src/utils/database');

async function fullWorkflowTest() {
    console.log('🚀 完整流程测试: 采集 → 内容生成 → 推广\n');
    
    const db = new Database();
    await db.connect();
    
    const stealth = new StealthScraper();
    const collector = new TelegramCollector();
    const ai = new AIGenerator();
    const outreach = new OutreachManager();
    const queue = new ApprovalQueue();
    
    await outreach.initialize();
    await queue.initialize();
    
    try {
        // ========== 阶段 1: 采集 ==========
        console.log('[阶段 1/4] 数据采集...\n');
        
        // 从数据库获取之前采集的频道
        let channels = await db.findAll('targets', { source: 'telemetr' }, 10);
        
        if (channels.length === 0) {
            console.log('  数据库中没有数据，重新采集...');
            const newChannels = await stealth.scrapeTelemetr('teen patti');
            
            // 保存到数据库
            for (const ch of newChannels.slice(0, 5)) {
                const exists = await db.findOne('targets', { username: ch.username });
                if (!exists) {
                    await db.insert('targets', { ...ch, status: 'new' });
                }
            }
            
            channels = newChannels.slice(0, 5);
        } else {
            console.log(`  ✅ 从数据库获取 ${channels.length} 个频道`);
        }
        
        console.log(`  📊 采集完成: ${channels.length} 个频道\n`);
        
        // ========== 阶段 2: 内容生成 ==========
        console.log('[阶段 2/4] AI 内容生成...\n');
        
        const messages = [];
        for (const channel of channels.slice(0, 3)) {
            console.log(`  为 ${channel.username} 生成内容...`);
            
            const content = await ai.generate('directMessage', {
                targetName: channel.username,
                topic: channel.keyword || 'gaming',
                language: 'EN'
            });
            
            messages.push({
                target: channel.username,
                content: content.content
            });
            
            console.log(`  ✅ 生成成功 (${content.content.length} 字符)`);
            
            // 间隔避免 API 限流
            await new Promise(r => setTimeout(r, 1000));
        }
        
        console.log(`\n  📄 共生成 ${messages.length} 条推广消息\n`);
        
        // ========== 阶段 3: 添加到审核队列 ==========
        console.log('[阶段 3/4] 添加到审核队列...\n');
        
        for (const msg of messages) {
            const taskId = await queue.add({
                type: 'directMessage',
                target: msg.target,
                content: msg.content,
                data: { topic: 'gaming', language: 'EN' }
            });
            
            console.log(`  ✅ ${msg.target} -> 队列 (ID: ${taskId})`);
        }
        
        const pendingStats = await queue.getStats();
        console.log(`\n  📋 待审核: ${pendingStats.pending} 个任务\n`);
        
        // ========== 阶段 4: 模拟批准和发送 ==========
        console.log('[阶段 4/4] 模拟审核通过...\n');
        
        // 获取待审核任务
        const pendingTasks = await queue.getPending();
        
        if (pendingTasks.length > 0) {
            console.log(`  批准 ${pendingTasks.length} 个任务...`);
            
            for (const task of pendingTasks) {
                // 批准任务
                await queue.approve(task._id);
                console.log(`  ✅ 任务 ${task._id} 已批准`);
                
                // 记录到推广日志（模拟发送成功）
                await db.insert('outreach_logs', {
                    type: 'directMessage',
                    target: task.target,
                    content: task.content,
                    status: 'simulated_sent',
                    sentAt: new Date(),
                    note: 'Test mode - not actually sent'
                });
            }
            
            console.log('\n  📤 模拟发送完成');
        }
        
        // ========== 统计 ==========
        console.log('\n' + '='.repeat(50));
        console.log('📊 测试总结');
        console.log('='.repeat(50));
        
        const finalStats = await queue.getStats();
        console.log(`  采集频道: ${channels.length}`);
        console.log(`  生成内容: ${messages.length}`);
        console.log(`  审核通过: ${finalStats.approved}`);
        console.log(`  模拟发送: ${finalStats.approved}`);
        
        console.log('\n✅ 完整流程测试成功！');
        
        console.log('\n📋 实际运行方式:');
        console.log('  1. 管理员收到 Telegram 通知');
        console.log('  2. 回复 /approve <id> 批准任务');
        console.log('  3. 系统自动发送私信');
        console.log('  4. 发送结果记录到数据库');
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        console.error(error.stack);
    } finally {
        await db.disconnect();
        await outreach.close();
        await queue.close();
    }
}

fullWorkflowTest().catch(console.error);
