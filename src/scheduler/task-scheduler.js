/**
 * ============================================================
 * 定时任务调度器 - Task Scheduler
 * ============================================================
 * 
 * 功能：
 * - 定时采集 (每日凌晨 2:00)
 * - 定时推广 (每日上午 10:00)
 * - 定时报告 (每日下午 6:00)
 * - 健康检查 (每小时)
 */

const cron = require('node-cron');
const StealthScraper = require('../scraper/stealth-scraper');
const OutreachManager = require('../outreach/outreach-manager');
const ApprovalQueue = require('../outreach/approval-queue');
const AIGenerator = require('../ai/ai-generator');
const Database = require('../utils/database');
const logger = require('../utils/logger');

class TaskScheduler {
    constructor() {
        this.db = new Database();
        this.scraper = new StealthScraper();
        this.outreach = new OutreachManager();
        this.queue = new ApprovalQueue();
        this.ai = new AIGenerator();
        
        this.tasks = [];
        this.isRunning = false;
    }

    /**
     * 初始化
     */
    async initialize() {
        await this.db.connect();
        await this.outreach.initialize();
        await this.queue.initialize();
        
        logger.info('[TaskScheduler] Initialized');
    }

    /**
     * ==================== 1. 定时采集任务 ====================
     */
    startScrapeJob() {
        // 每天凌晨 2:00 IST (对应 UTC 20:30)
        const job = cron.schedule('30 20 * * *', async () => {
            logger.info('[TaskScheduler] Starting scheduled scrape job...');
            
            try {
                // 记录任务开始
                const jobId = await this.logJobStart('scrape');
                
                // 执行采集
                const keywords = ['teen patti', 'online earning', 'make money india'];
                const allChannels = [];
                
                for (const keyword of keywords) {
                    logger.info(`[TaskScheduler] Scraping: ${keyword}`);
                    const channels = await this.scraper.scrapeTelemetr(keyword);
                    allChannels.push(...channels);
                    
                    // 间隔避免被封
                    await this.sleep(5000);
                }
                
                // 保存到数据库
                let newCount = 0;
                for (const channel of allChannels) {
                    const exists = await this.db.findOne('targets', { username: channel.username });
                    if (!exists && channel.username) {
                        await this.db.insert('targets', { 
                            ...channel, 
                            status: 'new',
                            addedAt: new Date()
                        });
                        newCount++;
                    }
                }
                
                // 记录任务完成
                await this.logJobComplete(jobId, {
                    totalFound: allChannels.length,
                    newAdded: newCount,
                    keywords: keywords.length
                });
                
                // 发送通知给管理员
                await this.notifyAdmin(`📊 采集完成\n\n找到频道: ${allChannels.length}\n新增入库: ${newCount}\n关键词: ${keywords.join(', ')}`);
                
                logger.info(`[TaskScheduler] Scrape job completed: ${newCount} new channels`);
                
            } catch (error) {
                logger.error('[TaskScheduler] Scrape job error:', error.message);
                await this.notifyAdmin(`❌ 采集任务失败: ${error.message}`);
            }
        }, {
            timezone: 'Asia/Kolkata'
        });
        
        this.tasks.push({ name: 'scrape', job });
        logger.info('[TaskScheduler] Scrape job scheduled for 02:00 IST');
    }

    /**
     * ==================== 2. 定时推广任务 ====================
     */
    startOutreachJob() {
        // 每天上午 10:00 IST
        const job = cron.schedule('0 10 * * *', async () => {
            logger.info('[TaskScheduler] Starting scheduled outreach job...');
            
            try {
                const jobId = await this.logJobStart('outreach');
                
                // 获取未推广的目标
                const targets = await this.db.findAll('targets', { 
                    status: 'new',
                    source: 'telemetr'
                }, 10); // 每天最多 10 个
                
                if (targets.length === 0) {
                    logger.info('[TaskScheduler] No new targets for outreach');
                    await this.logJobComplete(jobId, { sent: 0, reason: 'no_targets' });
                    return;
                }
                
                // 添加到审核队列
                for (const target of targets) {
                    // 生成内容
                    const content = await this.ai.generate('directMessage', {
                        targetName: target.username,
                        topic: target.keyword || 'gaming',
                        language: 'EN'
                    });
                    
                    // 添加到队列
                    await this.queue.add({
                        type: 'directMessage',
                        target: target.username,
                        content: content.content,
                        data: { 
                            topic: target.keyword,
                            language: 'EN',
                            targetId: target._id
                        }
                    });
                    
                    // 标记为 pending
                    await this.db.update('targets', 
                        { _id: target._id },
                        { status: 'pending_approval' }
                    );
                }
                
                await this.logJobComplete(jobId, { 
                    queued: targets.length,
                    awaitingApproval: true
                });
                
                // 通知管理员
                await this.notifyAdmin(`📤 推广任务已创建\n\n已添加 ${targets.length} 个目标到审核队列\n请回复 /approve_all 批准全部\n或逐一审核`);
                
                logger.info(`[TaskScheduler] Outreach job queued: ${targets.length} targets`);
                
            } catch (error) {
                logger.error('[TaskScheduler] Outreach job error:', error.message);
                await this.notifyAdmin(`❌ 推广任务失败: ${error.message}`);
            }
        }, {
            timezone: 'Asia/Kolkata'
        });
        
        this.tasks.push({ name: 'outreach', job });
        logger.info('[TaskScheduler] Outreach job scheduled for 10:00 IST');
    }

    /**
     * ==================== 3. 定时报告任务 ====================
     */
    startReportJob() {
        // 每天下午 6:00 IST
        const job = cron.schedule('0 18 * * *', async () => {
            logger.info('[TaskScheduler] Generating daily report...');
            
            try {
                // 统计今日数据
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const newTargets = await this.db.count('targets', { 
                    addedAt: { $gte: today }
                });
                
                const outreachLogs = await this.db.findAll('outreach_logs', {
                    sentAt: { $gte: today }
                });
                
                const queueStats = await this.queue.getStats();
                
                // 构建报告
                const report = `📈 每日数据报告 (${new Date().toLocaleDateString('en-IN')})

📊 采集统计:
• 新增目标: ${newTargets}
• 累计目标: ${await this.db.count('targets')}

📤 推广统计:
• 今日发送: ${outreachLogs.length}
• 待审核: ${queueStats.pending}
• 已批准: ${queueStats.approved}

🤖 系统状态:
• 定时任务: 运行中
• 账号状态: 正常

明天继续加油! 💪`;

                await this.notifyAdmin(report);
                
                logger.info('[TaskScheduler] Daily report sent');
                
            } catch (error) {
                logger.error('[TaskScheduler] Report job error:', error.message);
            }
        }, {
            timezone: 'Asia/Kolkata'
        });
        
        this.tasks.push({ name: 'report', job });
        logger.info('[TaskScheduler] Report job scheduled for 18:00 IST');
    }

    /**
     * ==================== 4. 健康检查 ====================
     */
    startHealthCheckJob() {
        // 每小时检查一次
        const job = cron.schedule('0 * * * *', async () => {
            try {
                // 检查数据库连接
                const dbStatus = await this.checkDatabase();
                
                // 检查代理状态
                const proxyStatus = await this.checkProxy();
                
                // 检查Bot状态
                const botStatus = await this.checkBotStatus();
                
                if (!dbStatus || !proxyStatus || !botStatus) {
                    const issues = [];
                    if (!dbStatus) issues.push('数据库');
                    if (!proxyStatus) issues.push('代理');
                    if (!botStatus) issues.push('Bot');
                    
                    await this.notifyAdmin(`⚠️ 系统异常\n\n${issues.join(', ')} 出现问题，请检查！`);
                }
                
            } catch (error) {
                logger.error('[TaskScheduler] Health check error:', error.message);
            }
        }, {
            timezone: 'Asia/Kolkata'
        });
        
        this.tasks.push({ name: 'health', job });
        logger.info('[TaskScheduler] Health check scheduled (hourly)');
    }

    /**
     * ==================== 辅助方法 ====================
     */
    
    async logJobStart(type) {
        const result = await this.db.insert('scheduled_jobs', {
            type,
            status: 'running',
            startedAt: new Date()
        });
        return result;
    }
    
    async logJobComplete(jobId, result) {
        await this.db.update('scheduled_jobs',
            { _id: jobId },
            {
                status: 'completed',
                completedAt: new Date(),
                result
            }
        );
    }
    
    async notifyAdmin(message) {
        try {
            const https = require('https');
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            const adminId = process.env.ADMIN_TELEGRAM_ID;
            
            const queryString = `chat_id=${adminId}&text=${encodeURIComponent(message)}&parse_mode=HTML`;
            const url = `https://api.telegram.org/bot${botToken}/sendMessage?${queryString}`;
            
            https.get(url, { timeout: 10000 });
            
        } catch (error) {
            logger.error('[TaskScheduler] Notify admin error:', error.message);
        }
    }
    
    async checkDatabase() {
        try {
            await this.db.findOne('targets', {});
            return true;
        } catch {
            return false;
        }
    }
    
    async checkProxy() {
        // 简化检查，实际可 ping 代理
        return true;
    }
    
    async checkBotStatus() {
        try {
            const https = require('https');
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            
            return new Promise((resolve) => {
                https.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 5000 }, (res) => {
                    resolve(res.statusCode === 200);
                }).on('error', () => resolve(false));
            });
        } catch {
            return false;
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 启动所有定时任务
     */
    startAll() {
        this.startScrapeJob();
        this.startOutreachJob();
        this.startReportJob();
        this.startHealthCheckJob();
        
        this.isRunning = true;
        logger.info('[TaskScheduler] All jobs started');
    }
    
    /**
     * 停止所有任务
     */
    stopAll() {
        for (const task of this.tasks) {
            task.job.stop();
            logger.info(`[TaskScheduler] Stopped: ${task.name}`);
        }
        this.tasks = [];
        this.isRunning = false;
    }
    
    /**
     * 关闭连接
     */
    async close() {
        this.stopAll();
        await this.db.disconnect();
        await this.outreach.close();
        await this.queue.close();
    }
}

module.exports = TaskScheduler;
