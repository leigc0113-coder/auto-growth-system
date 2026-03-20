/**
 * ============================================================
 * Telemetr.io 数据采集器
 * ============================================================
 * 
 * 采集内容：
 * - 频道名称、订阅数、增长率
 * - 描述、分类、地区
 * - 活跃度指标
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class TelemetrScraper {
    constructor() {
        this.baseUrl = 'https://telemetr.io';
        this.delay = 2000; // 2秒延迟，防封
    }

    /**
     * 搜索频道
     * @param {string} keyword - 搜索关键词
     * @param {string} country - 国家代码 (默认 'IN' 印度)
     * @param {number} limit - 最大采集数量
     */
    async searchChannels(keyword, country = 'IN', limit = 50) {
        logger.info(`[Telemetr] Searching: "${keyword}" in ${country}`);
        
        const channels = [];
        let page = 1;
        
        while (channels.length < limit) {
            try {
                const url = `${this.baseUrl}/en/search?query=${encodeURIComponent(keyword)}&country=${country}&page=${page}`;
                const response = await this.fetchWithRetry(url);
                const $ = cheerio.load(response.data);
                
                // 提取频道卡片
                const cards = $('.channel-card, .search-item');
                
                if (cards.length === 0) {
                    logger.info(`[Telemetr] No more results on page ${page}`);
                    break;
                }
                
                cards.each((i, elem) => {
                    const channel = this.parseChannelCard($, elem);
                    if (channel && this.isValidChannel(channel)) {
                        channels.push(channel);
                    }
                });
                
                logger.info(`[Telemetr] Page ${page}: Found ${cards.length} channels, Total: ${channels.length}`);
                
                page++;
                await this.sleep(this.delay);
                
            } catch (error) {
                logger.error(`[Telemetr] Search error on page ${page}:`, error.message);
                break;
            }
        }
        
        logger.info(`[Telemetr] Search complete: ${channels.length} channels found`);
        return channels.slice(0, limit);
    }

    /**
     * 按分类浏览
     * @param {string} category - 分类 (gaming, business, entertainment)
     * @param {string} country - 国家
     * @param {number} limit - 数量限制
     */
    async browseCategory(category, country = 'IN', limit = 30) {
        logger.info(`[Telemetr] Browsing category: ${category} in ${country}`);
        
        const categoryMap = {
            'gaming': 'games',
            'business': 'business',
            'entertainment': 'entertainment',
            'earning': 'economy'
        };
        
        const catCode = categoryMap[category] || category;
        const url = `${this.baseUrl}/en/category/${catCode}?country=${country}`;
        
        try {
            const response = await this.fetchWithRetry(url);
            const $ = cheerio.load(response.data);
            
            const channels = [];
            $('.channel-card').each((i, elem) => {
                const channel = this.parseChannelCard($, elem);
                if (channel && this.isValidChannel(channel)) {
                    channels.push(channel);
                }
            });
            
            logger.info(`[Telemetr] Category ${category}: ${channels.length} channels`);
            return channels.slice(0, limit);
            
        } catch (error) {
            logger.error(`[Telemetr] Category browse error:`, error.message);
            return [];
        }
    }

    /**
     * 解析频道卡片
     */
    parseChannelCard($, elem) {
        try {
            const $card = $(elem);
            
            // 频道名称
            const nameElem = $card.find('.channel-name, .title, h3').first();
            const name = nameElem.text().trim();
            
            // 订阅数
            const subsElem = $card.find('.subscribers, .member-count, .stats');
            const subscribersText = subsElem.text();
            const subscribers = this.parseNumber(subsText);
            
            // 描述
            const descElem = $card.find('.description, .desc, p');
            const description = descElem.text().trim().substring(0, 200);
            
            // 增长率
            const growthElem = $card.find('.growth, .trend');
            const growth = growthElem.text().trim();
            
            // 链接
            const linkElem = $card.find('a');
            const href = linkElem.attr('href') || '';
            const username = href.match(/@([\w_]+)/)?.[1] || name;
            
            return {
                platform: 'telemetr',
                name: username.startsWith('@') ? username : `@${username}`,
                subscribers,
                description,
                growth,
                category: this.detectCategory(description),
                country: 'IN',
                source: 'telemetr.io',
                scrapedAt: new Date().toISOString(),
                contact: null, // 需要单独获取
                status: 'new'
            };
            
        } catch (error) {
            logger.error('[Telemetr] Parse card error:', error.message);
            return null;
        }
    }

    /**
     * 验证频道是否符合要求
     */
    isValidChannel(channel) {
        // 订阅数范围：1,000 - 50,000
        if (channel.subscribers < 1000 || channel.subscribers > 50000) {
            return false;
        }
        
        // 必须有描述
        if (!channel.description || channel.description.length < 10) {
            return false;
        }
        
        return true;
    }

    /**
     * 检测分类
     */
    detectCategory(description) {
        const desc = description.toLowerCase();
        
        if (desc.match(/game|gaming|play|teen.*patti|rummy/)) {
            return 'gaming';
        }
        if (desc.match(/money|earn|income|cash|profit/)) {
            return 'earning';
        }
        if (desc.match(/business|crypto|invest/)) {
            return 'business';
        }
        
        return 'entertainment';
    }

    /**
     * 解析数字（处理 K/M 后缀）
     */
    parseNumber(text) {
        if (!text) return 0;
        
        const clean = text.replace(/,/g, '').toLowerCase();
        
        if (clean.includes('k')) {
            return parseFloat(clean) * 1000;
        }
        if (clean.includes('m')) {
            return parseFloat(clean) * 1000000;
        }
        
        return parseInt(clean) || 0;
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
                logger.warn(`[Telemetr] Retry ${i + 1}/${retries} for ${url}`);
                await this.sleep(3000);
            }
        }
    }

    /**
     * 延迟
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = TelemetrScraper;
