/**
 * ============================================================
 * 多账号管理器 - Multi-Account Manager
 * ============================================================
 * 
 * 功能：
 * - 管理多个 MTProto 账号
 * - 按功能分配账号（私信/加群/评论/邀请）
 * - 账号轮换防封
 * - 账号健康监控
 */

const MTProtoClient = require('./mtproto-client');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class MultiAccountManager {
    constructor() {
        this.accounts = new Map();
        this.accountConfigs = [];
        this.loadAccountConfigs();
    }

    /**
     * 加载账号配置
     */
    loadAccountConfigs() {
        // 从环境变量加载多账号配置
        // 格式: ACCOUNT_1=+919799524106,session1,DIRECT_MESSAGE
        //       ACCOUNT_2=+919638457883,session2,GROUP_JOIN
        
        const accountList = [];
        
        // 主账号
        if (process.env.PHONE_NUMBER) {
            accountList.push({
                name: 'account_1',
                phone: process.env.PHONE_NUMBER,
                sessionFile: 'mtproto-session-1.txt',
                role: 'all', // 默认全功能
                priority: 1
            });
        }
        
        // 第二账号
        if (process.env.PHONE_NUMBER_2) {
            accountList.push({
                name: 'account_2',
                phone: process.env.PHONE_NUMBER_2,
                sessionFile: 'mtproto-session-2.txt',
                role: process.env.ACCOUNT_2_ROLE || 'all',
                priority: 2
            });
        }
        
        // 更多账号...
        for (let i = 3; i <= 10; i++) {
            const phone = process.env[`PHONE_NUMBER_${i}`];
            if (phone) {
                accountList.push({
                    name: `account_${i}`,
                    phone: phone,
                    sessionFile: `mtproto-session-${i}.txt`,
                    role: process.env[`ACCOUNT_${i}_ROLE`] || 'all',
                    priority: i
                });
            }
        }
        
        this.accountConfigs = accountList;
        logger.info(`[MultiAccount] Loaded ${accountList.length} account configs`);
    }

    /**
     * 初始化所有账号
     */
    async initializeAll() {
        logger.info('[MultiAccount] Initializing all accounts...');
        
        for (const config of this.accountConfigs) {
            await this.initializeAccount(config);
        }
        
        logger.info(`[MultiAccount] ${this.accounts.size} accounts ready`);
    }

    /**
     * 初始化单个账号
     */
    async initializeAccount(config) {
        try {
            const sessionFile = path.join(__dirname, '..', '..', 'data', config.sessionFile);
            let sessionString = '';
            
            if (fs.existsSync(sessionFile)) {
                sessionString = fs.readFileSync(sessionFile, 'utf8').trim();
                logger.info(`[MultiAccount] Loaded session for ${config.name}`);
            } else {
                logger.warn(`[MultiAccount] No session file for ${config.name}, will need login`);
            }
            
            // 设置环境变量临时覆盖
            const originalPhone = process.env.PHONE_NUMBER;
            process.env.PHONE_NUMBER = config.phone;
            
            const client = new MTProtoClient(sessionString, config.name);
            
            // 恢复环境变量
            process.env.PHONE_NUMBER = originalPhone;
            
            // 连接
            const result = await client.connect();
            
            if (result.success) {
                // 保存新的 session
                if (result.sessionString) {
                    fs.writeFileSync(sessionFile, result.sessionString);
                }
                
                this.accounts.set(config.name, {
                    client,
                    config,
                    user: result.user,
                    stats: {
                        messagesSent: 0,
                        groupsJoined: 0,
                        invitesSent: 0,
                        lastAction: null
                    },
                    status: 'active'
                });
                
                logger.info(`[MultiAccount] ${config.name} (@${result.user.username}) ready`);
            } else {
                logger.error(`[MultiAccount] Failed to init ${config.name}:`, result.error);
            }
            
        } catch (error) {
            logger.error(`[MultiAccount] Error initializing ${config.name}:`, error.message);
        }
    }

    /**
     * 按功能获取可用账号
     */
    getAccountForFunction(functionType) {
        // 功能到角色的映射
        const functionToRole = {
            'directMessage': ['DIRECT_MESSAGE', 'all'],
            'joinGroup': ['GROUP_JOIN', 'all'],
            'groupMessage': ['GROUP_MESSAGE', 'all'],
            'inviteToChannel': ['INVITE', 'all'],
            'getAdmins': ['all'],
            'searchMessages': ['all']
        };
        
        const allowedRoles = functionToRole[functionType] || ['all'];
        
        // 找到符合角色的账号
        const candidates = [];
        for (const [name, account] of this.accounts) {
            if (allowedRoles.includes(account.config.role) && account.status === 'active') {
                // 检查冷却期
                if (this.isAccountReady(account, functionType)) {
                    candidates.push(account);
                }
            }
        }
        
        if (candidates.length === 0) {
            logger.warn(`[MultiAccount] No available account for ${functionType}`);
            return null;
        }
        
        // 选择使用次数最少的账号（负载均衡）
        const selected = candidates.sort((a, b) => {
            const aCount = this.getActionCount(a, functionType);
            const bCount = this.getActionCount(b, functionType);
            return aCount - bCount;
        })[0];
        
        logger.info(`[MultiAccount] Selected ${selected.config.name} for ${functionType}`);
        return selected.client;
    }

    /**
     * 检查账号是否就绪（冷却期检查）
     */
    isAccountReady(account, functionType) {
        const now = Date.now();
        const lastAction = account.stats.lastAction;
        
        if (!lastAction) return true;
        
        // 不同功能的最小间隔（毫秒）
        const cooldowns = {
            'directMessage': 60000,    // 私信间隔 1 分钟
            'joinGroup': 300000,       // 加群间隔 5 分钟
            'groupMessage': 120000,    // 发言间隔 2 分钟
            'inviteToChannel': 180000  // 邀请间隔 3 分钟
        };
        
        const cooldown = cooldowns[functionType] || 60000;
        return (now - lastAction) > cooldown;
    }

    /**
     * 获取账号某功能的使用次数
     */
    getActionCount(account, functionType) {
        const counts = {
            'directMessage': account.stats.messagesSent,
            'joinGroup': account.stats.groupsJoined,
            'groupMessage': account.stats.messagesSent,
            'inviteToChannel': account.stats.invitesSent
        };
        return counts[functionType] || 0;
    }

    /**
     * 更新账号统计
     */
    updateAccountStats(accountName, actionType) {
        const account = this.accounts.get(accountName);
        if (!account) return;
        
        account.stats.lastAction = Date.now();
        
        switch (actionType) {
            case 'directMessage':
            case 'groupMessage':
                account.stats.messagesSent++;
                break;
            case 'joinGroup':
                account.stats.groupsJoined++;
                break;
            case 'inviteToChannel':
                account.stats.invitesSent++;
                break;
        }
        
        logger.info(`[MultiAccount] ${accountName} stats updated: ${actionType}`);
    }

    /**
     * 暂停账号（被封或异常）
     */
    suspendAccount(accountName, reason) {
        const account = this.accounts.get(accountName);
        if (account) {
            account.status = 'suspended';
            account.suspendedReason = reason;
            account.suspendedAt = new Date();
            logger.warn(`[MultiAccount] ${accountName} suspended: ${reason}`);
        }
    }

    /**
     * 恢复账号
     */
    resumeAccount(accountName) {
        const account = this.accounts.get(accountName);
        if (account) {
            account.status = 'active';
            account.suspendedReason = null;
            account.suspendedAt = null;
            logger.info(`[MultiAccount] ${accountName} resumed`);
        }
    }

    /**
     * 获取所有账号状态
     */
    getAllStatus() {
        const status = [];
        for (const [name, account] of this.accounts) {
            status.push({
                name,
                phone: account.config.phone,
                role: account.config.role,
                username: account.user?.username,
                status: account.status,
                stats: account.stats
            });
        }
        return status;
    }

    /**
     * 分配任务到账号
     * 根据功能自动选择最合适的账号
     */
    async executeWithBestAccount(functionType, ...args) {
        const client = this.getAccountForFunction(functionType);
        
        if (!client) {
            return { success: false, error: 'No available account' };
        }
        
        // 找到对应的账号名
        let accountName = null;
        for (const [name, acc] of this.accounts) {
            if (acc.client === client) {
                accountName = name;
                break;
            }
        }
        
        try {
            let result;
            
            switch (functionType) {
                case 'directMessage':
                    result = await client.sendDirectMessage(...args);
                    break;
                case 'joinGroup':
                    result = await client.joinGroup(...args);
                    break;
                case 'groupMessage':
                    result = await client.sendGroupMessage(...args);
                    break;
                case 'inviteToChannel':
                    result = await client.inviteToChannel(...args);
                    break;
                case 'getAdmins':
                    result = await client.getChannelAdmins(...args);
                    break;
                case 'searchMessages':
                    result = await client.searchMessages(...args);
                    break;
                default:
                    return { success: false, error: 'Unknown function type' };
            }
            
            // 更新统计
            if (result.success && accountName) {
                this.updateAccountStats(accountName, functionType);
            }
            
            return result;
            
        } catch (error) {
            logger.error(`[MultiAccount] Execute error:`, error.message);
            
            // 如果是严重错误，暂停账号
            if (error.message.includes('FLOOD_WAIT') || 
                error.message.includes('USER_DEACTIVATED')) {
                if (accountName) {
                    this.suspendAccount(accountName, error.message);
                }
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * 断开所有账号
     */
    async disconnectAll() {
        logger.info('[MultiAccount] Disconnecting all accounts...');
        
        for (const [name, account] of this.accounts) {
            try {
                await account.client.disconnect();
                logger.info(`[MultiAccount] ${name} disconnected`);
            } catch (error) {
                logger.error(`[MultiAccount] Error disconnecting ${name}:`, error.message);
            }
        }
        
        this.accounts.clear();
    }
}

module.exports = MultiAccountManager;
