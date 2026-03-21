/**
 * 双账号功能测试
 * 
 * 测试1: 账号1 给 @Winbiginsta 发私信
 * 测试2: 账号2 加入 @tkgfg 群组
 */

require('dotenv').config();
const MTProtoClient = require('./src/core/mtproto-client');
const fs = require('fs');
const path = require('path');

async function testDualAccounts() {
    console.log('🚀 双账号功能测试\n');
    console.log('═══════════════════════════════════════\n');
    
    // ========== 测试 1: 账号1 发送私信 ==========
    console.log('[测试 1] 账号1 发送私信');
    console.log('─────────────────────────────────────');
    console.log('发送者: 账号1 (+919799524106)');
    console.log('接收者: @Winbiginsta');
    console.log('');
    
    // 加载账号1 session
    const session1 = fs.readFileSync(
        path.join(__dirname, 'data', 'mtproto-session.txt'), 
        'utf8'
    ).trim();
    
    const client1 = new MTProtoClient(session1, 'account_1');
    const connect1 = await client1.connect();
    
    if (!connect1.success) {
        console.log('❌ 账号1 连接失败:', connect1.error);
        return;
    }
    
    console.log('✅ 账号1 已连接:', connect1.user.username);
    
    // 生成私信内容
    const message = `🧪 双账号测试 - 私信功能\n\n发送时间: ${new Date().toLocaleString()}\n发送账号: 账号1\n接收账号: @Winbiginsta\n\n如果收到这条消息，说明私信功能正常！`;
    
    const sendResult = await client1.sendDirectMessage('Winbiginsta', message);
    
    if (sendResult.success) {
        console.log('✅ 私信发送成功!');
        console.log('   消息ID:', sendResult.messageId);
    } else {
        console.log('❌ 私信发送失败:', sendResult.error);
    }
    
    await client1.disconnect();
    console.log('');
    
    // ========== 测试 2: 账号2 加入群组 ==========
    console.log('[测试 2] 账号2 加入群组');
    console.log('─────────────────────────────────────');
    console.log('账号: 账号2 (+917416201930)');
    console.log('目标群组: @tkgfg');
    console.log('');
    
    // 设置账号2的API凭证
    process.env.API_ID = process.env.API_ID_2 || '38245742';
    process.env.API_HASH = process.env.API_HASH_2 || '98fda1388a1b2bf50a10a14eab34bf47';
    process.env.PHONE_NUMBER = '+917416201930';
    
    // 加载账号2 session
    const session2 = fs.readFileSync(
        path.join(__dirname, 'data', 'mtproto-session-2.txt'), 
        'utf8'
    ).trim();
    
    const client2 = new MTProtoClient(session2, 'account_2');
    const connect2 = await client2.connect();
    
    if (!connect2.success) {
        console.log('❌ 账号2 连接失败:', connect2.error);
        return;
    }
    
    console.log('✅ 账号2 已连接:', connect2.user.username);
    
    // 加入群组
    const joinResult = await client2.joinGroup('tkgfg');
    
    if (joinResult.success) {
        console.log('✅ 加入群组成功!');
        if (joinResult.alreadyJoined) {
            console.log('   (已在群组中)');
        }
    } else {
        console.log('❌ 加入群组失败:', joinResult.error);
    }
    
    // 如果加入成功，发送一条测试消息
    if (joinResult.success) {
        console.log('');
        console.log('发送测试消息到群组...');
        const groupMsg = `🧪 双账号测试 - 群组功能\n\n时间: ${new Date().toLocaleString()}\n账号: 账号2\n测试自动加入和发言功能`;
        
        const msgResult = await client2.sendGroupMessage('tkgfg', groupMsg);
        
        if (msgResult.success) {
            console.log('✅ 群组消息发送成功!');
        } else {
            console.log('❌ 群组消息发送失败:', msgResult.error);
        }
    }
    
    await client2.disconnect();
    
    // ========== 总结 ==========
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 测试结果');
    console.log('═══════════════════════════════════════');
    console.log('账号1 (私信):', sendResult.success ? '✅ 成功' : '❌ 失败');
    console.log('账号2 (加群):', joinResult.success ? '✅ 成功' : '❌ 失败');
    console.log('');
    console.log('✅ 双账号测试完成!');
    console.log('');
    console.log('请检查:');
    console.log('  1. @Winbiginsta 是否收到私信');
    console.log('  2. @tkgfg 群组是否看到加入和消息');
}

testDualAccounts().catch(err => {
    console.error('❌ 测试失败:', err.message);
});
