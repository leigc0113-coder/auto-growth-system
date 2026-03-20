/**
 * ============================================================
 * 数据导出工具 - 将 MongoDB 数据导出到文件
 * ============================================================
 */

const Database = require('./database');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class DataExporter {
    constructor() {
        this.db = new Database();
        this.exportDir = path.join(__dirname, '../../data');
    }

    async initialize() {
        await this.db.connect();
        // 确保导出目录存在
        await fs.mkdir(this.exportDir, { recursive: true });
    }

    /**
     * 导出所有目标数据到 JSON
     */
    async exportTargetsToJSON() {
        try {
            const targets = await this.db.findAll('targets');
            const filePath = path.join(this.exportDir, `targets-${this.getDateString()}.json`);
            
            await fs.writeFile(filePath, JSON.stringify(targets, null, 2));
            
            logger.info(`[Export] 导出 ${targets.length} 条记录到 ${filePath}`);
            return { count: targets.length, file: filePath };
        } catch (error) {
            logger.error('[Export] JSON导出失败:', error);
            throw error;
        }
    }

    /**
     * 导出为 CSV 格式
     */
    async exportTargetsToCSV() {
        try {
            const targets = await this.db.findAll('targets');
            
            // CSV 表头
            const headers = ['name', 'type', 'subscribers', 'category', 'status', 'platform', 'description'];
            
            // 生成 CSV 内容
            let csv = headers.join(',') + '\n';
            
            for (const t of targets) {
                const row = headers.map(h => {
                    const val = t[h] || '';
                    // 处理逗号和换行
                    return `"${String(val).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
                });
                csv += row.join(',') + '\n';
            }
            
            const filePath = path.join(this.exportDir, `targets-${this.getDateString()}.csv`);
            await fs.writeFile(filePath, csv);
            
            logger.info(`[Export] 导出 ${targets.length} 条记录到 ${filePath}`);
            return { count: targets.length, file: filePath };
        } catch (error) {
            logger.error('[Export] CSV导出失败:', error);
            throw error;
        }
    }

    /**
     * 导出按状态分类的数据
     */
    async exportByStatus() {
        try {
            const stats = {
                new: await this.db.findAll('targets', { status: 'new' }),
                contacted: await this.db.findAll('targets', { status: 'contacted' }),
                cooperating: await this.db.findAll('targets', { status: 'cooperating' }),
                rejected: await this.db.findAll('targets', { status: 'rejected' })
            };

            const result = {};
            for (const [status, items] of Object.entries(stats)) {
                const filePath = path.join(this.exportDir, `targets-${status}-${this.getDateString()}.json`);
                await fs.writeFile(filePath, JSON.stringify(items, null, 2));
                result[status] = { count: items.length, file: filePath };
            }

            logger.info(`[Export] 按状态导出完成`);
            return result;
        } catch (error) {
            logger.error('[Export] 状态分类导出失败:', error);
            throw error;
        }
    }

    /**
     * 生成统计报告
     */
    async generateReport() {
        try {
            const total = await this.db.count('targets');
            const newCount = await this.db.count('targets', { status: 'new' });
            const contacted = await this.db.count('targets', { status: 'contacted' });
            const cooperating = await this.db.count('targets', { status: 'cooperating' });

            const report = {
                generatedAt: new Date().toISOString(),
                summary: {
                    total,
                    new: newCount,
                    contacted,
                    cooperating,
                    conversionRate: contacted > 0 ? ((cooperating / contacted) * 100).toFixed(2) + '%' : '0%'
                },
                byPlatform: {},
                byCategory: {}
            };

            // 按平台统计
            const allTargets = await this.db.findAll('targets');
            for (const t of allTargets) {
                report.byPlatform[t.platform] = (report.byPlatform[t.platform] || 0) + 1;
                report.byCategory[t.category] = (report.byCategory[t.category] || 0) + 1;
            }

            const filePath = path.join(this.exportDir, `report-${this.getDateString()}.json`);
            await fs.writeFile(filePath, JSON.stringify(report, null, 2));

            // 同时生成文本报告
            const textReport = this.formatTextReport(report);
            const textPath = path.join(this.exportDir, `report-${this.getDateString()}.txt`);
            await fs.writeFile(textPath, textReport);

            logger.info(`[Export] 报告已生成`);
            return { json: filePath, txt: textPath, report };
        } catch (error) {
            logger.error('[Export] 报告生成失败:', error);
            throw error;
        }
    }

    formatTextReport(report) {
        return `
============================================
  Auto Growth System - 数据报告
  生成时间: ${report.generatedAt}
============================================

【总体统计】
  总计: ${report.summary.total} 个目标
  待联系: ${report.summary.new}
  已联系: ${report.summary.contacted}
  合作中: ${report.summary.cooperating}
  转化率: ${report.summary.conversionRate}

【按平台分布】
${Object.entries(report.byPlatform).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

【按分类分布】
${Object.entries(report.byCategory).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

============================================
        `;
    }

    getDateString() {
        return new Date().toISOString().split('T')[0];
    }

    async close() {
        await this.db.disconnect();
    }
}

module.exports = DataExporter;
