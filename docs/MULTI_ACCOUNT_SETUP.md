# 多账号配置指南

## 概述

Auto Growth System 支持多个 MTProto 用户账号，实现：
- **功能分离**：不同账号执行不同功能
- **负载均衡**：自动分配任务到最空闲的账号
- **防封保护**：轮换使用，避免单账号频繁操作

---

## 账号角色定义

| 角色 | 功能 | 说明 |
|------|------|------|
| `all` | 全功能 | 可以执行所有操作 |
| `DIRECT_MESSAGE` | 私信专用 | 只发送私信 |
| `GROUP_JOIN` | 加群专用 | 只加入群组 |
| `GROUP_MESSAGE` | 发言专用 | 只在群组发言 |
| `INVITE` | 邀请专用 | 只邀请用户加入频道 |

---

## 配置示例

### 方案1：双账号分工（推荐）

```env
# 账号1：私信专用
PHONE_NUMBER=+919799524106
ACCOUNT_1_ROLE=DIRECT_MESSAGE

# 账号2：加群+发言+邀请
PHONE_NUMBER_2=+919638457883
ACCOUNT_2_ROLE=GROUP_JOIN
```

**分工：**
- 账号1：负责私信推广（最安全，独立）
- 账号2：负责加群、发言、邀请（需要大量操作）

---

### 方案2：三账号全分离

```env
# 账号1：私信
PHONE_NUMBER=+919799524106
ACCOUNT_1_ROLE=DIRECT_MESSAGE

# 账号2：加群
PHONE_NUMBER_2=+919638457883
ACCOUNT_2_ROLE=GROUP_JOIN

# 账号3：邀请
PHONE_NUMBER_3=+918765432109
ACCOUNT_3_ROLE=INVITE
```

---

### 方案3：双账号轮换（全功能）

```env
# 两个账号都可以做所有事，系统自动轮换
PHONE_NUMBER=+919799524106
ACCOUNT_1_ROLE=all

PHONE_NUMBER_2=+919638457883
ACCOUNT_2_ROLE=all
```

---

## 首次登录流程

### 1. 配置环境变量

```bash
cd /opt/auto-growth-system

# 编辑 .env 文件
cat >> .env << 'EOF'

# 第一账号（已有）
PHONE_NUMBER=+919799524106

# 第二账号（新）
PHONE_NUMBER_2=+919638457883
ACCOUNT_2_ROLE=GROUP_JOIN
EOF
```

### 2. 登录第一账号（如果还没登录）

```bash
node mtproto-login.js
# 按提示输入验证码
# Session 保存到: data/mtproto-session-1.txt
```

### 3. 登录第二账号

```bash
PHONE_NUMBER=+919638457883 node mtproto-login.js
# 按提示输入验证码
# Session 保存到: data/mtproto-session-2.txt
```

---

## 防封策略

### 内置保护

```javascript
// 每个账号的冷却期
私信间隔: 60秒
加群间隔: 5分钟
发言间隔: 2分钟
邀请间隔: 3分钟

// 每日限额
每个账号每日最大:
- 私信: 20条
- 加群: 5个
- 发言: 30条
- 邀请: 10个
```

### 账号健康监控

系统会自动：
- ✅ 监控每个账号的发送频率
- ✅ 检测异常（被封、限流）
- ✅ 自动暂停异常账号
- ✅ 切换到备用账号

---

## 查看账号状态

```bash
node -e "
const MultiAccountManager = require('./src/core/multi-account-manager');
const manager = new MultiAccountManager();

async function showStatus() {
    await manager.initializeAll();
    const status = manager.getAllStatus();
    
    console.log('\n📊 账号状态:\n');
    status.forEach(acc => {
        console.log(\`账号: \${acc.name}\`);
        console.log(\`  手机号: \${acc.phone}\`);
        console.log(\`  角色: \${acc.role}\`);
        console.log(\`  用户名: @\${acc.username || 'N/A'}\`);
        console.log(\`  状态: \${acc.status}\`);
        console.log(\`  已发私信: \${acc.stats.messagesSent}\`);
        console.log(\`  已加群组: \${acc.stats.groupsJoined}\`);
        console.log('');
    });
    
    await manager.disconnectAll();
}

showStatus();
"
```

---

## 故障排除

### 问题1：第二个账号收不到验证码

**解决：**
- 检查手机号是否正确
- 检查是否被 Telegram 限制
- 尝试使用其他手机号

### 问题2：账号被封

**解决：**
1. 系统会自动检测并暂停
2. 等待 24 小时后尝试恢复
3. 检查操作频率是否过高
4. 考虑增加更多账号分散风险

### 问题3：Session 过期

**解决：**
```bash
# 删除旧 session
rm data/mtproto-session-2.txt

# 重新登录
PHONE_NUMBER=+919638457883 node mtproto-login.js
```

---

## 最佳实践

1. **逐步增加账号**：先跑通1-2个，稳定后再加
2. **分散手机号**：不同运营商、不同地区
3. **控制频率**：宁可慢，不要被封
4. **监控日志**：每天检查账号健康状态
5. **定期备份**：备份 session 文件和配置

---

## 下一步

配置好第二账号后，系统会自动：
- 根据功能分配任务到合适的账号
- 自动轮换，防止单账号过载
- 监控所有账号的健康状态

运行完整系统：
```bash
node src/app.js
```
