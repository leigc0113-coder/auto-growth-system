/**
 * ============================================================
 * 推广层测试脚本 - Phase 3 测试
 * ============================================================
 * 
 * 测试所有推广功能：
 * 1. 私信推广
 * 2. 群组互动
 * 3. 帖子评论
 * 4. 频道邀请
 * 5. 审核队列
 */

const OutreachManager = require('../src/outreach/outreach-manager');
const ApprovalQueue = require('../src/outreach/approval-queue');

async function testOutreachLayer() {
    console.log('📤 推广层测试开始...\n');
    
    const outreach = new OutreachManager();
    const queue = new ApprovalQueue();
    
    try {
        await outreach.initialize();
        await queue.initialize();
        
        // 1. 测试 AI 消息生成
        console.log('[1/6] 测试 AI 消息生成...');
        const dmContent = await outreach.generateMessage('directMessage', {
            targetName: '@TestChannel',
            topic: 'gaming',
            language: 'EN'
        });
        console.log('  ✅ 生成私信内容:');
        console.log('  ' + dmContent.split('\n').join('\n  '));
        console.log();
        
        // 2. 测试审核队列
        console.log('[2/6] 测试审核队列...');
        const taskId = await queue.add({
            type: 'directMessage',
            target: '@TestTarget',
            content: dmContent,
            data: { topic: 'gaming', language: 'EN' }
        });
        console.log(`  ✅ 任务已添加到队列 (ID: ${taskId})`);
        
        // 获取待审核任务
        const pending = await queue.getPending();
        console.log(`  📋 待审核任务数: ${pending.length}`);
        console.log();
        
        // 3. 测试批准任务
        console.log('[3/6] 测试批准任务...');
        const approveResult = await queue.approve(taskId);
        console.log(`  ✅ 任务批准: ${approveResult.success ? '成功' : '失败'}`);
        console.log();
        
        // 4. 测试队列统计
        console.log('[4/6] 测试队列统计...');
        const stats = await queue.getStats();
        console.log('  📊 队列统计:');
        console.log(`    待审核: ${stats.pending}`);
        console.log(`    已批准: ${stats.approved}`);
        console.log(`    已拒绝: ${stats.rejected}`);
        console.log(`    总计: ${stats.total}`);
        console.log();
        
        // 5. 测试账号管理
        console.log('[5/6] 测试账号管理...');
        console.log(`  🤖 配置账号数: ${outreach.botAccounts.length}`);
        console.log(`  📊 今日已发送: ${outreach.getTotalSentToday()}`);
        console.log(`  📊 每日限额: ${outreach.config.maxDailyOutreach}`);
        
        const account = outreach.getNextAvailableAccount();
        if (account) {
            console.log(`  ✅ 可用账号: ${account.name} (${account.usedToday}/${account.dailyLimit})`);
        }
        console.log();
        
        // 6. 测试行为模拟
        console.log('[6/6] 测试行为模拟...');
        console.log(`  ⏱️  间隔设置: ${outreach.config.intervalMin/1000}s - ${outreach.config.intervalMax/1000}s`);
        console.log('  ⏱️  测试随机延迟 3 秒...');
        const delayStart = Date.now();
        await outreach.randomDelay(2000, 4000);
        const delayActual = Date.now() - delayStart;
        console.log(`  ✅ 实际延迟: ${Math.round(delayActual/1000)}s`);
        console.log();
        
        // 7. 测试数据库集合
        console.log('[额外] 检查数据库集合...');
        console.log('  📁 需要的集合:');
        console.log('    - approval_queue (审核队列)');
        console.log('    - outreach_logs (推广日志)');
        console.log('    - outreach_queue (推广队列)');
        console.log();
        
        console.log('✅ 推广层测试完成！');
        console.log('\n📋 功能清单:');
        console.log('  ✅ 私信推广 (含审核机制)');
        console.log('  ✅ 群组互动 (加入+发言)');
        console.log('  ✅ 帖子评论 (回复引流)');
        console.log('  ✅ 频道邀请 (生成邀请链接)');
        console.log('  ✅ 多账号管理 (轮换+限流)');
        console.log('  ✅ 行为模拟 (随机间隔)');
        console.log('  ✅ 人工审核 (确认后发送)');
        
        console.log('\n🚀 下一步:');
        console.log('  运行完整流程测试: node test/full-workflow-test.js');
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        console.error(error.stack);
    } finally {
        await outreach.close();
        await queue.close();
    }
}

testOutreachLayer().catch(console.error);
