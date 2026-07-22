# Sub Worker — 私有订阅小岛

基于 Cloudflare Workers / Pages 的个人订阅聚合面板。

这个版本专门按“**根域名打开面板、用户名密码登录、登录后仍停留在根路径**”的使用方式定制：

```text
https://sub.example.com/        # 登录页 / 登录后的面板主页
```

主页不会放在 `/TOKEN` 下；`TOKEN` 只用于订阅 API，方便客户端导入。

---

## 功能概览

- **网页登录面板**：访问 `/` 显示登录页，登录后显示订阅小岛主页。
- **退出登录**：面板右上角提供“退出”按钮，清除浏览器登录 Cookie 后回到 `/`。
- **订阅链接隐藏**：面板不直接展示完整订阅 URL，只提供复制与二维码。
- **敏感信息隐藏**：面板不展示节点 IP、端口、UUID、Trojan 密码、Reality public key / shortId 等。
- **Mihomo / Clash YAML**：生成内联节点配置，不依赖外部 SubConverter。
- **Base64 订阅**：保留原始节点分享链接，适合移动端或通用客户端。
- **VLESS 变体展示**：面板展示 VLESS / REALITY / TLS / TCP / XHTTP / WS / gRPC / Vision / SNI 等非敏感信息。
- **旧链接兼容**：继续兼容 `/TOKEN?clash` 和 `/TOKEN?b64`。

---

## 访问方式

假设域名是：

```text
https://sub.example.com
```

### 面板

```text
https://sub.example.com/
```

未登录时显示登录页；登录成功后仍然回到：

```text
https://sub.example.com/
```

### 新订阅 API

```text
https://sub.example.com/api/sub?token=你的TOKEN&type=clash
https://sub.example.com/api/sub?token=你的TOKEN&type=b64
```

### 兼容旧订阅地址

```text
https://sub.example.com/你的TOKEN?clash
https://sub.example.com/你的TOKEN?b64
```

> 建议新导入客户端时使用 `/api/sub?...` 形式；旧地址只是为了不破坏已有客户端。

---

## 环境变量

| 变量名 | 必填 | 用途 | 推荐值 |
|---|---:|---|---|
| `TOKEN` | ✅ | 订阅 API 访问令牌 | 32 位左右 URL 友好随机字符串 |
| `LINK` | ✅ | 节点分享链接，一行一个 | `vless://...` 多行文本 |
| `SUBNAME` | ❌ | 客户端订阅名称 / 面板副标题 | `我的订阅` |
| `ADMIN_USER` | ✅ | 面板登录用户名 | 建议英文数字，如 `admin` |
| `ADMIN_PASS` | ✅ | 面板登录密码 | 长随机密码 |
| `SESSION_SECRET` | ✅ | 登录 Cookie 签名密钥 | `openssl rand -hex 32` |

### `TOKEN` 和 `SESSION_SECRET` 的区别

- `TOKEN`：会出现在订阅 URL 里，是给 Clash / Mihomo / Shadowrocket 等客户端访问订阅 API 用的。
- `SESSION_SECRET`：不会出现在 URL 里，只用于 Worker 内部校验浏览器登录 Cookie，防止伪造登录状态。

推荐不要把两者设成一样。

### 推荐生成方式

生成 `TOKEN`：

```bash
openssl rand -base64 24 | tr '+/' '-_' | tr -d '='
```

生成 `SESSION_SECRET`：

```bash
openssl rand -hex 32
```

---

## `LINK` 填写示例

每行一个节点链接：

```text
vless://uuid@example.com:443?encryption=none&security=reality&sni=www.apple.com&fp=chrome&pbk=PUBLIC_KEY&sid=SHORT_ID&type=xhttp&path=%2Fxhttp&mode=stream-up#香港-中转-新加坡
vless://uuid@example.com:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.apple.com&fp=chrome&pbk=PUBLIC_KEY&sid=SHORT_ID&type=tcp#洛杉矶-直连
trojan://password@example.com:443?sni=example.com#Trojan-Example
hysteria2://password@example.com:443?sni=example.com#HY2-Example
hy2://password@example.com:443?sni=example.com#HY2-Short
```

注意：

- 一行一个节点；
- 节点名称建议包含地区关键词，便于自动分组；
- XHTTP 建议显式写 `type=xhttp` 和 `mode=stream-up`；
- XHTTP 不建议带 `flow=xtls-rprx-vision`；
- REALITY 节点需要保留 `sni`、`fp`、`pbk`、`sid`。

---

## 部署方式

### 推荐：Cloudflare Pages + GitHub

1. Fork / 导入 / 使用此仓库。
2. 打开 Cloudflare Dashboard。
3. 进入 **Workers & Pages**。
4. 创建 Pages 项目并连接 GitHub 仓库。
5. 构建命令留空。
6. 部署完成后添加环境变量：
   - `TOKEN`
   - `LINK`
   - `SUBNAME`
   - `ADMIN_USER`
   - `ADMIN_PASS`
   - `SESSION_SECRET`
7. 绑定自定义域名，例如 `sub.example.com`。
8. 访问 `https://sub.example.com/` 登录测试。

### 普通 Worker 部署

本项目是模块化结构，入口是 `_worker.js`，同时依赖：

```text
utils.js
convert.js
yaml.js
dashboard.js
```

如果使用普通 Worker，不要只复制 `_worker.js`；需要一起上传模块文件，或自行打包成单文件版本。

---

## 登录与退出逻辑

### 登录

```text
GET  /        未登录显示登录页
POST /login   校验 ADMIN_USER / ADMIN_PASS
GET  /        已登录显示面板
```

登录成功后 Worker 会写入：

```text
sw_session=...
```

Cookie 属性：

```text
HttpOnly
Secure
SameSite=Lax
Max-Age=7天
```

### 退出

面板右上角“退出”按钮访问：

```text
/logout
```

Worker 会清除 `sw_session`，然后跳回 `/`。刷新页面不会丢登录，只有退出、清 Cookie、换浏览器、过期或更换 `SESSION_SECRET` 才需要重新登录。

---

## 面板安全展示规则

面板不会显示：

```text
完整订阅 URL
节点 IP
节点端口
UUID
Trojan password
Reality public key
Reality shortId
WebSocket path
gRPC serviceName
XHTTP path
```

面板会显示：

```text
节点名称
地区图标
协议类型
VLESS / Trojan / Hysteria2
REALITY / TLS
TCP / XHTTP / WS / gRPC
Vision
XHTTP mode
SNI 域名
```

这样适合自己查看、截图或投屏时避免暴露关键连接信息。

---

## 推荐客户端

| 客户端 | 推荐订阅类型 |
|---|---|
| Clash Verge Rev | `type=clash` |
| Mihomo Party | `type=clash` |
| FlClash | `type=clash` |
| Clash Meta for Android | `type=clash` |
| OpenClash / Nikki | `type=clash` |
| v2rayN | `type=b64` |
| NekoBox | `type=b64` |
| Hiddify | `type=b64` |
| Shadowrocket | `type=b64`，视版本协议支持情况 |

---

## 本地测试

本仓库带 Node 内置测试：

```bash
npm test
```

测试覆盖：

- `/` 未登录显示登录页；
- `/login` 错误密码拒绝；
- `/login` 正确密码写入 HttpOnly Cookie 并跳回 `/`；
- 登录后 `/` 显示面板和退出按钮；
- `/logout` 清除 Cookie；
- `/api/sub?token=...&type=b64` 可用；
- 旧的 `/TOKEN?b64` 仍兼容。

---

## 注意事项

- 不要把真实 `TOKEN`、节点链接、UUID、密码提交到仓库。
- 仓库建议保持私有。
- 如果 `TOKEN` 泄露，需要更换 `TOKEN` 并重新导入客户端。
- 如果 `SESSION_SECRET` 泄露，需要更换 `SESSION_SECRET`，所有浏览器会重新登录。
- Cloudflare 环境变量修改后要重新部署 / 等待生效。

---

## License

Private / personal-use subscription worker.
