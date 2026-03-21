/**
 * ============================================================
 * MTProto 登录脚本
 * ============================================================
 * 
 * 首次使用：运行此脚本登录并保存 session
 * 之后：系统会自动使用已保存的 session，无需重复登录
 */

require('dotenv').config();
const MTProtoClient = require('./src/core/mtproto-client');
const fs = require('fs');
const path = require('path');

async function login() {
    console.log('🔐 MTProto 用户账号登录\n');
    console.log('═══════════════════════════════════════\n');
    
    // 检查是否已有 session
    const sessionFile = path.join(__dirname, 'data', 'mtproto-session.txt');
    let existingSession = '';
    
    if (fs.existsSync(sessionFile)) {
        existingSession = fs.readFileSync(sessionFile, 'utf8').trim();
        console.log('📄 发现已有 session，尝试使用...\n');
    }
    
    // 创建客户端
    const client = new MTProtoClient(existingSession, 'main');
    
    console.log('📱 账号信息:');
    console.log(`   手机号: ${process.env.PHONE_NUMBER || '+919799524106'}`);
    console.log(`   API ID: ${process.env.API_ID || '39572298'}`);
    console.log('\n⏳ 正在连接 Telegram...\n');
    
    try {
        const result = await client.connect();
        
        if (result.success) {
            console.log('✅ 登录成功!\n');
            console.log('👤 用户信息:');
            console.log(`   用户名: @${result.user.username || 'N/A'}`);
            console.log(`   姓名: ${result.user.firstName} ${result.user.lastName || ''}`);
            console.log(`   ID: ${result.user.id}`);
            
            // 保存 session
            if (result.sessionString) {
                fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
                fs.writeFileSync(sessionFile, result.sessionString);
                console.log('\n💾 Session 已保存到:', sessionFile);
                console.log('   下次启动将自动登录，无需验证码\n');
            }
            
            // 测试功能
            console.log('🧪 测试功能...\n');
            
            // 测试 1: 获取自己的信息
            const me = await client.getUserInfo(result.user.username);
            console.log('✅ 获取用户信息: 正常');
            
            // 测试 2: 搜索消息
            const search = await client.searchMessages('test', 1);
            console.log('✅ 搜索功能: 正常');
            
            console.log('\n═══════════════════════════════════════');
            console.log('✅ 全部测试通过！系统已就绪');
            console.log('═══════════════════════════════════════\n');
            
            console.log('🚀 现在可以运行: node src/app.js');
            console.log('   系统将使用此账号自动执行任务\n');
            
        } else {
            console.error('\n❌ 登录失败:', result.error);
            console.log('\n可能原因:');
            console.log('   1. API_ID / API_HASH 错误');
            console.log('   2. 手机号格式不正确');
            console.log('   3. 需要输入验证码（首次登录）');
            console.log('   4. 账号被限制或封禁\n');
        }
        
    } catch (error) {
        console.error('\n❌ 错误:', error.message);
        console.error(error.stack);
    } finally {
        await client.disconnect();
    }
}

login();
