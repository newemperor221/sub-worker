# Sub Worker 私有订阅面板

这是一个部署在 **Cloudflare Pages / Workers** 上的私有订阅面板，用来把一组代理节点链接整理成 Clash / Mihomo YAML 或 Base64 订阅。

当前版本是 **单管理员、单订阅源** 版本：

- 面板登录使用 `ADMIN_USER` / `ADMIN_PASS`；
- 订阅接口使用 `TOKEN`；
- 节点内容来自环境变量 `LINK`；
- 不需要 D1 / KV / 数据库；
- 主页不暴露 `TOKEN`；
- 登录后进入随机路径 `/随机字符/home`。

---

## 当前访问结构

以当前域名为例：

```text
https://sub-xwcf0.357561.xyz
```

### 登录页

```text
https://sub-xwcf0.357561.xyz/login
```

未登录访问根路径：

```text
https://sub-xwcf0.357561.xyz/
```

会自动跳转到：

```text
https://sub-xwcf0.357561.xyz/login
```

### 登录后的面板主页

登录成功后会跳转到随机主页路径：

```text
https://sub-xwcf0.357561.xyz/随机字符/home
```

例如：

```text
https://sub-xwcf0.357561.xyz/Z0i9J3VjQ1uJkQOe6I_ZCA/home
```

这个随机路径和登录 Cookie 绑定。直接访问别人猜的 `/随机字符/home` 不会显示面板。

### 退出登录

面板右上角有退出按钮，访问：

```text
/logout
```

退出后会清理登录 Cookie，并跳回：

```text
/login
```

---

## 订阅接口

### 推荐新接口

```text
https://sub-xwcf0.357561.xyz/api/sub?token=你的TOKEN&type=clash
https://sub-xwcf0.357561.xyz/api/sub?token=你的TOKEN&type=b64
```

参数说明：

| 参数 | 说明 |
|---|---|
| `token` | 订阅访问令牌，对应环境变量 `TOKEN` |
| `type=clash` | 输出 Clash / Mihomo YAML |
| `type=b64` | 输出 Base64 原始分享链接订阅 |

### 旧接口兼容

仍然兼容旧格式：

```text
https://sub-xwcf0.357561.xyz/你的TOKEN?clash
https://sub-xwcf0.357561.xyz/你的TOKEN?b64
```

建议新客户端优先使用 `/api/sub?...`。

---

## 环境变量

Cloudflare Pages / Workers 里需要配置：

| 变量名 | 必填 | 说明 |
|---|---:|---|
| `TOKEN` | ✅ | 订阅接口访问令牌，会出现在客户端订阅 URL 中 |
| `LINK` | ✅ | 节点分享链接，一行一个 |
| `ADMIN_USER` | ✅ | 网页面板登录用户名 |
| `ADMIN_PASS` | ✅ | 网页面板登录密码 |
| `SESSION_SECRET` | ✅ | Cookie 签名密钥，只给 Worker 后端使用 |
| `SUBNAME` | ❌ | 面板副标题 / 客户端订阅名称 |

### 生成推荐值

生成 URL 友好的 `TOKEN`：

```bash
openssl rand -base64 24 | tr '+/' '-_' | tr -d '='
```

生成 `SESSION_SECRET`：

```bash
openssl rand -hex 32
```

### `TOKEN` 和 `SESSION_SECRET` 区别

| 变量 | 用途 | 是否会暴露在 URL |
|---|---|---:|
| `TOKEN` | 订阅 API 访问令牌 | 会 |
| `SESSION_SECRET` | 登录 Cookie 签名密钥 | 不会 |

不要把两者设置成一样。

---

## `LINK` 格式

`LINK` 是多行文本，每行一个节点分享链接，例如：

```text
vless://uuid@example.com:443?encryption=none&security=reality&sni=www.apple.com&fp=chrome&pbk=PUBLIC_KEY&sid=SHORT_ID&type=xhttp&path=%2Fxhttp&mode=stream-up#香港-中转-新加坡
vless://uuid@example.com:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.apple.com&fp=chrome&pbk=PUBLIC_KEY&sid=SHORT_ID&type=tcp#洛杉矶-直连
trojan://password@example.com:443?sni=example.com#Trojan-Example
hysteria2://password@example.com:443?sni=example.com#HY2-Example
hy2://password@example.com:443?sni=example.com#HY2-Short
```

注意：

- 一行一个节点；
- 节点名称建议带地区关键词；
- REALITY 节点需要保留 `sni`、`fp`、`pbk`、`sid`；
- XHTTP 建议写清楚 `type=xhttp` 和 `mode=stream-up`；
- XHTTP 不建议带 `flow=xtls-rprx-vision`。

---

## 面板展示规则

面板会尽量隐藏敏感信息。

不会直接展示：

```text
完整订阅 URL
节点 IP
节点端口
UUID
Trojan password
Reality public key
Reality shortId
WS path
gRPC serviceName
XHTTP path
```

会展示：

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

这样截图或投屏时不容易泄露核心连接参数。

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

刷新页面不会丢登录。

会重新要求登录的情况：

- 点击退出；
- 浏览器清 Cookie；
- 换浏览器 / 换设备；
- Cookie 超过 7 天；
- 修改 `SESSION_SECRET`。

退出时会清理：

```text
sub_worker_session
sw_session  # 旧版本兼容清理
```

---

## 部署方式

### Cloudflare Pages + GitHub

1. 保持仓库私有。
2. 打开 Cloudflare Dashboard。
3. 进入 **Workers & Pages**。
4. 创建 Pages 项目并连接此 GitHub 仓库。
5. 构建命令留空。
6. 配置环境变量：
   - `TOKEN`
   - `LINK`
   - `ADMIN_USER`
   - `ADMIN_PASS`
   - `SESSION_SECRET`
   - `SUBNAME`
7. 绑定自定义域名。
8. 访问 `/login` 测试登录。

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
dashboard.js
```

如果不用 Pages，而是普通 Worker，需要一起上传这些模块，或自行打包成单文件。

---

## 支持协议和客户端

当前节点解析支持：

- VLESS；
- Trojan；
- Hysteria2 / HY2。

推荐客户端：

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

```bash
npm test
```

当前测试覆盖：

- `/` 未登录跳 `/login`；
- `/login` 显示登录页；
- 登录成功后跳 `/随机字符/home`；
- 随机主页路径必须匹配当前会话；
- `/logout` 清理 Cookie；
- `/api/sub` 需要 `TOKEN`；
- 旧 `/TOKEN?b64` 兼容。

---

## 注意事项

- 不要把真实 `TOKEN`、`SESSION_SECRET`、密码、节点链接提交到仓库；
- `TOKEN` 泄露后，别人可以拉取订阅，需要立即更换；
- `SESSION_SECRET` 泄露后，别人可能伪造网页登录状态，需要立即更换；
- 仓库建议保持 private；
- 当前版本不包含多用户系统，不需要 D1 / KV。

---

## License

Private / personal-use subscription worker.
