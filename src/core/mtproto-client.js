/**
 * ============================================================
 * MTProto 用户账号控制器
 * ============================================================
 * 
 * 使用用户账号（非Bot）实现：
 * - 主动私信任何用户
 * - 自动加入群组
 * - 发送评论
 * - 邀请用户加入频道
 * - 私聊管理员
 * 
 * 基于: telegram (MTProto) 库
 */

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const input = require('input'); // 用于交互式输入
const logger = require('../utils/logger');

class MTProtoClient {
    constructor(sessionString = '', accountName = 'default') {
        this.apiId = parseInt(process.env.API_ID) || 39572298;
        this.apiHash = process.env.API_HASH || '4f0b281b341b54ac760fd606229da90b';
        this.phoneNumber = process.env.PHONE_NUMBER || '+919799524106';
        this.accountName = accountName;
        
        // 使用 StringSession 保存登录状态
        this.session = new StringSession(sessionString);
        this.client = null;
        this.isConnected = false;
    }

    /**
     * 初始化并连接
     */
    async connect() {
        try {
            logger.info(`[MTProto:${this.accountName}] Connecting...`);
            
            this.client = new TelegramClient(
                this.session,
                this.apiId,
                this.apiHash,
                {
                    connectionRetries: 5,
                    useProxy: this.getProxyConfig(),
                    deviceModel: 'Desktop',
                    systemVersion: 'Windows 10',
                    appVersion: '1.0.0',
                    langCode: 'en',
                    systemLangCode: 'en'
                }
            );

            // 启动客户端
            await this.client.start({
                phoneNumber: this.phoneNumber,
                phoneCode: async () => {
                    // 如果已有 session，不会走到这里
                    logger.info('[MTProto] Please enter the code you received:');
                    return await input.text('Code:');
                },
                password: async () => {
                    // 如果有 2FA
                    logger.info('[MTProto] Please enter your 2FA password:');
                    return await input.text('Password:');
                },
                onError: (err) => {
                    logger.error('[MTProto] Connection error:', err);
                }
            });

            this.isConnected = true;
            
            // 保存 session 字符串（用于下次免登录）
            const sessionString = this.client.session.save();
            logger.info(`[MTProto:${this.accountName}] Connected successfully!`);
            logger.info(`[MTProto] Session string (save this): ${sessionString.substring(0, 50)}...`);
            
            return {
                success: true,
                sessionString,
                user: await this.client.getMe()
            };
            
        } catch (error) {
            logger.error(`[MTProto:${this.accountName}] Connection failed:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取代理配置
     */
    getProxyConfig() {
        if (process.env.PROXY_URL) {
            // 解析代理 URL
            const url = new URL(process.env.PROXY_URL);
            return {
                socksType: 5, // SOCKS5
                ip: url.hostname,
                port: parseInt(url.port),
                username: url.username,
                password: url.password
            };
        }
        return undefined;
    }

    /**
     * ==================== 核心功能 ====================
     */

    /**
     * 1. 给任何用户发送私信
     */
    async sendDirectMessage(username, message) {
        try {
            if (!this.isConnected) {
                throw new Error('Client not connected');
            }

            // 去掉 @ 符号
            const cleanUsername = username.replace('@', '');
            
            logger.info(`[MTProto] Sending DM to @${cleanUsername}...`);
            
            // 获取用户实体
            const entity = await this.client.getEntity(cleanUsername);
            
            // 发送消息
            const result = await this.client.sendMessage(entity, {
                message: message,
                parseMode: 'html'
            });

            logger.info(`[MTProto] DM sent successfully to @${cleanUsername}`);
            
            return {
                success: true,
                messageId: result.id,
                date: result.date
            };
            
        } catch (error) {
            logger.error(`[MTProto] Failed to send DM to ${username}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 2. 加入群组
     */
    async joinGroup(groupUsername) {
        try {
            const cleanUsername = groupUsername.replace('@', '');
            
            logger.info(`[MTProto] Joining group @${cleanUsername}...`);
            
            // 获取群组实体
            const entity = await this.client.getEntity(cleanUsername);
            
            // 加入群组
            const updates = await this.client.invoke(
                new Api.channels.JoinChannel({
                    channel: entity
                })
            );

            logger.info(`[MTProto] Successfully joined @${cleanUsername}`);
            
            return { success: true, updates };
            
        } catch (error) {
            // 如果已经在群组中会报错
            if (error.message.includes('already a participant')) {
                logger.info(`[MTProto] Already in group @${groupUsername}`);
                return { success: true, alreadyJoined: true };
            }
            
            logger.error(`[MTProto] Failed to join ${groupUsername}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 3. 在群组中发送评论/消息
     */
    async sendGroupMessage(groupUsername, message, replyToMsgId = null) {
        try {
            const cleanUsername = groupUsername.replace('@', '');
            
            logger.info(`[MTProto] Sending message to group @${cleanUsername}...`);
            
            const entity = await this.client.getEntity(cleanUsername);
            
            const options = {
                message: message,
                parseMode: 'html'
            };
            
            if (replyToMsgId) {
                options.replyTo = replyToMsgId;
            }
            
            const result = await this.client.sendMessage(entity, options);
            
            logger.info(`[MTProto] Message sent to group @${cleanUsername}`);
            
            return {
                success: true,
                messageId: result.id,
                date: result.date
            };
            
        } catch (error) {
            logger.error(`[MTProto] Failed to send group message:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 4. 邀请用户加入频道
     */
    async inviteToChannel(channelUsername, targetUsername) {
        try {
            const cleanChannel = channelUsername.replace('@', '');
            const cleanTarget = targetUsername.replace('@', '');
            
            logger.info(`[MTProto] Inviting @${cleanTarget} to @${cleanChannel}...`);
            
            // 获取频道和目标用户
            const channel = await this.client.getEntity(cleanChannel);
            const target = await this.client.getEntity(cleanTarget);
            
            // 邀请用户
            await this.client.invoke(
                new Api.channels.InviteToChannel({
                    channel: channel,
                    users: [target]
                })
            );

            logger.info(`[MTProto] Successfully invited @${cleanTarget}`);
            
            return { success: true };
            
        } catch (error) {
            logger.error(`[MTProto] Failed to invite user:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 5. 获取频道/群组管理员列表
     */
    async getChannelAdmins(channelUsername) {
        try {
            const cleanUsername = channelUsername.replace('@', '');
            
            logger.info(`[MTProto] Getting admins of @${cleanUsername}...`);
            
            const channel = await this.client.getEntity(cleanUsername);
            
            const participants = await this.client.invoke(
                new Api.channels.GetParticipants({
                    channel: channel,
                    filter: new Api.ChannelParticipantsAdmins(),
                    offset: 0,
                    limit: 100,
                    hash: BigInt(0)
                })
            );

            const admins = participants.users.map(user => ({
                id: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                isBot: user.bot
            }));

            logger.info(`[MTProto] Found ${admins.length} admins`);
            
            return { success: true, admins };
            
        } catch (error) {
            logger.error(`[MTProto] Failed to get admins:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 6. 搜索公开消息
     */
    async searchMessages(query, limit = 10) {
        try {
            logger.info(`[MTProto] Searching for: ${query}`);
            
            const result = await this.client.invoke(
                new Api.messages.SearchGlobal({
                    q: query,
                    filter: new Api.InputMessagesFilterEmpty(),
                    minDate: 0,
                    maxDate: 0,
                    offsetRate: 0,
                    offsetPeer: new Api.InputPeerEmpty(),
                    offsetId: 0,
                    limit: limit
                })
            );

            return {
                success: true,
                messages: result.messages,
                count: result.messages.length
            };
            
        } catch (error) {
            logger.error(`[MTProto] Search failed:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 7. 获取用户信息
     */
    async getUserInfo(username) {
        try {
            const cleanUsername = username.replace('@', '');
            const entity = await this.client.getEntity(cleanUsername);
            
            return {
                success: true,
                user: {
                    id: entity.id,
                    username: entity.username,
                    firstName: entity.firstName,
                    lastName: entity.lastName,
                    isBot: entity.bot,
                    isVerified: entity.verified
                }
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 断开连接
     */
    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
            this.isConnected = false;
            logger.info(`[MTProto:${this.accountName}] Disconnected`);
        }
    }
}

module.exports = MTProtoClient;
