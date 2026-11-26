# Sub Worker 订阅控制台

私有 Cloudflare Worker 订阅面板。登录后可添加、排序、搜索、命名、分组、编辑链接和备注节点，也可停用节点而不删除。输出 Auto / Clash / Loon / Base64，管理列表不显示完整节点 URL。

## 存储模型

- **D1 唯一存储**：必须以 `SUBSCRIPTIONS_DB` 绑定数据库。所有节点管理和订阅输出均使用 D1。
- **自动初始化**：运行时幂等创建表和索引，为旧 schema 补充名称列，并初始化并发控制版本。已有 D1 节点和版本不会被重置。
- **故障处理**：D1 未绑定或不可用时，订阅、管理和已登录主页返回 503；健康检查同时报告异常。不读取其他数据源。
- 不再提供 KV 读取、写入、迁移、备份或故障回退。`LINK`、`LINK1...` 环境变量仍然停用。

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
| `SESSION_SECRET` | secret | ✅ | 独立的 Cookie HMAC 密钥；禁止复用 TOKEN 或 ADMIN_PASS，不提供回退 |
| `SUBNAME` | variable | 否 | 订阅显示名称 |
| `SUBSCRIPTIONS_DB` | D1 binding | ✅ | 唯一节点存储 |

不要把真实令牌、密码、节点链接、数据库 ID  提交到仓库。

## 创建 D1

### Wrangler

```bash
npx wrangler d1 create sub-worker-db
```

在项目的 Wrangler 配置中使用命令输出的 ID：

```toml
[[d1_databases]]
binding = "SUBSCRIPTIONS_DB"
database_name = "sub-worker-db"
database_id = "你的 D1 database ID"

```

可以预先应用仓库中的 schema；即使不执行，Worker 也会在运行时幂等初始化：

```bash
npx wrangler d1 execute sub-worker-db --remote --file=schema.sql
```

### Cloudflare Dashboard / Pages

1. 在 **Storage & Databases → D1** 创建数据库，并以 `SUBSCRIPTIONS_DB` 绑定。
2. 配置管理员凭据、独立会话密钥和订阅令牌，重新部署 Worker/Pages 项目。
3. 请求 `/api/health` 或登录面板触发初始化。
4. 确认健康响应的 `storage` 与 `subscriptionSource` 为 `d1`。

已有 D1 节点可直接沿用。若节点尚且只存在旧 KV 中，请先将需要的节点录入或导入 D1 并核对；本版本不会自动迁移旧 KV 数据。确认 D1 数据齐全后，可从部署设置移除旧 `SUBSCRIPTIONS` 绑定。

## 管理 API

所有管理请求都需要有效登录 Cookie，并返回 `Cache-Control: no-store`：

```text
GET    /api/manage/subscriptions   # 全部节点（含停用节点和元数据，不返回 URL）
POST   /api/manage/subscriptions   # { "link": "vless://...", "name": "香港入口", "group": "香港" }
PATCH  /api/manage/subscriptions   # { "id": "稳定ID", "direction": "up|down" }
PUT    /api/manage/subscriptions   # { "id": "稳定ID", "name": "...", "group": "...", "url": "可选替换链接", "note": "...", "enabled": true }
DELETE /api/manage/subscriptions   # { "id": "稳定ID" }
```

D1 管理写入使用版本检查和事务内的逐条 SQL 更新，不再删除重写全表。并发冲突返回 409，请刷新后重试。GET 和写入响应带 `revision`；客户端在写入 JSON 中带回该版本，避免旧面板覆盖新数据。

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

Clash/Mihomo 输出采用 MT3600BE 当前「出去看看」配置的 Fake-IP DNS、域名嗅探、GeoData、`oc-cn-domain` 规则集和 59 条分流规则。订阅文件的 DNS 和面板监听使用本机地址，由 OpenClash 接管路由器运行时端口。

当订阅包含同名节点时，默认代理、GitHub、X、YouTube 和 TikTok 优先选 `洛杉矶 CN2`，AI、Google、Reddit、Meta 和 PayPal 优先选 `洛杉矶`。Netflix、Telegram 和海外游戏优先选新加坡，Spotify 优先选尼日利亚。各策略组保留地区回退，缺失的节点和地区会自动从候选项中移除。`store-selected` 保留客户端手动选中的节点。

订阅转换从 D1 读取已启用节点。更新模板时，订阅链接、节点数据、排序和启停状态继续由原有存储管理。

## 路由与安全

- `/login`：管理员登录
- `/随机字符/home`：与签名 Cookie 绑定的管理主页
- `/logout`：清除会话
- `/api/health`：存储状态、格式与管理能力，不返回秘密

二维码使用随项目分发的 qrcode-generator 2.0.4（MIT）在浏览器本地生成，不向第三方发送订阅地址。生成失败时请使用复制链接。

Cookie 使用 `HttpOnly; Secure; SameSite=Lax`，有效期 7 天。订阅 URL 持有 `TOKEN` 的客户端可获取启用节点的完整凭据；请只通过 HTTPS 分发，并在泄露后立即轮换令牌。

## 配置检查与升级

`ADMIN_USER`、`ADMIN_PASS`、`SESSION_SECRET` 均为必填非空配置；缺失时 `/login`、管理 API 和健康检查返回 503，不签发管理员会话。`SESSION_SECRET` 必须独立于订阅 TOKEN 和管理员密码，建议使用密码管理器生成的至少 32 字节随机值。轮换该密钥会使旧会话失效。

部署前，将目标环境的这三项配置以环境变量注入检查进程，再运行 `npm run check:config`；检查失败会返回非零退出码，供部署流水线阻止发布。Cloudflare 远端 Secrets 不会被该本地命令自动读取，仍需在目标部署环境配置；运行时检查始终生效。不要将真实值写入仓库。

升级前先设置独立的 `SESSION_SECRET` 并绑定 D1。只有旧 KV 数据而没有 D1 节点的部署，需要先完成节点转移；缺少 D1 时订阅和管理均返回 503。D1 的版本记录由运行时自动初始化，不需要手工更改现有节点。回退到旧写入版本会失去并发保护，应避免新旧版本同时处理管理写入。

## 保存时的节点校验

新增和替换链接共用 `validation.js`，要求显式的有效端口、服务器地址和身份凭据。VLESS 身份采用 UUID，支持 tcp/ws/grpc/http/h2/xhttp；Reality 要求有效公钥格式和 short-id 格式，Vision flow 仅允许安全 TCP。Hysteria2 支持无混淆和带密码的 salamander；布尔值、带宽及已支持的传输参数均检查格式。未知、重复、冲突参数被拒绝，错误响应不回显完整链接。

旧存储的订阅读取保留兼容行为；新校验不会批量重写旧节点，但编辑旧节点时需使其链接满足当前校验。

## 本地测试

无需运行时 npm 依赖。测试需要 Node.js >=22.13（使用真实 SQLite 验证 D1 SQL），二维码解码测试使用仅开发依赖：

```bash
npm ci
npm test
```

测试包含配置缺失和密钥轮换、二维码实际图像解码、并发冲突与重试、事务回滚、D1 故障与缺失绑定、禁止访问旧存储、空库不回填、无效节点零写入，并覆盖认证与路由、名称/分组持久化、节点链接替换、稳定 ID 排序、停用节点从四种输出排除，以及搜索/筛选/编辑 UI 标记。

## 部署文件

Worker 入口为 `_worker.js`，并依赖 `dashboard.js`、`utils.js`、`convert.js`、`yaml.js`、`loon.js`、`validation.js` 与 `qr.js`。`schema.sql` 是可选的预初始化脚本。Cloudflare Pages 可直接部署；普通 Worker 需要上传这些 ES modules 或自行打包。

## License

Personal-use subscription worker.
