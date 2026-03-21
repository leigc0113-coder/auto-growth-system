/**
 * ============================================================
 * Stealth Scraper - 绕过 Cloudflare 的采集器
 * ============================================================
 * 
 * 技术栈：
 * - Puppeteer Extra + Stealth Plugin
 * - IPRoyal 住宅代理
 * - 真人行为模拟
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

// 启用 Stealth 插件
puppeteer.use(StealthPlugin());

class StealthScraper {
    constructor() {
        this.proxyUrl = process.env.PROXY_URL || 'http://3L3TODmeB74X7FGC:530tn4b8HeBfG2Rh_country-in_city-bacheli_session-Z7nqzlfG_lifetime-30m@geo.iproyal.com:12321';
    }

    /**
     * 创建带代理的浏览器实例
     */
    async createBrowser() {
        logger.info('[StealthScraper] Launching browser with proxy...');
        
        // 解析代理配置
        const proxyUrl = new URL(this.proxyUrl);
        const proxyHost = `${proxyUrl.protocol}//${proxyUrl.host}`;
        const proxyUsername = proxyUrl.username;
        const proxyPassword = proxyUrl.password;
        
        this.proxyAuth = { username: proxyUsername, password: proxyPassword };
        
        return await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                `--proxy-server=${proxyHost}`,
                '--disable-web-security'
            ]
        });
    }

    /**
     * 采集 Telemetr.io 频道
     */
    async scrapeTelemetr(keyword) {
        const browser = await this.createBrowser();
        const results = [];
        
        try {
            const page = await browser.newPage();
            
            // 设置代理认证
            if (this.proxyAuth) {
                await page.authenticate(this.proxyAuth);
            }
            
            // 设置额外请求头
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            });

            // 访问频道列表页
            const url = `https://telemetr.io/en/channels`;
            logger.info(`[StealthScraper] Scraping Telemetr channels list`);
            
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });

            // 等待页面完全加载（Next.js 动态渲染）
            logger.info('[StealthScraper] Waiting for content to load...');
            await page.waitForTimeout(10000);  // 等待 10 秒让 JS 执行
            
            // 多次滚动触发懒加载
            for (let i = 0; i < 5; i++) {
                await page.evaluate(() => {
                    window.scrollBy(0, 800);
                });
                await page.waitForTimeout(2000);
            }
            
            // 再等待内容加载
            await page.waitForTimeout(5000);

            // 使用 Puppeteer 直接提取数据（更可靠）
            const channels = await page.evaluate(() => {
                const data = [];
                
                // 尝试多种可能的选择器
                const items = document.querySelectorAll([
                    '[class*="channel"]',
                    '[class*="item"]',
                    '[class*="card"]',
                    'a[href*="/channels/"]'
                ].join(', '));
                
                items.forEach(el => {
                    // 获取链接
                    const href = el.getAttribute('href') || el.querySelector('a')?.getAttribute('href') || '';
                    if (!href.includes('/channels/')) return;
                    
                    // 提取用户名
                    const usernameMatch = href.match(/\/channels\/@?([^\/\s]+)/);
                    const username = usernameMatch ? usernameMatch[1] : '';
                    if (!username) return;
                    
                    // 获取名称（从元素文本或子元素）
                    const container = el.closest('li, [class*="item"], [class*="row"]') || el;
                    let name = '';
                    
                    // 尝试多种方式获取名称
                    const nameSelectors = ['h3', 'h2', '.title', '[class*="name"]', 'strong', 'b'];
                    for (const sel of nameSelectors) {
                        const nameEl = container.querySelector(sel);
                        if (nameEl?.textContent?.trim()) {
                            name = nameEl.textContent.trim();
                            break;
                        }
                    }
                    // 如果没有找到，使用元素本身文本
                    if (!name) {
                        name = el.textContent?.trim()?.split('\n')[0]?.substring(0, 50) || '';
                    }
                    
                    // 获取订阅数
                    const containerText = container.textContent || '';
                    const subMatch = containerText.match(/(\d[\d.,]*\s*[KkMm]?)\s*(?:subscribers?|members?|subs?)/i);
                    const subscribers = subMatch ? subMatch[1] : '';
                    
                    if (!data.find(c => c.username === username)) {
                        data.push({
                            name: name.replace(/\s+/g, ' ').trim() || username,
                            username,
                            subscribers,
                            link: href.startsWith('http') ? href : `https://telemetr.io${href}`
                        });
                    }
                });
                
                return data;
            });

            // 去重
            const seen = new Set();
            channels.forEach(ch => {
                if (ch.username && !seen.has(ch.username)) {
                    seen.add(ch.username);
                    results.push({
                        ...ch,
                        source: 'telemetr',
                        keyword: 'channels-list',
                        scrapedAt: new Date()
                    });
                }
            });

            logger.info(`[StealthScraper] Found ${results.length} channels on Telemetr`);
            
            // 截图保存用于调试
            await page.screenshot({ 
                path: '/opt/auto-growth-system/data/telemetr-screenshot.png',
                fullPage: true 
            });

        } catch (error) {
            logger.error('[StealthScraper] Error:', error.message);
        } finally {
            await browser.close();
        }

        return results;
    }

    /**
     * 模拟真人滚动行为
     */
    async humanLikeScroll(page) {
        await page.evaluate(async () => {
            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
            
            for (let i = 0; i < 3; i++) {
                window.scrollBy(0, Math.random() * 300 + 100);
                await delay(Math.random() * 1000 + 500);
            }
        });
    }

    /**
     * 解析订阅数文本
     */
    parseSubscribers(text) {
        if (!text) return 0;
        const num = text.replace(/[^0-9.km]/gi, '').toLowerCase();
        if (num.includes('k')) return parseFloat(num) * 1000;
        if (num.includes('m')) return parseFloat(num) * 1000000;
        return parseInt(num) || 0;
    }
}

module.exports = StealthScraper;
