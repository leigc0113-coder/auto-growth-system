/**
 * ============================================================
 * 用户标签系统 - User Tagging System
 * ============================================================
 * 
 * 功能：
 * - 自动标签分类
 * - 用户分层管理
 * - 优先级评分
 * - 智能筛选
 */

const Database = require('../utils/database');
const logger = require('../utils/logger');

class UserTaggingSystem {
    constructor() {
        this.db = new Database();
        
        // 标签规则
        this.tagRules = {
            // 按订阅数分级
            tier: [
                { name: 'mega', condition: (sub) => sub >= 100000, score: 100 },
                { name: 'large', condition: (sub) => sub >= 10000, score: 80 },
                { name: 'medium', condition: (sub) => sub >= 1000, score: 60 },
                { name: 'small', condition: (sub) => sub >= 100, score: 40 },
                { name: 'micro', condition: () => true, score: 20 }
            ],
            
            // 按主题分类
            category: [
                { keywords: ['teen patti', 'poker', 'card', 'casino'], tag: 'gaming' },
                { keywords: ['earn', 'money', 'cash', 'income'], tag: 'money' },
                { keywords: ['crypto', 'bitcoin', 'trading'], tag: 'crypto' },
                { keywords: ['india', 'hindi', 'desi'], tag: 'indian' },
                { keywords: ['lottery', 'lucky', 'win'], tag: 'lottery' }
            ],
            
            // 质量评分
            quality: [
                { check: (data) => data.verified, score: 50, tag: 'verified' },
                { check: (data) => data.active, score: 30, tag: 'active' },
                { check: (data) => data.premium, score: 40, tag: 'premium' }
            ]
        };
    }

    /**
     * 初始化
     */
    async initialize() {
        await this.db.connect();
        logger.info('[UserTagging] Initialized');
    }

    /**
     * 为目标添加标签
     */
    async tagTarget(targetId, targetData) {
        try {
            const tags = [];
            let priorityScore = 0;
            
            // 1. 分级标签
            const subscribers = this.parseSubscribers(targetData.subscribers);
            for (const rule of this.tagRules.tier) {
                if (rule.condition(subscribers)) {
                    tags.push({
                        type: 'tier',
                        value: rule.name,
                        score: rule.score
                    });
                    priorityScore += rule.score;
                    break;
                }
            }
            
            // 2. 主题标签
            const text = `${targetData.name} ${targetData.description || ''} ${targetData.keyword || ''}`.toLowerCase();
            
            for (const rule of this.tagRules.category) {
                if (rule.keywords.some(kw => text.includes(kw))) {
                    tags.push({
                        type: 'category',
                        value: rule.tag,
                        score: 25
                    });
                    priorityScore += 25;
                }
            }
            
            // 3. 质量标签
            for (const rule of this.tagRules.quality) {
                if (rule.check(targetData)) {
                    tags.push({
                        type: 'quality',
                        value: rule.tag,
                        score: rule.score
                    });
                    priorityScore += rule.score;
                }
            }
            
            // 4. 来源标签
            tags.push({
                type: 'source',
                value: targetData.source || 'unknown',
                score: 10
            });
            
            // 5. 去重并计算最终评分
            const uniqueTags = this.deduplicateTags(tags);
            priorityScore = Math.min(100, priorityScore); // 最高100分
            
            // 更新数据库
            await this.db.update('targets',
                { _id: targetId },
                {
                    tags: uniqueTags,
                    priorityScore,
                    taggedAt: new Date()
                }
            );
            
            logger.info(`[UserTagging] Tagged ${targetData.username || targetId}: ${uniqueTags.map(t => t.value).join(', ')} (Score: ${priorityScore})`);
            
            return {
                targetId,
                tags: uniqueTags,
                priorityScore
            };
            
        } catch (error) {
            logger.error('[UserTagging] Tag error:', error.message);
            return null;
        }
    }

    /**
     * 批量标签
     */
    async batchTag(limit = 100) {
        try {
            // 获取未标签的目标
            const untagged = await this.db.findAll('targets', {
                $or: [
                    { tags: { $exists: false } },
                    { tags: { $size: 0 } }
                ]
            }, limit);
            
            logger.info(`[UserTagging] Batch tagging ${untagged.length} targets...`);
            
            const results = [];
            for (const target of untagged) {
                const result = await this.tagTarget(target._id, target);
                if (result) {
                    results.push(result);
                }
                
                // 小间隔避免阻塞
                await new Promise(r => setTimeout(r, 100));
            }
            
            logger.info(`[UserTagging] Batch tagging completed: ${results.length} tagged`);
            
            return {
                processed: results.length,
                avgScore: results.length > 0
                    ? (results.reduce((sum, r) => sum + r.priorityScore, 0) / results.length).toFixed(1)
                    : 0
            };
            
        } catch (error) {
            logger.error('[UserTagging] Batch tag error:', error.message);
            return { processed: 0, avgScore: 0 };
        }
    }

    /**
     * 根据标签筛选目标
     */
    async filterByTags(criteria) {
        try {
            const query = {};
            
            // 必须包含的标签
            if (criteria.includeTags?.length > 0) {
                query['tags.value'] = { $in: criteria.includeTags };
            }
            
            // 排除的标签
            if (criteria.excludeTags?.length > 0) {
                query['tags.value'] = { 
                    ...query['tags.value'],
                    $nin: criteria.excludeTags 
                };
            }
            
            // 最低评分
            if (criteria.minScore) {
                query.priorityScore = { $gte: criteria.minScore };
            }
            
            // 特定标签类型
            if (criteria.tagType) {
                query['tags.type'] = criteria.tagType;
            }
            
            // 排序方式
            const sort = {};
            if (criteria.sortBy === 'score') {
                sort.priorityScore = -1;
            } else if (criteria.sortBy === 'newest') {
                sort.taggedAt = -1;
            }
            
            const targets = await this.db.findAll('targets', query, criteria.limit || 50);
            
            // 按评分排序
            if (criteria.sortBy === 'score') {
                targets.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
            }
            
            return targets;
            
        } catch (error) {
            logger.error('[UserTagging] Filter error:', error.message);
            return [];
        }
    }

    /**
     * 获取优先级队列
     */
    async getPriorityQueue(limit = 20) {
        return await this.filterByTags({
            minScore: 50,
            sortBy: 'score',
            limit
        });
    }

    /**
     * 获取标签统计
     */
    async getTagStats() {
        try {
            const allTargets = await this.db.findAll('targets', { tags: { $exists: true } });
            
            const stats = {
                total: allTargets.length,
                byTier: {},
                byCategory: {},
                bySource: {},
                scoreDistribution: {
                    high: 0,    // 80-100
                    medium: 0,  // 50-79
                    low: 0      // 0-49
                }
            };
            
            for (const target of allTargets) {
                // 评分分布
                const score = target.priorityScore || 0;
                if (score >= 80) stats.scoreDistribution.high++;
                else if (score >= 50) stats.scoreDistribution.medium++;
                else stats.scoreDistribution.low++;
                
                // 标签统计
                for (const tag of (target.tags || [])) {
                    if (tag.type === 'tier') {
                        stats.byTier[tag.value] = (stats.byTier[tag.value] || 0) + 1;
                    } else if (tag.type === 'category') {
                        stats.byCategory[tag.value] = (stats.byCategory[tag.value] || 0) + 1;
                    } else if (tag.type === 'source') {
                        stats.bySource[tag.value] = (stats.bySource[tag.value] || 0) + 1;
                    }
                }
            }
            
            return stats;
            
        } catch (error) {
            logger.error('[UserTagging] Stats error:', error.message);
            return null;
        }
    }

    /**
     * 去重标签
     */
    deduplicateTags(tags) {
        const seen = new Map();
        
        for (const tag of tags) {
            const key = `${tag.type}:${tag.value}`;
            if (!seen.has(key) || seen.get(key).score < tag.score) {
                seen.set(key, tag);
            }
        }
        
        return Array.from(seen.values());
    }

    /**
     * 解析订阅数
     */
    parseSubscribers(text) {
        if (!text) return 0;
        
        const match = text.toString().toLowerCase().match(/([\d.]+)\s*([km]?)/);
        if (!match) return 0;
        
        const num = parseFloat(match[1]);
        const unit = match[2];
        
        if (unit === 'k') return num * 1000;
        if (unit === 'm') return num * 1000000;
        return num;
    }

    /**
     * 推荐下一个目标
     */
    async recommendNext(count = 5) {
        const highPriority = await this.getPriorityQueue(count);
        
        // 排除最近已联系的
        const recentContacts = await this.db.findAll('outreach_logs', {}, 50);
        const recentUsernames = new Set(recentContacts.map(c => c.target));
        
        return highPriority.filter(t => !recentUsernames.has(t.username)).slice(0, count);
    }

    /**
     * 关闭连接
     */
    async close() {
        await this.db.disconnect();
    }
}

module.exports = UserTaggingSystem;
