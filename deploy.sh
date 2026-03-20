#!/bin/bash
# ============================================================
# Auto Growth System - 阿里云一键部署脚本
# ============================================================

set -e  # 遇到错误立即停止

echo "🚀 Auto Growth System - 阿里云部署脚本"
echo "========================================"
echo ""

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用 root 权限运行: sudo bash deploy.sh"
    exit 1
fi

# 配置变量（部署时修改）
PROJECT_DIR="/opt/auto-growth-system"
GITHUB_REPO="https://github.com/leigc0113-coder/auto-growth-system.git"
NODE_VERSION="18"

echo "📋 安装系统依赖..."
apt-get update -y
apt-get upgrade -y

# 安装基础工具
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw \
    nginx \
    certbot \
    python3-certbot-nginx

echo "✅ 基础工具安装完成"
echo ""

echo "📦 安装 Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs

# 验证安装
node_version=$(node -v)
echo "✅ Node.js 版本: ${node_version}"

echo "📦 安装 PM2..."
npm install -g pm2
pm2 install pm2-logrotate

echo "✅ PM2 安装完成"
echo ""

echo "🌐 安装 Chrome（用于爬虫）..."
apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils

wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
dpkg -i google-chrome-stable_current_amd64.deb || apt-get -f install -y
rm google-chrome-stable_current_amd64.deb

echo "✅ Chrome 安装完成"
echo ""

echo "📥 克隆项目..."
if [ -d "$PROJECT_DIR" ]; then
    echo "⚠️  项目目录已存在，执行更新..."
    cd $PROJECT_DIR
    git pull
else
    git clone $GITHUB_REPO $PROJECT_DIR
    cd $PROJECT_DIR
fi

echo "✅ 项目克隆/更新完成"
echo ""

echo "📦 安装项目依赖..."
npm install
npm run setup 2>/dev/null || echo "⚠️  setup 脚本不存在，跳过"

echo "✅ 依赖安装完成"
echo ""

echo "⚙️  配置环境变量..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件，填入你的配置信息"
    echo "   命令: nano /opt/auto-growth-system/.env"
fi

echo "✅ 环境变量配置完成"
echo ""

echo "🔥 配置防火墙..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw --force enable

echo "✅ 防火墙配置完成"
echo ""

echo "🚀 启动应用..."
pm2 start src/index.js --name "auto-growth"
pm2 startup systemd
pm2 save

echo "✅ 应用已启动"
echo ""

echo "📊 配置 PM2 日志切割..."
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 10
pm2 set pm2-logrotate:compress true

echo "✅ 日志切割配置完成"
echo ""

echo "📝 创建管理脚本..."
cat > /usr/local/bin/growth-logs << 'EOF'
#!/bin/bash
cd /opt/auto-growth-system
tail -f logs/combined.log
EOF

cat > /usr/local/bin/growth-restart << 'EOF'
#!/bin/bash
cd /opt/auto-growth-system
pm2 restart auto-growth
EOF

cat > /usr/local/bin/growth-status << 'EOF'
#!/bin/bash
pm2 status
EOF

chmod +x /usr/local/bin/growth-*

echo "✅ 管理脚本创建完成"
echo ""

echo "========================================"
echo "🎉 部署完成！"
echo "========================================"
echo ""
echo "📍 项目路径: ${PROJECT_DIR}"
echo "📊 查看状态: pm2 status"
echo "📋 查看日志: growth-logs"
echo "🔄 重启应用: growth-restart"
echo "ℹ️  查看状态: growth-status"
echo ""
echo "⚠️  重要提醒："
echo "   1. 请编辑 .env 文件填入你的配置"
echo "   2. 确保 MongoDB 已连接"
echo "   3. 检查 Telegram Bot Token 是否有效"
echo ""
echo "🔗 常用命令："
echo "   cd ${PROJECT_DIR}"
echo "   pm2 logs auto-growth"
echo "   pm2 monit"
echo ""
