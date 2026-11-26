# Sub Worker 订阅控制台

私有 Cloudflare Worker 订阅面板。登录后可添加、排序、搜索、命名、分组、编辑链接和备注节点，也可停用节点而不删除。输出 Auto / Clash / Loon / Base64，管理列表不显示完整节点 URL。

## 存储模型

- **D1 主存储**：绑定名固定为 `SUBSCRIPTIONS_DB`。绑定且可用时，D1 是唯一权威数据源。
- **KV 兼容与备份**：绑定名固定为 `SUBSCRIPTIONS`。结构化备份写入 `subscription_nodes_v2`，同时继续写入兼容 key `subscription_links`（URL 数组）。
- **无 D1 时**：Worker 使用结构化 KV 完整支持添加、排序、编辑元数据、启停和删除，因此可以先部署 KV 版本，再绑定 D1。
- **首次绑定 D1**：运行时安全执行 `CREATE TABLE IF NOT EXISTS`，然后只迁移一次 KV 数据。`app_meta` 中的 `kv_nodes_migrated_v2` 标记可防止删除全部节点后又从旧 KV 数据回填。
- **D1 读取失败**：订阅接口可以读取 KV 备份。D1 已绑定时，管理写入会失败而不是写 KV，避免 split-brain。
- D1 成功变更后会刷新两个 KV key；若 KV 未绑定或备份写入失败，D1 中的变更仍是权威结果，API 的 `backupUpdated` 会反映备份状态。
- `LINK`、`LINK1...` 环境变量仍然完全停用，不参与迁移、读取或回退。

每个节点保存稳定字符串 ID、URL、名称、整数位置、分组、备注、启用状态和创建/更新时间。停用节点仍在面板中，但不会进入任何订阅输出。

## 功能

- 仅接受 `vless://` 与完整的 `hysteria2://` 链接
- 添加节点时必须填写一个完整链接、名称和分组
- 按稳定 ID 相邻上移/下移和删除
- 编辑名称、分组、节点链接和备注
- 客户端搜索覆盖节点名称、分组和备注
- 分组与启用状态筛选
- Auto 根据 User-Agent 选择 Loon、Clash/Mihomo 或 Base64
- 深色响应式面板，无地区图片或旗帜卡片，无横向溢出

## 环境变量与绑定

| 名称 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `TOKEN` | secret/variable | ✅ | 订阅 API 令牌 |
| `ADMIN_USER` | secret/variable | ✅ | 管理员用户名 |
| `ADMIN_PASS` | secret | ✅ | 管理员密码 |
| `SESSION_SECRET` | secret | 推荐 | Cookie HMAC 密钥；未设置时由 `ADMIN_PASS` 派生 |
| `SUBNAME` | variable | 否 | 订阅显示名称 |
| `SUBSCRIPTIONS` | KV binding | 推荐 | KV 兼容存储和 D1 备份；无 D1 时必填 |
| `SUBSCRIPTIONS_DB` | D1 binding | 推荐 | D1 权威存储 |

不要把真实令牌、密码、节点链接、数据库 ID 或 KV namespace ID 提交到仓库。

## 创建 D1 与 KV

### Wrangler

```bash
npx wrangler d1 create sub-worker-db
npx wrangler kv namespace create SUBSCRIPTIONS
```

在项目的 Wrangler 配置中使用命令输出的 ID：

```toml
[[d1_databases]]
binding = "SUBSCRIPTIONS_DB"
database_name = "sub-worker-db"
database_id = "你的 D1 database ID"

[[kv_namespaces]]
binding = "SUBSCRIPTIONS"
id = "你的 KV namespace ID"
```

可以预先应用仓库中的 schema；即使不执行，Worker 也会在运行时幂等初始化：

```bash
npx wrangler d1 execute sub-worker-db --remote --file=schema.sql
```

### Cloudflare Dashboard / Pages

1. 在 **Storage & Databases → KV** 创建命名空间，并以 `SUBSCRIPTIONS` 绑定。
2. 在 **Storage & Databases → D1** 创建数据库，并以 `SUBSCRIPTIONS_DB` 绑定。
3. 重新部署 Worker/Pages 项目。
4. 请求 `/api/health` 或登录面板触发初始化与一次性迁移。
5. 确认健康响应的 `storage` 与 `subscriptionSource` 为 `d1`。

推荐先绑定 KV 并部署，确认现有 `subscription_links` 可用后再绑定空 D1。首次 D1 初始化会优先读取 `subscription_nodes_v2`；该 key 不存在时再读取 `subscription_links`。迁移期间不要手工编辑两个 key。

## 管理 API

所有管理请求都需要有效登录 Cookie，并返回 `Cache-Control: no-store`：

```text
GET    /api/manage/subscriptions   # 全部节点（含停用节点和元数据，不返回 URL）
POST   /api/manage/subscriptions   # { "link": "vless://...", "name": "香港入口", "group": "香港" }
PATCH  /api/manage/subscriptions   # { "id": "稳定ID", "direction": "up|down" }
PUT    /api/manage/subscriptions   # { "id": "稳定ID", "name": "...", "group": "...", "url": "可选替换链接", "note": "...", "enabled": true }
DELETE /api/manage/subscriptions   # { "id": "稳定ID" }
```

名称与分组均为必填，最长 64 字符；备注最长 500 字符。`enabled` 必须是 JSON 布尔值。编辑时仅在 `url` 非空时替换节点链接，管理列表和普通 API 响应不会返回完整 URL。

## 订阅接口

```text
/api/sub?token=你的TOKEN&type=auto
/api/sub?token=你的TOKEN&type=clash
/api/sub?token=你的TOKEN&type=loon
/api/sub?token=你的TOKEN&type=base64
```

Auto 规则：Loon 输出 Loon；Clash、Mihomo、Stash、OpenClash、Nikki、FlClash 输出 Clash；其他客户端输出 Base64。Auto 响应带 `Vary: User-Agent`。旧 `/TOKEN?...` 路径和 `type=b64` / `type=mihomo` 不受支持。

## Clash 模板

Clash/Mihomo 输出的路由与 DNS 结构取自 `newemperor221/mt3600be-mihomo` 仓库的 `mihomo.yaml`（原为 MT3600BE 路由器导出配置）：端口与监听、`geox-url`、sniffer、fake-ip DNS、`rule-providers`（`oc-cn-domain`）和 59 条分流规则逐项对齐。

模板中的服务策略原本按具体节点名书写（洛杉矶、洛杉矶 CN2、大阪…）。订阅端节点由面板动态维护，因此渲染时把这些名字替换为等价策略组：美国具体节点 → `🇺🇸 美国节点` / `🇺🇸 美国固定节点`，其余地区 → `🇸🇬 新加坡节点` 等地区组；不存在的地区自动从组内剔除，避免悬空引用。`🇺🇸 美国固定节点` 默认把名称含 `CN2` 的节点排在最前，保留模板里 GitHub 默认走洛杉矶 CN2 的语义。

## 路由与安全

- `/login`：管理员登录
- `/随机字符/home`：与签名 Cookie 绑定的管理主页
- `/logout`：清除会话
- `/api/health`：存储状态、格式与管理能力，不返回秘密

Cookie 使用 `HttpOnly; Secure; SameSite=Lax`，有效期 7 天。订阅 URL 持有 `TOKEN` 的客户端可获取启用节点的完整凭据；请只通过 HTTPS 分发，并在泄露后立即轮换令牌。

## 本地测试

无需运行时依赖：

```bash
npm test
```

测试覆盖认证与路由、KV 结构化模式、KV→D1 一次性迁移、迁移标记、名称/分组持久化、节点链接替换、稳定 ID 排序、D1 失败回退和写入拒绝、停用节点从四种输出排除，以及搜索/筛选/编辑 UI 标记。

## 部署文件

Worker 入口为 `_worker.js`，并依赖 `dashboard.js`、`utils.js`、`convert.js`、`yaml.js` 与 `loon.js`。`schema.sql` 是可选的预初始化脚本。Cloudflare Pages 可直接部署；普通 Worker 需要上传这些 ES modules 或自行打包。

## License

Personal-use subscription worker.
