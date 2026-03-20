/**
 * ============================================================
 * TGStat 数据采集器
 * ============================================================
 * 
 * 采集内容：
 * - 频道/群组信息
 * - 订阅数、活跃度
 * - 增长趋势
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class TGStatScraper {
    constructor() {
        this.baseUrl = 'https://tgstat.com';
        this.delay = 2000;
    }

    /**
     * 搜索频道
     * @param {string} keyword - 关键词
     * @param {string} type - 类型 (channels/groups/all)
     * @param {number} limit - 最大数量
     */
    async searchChannels(keyword, type = 'all', limit = 50) {
        logger.info(`[TGStat] Searching: "${keyword}" (${type})`);
        
        const channels = [];
        let page = 1;
        
        while (channels.length < limit) {
            try {
                const url = `${this.baseUrl}/search?q=${encodeURIComponent(keyword)}&type=${type}&page=${page}`;
                const response = await this.fetchWithRetry(url);
                const $ = cheerio.load(response.data);
                
                const items = $('.search-item, .channel-item');
                
                if (items.length === 0) {
                    logger.info(`[TGStat] No more results on page ${page}`);
                    break;
                }
                
                items.each((i, elem) => {
                    const item = this.parseItem($, elem);
                    if (item && this.isValidItem(item)) {
                        channels.push(item);
                    }
                });
                
                logger.info(`[TGStat] Page ${page}: Found ${items.length}, Total: ${channels.length}`);
                
                page++;
                await this.sleep(this.delay);
                
            } catch (error) {
                logger.error(`[TGStat] Search error:`, error.message);
                break;
            }
        }
        
        return channels.slice(0, limit);
    }

    /**
     * 按语言/地区筛选
     * @param {string} language - 语言 (en, hi)
     * @param {string} category - 分类
     */
    async browseByLanguage(language = 'en', category = 'gaming', limit = 30) {
        logger.info(`[TGStat] Browsing: ${language} / ${category}`);
        
        try {
            const url = `${this.baseUrl}/language/${language}?category=${category}`;
            const response = await this.fetchWithRetry(url);
            const $ = cheerio.load(response.data);
            
            const channels = [];
            $('.channel-item').each((i, elem) => {
                const item = this.parseItem($, elem);
                if (item && this.isValidItem(item)) {
                    channels.push(item);
                }
            });
            
            return channels.slice(0, limit);
            
        } catch (error) {
            logger.error(`[TGStat] Browse error:`, error.message);
            return [];
        }
    }

    /**
     * 获取热门频道
     */
    async getTrending(limit = 20) {
        logger.info(`[TGStat] Getting trending channels`);
        
        try {
            const url = `${this.baseUrl}/trending`;
            const response = await this.fetchWithRetry(url);
            const $ = cheerio.load(response.data);
            
            const channels = [];
            $('.trending-item, .channel-item').each((i, elem) => {
                const item = this.parseItem($, elem);
                if (item && this.isValidItem(item)) {
                    channels.push(item);
                }
            });
            
            return channels.slice(0, limit);
            
        } catch (error) {
            logger.error(`[TGStat] Trending error:`, error.message);
            return [];
        }
    }

    /**
     * 解析列表项
     */
    parseItem($, elem) {
        try {
            const $item = $(elem);
            
            // 名称和链接
            const linkElem = $item.find('a[href^="/@"], a[href^="/channel/"]').first();
            const href = linkElem.attr('href') || '';
            const name = href.match(/@([\w_]+)/)?.[1] || linkElem.text().trim();
            
            // 订阅数
            const subsElem = $item.find('.subscribers-count, .members-count, .stat-value');
            const subscribers = this.parseNumber(subsElem.text());
            
            // 描述
            const descElem = $item.find('.description, .about, p');
            const description = descElem.text().trim().substring(0, 200);
            
            // 活跃度
            const activityElem = $item.find('.activity, .activity-score');
            const activity = activityElem.text().trim();
            
            // 类型判断
            const isGroup = href.includes('/group/') || description.toLowerCase().includes('group');
            
            return {
                platform: 'tgstat',
                name: name.startsWith('@') ? name : `@${name}`,
                type: isGroup ? 'group' : 'channel',
                subscribers,
                description,
                activity,
                category: this.detectCategory(description),
                country: 'IN',
                source: 'tgstat.com',
                scrapedAt: new Date().toISOString(),
                contact: null,
                status: 'new'
            };
            
        } catch (error) {
            logger.error('[TGStat] Parse error:', error.message);
            return null;
        }
    }

    /**
     * 验证
     */
    isValidItem(item) {
        if (item.subscribers < 1000 || item.subscribers > 50000) {
            return false;
        }
        if (!item.description || item.description.length < 10) {
            return false;
        }
        return true;
    }

    /**
     * 检测分类
     */
    detectCategory(description) {
        const desc = description.toLowerCase();
        
        if (desc.match(/game|gaming|teen.*patti|rummy|casino/)) {
            return 'gaming';
        }
        if (desc.match(/earn|money|cash|profit|income/)) {
            return 'earning';
        }
        if (desc.match(/crypto|trading|invest/)) {
            return 'business';
        }
        
        return 'entertainment';
    }

    /**
     * 解析数字
     */
    parseNumber(text) {
        if (!text) return 0;
        
        const clean = text.replace(/,/g, '').toLowerCase();
        
        if (clean.includes('k')) return parseFloat(clean) * 1000;
        if (clean.includes('m')) return parseFloat(clean) * 1000000;
        
        return parseInt(clean.match(/\d+/)?.[0]) || 0;
    }

    /**
     * 带重试的请求
     */
    async fetchWithRetry(url, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                return await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 10000
                });
            } catch (error) {
                if (i === retries - 1) throw error;
                await this.sleep(3000);
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = TGStatScraper;
