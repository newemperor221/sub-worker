# Sub Worker 订阅控制台

> 私有代理订阅管理控制台：登录后添加、排序和删除节点，生成 Auto / Clash / Loon / Base64 订阅并扫码导入，同时隐藏敏感连接细节。

[![Cloudflare Worker](https://img.shields.io/badge/runtime-Cloudflare%20Workers-f38020?style=flat-square)](#部署)
[![Private Panel](https://img.shields.io/badge/panel-private%20login-5f7fe7?style=flat-square)](#访问结构)
[![Dark Console](https://img.shields.io/badge/style-dark%20console-6875f5?style=flat-square)](#视觉风格)
[![Node Test](https://img.shields.io/badge/test-node%20--test-b2f2bb?style=flat-square)](#本地测试)

---

## 这是什么

`sub-worker` 是一个部署在 **Cloudflare Pages / Workers** 上的私有订阅面板。

它会把 Cloudflare KV 中的节点分享链接整理成：

- Auto 自动识别订阅
- Clash / Mihomo YAML 订阅
- Loon 原生 Proxy 订阅
- Base64 原始分享链接订阅
- 登录后可视化管理节点、调整顺序和查看脱敏摘要
- 可复制 / 可扫码的订阅入口

当前版本是 **单管理员、单订阅源** 版本：

- 面板登录使用 `ADMIN_USER` / `ADMIN_PASS`
- 订阅接口使用 `TOKEN`
- 节点仅来自绑定名为 `SUBSCRIPTIONS` 的 Cloudflare KV
- 首次创建并绑定 KV 后，以后可直接在登录面板批量添加、查看脱敏摘要、调整顺序和删除节点
- 不需要 D1 或其他数据库
- 主页不展示完整订阅 URL
- 登录后进入随机路径 `/随机字符/home`

---

## 视觉风格

当前 UI 是纯深色、紧凑的 SaaS 管理后台：

- 炭黑页面背景、深灰面板、细灰边框与克制的紫蓝主色
- 高对比文字和系统字体栈：`system-ui / Segoe UI / PingFang SC / Microsoft YaHei / Noto Sans CJK SC`
- 顶部品牌栏和居中内容区，不使用侧边栏、玻璃态或大型 Hero
- `/login` 使用工作区介绍与登录表单组成的双栏布局，移动端自动收为单列
- `/随机字符/home` 使用两列控制台布局：左侧管理节点，右侧展示 Auto / Clash / Loon / Base64 导出入口
- 字体和操作图标统一采用较大的可读尺寸；节点卡片不显示地区图片或旗帜
- 桌面端导出工具保持在右侧，移动端自动切换为单列布局

---

## 访问结构

### 登录页

```text
/login
```

未登录访问根路径：

```text
/
```

会自动跳转到：

```text
/login
```

### 登录后的面板主页

登录成功后会跳转到随机主页路径：

```text
/随机字符/home
```

这个随机路径和登录 Cookie 绑定。没有对应会话时，直接访问别人猜的 `/随机字符/home` 不会显示面板。

### 退出登录

```text
/logout
```

退出时会清理登录 Cookie，并跳回 `/login`。

---

## 订阅接口

推荐新接口：

```text
https://你的域名/api/sub?token=你的TOKEN&type=auto
https://你的域名/api/sub?token=你的TOKEN&type=clash
https://你的域名/api/sub?token=你的TOKEN&type=loon
https://你的域名/api/sub?token=你的TOKEN&type=base64
```

参数：

| 参数 | 说明 |
|---|---|
| `token` | 订阅访问令牌，对应环境变量 `TOKEN` |
| `type=auto` | 根据客户端 User-Agent 自动选择 Loon、Clash 或 Base64 |
| `type=clash` | 输出 Clash / Mihomo YAML |
| `type=loon` | 输出 Loon 原生 `[Proxy]` 订阅 |
| `type=base64` | 输出 Base64 原始分享链接订阅 |

仅支持上面的 `/api/sub?...` 地址，不兼容旧 `/TOKEN?...` 地址或 `type=b64` 别名。

Auto 识别规则：Loon 客户端输出 Loon 格式；Clash、Mihomo、Stash、OpenClash、Nikki、FlClash 输出 Clash 格式；其他客户端回退到 Base64。Auto 响应带有 `Vary: User-Agent`，避免不同客户端之间复用错误格式的缓存。

---

## 环境变量

Cloudflare Pages / Workers 需要配置：

| 变量名 | 必填 | 说明 |
|---|---:|---|
| `TOKEN` | ✅ | 订阅接口访问令牌，会出现在客户端订阅 URL 中 |
| `ADMIN_USER` | ✅ | 网页面板登录用户名 |
| `ADMIN_PASS` | ✅ | 网页面板登录密码 |
| `SESSION_SECRET` | 推荐 | Cookie 签名密钥；未设置时回退到由 `ADMIN_PASS` 派生的稳定密钥 |
| `SUBNAME` | ❌ | 面板副标题 / 客户端订阅名称 |

生成 URL 友好的 `TOKEN`：

```bash
openssl rand -base64 24 | tr '+/' '-_' | tr -d '='
```

生成 `SESSION_SECRET`：

```bash
openssl rand -hex 32
```

`TOKEN` 和 `SESSION_SECRET` 不要设置成一样：

| 变量 | 用途 | 是否会出现在 URL |
|---|---|---:|
| `TOKEN` | 订阅 API 访问令牌 | 会 |
| `SESSION_SECRET` | 登录 Cookie 签名密钥 | 不会 |

---

## Cloudflare KV 创建与绑定

KV 只需首次创建并绑定一次；完成后节点增删和排序都在登录面板操作。

### Pages 项目

1. 在 Cloudflare Dashboard 打开 **Storage & Databases → KV**，创建一个 KV 命名空间（名称可自定）。
2. 打开对应的 **Workers & Pages → Pages 项目 → Settings → Bindings**。
3. 新增 **KV namespace binding**，变量名必须填写 `SUBSCRIPTIONS`，选择刚创建的命名空间。
4. 保存绑定并重新部署一次项目。
5. 登录 `/login`，在“订阅管理 / 添加订阅”中粘贴节点（每行一个）并保存。

### 普通 Worker

在 Worker 的 **Settings → Bindings** 中新增 KV namespace，变量名同样必须是 `SUBSCRIPTIONS`，保存后重新部署。若使用 Wrangler，可在配置中增加：

```toml
[[kv_namespaces]]
binding = "SUBSCRIPTIONS"
id = "你的 KV namespace ID"
```

Worker 使用固定 key `subscription_links` 保存一个 JSON 节点链接数组。不要手工创建多个 key。

### 唯一数据源

- `SUBSCRIPTIONS` KV 是节点的唯一数据源。
- 未绑定 KV 时不提供节点订阅，面板只显示绑定提示。
- KV 中固定 key 尚不存在或保存为空数组时，节点列表为空。
- `LINK`、`LINK1...` 环境变量已彻底停用，即使误配也不会读取。
- REALITY 节点需要保留 `sni`、`fp`、`pbk`、`sid`
- XHTTP 建议写清楚 `type=xhttp` 和 `mode=stream-up`
- XHTTP 不建议带 `flow=xtls-rprx-vision`

---

## 面板管理节点

1. 登录后滚动到“订阅管理”。
2. 在“添加订阅”中粘贴一行或多行节点链接并保存。
3. 输入会自动 trim、忽略空行并去重；仅接受 `vless://`、`hysteria2://`。
4. “已添加节点”只显示协议与节点名称等脱敏摘要；使用上移/下移按钮调整顺序，点击删除可移除对应节点。
5. 排序会直接写回 KV，Auto、Clash、Loon、Base64 都按相同的新顺序输出。
6. 添加、排序或删除后，订阅 API 与节点卡片都以 KV 中的最新数组为准。

这些操作使用同源管理 API、登录 Cookie，并且响应禁止缓存。未登录请求会被拒绝；未绑定 KV 时不会假装保存成功。

---

## 面板展示规则

面板会尽量隐藏敏感信息，适合截图或投屏。

不会直接展示：

```text
完整订阅 URL
节点 IP / 域名
节点端口
UUID
Hysteria2 password
Reality public key
Reality shortId
WS path
gRPC serviceName
XHTTP path
```

会展示：

```text
节点名称
协议类型
VLESS / Hysteria2
REALITY / TLS
TCP / XHTTP / WS / gRPC
Vision
XHTTP mode
SNI 域名
```

---

## Cookie 与登录状态

登录后 Worker 写入：

```text
sub_worker_session=...
```

Cookie 属性：

```text
HttpOnly
Secure
SameSite=Lax
Max-Age=7天
```

会重新要求登录的情况：

- 点击退出
- 浏览器清 Cookie
- 换浏览器 / 换设备
- Cookie 超过 7 天
- 修改 `SESSION_SECRET`

退出时会清理当前的 `sub_worker_session` Cookie。

---

## 部署

### Cloudflare Pages + GitHub

1. 打开 Cloudflare Dashboard。
2. 进入 **Workers & Pages**。
3. 创建 Pages 项目并连接此 GitHub 仓库。
4. 构建命令留空。
5. 配置环境变量：
   - `TOKEN`
   - `ADMIN_USER`
   - `ADMIN_PASS`
   - `SESSION_SECRET`
   - `SUBNAME`

6. 按上文创建 KV 命名空间，并以 `SUBSCRIPTIONS` 绑定到项目。
7. 重新部署并绑定自定义域名。
8. 访问 `/login`，登录后在“订阅管理”中维护节点。

### 普通 Worker 部署

项目是模块化结构，入口是：

```text
_worker.js
```

同时依赖：

```text
utils.js
convert.js
yaml.js
loon.js
dashboard.js
```

如果不用 Pages，而是普通 Worker，需要一起上传这些模块，或自行打包成单文件。

---

## 支持协议和客户端

当前节点解析支持：

- VLESS
- Hysteria2（仅接受完整的 `hysteria2://` scheme）

推荐客户端：

| 客户端 | 推荐类型 |
|---|---|
| 自动识别 | `type=auto` |
| Clash Verge Rev | `type=clash` |
| Mihomo Party | `type=clash` |
| FlClash | `type=clash` |
| Clash Meta for Android | `type=clash` |
| OpenClash / Nikki | `type=clash` |
| Loon | `type=loon` |
| v2rayN | `type=base64` |
| NekoBox | `type=base64` |
| Hiddify | `type=base64` |
| Shadowrocket | `type=base64`，视版本协议支持情况 |

---

## 本地测试

```bash
npm test
```

当前测试覆盖：

- `/` 未登录跳 `/login`
- `/login` 显示深色管理后台登录卡
- 登录成功后跳 `/随机字符/home`
- 随机主页路径必须匹配当前会话
- `/logout` 清理 Cookie
- `/api/sub` 需要 `TOKEN`
- `type=auto` 按 User-Agent 选择 Loon、Clash 或 Base64，并返回 `Vary: User-Agent`
- 旧 `/TOKEN?...` 地址、`type=b64` 和 `type=mihomo` 均拒绝
- 管理 API 未登录拒绝，登录后可增/列/排序/删
- 多行输入去重、非法协议和未绑定 KV 错误
- KV 唯一数据源与空 KV 行为
- 面板不暴露完整节点链接

---

## 安全注意事项

- 不要把真实 `TOKEN`、`SESSION_SECRET`、密码、节点链接提交到仓库。
- `TOKEN` 泄露后，别人可以拉取订阅，需要立即更换。
- `SESSION_SECRET` 泄露后，别人可能伪造网页登录状态，需要立即更换。
- 仓库即使公开，也不要公开任何真实连接串或环境变量。
- `SUBSCRIPTIONS` KV 保存完整节点凭据；只把它绑定到此 Worker，不要公开 KV 内容或授予无关账号写权限。
- 管理 API 只接受有效登录 Cookie，并返回 `no-store`；节点卡片和列表只显示脱敏摘要，但订阅 API 持有 `TOKEN` 的客户端仍可获取完整节点。
- 当前版本是单管理员模型；不包含多用户权限隔离，也不需要 D1。

---

## License

Personal-use subscription worker.
