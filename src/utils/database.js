/**
 * ============================================================
 * 数据库工具 - MongoDB 原生驱动
 * ============================================================
 */

const { MongoClient, ObjectId } = require('mongodb');
const logger = require('./logger');

class Database {
    constructor() {
        this.uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/auto_growth';
        this.client = null;
        this.db = null;
    }

    async connect() {
        try {
            this.client = new MongoClient(this.uri);
            await this.client.connect();
            this.db = this.client.db();
            logger.info('[Database] Connected');
            return true;
        } catch (error) {
            logger.error('[Database] Connection failed:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            logger.info('[Database] Disconnected');
        }
    }

    async insert(collection, doc) {
        const result = await this.db.collection(collection).insertOne(doc);
        return result.insertedId;
    }

    async findOne(collection, query) {
        return await this.db.collection(collection).findOne(query);
    }

    async findAll(collection, query = {}) {
        return await this.db.collection(collection).find(query).toArray();
    }

    async count(collection, query = {}) {
        return await this.db.collection(collection).countDocuments(query);
    }
}

module.exports = Database;
