# Sub Worker — 订阅聚合与转换

Cloudflare Workers 订阅服务。解析 vless / trojan / hysteria2 链接，直接生成 **Mihomo/Clash YAML**、**Xray-core JSON**、**sing-box JSON** 和 **Base64 订阅**。**无后端依赖**，全部跑在 CF 边缘节点。

## 功能

- 🔗 **Clash YAML** — 内联节点（不走 SubConverter/ proxy-provider），Clash Verge 直接导入
- ☄️ **Xray-core JSON** — 完整 DNS / routing / observatory / streaming 分流配置
- 🧩 **sing-box JSON** — 完整客户端配置，内置 DNS / 分流 / 策略组
- 📄 **Base64** — Shadowrocket / v2rayNG 通用格式
- 🎨 **暗色玻璃管理面板** — 二维码、复制、节点统计
- 📛 **订阅名称自定义** — 通过 `Content-Disposition` / `profile-title` 响应头

## 部署

### 方式一：GitHub 导入（推荐）

1. Fork 或推送此仓库到你的 GitHub
2. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Pages** → **Connect to Git**
3. 选择此仓库，构建配置保持默认（无需构建命令）
4. 部署后，在 Pages 项目 **设置 → 环境变量** 中添加：
5. （可选）绑自定义域：Pages → **自定义域** → 添加

### 方式二：复制粘贴

1. 复制 `_worker.js` 全部内容
2. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **创建 Worker**
3. 粘贴代码 → **部署**
4. 在 Worker **设置 → 环境变量** 中添加：

| 变量名 | 必填 | 说明 | 示例 |
|--------|------|------|------|
| `TOKEN` | ✅ | 访问令牌 | `mysecret` |
| `LINK` | ✅ | 节点链接（每行一条 vless:// / trojan:// / hysteria2://） | `vless://...` 多行 |
| `SUBNAME` | ❌ | 订阅导入名称（默认：`自用`） | `MyNodes` |

5. （可选）绑自定义域：Worker → **触发器** → **自定义域** → 添加

## 使用

```
https://你的域名/<TOKEN>            → 管理面板
https://你的域名/<TOKEN>?clash      → Mihomo / Clash YAML 订阅
https://你的域名/<TOKEN>?xray       → Xray-core JSON 配置
https://你的域名/<TOKEN>?sing-box   → sing-box JSON 配置
https://你的域名/<TOKEN>?b64        → Base64 订阅
```

浏览器直接访问 Token 路径显示管理面板，客户端导入时自动识别格式。

## 配置风格说明

当前生成的三套主配置遵循“自包含 + 可直接导入”的思路，重点参考了常见的流行做法：

- **Clash / Mihomo**：参考 MetaCubeX / Clash.Meta 常见写法，内置 fake-ip、nameserver-policy、fallback、GEOSITE/GEOIP 分流
- **Xray-core**：使用内建 DNS + routing + observatory + balancer，偏 `leastPing` 自动选路
- **sing-box**：使用 remote rule-set + selector/urltest + 分类型 DNS server / rule

重点补齐：

- DNS 国内外分流
- AI / Telegram / Google / GitHub / 流媒体分流
- IPv4-only 倾向
- 流媒体域名优先远端 DNS 解析
- 代理节点去重与基础自动选路

> 说明：当前 **Xray-core 导出优先覆盖 VLESS / Trojan**。若订阅里包含 Hysteria2，生成结果会在 `_meta.skipped_nodes` 里标出未导出的节点，避免静默丢失。

## 环境变量说明

- **TOKEN**：访问管理面板和订阅的唯一凭据
- **LINK**：节点链接，一行一条。支持 VLESS + Reality + XHTTP、Trojan、Hysteria2
- **SUBNAME**：订阅导入后在客户端显示的名称（默认 `自用`）
