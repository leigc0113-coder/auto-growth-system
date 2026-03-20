/**
 * ============================================================
 * 采集测试脚本
 * ============================================================
 * 
 * 运行：node test/scraper-test.js
 */

const ScraperManager = require('../src/scraper/scraper-manager');
const logger = require('../src/utils/logger');

async function test() {
    logger.info('🧪 开始采集测试...\n');
    
    const manager = new ScraperManager();
    
    try {
        await manager.initialize();
        
        // 执行完整采集
        const results = await manager.runFullCollection();
        
        logger.info('\n📊 采集结果：');
        logger.info(`  Telemetr.io: ${results.telemetr.length} 个`);
        logger.info(`  TGStat: ${results.tgstat.length} 个`);
        logger.info(`  去重后: ${results.unique} 个`);
        logger.info(`  新保存: ${results.saved} 个`);
        
        // 显示统计
        const stats = await manager.getStats();
        logger.info('\n📈 数据库统计：');
        logger.info(`  总计: ${stats.total}`);
        logger.info(`  待联系: ${stats.new}`);
        logger.info(`  已联系: ${stats.contacted}`);
        logger.info(`  合作中: ${stats.cooperating}`);
        
    } catch (error) {
        logger.error('❌ 测试失败:', error);
    } finally {
        process.exit(0);
    }
}

test();
