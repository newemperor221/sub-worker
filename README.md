# Sub Worker 订阅控制台

**基于 Cloudflare Workers / Pages 和 D1 的私有订阅控制台。** 当前版本仅使用 D1 存储节点，不需要 KV。

登录后可添加、排序、搜索、命名、分组、编辑链接和备注节点，也可停用节点而不删除。输出 Auto / Clash / Loon / Base64，管理列表不显示完整节点 URL。

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
- 浏览器本地生成订阅二维码，完整订阅地址不发送给第三方
- D1 事务与版本检查，保存冲突时明确返回 409
- 深色响应式面板，无地区图片或旗帜卡片，无横向溢出

## 环境变量与绑定

| 名称 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `TOKEN` | secret（推荐） | ✅ | 订阅 API 令牌，与管理员会话密钥独立 |
| `ADMIN_USER` | secret/variable | ✅ | 管理员用户名 |
| `ADMIN_PASS` | secret | ✅ | 管理员密码 |
| `SESSION_SECRET` | secret | ✅ | 独立的 Cookie HMAC 密钥；禁止复用 TOKEN 或 ADMIN_PASS，不提供回退 |
| `SUBNAME` | variable | 否 | 订阅显示名称 |
| `SUBSCRIPTIONS_DB` | D1 binding | ✅ | 唯一节点存储 |

`ADMIN_USER`、`ADMIN_PASS`、`SESSION_SECRET` 必须是非空字符串，密钥不得与令牌或管理员密码相同。配置缺失或无效时，登录、管理 API 和健康检查返回 503。

不要将真实令牌、密码、节点链接或部署标识提交到仓库。

## 部署

### Cloudflare Workers（Wrangler）

1. 克隆仓库并创建 D1 数据库：

   ```bash
   git clone https://github.com/newemperor221/sub-worker.git
   cd sub-worker
   npx wrangler login
   npx wrangler d1 create sub-worker-db
   ```

2. 在本地创建 `wrangler.toml`，将数据库 ID 替换为上一条命令的实际输出。以下是配置示例，仓库未附带预配置的 Wrangler 部署文件：

   ```toml
   name = "sub-worker"
   main = "_worker.js"
   compatibility_date = "2026-11-26"

   [vars]
   SUBNAME = "我的订阅"

   [[d1_databases]]
   binding = "SUBSCRIPTIONS_DB"
   database_name = "sub-worker-db"
   database_id = "替换为实际 D1 database ID"
   ```

3. 上传项目，再通过交互输入设置配置：

   ```bash
   npx wrangler deploy
   npx wrangler secret put TOKEN
   npx wrangler secret put ADMIN_USER
   npx wrangler secret put ADMIN_PASS
   npx wrangler secret put SESSION_SECRET
   ```

   首次上传到配置齐全前，受保护入口可能返回 503。`SESSION_SECRET` 应单独随机生成，建议至少 32 字节；不能复用 `TOKEN` 或 `ADMIN_PASS`。不要将真实值写进示例文件。

4. 打开部署地址的 `/api/health`，确认 `ok: true`，且 `storage`、`subscriptionSource` 均为 `d1`；随后通过 `/login` 登录并添加节点。

数据库表和版本记录会在首次读取时自动初始化。也可以预先执行：

```bash
npx wrangler d1 execute sub-worker-db --remote --file=schema.sql
```

Wrangler 会从 `_worker.js` 打包导入的模块，无需单独安装运行时 npm 依赖。配置与 Secrets 的说明见 [Wrangler 官方文档](https://developers.cloudflare.com/workers/wrangler/configuration/) 和 [Secrets 官方文档](https://developers.cloudflare.com/workers/configuration/secrets/)。

### Cloudflare Pages

使用 Pages 的 `_worker.js` 入口部署方式时，发布目录需同时包含入口和全部运行时模块，不能只上传 `_worker.js`。在项目的目标部署环境中绑定 D1，绑定名称必须为 `SUBSCRIPTIONS_DB`，并设置上表中的令牌、管理员配置和独立会话密钥。修改绑定后重新部署，再验证 `/api/health` 和 `/login`。

提交代码到 GitHub 与部署 Cloudflare 是两个步骤；只有已配置相应自动部署流程时，推送代码才会触发发布。

## 从旧版本升级

- 已有 D1：沿用同一个 `SUBSCRIPTIONS_DB` 绑定，节点和排序数据会保留；表结构与版本记录由运行时幂等补齐。
- 只有旧 KV：本版本不会自动读取或迁移。上线前将所需节点录入或导入 D1，并核对名称、分组、顺序和启停状态。
- 确认 D1 数据齐全后，可移除旧 `SUBSCRIPTIONS` 绑定。无需删除旧命名空间才能运行新版。
- 设置独立的 `SESSION_SECRET` 后重新登录；更换该密钥会使旧会话失效。
- 不要让旧版写入代码与新版并行处理管理请求，以免绕过新版的版本检查。

D1 故障时不使用旧备份自动回退。备份和恢复应单独安排；本项目不提供运行时 KV 备份。

## 管理 API

所有管理请求都需要有效登录 Cookie，并返回 `Cache-Control: no-store`：

```text
GET    /api/manage/subscriptions   # 全部节点（含停用节点和元数据，不返回 URL）
POST   /api/manage/subscriptions   # { "link": "vless://...", "name": "香港入口", "group": "香港" }
PATCH  /api/manage/subscriptions   # { "id": "稳定ID", "direction": "up|down" }
PUT    /api/manage/subscriptions   # { "id": "稳定ID", "name": "...", "group": "...", "url": "可选替换链接", "note": "...", "enabled": true }
DELETE /api/manage/subscriptions   # { "id": "稳定ID" }
```

D1 管理写入使用版本检查和事务内的逐条 SQL 更新，不再删除重写全表。并发冲突返回 409，请刷新后重试。GET 和写入响应带 `revision`；面板会自动在写入 JSON 中带回该版本。自行调用 API 时也应带上最新 `revision`，以便拒绝旧快照的修改：

```json
{ "id": "节点ID", "revision": "GET返回的版本", "enabled": false }
```

409 也可能表示重复链接；请按响应中的 `error` 判断原因。

名称与分组均为必填，最长 64 字符；备注最长 500 字符。`enabled` 必须是 JSON 布尔值。编辑时若不替换链接，应省略 `url` 字段；面板会自动处理留空输入。直接向 API 发送空 `url` 会返回 400。管理列表和普通 API 响应不会返回完整 URL。

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

## 部署前配置检查

将目标环境的 `ADMIN_USER`、`ADMIN_PASS`、`SESSION_SECRET`（以及用于检查密钥独立性的 `TOKEN`）注入进程环境后运行：

```bash
npm run check:config
```

检查失败会返回非零退出码，可作为部署流水线的前置条件。该命令只读取本地进程环境，不自动加载 `.env` / `.dev.vars`，也不会读取 Cloudflare 远端 Secrets 或验证 D1 绑定。目标部署仍需配置完整的环境变量和数据库绑定；运行时也会执行管理员配置检查。

## 常见状态码

| 状态码 | 含义与处理 |
|---|---|
| `400` | 请求格式、节点链接或元数据校验失败；按错误提示修正 |
| `401` | 管理会话缺失或无效；重新登录 |
| `404` | 订阅令牌不正确、路径不存在、格式参数不支持或节点 ID 不存在；核对请求 |
| `409` | 版本冲突或链接重复；查看 `error`，必要时刷新后重试 |
| `422` | Clash / Loon 没有可转换的有效节点；添加或启用有效节点 |
| `503` | 管理员配置无效，或 D1 缺失 / 不可用；结合请求路径和健康检查排查 |

空订阅的 Base64 输出为空字符串；健康检查通过并不代表已经录入有效节点。

## 保存时的节点校验

新增和替换链接共用 `validation.js`，要求显式的有效端口、服务器地址和身份凭据。VLESS 身份采用 UUID，支持 tcp/ws/grpc/http/h2/xhttp；Reality 要求有效公钥格式和 short-id 格式，Vision flow 仅允许安全 TCP。Hysteria2 支持无混淆和带密码的 salamander；布尔值、带宽及已支持的传输参数均检查格式。未知、重复、冲突参数被拒绝，错误响应不回显完整链接。

旧存储的订阅读取保留兼容行为；新校验不会批量重写旧节点，但编辑旧节点时需使其链接满足当前校验。

## 本地测试

无需运行时 npm 依赖。测试需要 Node.js >=22.13（使用真实 SQLite 验证 D1 SQL），二维码解码测试使用仅开发依赖：

```bash
npm ci
npm test
```

当前测试集共 **60 项**，包含配置缺失和密钥轮换、二维码实际图像解码、并发冲突与重试、事务回滚、D1 故障与缺失绑定、禁止访问旧存储、空库不回填、无效节点零写入，并覆盖认证与路由、名称/分组持久化、节点链接替换、稳定 ID 排序、停用节点从四种输出排除，以及搜索/筛选/编辑 UI 标记。

## 部署文件

| 文件 | 用途 |
|---|---|
| `_worker.js` | HTTP 路由、会话认证、D1 初始化与管理事务 |
| `dashboard.js` | 管理界面与本地二维码交互 |
| `utils.js` | 配置读取、管理员配置校验与 Base64 编码 |
| `validation.js` | 节点保存前的字段校验 |
| `convert.js` | VLESS / Hysteria2 解析与转换 |
| `yaml.js` / `loon.js` | Clash / Loon 输出 |
| `qr.js` | 随项目分发的二维码生成库 |
| `schema.sql` | 可选的 D1 预初始化脚本 |
| `check-config.mjs` | 部署前管理员配置检查 |

运行时模块必须完整发布。`*.test.mjs`、测试依赖和本地配置检查脚本无需作为运行时模块上传。

## License

Personal-use subscription worker.

二维码库的第三方许可见 [THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt)。
