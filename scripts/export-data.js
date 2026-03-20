/**
 * ============================================================
 * 数据导出脚本 - 双击运行即可
 * ============================================================
 * 
 * 导出内容：
 * - targets-all.json (所有数据)
 * - targets-all.csv (CSV格式)
 * - targets-new.json (待联系)
 * - targets-contacted.json (已联系)
 * - targets-cooperating.json (合作中)
 * - report.txt (统计报告)
 */

const DataExporter = require('./utils/data-exporter');
const logger = require('./utils/logger');

async function main() {
    console.log('🚀 Auto Growth System - 数据导出工具\n');
    
    const exporter = new DataExporter();
    
    try {
        await exporter.initialize();
        
        // 1. 导出所有数据
        console.log('📦 导出所有数据...');
        const jsonResult = await exporter.exportTargetsToJSON();
        console.log(`  ✓ JSON: ${jsonResult.count} 条记录`);
        
        const csvResult = await exporter.exportTargetsToCSV();
        console.log(`  ✓ CSV: ${csvResult.count} 条记录`);
        
        // 2. 按状态分类导出
        console.log('\n📂 按状态分类导出...');
        const statusResult = await exporter.exportByStatus();
        for (const [status, data] of Object.entries(statusResult)) {
            console.log(`  ✓ ${status}: ${data.count} 条`);
        }
        
        // 3. 生成报告
        console.log('\n📊 生成统计报告...');
        const report = await exporter.generateReport();
        console.log(`  ✓ 报告已保存`);
        
        // 显示摘要
        console.log('\n============================================');
        console.log('  导出完成！');
        console.log('============================================');
        console.log(`\n文件位置: data/ 目录`);
        console.log(`  - ${jsonResult.file}`);
        console.log(`  - ${csvResult.file}`);
        console.log(`  - ${report.txt}`);
        console.log('\n统计摘要:');
        console.log(`  总计: ${report.report.summary.total}`);
        console.log(`  待联系: ${report.report.summary.new}`);
        console.log(`  已联系: ${report.report.summary.contacted}`);
        console.log(`  合作中: ${report.report.summary.cooperating}`);
        console.log('============================================\n');
        
    } catch (error) {
        console.error('❌ 导出失败:', error.message);
        process.exit(1);
    } finally {
        await exporter.close();
        process.exit(0);
    }
}

main();
