# ✎ 纸边订阅白板

> 把私有代理订阅整理成一张纸边手绘白板：登录后看节点草稿，复制 Clash / Base64 订阅，扫码导入，但不把敏感连接细节摊在页面上。

[![Cloudflare Worker](https://img.shields.io/badge/runtime-Cloudflare%20Workers-f38020?style=flat-square)](#部署)
[![Private Panel](https://img.shields.io/badge/panel-private%20login-5f7fe7?style=flat-square)](#访问结构)
[![Rough.js](https://img.shields.io/badge/style-Rough.js%20paper-d9485f?style=flat-square)](#视觉风格)
[![Node Test](https://img.shields.io/badge/test-node%20--test-b2f2bb?style=flat-square)](#本地测试)

仓库：<https://github.com/newemperor221/sub-worker>

---

## 这是什么

`sub-worker` 是一个部署在 **Cloudflare Pages / Workers** 上的私有订阅面板。

它会把环境变量中的节点分享链接整理成：

- Clash / Mihomo YAML 订阅
- Base64 原始分享链接订阅
- 登录后可视化节点卡片
- 可复制 / 可扫码的订阅入口

当前版本是 **单管理员、单订阅源** 版本：

- 面板登录使用 `ADMIN_USER` / `ADMIN_PASS`
- 订阅接口使用 `TOKEN`
- 节点内容来自环境变量 `LINK`
- 不需要 D1 / KV / 数据库
- 主页不展示完整订阅 URL
- 登录后进入随机路径 `/随机字符/home`

---

## 视觉风格

当前 UI 是：

> **纸边实验室式手绘白板风**

它和 [`newemperor221/vps-jsq`](https://github.com/newemperor221/vps-jsq) 共用同一套视觉语言。

关键词：

- 米白纸张背景：`#fffdf7`
- 点阵草稿纸纹理
- Rough.js 真实手绘 SVG 外框
- 中文纸笔字体栈：`LXGW WenKai / Kaiti SC / STKaiti`
- Excalidraw 低饱和色板：黄、蓝、红、绿、紫
- Hero 草稿插画、纸片卡片、手绘按钮

页面结构：

- `/login`：纸边登录白板
- `/随机字符/home`：订阅导出白板
- `导出路线`：Clash / Base64 两张入口卡
- `节点草稿`：每个节点是一张 ProjectCard 风格纸片

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
/api/sub?token=你的TOKEN&type=clash
/api/sub?token=你的TOKEN&type=b64
```

参数：

| 参数 | 说明 |
|---|---|
| `token` | 订阅访问令牌，对应环境变量 `TOKEN` |
| `type=clash` | 输出 Clash / Mihomo YAML |
| `type=b64` | 输出 Base64 原始分享链接订阅 |

旧接口仍兼容：

```text
/你的TOKEN?clash
/你的TOKEN?b64
```

新客户端建议优先使用 `/api/sub?...`。

---

## 环境变量

Cloudflare Pages / Workers 需要配置：

| 变量名 | 必填 | 说明 |
|---|---:|---|
| `TOKEN` | ✅ | 订阅接口访问令牌，会出现在客户端订阅 URL 中 |
| `LINK` | ✅ | 节点分享链接，一行一个 |
| `ADMIN_USER` | ✅ | 网页面板登录用户名 |
| `ADMIN_PASS` | ✅ | 网页面板登录密码 |
| `SESSION_SECRET` | ✅ | Cookie 签名密钥，只给 Worker 后端使用 |
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

## `LINK` 格式

`LINK` 是多行文本，每行一个节点分享链接。

示例只保留字段结构，真实 UUID / 密钥 / 地址请自行替换：

```text
vless://uuid@example.com:443?encryption=none&security=reality&sni=www.apple.com&fp=chrome&pbk=PUBLIC_KEY&sid=SHORT_ID&type=xhttp&path=%2Fxhttp&mode=stream-up#台湾
vless://uuid@example.com:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.apple.com&fp=chrome&pbk=PUBLIC_KEY&sid=SHORT_ID&type=tcp#洛杉矶
trojan://password@example.com:443?sni=example.com#Trojan-Example
hysteria2://password@example.com:443?sni=example.com#HY2-Example
hy2://password@example.com:443?sni=example.com#HY2-Short
```

注意：

- 一行一个节点
- 节点名称建议带地区关键词，例如 `台湾`、`香港`、`日本`、`洛杉矶`
- REALITY 节点需要保留 `sni`、`fp`、`pbk`、`sid`
- XHTTP 建议写清楚 `type=xhttp` 和 `mode=stream-up`
- XHTTP 不建议带 `flow=xtls-rprx-vision`

---

## 面板展示规则

面板会尽量隐藏敏感信息，适合截图或投屏。

不会直接展示：

```text
完整订阅 URL
节点 IP / 域名
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

如果节点名包含 `台湾` / `Taiwan` / `TW`，面板会显示台湾图标。

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

退出时会清理：

```text
sub_worker_session
sw_session  # 旧版本兼容清理
```

---

## 部署

### Cloudflare Pages + GitHub

1. 打开 Cloudflare Dashboard。
2. 进入 **Workers & Pages**。
3. 创建 Pages 项目并连接此 GitHub 仓库。
4. 构建命令留空。
5. 配置环境变量：
   - `TOKEN`
   - `LINK`
   - `ADMIN_USER`
   - `ADMIN_PASS`
   - `SESSION_SECRET`
   - `SUBNAME`
6. 绑定自定义域名。
7. 访问 `/login` 测试登录。

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

- VLESS
- Trojan
- Hysteria2 / HY2

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

- `/` 未登录跳 `/login`
- `/login` 显示纸边登录白板
- 登录成功后跳 `/随机字符/home`
- 随机主页路径必须匹配当前会话
- `/logout` 清理 Cookie
- `/api/sub` 需要 `TOKEN`
- 旧 `/TOKEN?b64` 兼容

---

## 安全注意事项

- 不要把真实 `TOKEN`、`SESSION_SECRET`、密码、节点链接提交到仓库。
- `TOKEN` 泄露后，别人可以拉取订阅，需要立即更换。
- `SESSION_SECRET` 泄露后，别人可能伪造网页登录状态，需要立即更换。
- 仓库即使公开，也不要公开任何真实连接串或环境变量。
- 当前版本不包含多用户系统，不需要 D1 / KV。

---

## License

Personal-use subscription worker.
