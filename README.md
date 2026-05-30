# SubWorker - 美观版订阅聚合转换

基于 CF-Workers-SUB 的美观版，支持**暗色玻璃主题**、**二维码**、**全环境变量配置**。

## ✨ 功能

- 🎨 暗色玻璃风格管理面板，精美前端
- 🔗 Token 短链接访问（如 `/auto`）
- 📱 每个订阅链接一键生成二维码
- 📦 多格式输出：Clash / Sing-box / Surge / Quantumult X / Loon / Base64
- 🔄 自动 User-Agent 识别客户端
- 👤 访客订阅支持
- 📊 仪表盘显示节点数、配置信息

## 🚀 部署（Cloudflare Pages）

### 方式一：Git 连接（推荐）

1. Fork 或连接此仓库到你的 GitHub
2. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers 和 Pages** → **Pages**
3. 点击 **创建** → **连接到 Git**
4. 选择 `newemperor221/sub-worker` 仓库
5. 构建配置：**框架预设 = 无**，**构建命令 = 留空**，**输出目录 = 留空**
6. 点击 **部署**

### 方式二：直接上传 Worker

1. 打开 `_worker.js`，复制全部内容
2. Cloudflare Dashboard → Workers → 创建 Worker
3. 粘贴代码 → 部署

## ⚙️ 环境变量

在 Cloudflare Pages 的 **设置 → 环境变量** 中添加：

| 变量名 | 必填 | 说明 | 示例 |
|--------|------|------|------|
| `TOKEN` | ✅ | 订阅访问令牌 | `auto` 或 `mysecret` |
| `SUBAPI` | ✅ | 订阅转换后端地址 | `subapi.357561.xyz` |
| `LINK` | ✅ | 节点链接（每行一个） | `vless://...` 多行 |
| `SUBNAME` | ❌ | 订阅名称 | `MyNodes` |
| `SUBCONFIG` | ❌ | 转换配置文件 URL | `https://raw.githubusercontent.com/...` |
| `SUBUPTIME` | ❌ | 更新间隔（小时） | `6` |
| `LINKSUB` | ❌ | 额外订阅链接 | `https://xxx.com/sub` |
| `GUEST` | ❌ | 访客令牌 | `guest123` |
| `TGTOKEN` | ❌ | Telegram Bot Token | `123456:ABC...` |
| `TGID` | ❌ | Telegram Chat ID | `987654321` |
| `WARP` | ❌ | WARP 节点 | `warp://...` |

## 🔗 访问地址

部署成功后：

```
https://你的pages域名/你的TOKEN     → 默认返回 Base64 订阅
https://你的pages域名/你的TOKEN?clash → Clash 格式
https://你的pages域名/你的TOKEN?sb     → Sing-box 格式
https://你的pages域名/你的TOKEN?surge  → Surge 格式
https://你的pages域名/你的TOKEN?quanx  → Quantumult X 格式
https://你的pages域名/你的TOKEN?loon   → Loon 格式
https://你的pages域名/你的TOKEN?b64    → Base64 格式
```

浏览器直接访问 Token 路径 → 显示精美管理面板
