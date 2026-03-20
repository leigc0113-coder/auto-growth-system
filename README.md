# 🔥 Auto Growth System

**全自动增长系统 - 多平台并行获取新用户**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/leigc0113-coder/auto-growth-system)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 🎯 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Auto Growth System                       │
├─────────────────────────────────────────────────────────────┤
│  📊 数据采集  →  🎯 智能筛选  →  🤖 自动推广  →  📈 数据分析  │
├─────────────────────────────────────────────────────────────┤
│  Telegram Scraper    AI评分      私信/发帖      效果追踪    │
│  Reddit Collector    筛选        多账号         转化率      │
│  Group Finder        分类        定时任务       A/B测试    │
└─────────────────────────────────────────────────────────────┘
```

## ✨ 核心功能

### 📊 数据采集 (Scraper)
- **TGStat 爬虫**: 自动采集 Telegram 频道/群组
- **Reddit 监控**: 追踪相关话题和讨论
- **竞品分析**: 发现竞争对手的推广渠道
- **关键词搜索**: 多关键词并行采集

### 🎯 智能筛选 (AI Filter)
- **评分系统**: AI自动评估频道质量
- **活跃度检测**: 筛选活跃用户群
- **相关性匹配**: 精准匹配目标受众
- **去重处理**: 避免重复联系

### 🤖 自动推广 (Outreach)
- **Telegram 私信**: 自动联系频道管理员
- **群组分享**: 自然分享推广内容
- **Reddit 发帖**: 自动生成内容并发布
- **多账号轮换**: 防封号机制

### 📈 数据分析 (Analytics)
- **转化率追踪**: 监控每个渠道效果
- **增长报表**: 自动生成日报/周报
- **A/B 测试**: 优化文案和策略
- **智能建议**: AI推荐最佳推广时间

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/leigc0113-coder/auto-growth-system.git
cd auto-growth-system
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填写你的配置
```

### 4. 初始化系统

```bash
npm run setup
```

### 5. 启动系统

```bash
npm start
```

## 📋 配置文件

### 环境变量 (.env)

```env
# Telegram Bot Tokens (推广用小号)
TELEGRAM_BOT_TOKEN_1=your_first_bot_token
TELEGRAM_BOT_TOKEN_2=your_second_bot_token
TELEGRAM_BOT_TOKEN_3=your_third_bot_token

# AI Content Generation
KIMI_API_KEY=your_kimi_api_key
KIMI_API_URL=https://api.moonshot.cn/v1/chat/completions
KIMI_MODEL=moonshot-v1-8k

# Reddit API
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password

# Proxy (固定IP)
PROXY_SERVER=http://your-proxy:port
PROXY_USERNAME=username
PROXY_PASSWORD=password

# Admin
ADMIN_TELEGRAM_ID=your_admin_id
```

### 系统配置 (config/system.json)

```json
{
  "growth": {
    "daily_target": 50,
    "max_outreach_per_day": 20,
    "channels_per_day": 10,
    "groups_per_day": 5,
    "reddit_posts_per_day": 2
  },
  "safety": {
    "delay_min": 30,
    "delay_max": 120,
    "max_failures": 3,
    "cooldown_hours": 24
  },
  "filters": {
    "min_subscribers": 1000,
    "max_subscribers": 50000,
    "min_activity_score": 0.5,
    "language": ["en", "hi"]
  }
}
```

## 📅 每日任务调度

| 时间 (IST) | 任务 | 平台 | 模式 |
|-----------|------|------|------|
| **06:00** | 数据采集 | TGStat/Reddit | 🤖 自动 |
| **08:00** | 智能筛选 | AI评分 | 🤖 自动 |
| **09:00** | 频道互推联系 | Telegram | 👤 人工审核后发送 |
| **11:00** | 群组分享第1轮 | Telegram | 🤖 自动 |
| **14:00** | Reddit帖子生成 | Reddit | 👤 人工审核后发布 |
| **16:00** | 群组分享第2轮 | Telegram | 🤖 自动 |
| **18:00** | 效果数据统计 | 全平台 | 🤖 自动 |
| **20:00** | 日报生成 | Telegram | 🤖 自动发送给管理员 |

## 🛠️ 模块说明

### Scraper 模块

```bash
# 手动启动采集
npm run scraper -- --platform=tgstat --keyword="teen patti"

# 批量采集多个关键词
npm run scraper -- --platform=tgstat --keywords="teen patti,online earning,lottery"
```

### Outreach 模块

```bash
# 启动自动推广
npm run outreach

# 查看待审核列表
npm run outreach -- --pending

# 批准发送
npm run outreach -- --approve=all
```

### Analytics 模块

```bash
# 查看今日数据
npm run analytics -- --today

# 生成周报
npm run analytics -- --weekly

# 导出CSV报告
npm run analytics -- --export=csv
```

## 🛡️ 安全机制

### 防封号策略
- ✅ **多账号轮换**: 3-5个小号自动切换
- ✅ **智能延迟**: 30-120秒随机延迟
- ✅ **行为模拟**: 模拟真人操作习惯
- ✅ **IP代理**: 固定IP + 轮换机制
- ✅ **冷却机制**: 失败自动冷却24小时

### 人工审核点
- 📋 **频道互推**: AI生成文案，人工确认后发送
- 📋 **Reddit发帖**: 生成内容，人工审核后发布
- 📋 **批量操作**: 超过10条/小时需人工确认

## 📊 数据存储

### MongoDB 集合

```javascript
// 采集的目标
channels: {
  name: String,
  platform: String,
  subscribers: Number,
  activity_score: Number,
  contact_info: String,
  status: 'new' | 'contacted' | 'replied' | 'cooperating' | 'rejected'
}

// 推广记录
outreach_logs: {
  channel_id: ObjectId,
  type: 'dm' | 'post' | 'comment',
  content: String,
  status: 'pending' | 'sent' | 'failed',
  sent_at: Date,
  response: String
}

// 效果统计
analytics: {
  date: Date,
  platform: String,
  new_users: Number,
  conversion_rate: Number,
  top_channels: Array
}
```

## 🎯 增长目标追踪

```
每日目标:
├── 新用户: 50-100人
├── 频道联系: 10个
├── 群组分享: 10个群
└── Reddit帖子: 2篇

每周目标:
├── 新用户: 350-700人
├── 建立合作: 3-5个频道
└── 优化文案: A/B测试3组

每月目标:
├── 新用户: 1500-3000人
├── 转化率: >5%
└── 自动化率: >80%
```

## 🔧 高级配置

### 自定义采集规则

编辑 `config/scraper-rules.json`:

```json
{
  "tgstat": {
    "search_keywords": ["teen patti", "online earning", "lottery india"],
    "filters": {
      "subscribers": { "min": 1000, "max": 50000 },
      "activity": "high",
      "language": "en"
    }
  },
  "reddit": {
    "subreddits": ["beermoneyindia", "IndianGaming", "sidehustle"],
    "post_types": ["discussion", "experience", "question"]
  }
}
```

### 自定义推广文案

编辑 `config/templates.json`:

```json
{
  "telegram_dm": {
    "friendly": "Hi! I run...",
    "professional": "Hello, I'm reaching out...",
    "data_driven": "Hi! We have 1500+ users..."
  },
  "reddit_post": {
    "experience": "I've been using...",
    "question": "Has anyone tried..."
  }
}
```

## 📝 更新日志

### v1.0.0 (2024-03-20)
- ✅ 项目初始化
- ✅ TGStat 爬虫模块
- ✅ AI内容生成
- ✅ 多平台推广
- ✅ 数据分析报表

## 🤝 贡献指南

欢迎提交 Issue 和 PR！

## 📄 许可证

MIT License

---

**⚠️ 免责声明**: 此工具仅供学习和合法营销使用，请遵守各平台的使用条款和相关法律法规。
