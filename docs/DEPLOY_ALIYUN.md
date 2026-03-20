# 阿里云部署指南

## 服务器配置

### 1. 购买 ECS 实例

**推荐配置：**
- **地域**：孟买（印度）或 新加坡
- **实例**：ecs.t6-c1m2.large（2核4G）
- **系统**：Ubuntu 22.04 LTS
- **带宽**：5Mbps
- **存储**：40GB SSD
- **费用**：约 ¥150-200/月

**购买步骤：**
1. 登录 https://www.aliyun.com/
2. 进入 ECS 控制台
3. 点击"创建实例"
4. 选择地域和配置
5. 设置 root 密码
6. 开通安全组（放行 22, 80, 443, 27017 端口）

### 2. 安全组配置

**入方向规则：**
```
端口 22 (SSH)：允许
端口 80 (HTTP)：允许
端口 443 (HTTPS)：允许
端口 3000 (应用)：允许
```

---

## MongoDB 配置

### 方案：阿里云 MongoDB

**购买：**
1. 进入 https://mongodb.console.aliyun.com/
2. 创建实例
3. **配置**：
   - 版本：MongoDB 6.0
   - 规格：1核2G（入门版）
   - 存储：20GB
   - 费用：约 ¥50/月

**获取连接字符串：**
```
mongodb://用户名:密码@host:port/database?replicaSet=rs0
```

### 或自建 MongoDB（免费）

在 ECS 上直接安装：
```bash
# 安装 MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# 启动
sudo systemctl start mongod
sudo systemctl enable mongod

# 创建数据库
mongo
> use auto_growth
> db.createUser({user: "growth", pwd: "你的密码", roles: [{role: "readWrite", db: "auto_growth"}]})
```

连接字符串：
```
mongodb://growth:你的密码@localhost:27017/auto_growth
```

---

## 代理配置

### IPRoyal 代理设置

**你的代理信息：**
```
主机：geo.iproyal.com
端口：12321
地区：India (Bacheli)
类型：粘性IP (TTL 30分钟)
```

**配置项目：**
编辑 `config/proxy.json`：
```json
{
  "enabled": true,
  "server": "http://geo.iproyal.com:12321",
  "username": "你的用户名",
  "password": "你的密码",
  "type": "http",
  "sticky": true,
  "ttl": 1800
}
```

**注意：** IPRoyal 需要在控制面板生成子账号密码

---

## 部署步骤

### 1. 连接服务器

```bash
ssh root@你的阿里云IP
```

### 2. 安装依赖

```bash
# 更新系统
apt-get update && apt-get upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 安装 PM2（进程管理器）
npm install -g pm2

# 安装 Git
apt-get install -y git

# 安装 Chrome（用于爬虫）
apt-get install -y wget gnupg
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list
apt-get update
apt-get install -y google-chrome-stable
```

### 3. 克隆项目

```bash
cd /opt
git clone https://github.com/leigc0113-coder/auto-growth-system.git
cd auto-growth-system
```

### 4. 安装依赖

```bash
npm install
```

### 5. 配置环境变量

```bash
cp .env.example .env
nano .env
```

编辑 `.env`：
```env
# Telegram Bot Tokens
TELEGRAM_BOT_TOKEN_1=你的第一个BotToken
TELEGRAM_BOT_TOKEN_2=你的第二个BotToken
TELEGRAM_BOT_TOKEN_3=你的第三个BotToken

# Kimi API
KIMI_API_KEY=你的KimiAPIKey

# MongoDB (阿里云或本地)
MONGODB_URI=mongodb://用户名:密码@host:27017/auto_growth

# 代理配置
PROXY_ENABLED=true
PROXY_SERVER=http://geo.iproyal.com:12321
PROXY_USERNAME=你的IPRoyal用户名
PROXY_PASSWORD=你的IPRoyal密码

# 管理员
ADMIN_TELEGRAM_ID=你的TelegramID

# 系统
NODE_ENV=production
LOG_LEVEL=info
TIMEZONE=Asia/Kolkata
```

### 6. 启动应用

```bash
# 使用 PM2 启动
pm2 start src/index.js --name auto-growth

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs auto-growth
```

### 7. 配置 Nginx（可选）

```bash
apt-get install -y nginx

# 配置反向代理
cat > /etc/nginx/sites-available/auto-growth << 'EOF'
server {
    listen 80;
    server_name 你的域名或IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/auto-growth /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## 监控和维护

### PM2 命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs auto-growth

# 重启
pm2 restart auto-growth

# 停止
pm2 stop auto-growth

# 监控面板
pm2 monit
```

### 日志查看

```bash
# 应用日志
tail -f /opt/auto-growth-system/logs/combined.log

# 错误日志
tail -f /opt/auto-growth-system/logs/error.log
```

---

## 自动采集配置

### 使用半自动采集工具

```bash
# 安装 Puppeteer 依赖
apt-get install -y libgbm-dev

# 运行采集工具
node src/scraper/tgstat-scraper.js
```

### 配置定时采集

```bash
crontab -e

# 添加定时任务（每天6点采集）
0 6 * * * cd /opt/auto-growth-system && /usr/bin/node src/scraper/index.js >> /var/log/growth-scraper.log 2>&1
```

---

## 备份策略

### 数据库备份

```bash
# 创建备份脚本
cat > /opt/backup-mongo.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="你的MongoDB连接串" --out=/backup/mongo_$DATE
tar -czf /backup/mongo_$DATE.tar.gz /backup/mongo_$DATE
rm -rf /backup/mongo_$DATE
# 保留7天
find /backup -name "mongo_*.tar.gz" -mtime +7 -delete
EOF

chmod +x /opt/backup-mongo.sh

# 定时每天备份
echo "0 3 * * * /opt/backup-mongo.sh" | crontab -
```

---

## 费用预估

| 项目 | 配置 | 月费 |
|------|------|------|
| 阿里云 ECS | 2核4G/5M | ¥150-200 |
| 阿里云 MongoDB | 1核2G | ¥50 |
| IPRoyal 代理 | 5GB流量 | ¥70-100 |
| **总计** | | **¥270-350/月** |

---

## 下一步

1. **购买阿里云 ECS**（孟买地域）
2. **配置 MongoDB**（阿里云或自建）
3. **提供给我：**
   - 服务器 IP 地址
   - root 密码或 SSH Key
   - MongoDB 连接字符串
   - Telegram Bot Tokens
   - Kimi API Key
   - IPRoyal 子账号信息

4. **我来远程部署** 或 **给你完整部署脚本**

---

**准备好后告诉我，我立即帮你部署！** 🚀
