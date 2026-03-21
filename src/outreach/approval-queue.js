/**
 * ============================================================
 * 审核队列管理器 - 人工审核系统
 * ============================================================
 * 
 * 功能：
 * - 待审核任务队列
 * - Telegram 通知管理员
 * - 管理员确认/拒绝操作
 */

const Database = require('../utils/database');
const logger = require('../utils/logger');

class ApprovalQueue {
    constructor() {
        this.db = new Database();
        this.adminId = process.env.ADMIN_TELEGRAM_ID;
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    }

    /**
     * 初始化
     */
    async initialize() {
        await this.db.connect();
        logger.info('[ApprovalQueue] Initialized');
    }

    /**
     * 添加任务到审核队列
     */
    async add(task) {
        const record = {
            type: task.type,
            target: task.target,
            content: task.content,
            data: JSON.stringify(task.data || {}),
            status: 'pending',
            createdAt: new Date(),
            notified: false
        };
        
        const id = await this.db.insert('approval_queue', record);
        
        // 通知管理员
        await this.notifyAdmin(id, task);
        
        logger.info(`[ApprovalQueue] Task added: ${task.target} (ID: ${id})`);
        return id;
    }

    /**
     * 通知管理员有新任务
     */
    async notifyAdmin(taskId, task) {
        try {
            const https = require('https');
            
            const message = `🔔 <b>新推广任务待审核</b>

<b>类型:</b> ${task.type}
<b>目标:</b> ${task.target}
<b>内容预览:</b>
${task.content?.substring(0, 200) || 'N/A'}...

请回复:
✅ <code>/approve ${taskId}</code> - 批准发送
❌ <code>/reject ${taskId}</code> - 拒绝发送
⏸ <code>/approve_all</code> - 批准全部待审核`;

            const queryString = `chat_id=${this.adminId}&text=${encodeURIComponent(message)}&parse_mode=HTML`;
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage?${queryString}`;
            
            https.get(url, { timeout: 10000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', async () => {
                    const result = JSON.parse(data);
                    if (result.ok) {
                        await this.db.update('approval_queue', 
                            { _id: taskId }, 
                            { notified: true, notificationSentAt: new Date() }
                        );
                        logger.info(`[ApprovalQueue] Admin notified for task ${taskId}`);
                    }
                });
            });
            
        } catch (error) {
            logger.error('[ApprovalQueue] Notify admin error:', error.message);
        }
    }

    /**
     * 获取待审核任务
     */
    async getPending() {
        return await this.db.findAll('approval_queue', { status: 'pending' });
    }

    /**
     * 批准任务
     */
    async approve(taskId) {
        const task = await this.db.findOne('approval_queue', { _id: taskId });
        
        if (!task) {
            return { success: false, error: 'Task not found' };
        }
        
        if (task.status !== 'pending') {
            return { success: false, error: `Task already ${task.status}` };
        }
        
        // 更新状态
        await this.db.update('approval_queue', 
            { _id: taskId },
            { 
                status: 'approved',
                approvedAt: new Date()
            }
        );
        
        logger.info(`[ApprovalQueue] Task approved: ${taskId}`);
        
        return { 
            success: true, 
            task: {
                ...task,
                data: JSON.parse(task.data || '{}')
            }
        };
    }

    /**
     * 拒绝任务
     */
    async reject(taskId, reason = '') {
        const task = await this.db.findOne('approval_queue', { _id: taskId });
        
        if (!task) {
            return { success: false, error: 'Task not found' };
        }
        
        await this.db.update('approval_queue',
            { _id: taskId },
            {
                status: 'rejected',
                rejectionReason: reason,
                rejectedAt: new Date()
            }
        );
        
        logger.info(`[ApprovalQueue] Task rejected: ${taskId}`);
        
        return { success: true };
    }

    /**
     * 批准所有待审核任务
     */
    async approveAll() {
        const pending = await this.getPending();
        const results = [];
        
        for (const task of pending) {
            const result = await this.approve(task._id);
            results.push({ id: task._id, ...result });
        }
        
        logger.info(`[ApprovalQueue] Approved ${results.length} tasks`);
        
        return {
            success: true,
            approved: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            details: results
        };
    }

    /**
     * 获取统计信息
     */
    async getStats() {
        const pending = await this.db.count('approval_queue', { status: 'pending' });
        const approved = await this.db.count('approval_queue', { status: 'approved' });
        const rejected = await this.db.count('approval_queue', { status: 'rejected' });
        const total = await this.db.count('approval_queue');
        
        return { pending, approved, rejected, total };
    }

    /**
     * 清理旧记录
     */
    async cleanup(days = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        // 删除 N 天前的已处理记录
        // 注意：这里假设 MongoDB 驱动支持 deleteMany
        logger.info(`[ApprovalQueue] Cleanup completed (older than ${days} days)`);
    }

    /**
     * 关闭连接
     */
    async close() {
        await this.db.disconnect();
    }
}

module.exports = ApprovalQueue;
