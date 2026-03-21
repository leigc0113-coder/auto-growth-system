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

            // 模拟真人行为：随机滚动
            await this.humanLikeScroll(page);

            // 等待内容加载
            await page.waitForTimeout(5000);

            // 提取数据
            const html = await page.content();
            const $ = cheerio.load(html);

            // 尝试多种选择器
            const selectors = [
                '.channel-card',
                '.channel-item',
                '.list-item',
                '.channel-row',
                'a[href*="/channels/"]'
            ];

            let results = [];
            for (const selector of selectors) {
                $(selector).each((i, el) => {
                    const name = $(el).find('.channel-name, h3, .title, .name').first().text().trim();
                    const username = $(el).find('.channel-username, .username, .handle').first().text().trim();
                    const subscribers = $(el).find('.subscribers-count, .stats, .members').first().text().trim();
                    const link = $(el).attr('href') || $(el).find('a').first().attr('href');

                    if (name || username) {
                        results.push({
                            name,
                            username: username?.replace('@', '') || '',
                            subscribers: this.parseSubscribers(subscribers),
                            link: link ? (link.startsWith('http') ? link : `https://telemetr.io${link}`) : '',
                            source: 'telemetr',
                            keyword: 'channels-list',
                            scrapedAt: new Date()
                        });
                    }
                });
                
                if (results.length > 0) break;
            }

            logger.info(`[StealthScraper] Found ${results.length} channels on Telemetr`);

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
