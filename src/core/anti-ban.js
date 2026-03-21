/**
 * ============================================================
 * 反封策略模块 - Anti-Ban Strategy
 * ============================================================
 * 
 * 功能：
 * - 智能限速控制
 * - 冷却期管理
 * - 异常检测与自动暂停
 * - 账号健康度监控
 */

const logger = require('../utils/logger');

class AntiBanStrategy {
    constructor() {
        // 限速配置
        this.rateLimits = {
            directMessage: {
                perHour: 10,      // 每小时最多10条
                perDay: 50,       // 每天最多50条
                cooldownMinutes: 5 // 发送间隔至少5分钟
            },
            groupJoin: {
                perHour: 3,
                perDay: 10,
                cooldownMinutes: 20
            },
            comment: {
                perHour: 5,
                perDay: 30,
                cooldownMinutes: 10
            }
        };
        
        // 账号健康度
        this.accountHealth = new Map();
        
        // 发送记录（内存，实际应持久化到数据库）
        this.sendHistory = [];
        
        // 自动暂停阈值
        this.thresholds = {
            errorRate: 0.3,        // 错误率超过30%暂停
            consecutiveErrors: 5,  // 连续5次错误暂停
            hourlyLimit: 15        // 每小时超过15次任何操作暂停
        };
    }

    /**
     * 检查是否可以发送
     */
    async canSend(type, accountName) {
        const limits = this.rateLimits[type];
        if (!limits) return { allowed: true };
        
        const now = new Date();
        const hourAgo = new Date(now - 60 * 60 * 1000);
        const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
        
        // 统计近期发送
        const recentSends = this.sendHistory.filter(h => 
            h.type === type && 
            h.account === accountName &&
            h.timestamp > hourAgo
        );
        
        const dailySends = this.sendHistory.filter(h =>
            h.type === type &&
            h.account === accountName &&
            h.timestamp > dayAgo
        );
        
        // 检查每小时限制
        if (recentSends.length >= limits.perHour) {
            const oldestInHour = recentSends[0]?.timestamp;
            const waitMinutes = Math.ceil((oldestInHour - hourAgo) / 60000);
            
            return {
                allowed: false,
                reason: `hourly_limit_exceeded`,
                message: `已达每小时限制 (${limits.perHour})，请等待 ${waitMinutes} 分钟`,
                retryAfter: waitMinutes * 60
            };
        }
        
        // 检查每日限制
        if (dailySends.length >= limits.perDay) {
            return {
                allowed: false,
                reason: `daily_limit_exceeded`,
                message: `已达每日限制 (${limits.perDay})，请明天再试`,
                retryAfter: (24 - now.getHours()) * 3600
            };
        }
        
        // 检查冷却期
        const lastSend = recentSends[recentSends.length - 1];
        if (lastSend) {
            const minutesSinceLastSend = (now - lastSend.timestamp) / 60000;
            if (minutesSinceLastSend < limits.cooldownMinutes) {
                const waitMinutes = Math.ceil(limits.cooldownMinutes - minutesSinceLastSend);
                
                return {
                    allowed: false,
                    reason: `cooldown_period`,
                    message: `冷却期中，请等待 ${waitMinutes} 分钟`,
                    retryAfter: waitMinutes * 60
                };
            }
        }
        
        // 检查账号健康度
        const health = this.getAccountHealth(accountName);
        if (health.status === 'suspended') {
            return {
                allowed: false,
                reason: `account_suspended`,
                message: `账号 ${accountName} 已暂停，请检查状态`,
                retryAfter: null
            };
        }
        
        // 检查总体错误率
        const recentErrors = recentSends.filter(h => h.status === 'error').length;
        const errorRate = recentSends.length > 0 ? recentErrors / recentSends.length : 0;
        
        if (errorRate > this.thresholds.errorRate) {
            this.suspendAccount(accountName, '错误率过高');
            
            return {
                allowed: false,
                reason: `high_error_rate`,
                message: `错误率过高 (${(errorRate * 100).toFixed(1)}%)，账号已自动暂停`,
                retryAfter: 3600  // 1小时后重试
            };
        }
        
        return { allowed: true };
    }

    /**
     * 记录发送
     */
    recordSend(type, accountName, target, status, error = null) {
        const record = {
            type,
            account: accountName,
            target,
            status,
            error,
            timestamp: new Date()
        };
        
        this.sendHistory.push(record);
        
        // 只保留最近1000条记录
        if (this.sendHistory.length > 1000) {
            this.sendHistory = this.sendHistory.slice(-1000);
        }
        
        // 更新账号健康度
        this.updateAccountHealth(accountName, status);
        
        logger.info(`[AntiBan] Recorded ${type} to ${target}: ${status}`);
    }

    /**
     * 更新账号健康度
     */
    updateAccountHealth(accountName, status) {
        if (!this.accountHealth.has(accountName)) {
            this.accountHealth.set(accountName, {
                name: accountName,
                totalSends: 0,
                successfulSends: 0,
                failedSends: 0,
                consecutiveErrors: 0,
                status: 'active',
                suspendedUntil: null,
                lastError: null
            });
        }
        
        const health = this.accountHealth.get(accountName);
        health.totalSends++;
        
        if (status === 'success') {
            health.successfulSends++;
            health.consecutiveErrors = 0;
        } else {
            health.failedSends++;
            health.consecutiveErrors++;
            health.lastError = new Date();
            
            // 检查连续错误
            if (health.consecutiveErrors >= this.thresholds.consecutiveErrors) {
                this.suspendAccount(accountName, `连续 ${health.consecutiveErrors} 次失败`);
            }
        }
    }

    /**
     * 暂停账号
     */
    suspendAccount(accountName, reason) {
        const health = this.accountHealth.get(accountName);
        if (health) {
            health.status = 'suspended';
            health.suspendedUntil = new Date(Date.now() + 3600000); // 暂停1小时
            health.suspensionReason = reason;
            
            logger.warn(`[AntiBan] Account ${accountName} suspended: ${reason}`);
        }
    }

    /**
     * 恢复账号
     */
    resumeAccount(accountName) {
        const health = this.accountHealth.get(accountName);
        if (health && health.status === 'suspended') {
            health.status = 'active';
            health.consecutiveErrors = 0;
            health.suspendedUntil = null;
            health.suspensionReason = null;
            
            logger.info(`[AntiBan] Account ${accountName} resumed`);
        }
    }

    /**
     * 获取账号健康度
     */
    getAccountHealth(accountName) {
        return this.accountHealth.get(accountName) || {
            name: accountName,
            status: 'active',
            totalSends: 0,
            successfulSends: 0,
            failedSends: 0
        };
    }

    /**
     * 获取所有账号健康报告
     */
    getHealthReport() {
        const report = [];
        
        for (const [name, health] of this.accountHealth) {
            const successRate = health.totalSends > 0 
                ? (health.successfulSends / health.totalSends * 100).toFixed(1)
                : 100;
            
            report.push({
                name,
                status: health.status,
                successRate: `${successRate}%`,
                totalSends: health.totalSends,
                suspendedUntil: health.suspendedUntil,
                reason: health.suspensionReason
            });
        }
        
        return report;
    }

    /**
     * 智能延迟计算
     */
    calculateDelay(baseDelay = 30000) {
        // 基础延迟 + 随机抖动 + 根据成功率调整
        const jitter = Math.random() * 30000; // 0-30秒随机
        
        // 如果近期错误率高，增加延迟
        const recentErrors = this.sendHistory
            .slice(-10)
            .filter(h => h.status === 'error').length;
        
        const errorMultiplier = recentErrors > 3 ? 2 : 1;
        
        return (baseDelay + jitter) * errorMultiplier;
    }

    /**
     * 检查是否需要长时间冷却
     */
    async needExtendedCooldown(accountName) {
        const sendsInLast10 = this.sendHistory
            .filter(h => 
                h.account === accountName &&
                h.timestamp > new Date(Date.now() - 10 * 60000)
            ).length;
        
        // 10分钟内发送超过15条，需要长时间冷却
        if (sendsInLast10 > 15) {
            return {
                needed: true,
                duration: 3600000, // 冷却1小时
                reason: '发送频率过高'
            };
        }
        
        return { needed: false };
    }

    /**
     * 清理过期记录
     */
    cleanup() {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // 保留24小时内的记录
        this.sendHistory = this.sendHistory.filter(h => h.timestamp > dayAgo);
        
        // 检查并恢复暂停的账号
        for (const [name, health] of this.accountHealth) {
            if (health.status === 'suspended' && health.suspendedUntil <= new Date()) {
                this.resumeAccount(name);
            }
        }
        
        logger.info('[AntiBan] Cleanup completed');
    }
}

module.exports = AntiBanStrategy;
