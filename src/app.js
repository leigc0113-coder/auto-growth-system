/**
 * ============================================================
 * Auto Growth System - 主程序入口
 * ============================================================
 * 
 * 启动命令：
 * - node src/app.js              # 启动完整系统
 * - node src/app.js --daemon     # 守护模式
 * - node src/app.js --test       # 测试模式
 */

require('dotenv').config();

const TaskScheduler = require('./scheduler/task-scheduler');
const AutoResponder = require('./ai/auto-responder');
const UserTaggingSystem = require('./core/user-tagging');
const AntiBanStrategy = require('./core/anti-ban');
const AnalyticsEngine = require('./analytics/analytics-engine');
const logger = require('./utils/logger');

class AutoGrowthSystem {
    constructor() {
        this.scheduler = new TaskScheduler();
        this.responder = new AutoResponder();
        this.tagging = new UserTaggingSystem();
        this.antiBan = new AntiBanStrategy();
        this.analytics = new AnalyticsEngine();
        
        this.isRunning = false;
        this.startTime = null;
    }

    /**
     * 初始化所有组件
     */
    async initialize() {
        try {
            logger.info('[AutoGrowthSystem] Initializing...');
            
            await this.scheduler.initialize();
            await this.tagging.initialize();
            await this.analytics.initialize();
            
            // 清理反封策略记录
            this.antiBan.cleanup();
            
            logger.info('[AutoGrowthSystem] All components initialized');
            
        } catch (error) {
            logger.error('[AutoGrowthSystem] Initialization error:', error.message);
            throw error;
        }
    }

    /**
     * 启动完整系统
     */
    async start() {
        try {
            await this.initialize();
            
            this.startTime = new Date();
            this.isRunning = true;
            
            // 1. 启动定时任务
            this.scheduler.startAll();
            
            // 2. 启动自动回复（可选）
            // await this.responder.startPolling();
            
            // 3. 启动反封策略定时清理
            this.startAntiBanCleanup();
            
            // 4. 发送启动通知
            await this.scheduler.notifyAdmin(
                `🚀 Auto Growth System 已启动\n\n` +
                `⏰ 定时任务已激活:\n` +
                `• 每日 02:00 - 自动采集\n` +
                `• 每日 10:00 - 推广任务\n` +
                `• 每日 18:00 - 数据报告\n\n` +
                `系统版本: 1.0.0\n` +
                `启动时间: ${this.startTime.toLocaleString('en-IN')}`
            );
            
            logger.info('[AutoGrowthSystem] System started successfully');
            
            // 保持运行
            this.keepAlive();
            
        } catch (error) {
            logger.error('[AutoGrowthSystem] Start error:', error.message);
            await this.shutdown();
        }
    }

    /**
     * 保持进程运行
     */
    keepAlive() {
        // 每分钟记录一次心跳
        setInterval(() => {
            if (this.isRunning) {
                logger.info('[AutoGrowthSystem] Heartbeat - System running normally');
            }
        }, 60000);
        
        // 防止进程退出
        process.stdin.resume();
    }

    /**
     * 启动反封策略清理
     */
    startAntiBanCleanup() {
        // 每小时清理一次
        setInterval(() => {
            this.antiBan.cleanup();
        }, 3600000);
    }

    /**
     * 优雅关闭
     */
    async shutdown() {
        logger.info('[AutoGrowthSystem] Shutting down...');
        
        this.isRunning = false;
        
        try {
            this.scheduler.stopAll();
            await this.scheduler.close();
            await this.tagging.close();
            await this.analytics.close();
            
            logger.info('[AutoGrowthSystem] Shutdown complete');
            
        } catch (error) {
            logger.error('[AutoGrowthSystem] Shutdown error:', error.message);
        }
        
        process.exit(0);
    }

    /**
     * 获取系统状态
     */
    async getStatus() {
        const uptime = this.startTime 
            ? Math.floor((Date.now() - this.startTime) / 1000)
            : 0;
        
        return {
            running: this.isRunning,
            uptime: {
                seconds: uptime,
                formatted: this.formatUptime(uptime)
            },
            scheduler: {
                active: this.scheduler.isRunning,
                tasks: this.scheduler.tasks.length
            },
            health: this.antiBan.getHealthReport()
        };
    }

    /**
     * 格式化运行时间
     */
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    /**
     * 手动执行采集
     */
    async manualScrape() {
        logger.info('[AutoGrowthSystem] Manual scrape initiated');
        
        const StealthScraper = require('./scraper/stealth-scraper');
        const scraper = new StealthScraper();
        
        const keywords = ['teen patti', 'online earning'];
        const results = [];
        
        for (const keyword of keywords) {
            const channels = await scraper.scrapeTelemetr(keyword);
            results.push(...channels);
            await new Promise(r => setTimeout(r, 5000));
        }
        
        // 保存到数据库
        const db = require('./utils/database');
        const database = new db();
        await database.connect();
        
        let newCount = 0;
        for (const ch of results) {
            const exists = await database.findOne('targets', { username: ch.username });
            if (!exists) {
                await database.insert('targets', { ...ch, status: 'new' });
                newCount++;
            }
        }
        
        await database.disconnect();
        
        return { total: results.length, new: newCount };
    }

    /**
     * 手动生成报告
     */
    async manualReport() {
        const report = await this.analytics.generateTelegramReport();
        await this.scheduler.notifyAdmin(report);
        return report;
    }
}

// ==================== 启动处理 ====================

const system = new AutoGrowthSystem();

// 优雅关闭处理
process.on('SIGINT', () => system.shutdown());
process.on('SIGTERM', () => system.shutdown());
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    system.shutdown();
});

// 命令行参数处理
const args = process.argv.slice(2);

if (args.includes('--test')) {
    // 测试模式
    console.log('Running in test mode...');
    system.initialize().then(async () => {
        console.log('Status:', await system.getStatus());
        await system.shutdown();
    });
} else if (args.includes('--manual-scrape')) {
    // 手动采集
    system.manualScrape().then(result => {
        console.log('Scrape result:', result);
        process.exit(0);
    });
} else if (args.includes('--report')) {
    // 手动报告
    system.initialize().then(async () => {
        await system.manualReport();
        await system.shutdown();
    });
} else {
    // 正常启动
    system.start();
}

module.exports = AutoGrowthSystem;
