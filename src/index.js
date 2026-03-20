/**
 * ============================================================
 * 全自动增长系统 - 主入口
 * ============================================================
 */

require('dotenv').config();
const GrowthEngine = require('./src/core/growth-engine');
const Scheduler = require('./src/scheduler/task-scheduler');
const logger = require('./src/utils/logger');

async function main() {
    logger.info('🚀 Auto Growth System Starting...');

    try {
        // 初始化增长引擎
        const engine = new GrowthEngine();
        await engine.initialize();

        // 初始化任务调度器
        const scheduler = new Scheduler(engine);
        scheduler.startAllTasks();

        logger.info('✅ All systems initialized and running');
        logger.info('📊 Daily growth target: 50-100 new users');

        // 保持进程运行
        process.on('SIGINT', async () => {
            logger.info('🛑 Shutting down gracefully...');
            await engine.shutdown();
            process.exit(0);
        });

    } catch (error) {
        logger.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

main();
