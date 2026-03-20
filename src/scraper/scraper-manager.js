/**
 * ============================================================
 * 数据采集管理器 - 整合多平台
 * ============================================================
 * 
 * 支持平台：
 * - Telemetr.io
 * - TGStat
 * - Reddit（后续添加）
 */

const TelemetrScraper = require('./telemetr-scraper');
const TGStatScraper = require('./tgstat-scraper');
const Database = require('../utils/database');
const logger = require('../utils/logger');

class ScraperManager {
    constructor() {
        this.telemetr = new TelemetrScraper();
        this.tgstat = new TGStatScraper();
        this.db = new Database();
        
        // 关键词配置
        this.keywords = {
            english: [
                'teen patti',
                'online earning',
                'make money india',
                'lottery india',
                'rummy',
                'cash games',
                'work from home',
                'passive income'
            ],
            hindi: [
                'टीन पत्ती',
                'ऑनलाइन कमाई'
            ]
        };
    }

    async initialize() {
        logger.info('[ScraperManager] Initializing...');
        await this.db.connect();
        logger.info('[ScraperManager] Ready');
    }

    /**
     * 执行完整采集任务
     */
    async runFullCollection() {
        logger.info('[ScraperManager] Starting full collection...');
        
        const results = {
            telemetr: [],
            tgstat: [],
            total: 0,
            unique: 0,
            saved: 0
        };

        try {
            // 1. Telemetr.io 采集
            logger.info('[ScraperManager] Phase 1: Telemetr.io');
            results.telemetr = await this.collectFromTelemetr();
            
            // 2. TGStat 采集
            logger.info('[ScraperManager] Phase 2: TGStat');
            results.tgstat = await this.collectFromTGStat();
            
            // 3. 合并去重
            logger.info('[ScraperManager] Phase 3: Deduplication');
            const merged = this.mergeAndDeduplicate([
                ...results.telemetr,
                ...results.tgstat
            ]);
            results.unique = merged.length;
            
            // 4. 保存到数据库
            logger.info('[ScraperManager] Phase 4: Save to database');
            results.saved = await this.saveToDatabase(merged);
            
            results.total = results.telemetr.length + results.tgstat.length;
            
            logger.info('[ScraperManager] Collection complete:');
            logger.info(`  - Telemetr: ${results.telemetr.length}`);
            logger.info(`  - TGStat: ${results.tgstat.length}`);
            logger.info(`  - Total: ${results.total}`);
            logger.info(`  - Unique: ${results.unique}`);
            logger.info(`  - Saved: ${results.saved}`);
            
            return results;
            
        } catch (error) {
            logger.error('[ScraperManager] Collection failed:', error);
            throw error;
        }
    }

    /**
     * 从 Telemetr.io 采集
     */
    async collectFromTelemetr() {
        const channels = [];
        
        // 按关键词搜索
        for (const keyword of this.keywords.english) {
            try {
                const results = await this.telemetr.searchChannels(keyword, 'IN', 20);
                channels.push(...results);
                logger.info(`[Telemetr] "${keyword}": ${results.length} channels`);
                await this.sleep(3000);
            } catch (error) {
                logger.error(`[Telemetr] Keyword "${keyword}" failed:`, error.message);
            }
        }
        
        // 按分类浏览
        const categories = ['gaming', 'business', 'entertainment'];
        for (const cat of categories) {
            try {
                const results = await this.telemetr.browseCategory(cat, 'IN', 15);
                channels.push(...results);
                logger.info(`[Telemetr] Category "${cat}": ${results.length} channels`);
                await this.sleep(3000);
            } catch (error) {
                logger.error(`[Telemetr] Category "${cat}" failed:`, error.message);
            }
        }
        
        return channels;
    }

    /**
     * 从 TGStat 采集
     */
    async collectFromTGStat() {
        const channels = [];
        
        // 搜索频道
        for (const keyword of this.keywords.english) {
            try {
                const results = await this.tgstat.searchChannels(keyword, 'all', 20);
                channels.push(...results);
                logger.info(`[TGStat] "${keyword}": ${results.length} items`);
                await this.sleep(3000);
            } catch (error) {
                logger.error(`[TGStat] Keyword "${keyword}" failed:`, error.message);
            }
        }
        
        // 获取热门
        try {
            const trending = await this.tgstat.getTrending(20);
            channels.push(...trending);
            logger.info(`[TGStat] Trending: ${trending.length} channels`);
        } catch (error) {
            logger.error('[TGStat] Trending failed:', error.message);
        }
        
        return channels;
    }

    /**
     * 合并并去重
     */
    mergeAndDeduplicate(items) {
        const seen = new Set();
        const unique = [];
        
        for (const item of items) {
            const key = item.name.toLowerCase();
            
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(item);
            } else {
                logger.debug(`[Deduplicate] Skipping duplicate: ${item.name}`);
            }
        }
        
        return unique;
    }

    /**
     * 保存到数据库
     */
    async saveToDatabase(items) {
        let saved = 0;
        
        for (const item of items) {
            try {
                // 检查是否已存在
                const exists = await this.db.findOne('targets', { name: item.name });
                
                if (!exists) {
                    await this.db.insert('targets', item);
                    saved++;
                } else {
                    logger.debug(`[Save] Already exists: ${item.name}`);
                }
                
            } catch (error) {
                logger.error(`[Save] Failed to save ${item.name}:`, error.message);
            }
        }
        
        return saved;
    }

    /**
     * 获取统计信息
     */
    async getStats() {
        const total = await this.db.count('targets');
        const newTargets = await this.db.count('targets', { status: 'new' });
        const contacted = await this.db.count('targets', { status: 'contacted' });
        
        return {
            total,
            new: newTargets,
            contacted,
            cooperating: await this.db.count('targets', { status: 'cooperating' })
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ScraperManager;
