/**
 * ============================================================
 * Puppeteer 测试脚本
 * ============================================================
 * 
 * 测试内容：
 * 1. 能否启动浏览器
 * 2. 能否访问网页
 * 3. 资源占用情况
 */

const puppeteer = require('puppeteer');
const logger = require('./utils/logger');

async function testPuppeteer() {
    console.log('🚀 Puppeteer 测试开始...\n');
    
    let browser = null;
    
    try {
        // 1. 测试启动浏览器
        console.log('[1/4] 启动浏览器...');
        const startTime = Date.now();
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080'
            ],
            executablePath: process.env.CHROME_PATH || undefined
        });
        
        const launchTime = Date.now() - startTime;
        console.log(`  ✅ 浏览器启动成功 (${launchTime}ms)\n`);
        
        // 2. 测试打开页面
        console.log('[2/4] 测试访问 Google...');
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        await page.goto('https://www.google.com', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        const title = await page.title();
        console.log(`  ✅ 访问成功，标题: ${title}\n`);
        
        // 3. 测试访问 Telemetr
        console.log('[3/4] 测试访问 Telemetr.io...');
        await page.goto('https://telemetr.io/en/search?query=teen+patti', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        // 等待内容加载
        await page.waitForTimeout(5000);
        
        // 检查是否有频道数据
        const hasContent = await page.evaluate(() => {
            return document.querySelector('.channel-card, .search-item') !== null;
        });
        
        if (hasContent) {
            console.log('  ✅ 成功获取到频道数据！\n');
            
            // 截图保存
            await page.screenshot({
                path: '/opt/auto-growth-system/data/test-screenshot.png',
                fullPage: true
            });
            console.log('  📸 截图已保存到 data/test-screenshot.png\n');
        } else {
            console.log('  ⚠️ 页面加载完成，但未找到频道数据（可能被反爬）\n');
        }
        
        // 4. 检查资源占用
        console.log('[4/4] 检查资源占用...');
        const metrics = await page.metrics();
        console.log(`  JS 堆内存: ${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  文档数量: ${metrics.Documents}`);
        console.log(`  节点数量: ${metrics.Nodes}`);
        
        console.log('\n✅ 测试完成！Puppeteer 可以正常运行');
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        console.error('\n可能原因:');
        console.error('  1. Chrome 未安装');
        console.error('  2. 内存不足');
        console.error('  3. 网络连接问题');
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n🛑 浏览器已关闭');
        }
    }
}

testPuppeteer();
