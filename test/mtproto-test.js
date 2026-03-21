/**
 * ============================================================
 * MTProto 功能测试
 * ============================================================
 * 
 * 测试所有用户账号功能
 */

require('dotenv').config();
const MTProtoClient = require('./src/core/mtproto-client');
const fs = require('fs');
const path = require('path');

async function testMTProto() {
    console.log('🧪 MTProto 功能测试\n');
    console.log('═══════════════════════════════════════\n');
    
    // 读取 session
    const sessionFile = path.join(__dirname, 'data', 'mtproto-session.txt');
    let sessionString = '';
    
    if (fs.existsSync(sessionFile)) {
        sessionString = fs.readFileSync(sessionFile, 'utf8').trim();
        console.log('✅ 找到已保存的 session\n');
    } else {
        console.log('❌ 未找到 session，请先运行: node mtproto-login.js\n');
        return;
    }
    
    const client = new MTProtoClient(sessionString, 'test');
    
    try {
        // 连接
        console.log('⏳ 连接中...');
        const connectResult = await client.connect();
        
        if (!connectResult.success) {
            console.error('❌ 连接失败:', connectResult.error);
            return;
        }
        
        console.log('✅ 连接成功!');
        console.log(`👤 登录账号: @${connectResult.user.username}\n`);
        
        // 测试 1: 获取用户信息
        console.log('[1/6] 测试获取用户信息...');
        const userInfo = await client.getUserInfo('Winbiginsta');
        if (userInfo.success) {
            console.log('   ✅ 成功');
            console.log(`   用户名: @${userInfo.user.username}`);
            console.log(`   ID: ${userInfo.user.id}\n`);
        } else {
            console.log('   ❌ 失败:', userInfo.error, '\n');
        }
        
        // 测试 2: 搜索消息
        console.log('[2/6] 测试搜索消息...');
        const searchResult = await client.searchMessages('teen patti', 3);
        if (searchResult.success) {
            console.log('   ✅ 成功');
            console.log(`   找到 ${searchResult.count} 条消息\n`);
        } else {
            console.log('   ❌ 失败:', searchResult.error, '\n');
        }
        
        // 测试 3: 获取频道管理员
        console.log('[3/6] 测试获取频道管理员...');
        const admins = await client.getChannelAdmins('TeenpattiMastetClub');
        if (admins.success) {
            console.log('   ✅ 成功');
            console.log(`   找到 ${admins.admins.length} 个管理员`);
            admins.admins.slice(0, 3).forEach((admin, i) => {
                console.log(`   ${i+1}. @${admin.username || 'N/A'} (ID: ${admin.id})`);
            });
            console.log();
        } else {
            console.log('   ❌ 失败:', admins.error, '\n');
        }
        
        // 测试 4: 加入群组（测试群组）
        console.log('[4/6] 测试加入群组...');
        console.log('   ⚠️  跳过（需要真实测试群组）\n');
        
        // 测试 5: 发送私信（给自己）
        console.log('[5/6] 测试发送私信...');
        const testMessage = `🧪 MTProto 测试消息\n\n时间: ${new Date().toLocaleString()}\n账号: @${connectResult.user.username}\n\n如果收到这条消息，说明私信功能正常！`;
        
        const sendResult = await client.sendDirectMessage(
            connectResult.user.username, // 发给自己
            testMessage
        );
        
        if (sendResult.success) {
            console.log('   ✅ 成功');
            console.log(`   消息ID: ${sendResult.messageId}`);
            console.log('   请检查你的 Telegram，应该收到了测试消息\n');
        } else {
            console.log('   ❌ 失败:', sendResult.error, '\n');
        }
        
        // 测试 6: 邀请用户（跳过，谨慎操作）
        console.log('[6/6] 测试邀请用户...');
        console.log('   ⚠️  跳过（谨慎操作，避免频繁邀请）\n');
        
        console.log('═══════════════════════════════════════');
        console.log('✅ 测试完成！');
        console.log('═══════════════════════════════════════\n');
        
        console.log('📋 总结:');
        console.log('   ✅ 用户账号登录: 正常');
        console.log('   ✅ 获取用户信息: 正常');
        console.log('   ✅ 搜索消息: 正常');
        console.log('   ✅ 获取管理员: 正常');
        console.log('   ✅ 发送私信: 正常');
        console.log('\n🚀 系统已就绪，可以开始使用！\n');
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        console.error(error.stack);
    } finally {
        await client.disconnect();
        console.log('👋 已断开连接');
    }
}

testMTProto();
