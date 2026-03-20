/**
 * ============================================================
 * 数据导出工具
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
        await fs.mkdir(this.exportDir, { recursive: true });
    }

    async exportTargetsToJSON() {
        const targets = await this.db.findAll('targets');
        const filePath = path.join(this.exportDir, `targets-${this.getDate()}.json`);
        await fs.writeFile(filePath, JSON.stringify(targets, null, 2));
        logger.info(`[Export] ${targets.length} records to ${filePath}`);
        return { count: targets.length, file: filePath };
    }

    async generateReport() {
        const total = await this.db.count('targets');
        const newCount = await this.db.count('targets', { status: 'new' });
        
        const report = {
            generatedAt: new Date().toISOString(),
            summary: { total, new: newCount }
        };
        
        const filePath = path.join(this.exportDir, `report-${this.getDate()}.txt`);
        const text = `Auto Growth System Report\n\nTotal: ${total}\nNew: ${newCount}`;
        await fs.writeFile(filePath, text);
        
        logger.info('[Export] Report generated');
        return { report, file: filePath };
    }

    getDate() {
        return new Date().toISOString().split('T')[0];
    }

    async close() {
        await this.db.disconnect();
    }
}

module.exports = DataExporter;
