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
            logger.info('[Database] Connected to MongoDB');
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
        try {
            const result = await this.db.collection(collection).insertOne(doc);
            return result.insertedId;
        } catch (error) {
            logger.error(`[Database] Insert failed:`, error);
            throw error;
        }
    }

    async findOne(collection, query) {
        try {
            return await this.db.collection(collection).findOne(query);
        } catch (error) {
            logger.error(`[Database] FindOne failed:`, error);
            return null;
        }
    }

    async findAll(collection, query = {}) {
        try {
            return await this.db.collection(collection).find(query).toArray();
        } catch (error) {
            logger.error(`[Database] FindAll failed:`, error);
            return [];
        }
    }

    async count(collection, query = {}) {
        try {
            return await this.db.collection(collection).countDocuments(query);
        } catch (error) {
            logger.error(`[Database] Count failed:`, error);
            return 0;
        }
    }

    async update(collection, id, update) {
        try {
            const result = await this.db.collection(collection).updateOne(
                { _id: new ObjectId(id) },
                { $set: update }
            );
            return result.modifiedCount;
        } catch (error) {
            logger.error(`[Database] Update failed:`, error);
            throw error;
        }
    }

    async deleteOne(collection, query) {
        try {
            const result = await this.db.collection(collection).deleteOne(query);
            return result.deletedCount;
        } catch (error) {
            logger.error(`[Database] Delete failed:`, error);
            throw error;
        }
    }

    async getCollections() {
        try {
            const collections = await this.db.listCollections().toArray();
            return collections.map(c => c.name);
        } catch (error) {
            logger.error(`[Database] ListCollections failed:`, error);
            return [];
        }
    }
}

module.exports = Database;
