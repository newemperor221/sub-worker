# Sub Worker — 私有订阅聚合与 Mihomo 分流面板

一个运行在 **Cloudflare Workers / Pages** 上的轻量订阅聚合服务。

它把环境变量里的多个代理节点统一整理成：

- **Mihomo / Clash YAML 订阅**
- **Base64 原始分享链接订阅**
- **私有管理面板**

项目重点不是做一个公开订阅站，而是做一个干净、安全、方便自己用的私有订阅面板。

---

## 功能特点

### 两种订阅出口

| 入口 | 用途 |
|---|---|
| `?clash` | Mihomo / Clash.Meta YAML，带 DNS、策略组和分流规则 |
| `?b64` | Base64 原始节点链接订阅，保留原始分享链接参数 |

### 私有管理面板

浏览器访问根路径 `/` 时会显示登录页；输入 `ADMIN_USER` / `ADMIN_PASS` 后跳回根路径并显示管理面板。

面板地址固定为：

```text
https://sub.example.com/
```

不会把主页放在 `/TOKEN` 路径下。

面板特性：

- 不直接显示订阅链接；
- 不显示节点 IP；
- 不显示节点端口；
- 节点名称会隐藏无法渲染的国旗 emoji；
- 左侧使用内联 SVG 国旗图标，不依赖系统 emoji 字体，也不依赖外部图片；
- VLESS 节点会显示更详细的协议变体信息。

示例显示：

```text
香港-中转-伦敦
连接地址与端口已隐藏
VLESS
REALITY
XHTTP
stream-up
SNI www.apple.com
```

---

### VLESS 变体识别

VLESS 不是单一形态，本项目会在面板和 Clash 输出中尽量区分不同变体。

支持展示 / 转换：

- `VLESS + REALITY + TCP / Vision`
- `VLESS + REALITY + XHTTP`
- `VLESS + TLS`
- `VLESS + WS`
- `VLESS + gRPC`

XHTTP 支持保留：

```text
type=xhttp
path
host
mode=packet-up / stream-up / stream-one / auto
```

Reality 支持保留：

```text
sni
fp
pbk
sid
```

> 面板不会显示 Reality public key、shortId、节点 IP、端口等敏感信息。

---

## 分流策略

`?clash` 输出的是完整 Mihomo / Clash YAML，包含：

- `proxies`
- `proxy-groups`
- fake-ip DNS
- GEOSITE / GEOIP 规则
- 常见服务分流
- 地区节点组
- 应用指定地区组

### 地区节点组

会根据节点名称自动归类：

```text
🇭🇰 香港节点
🇹🇼 台湾节点
🇸🇬 新加坡节点
🇯🇵 日本节点
🇺🇸 美国节点
🇬🇧 英国节点
🇳🇬 尼日利亚节点
🌍 其它地区
```

英国匹配关键词：

```text
UK / GB / 英国 / 英國 / 伦敦 / 倫敦 / london / united kingdom / great britain
```

尼日利亚匹配关键词：

```text
NG / 尼日利亚 / 尼日利亞 / 奈及利亚 / 奈及利亞 / nigeria / lagos / abuja
```

---

### 应用指定地区

当前内置策略：

| 应用 / 网站 | 默认策略组 |
|---|---|
| Spotify | 🇺🇸 美国应用 |
| ChatGPT / OpenAI | 🇺🇸 美国应用 |
| Google / YouTube / Gemini | 🇺🇸 美国应用 |
| X / Twitter | 🇸🇬 新加坡应用 |
| Netflix | 🇸🇬 新加坡应用 |

相关规则会放在更宽泛的流媒体 / 社交媒体规则之前，避免被提前吞掉。

DNS `nameserver-policy` 也同步走对应策略组，避免 DNS 和路由方向不一致。

---

## 支持协议

| 协议 | `?clash` | `?b64` |
|---|---:|---:|
| VLESS + REALITY + Vision | ✅ | ✅ |
| VLESS + REALITY + XHTTP | ✅ | ✅ |
| Trojan | ✅ | ✅ |
| Hysteria2 / HY2 | ✅ | ✅ |

说明：

- `?clash` 会把节点转换成 Mihomo / Clash.Meta 可导入 YAML；
- `?b64` 会尽量保持原始分享链接不变；
- XHTTP 节点不会在 Clash 输出中继承 Vision `flow`；
- Vision 节点会保留 `flow=xtls-rprx-vision`。

---

## 订阅地址格式

假设你的域名是：

```text
https://sub.example.com
```

环境变量 `TOKEN` 是：

```text
my-secret-token
```

则入口为：

```text
https://sub.example.com/                                      # 登录页 / 登录后的私有面板
https://sub.example.com/api/sub?token=my-secret-token&type=clash  # Mihomo / Clash YAML
https://sub.example.com/api/sub?token=my-secret-token&type=b64    # Base64 原始链接订阅
```

兼容旧订阅地址：

```text
https://sub.example.com/my-secret-token?clash
https://sub.example.com/my-secret-token?b64
```

> README 中只写示例地址，不应提交真实 Token、真实节点 IP、UUID、密码或订阅链接。

---

## 环境变量

| 变量名 | 必填 | 说明 |
|---|---:|---|
| `TOKEN` | ✅ | 订阅接口访问令牌 |
| `LINK` | ✅ | 节点链接，一行一个 |
| `SUBNAME` | ❌ | 订阅显示名称 |
| `ADMIN_USER` | ✅ | 面板登录用户名 |
| `ADMIN_PASS` | ✅ | 面板登录密码 |
| `SESSION_SECRET` | ✅ | Cookie 签名密钥，建议用随机长字符串，例如 `openssl rand -hex 32` |

### `LINK` 示例

```text
# VLESS + REALITY + XHTTP stream-up
vless://uuid@example.com:443?encryption=none&security=reality&sni=www.apple.com&fp=chrome&pbk=PUBLIC_KEY&sid=SHORT_ID&type=xhttp&path=%2Fxhttp&mode=stream-up#香港-中转-新加坡

# VLESS + REALITY + Vision
vless://uuid@example.com:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.apple.com&fp=chrome&pbk=PUBLIC_KEY&sid=SHORT_ID&type=tcp#洛杉矶-直连

# Trojan
trojan://password@example.com:443?sni=example.com#Trojan-Example

# Hysteria2 / HY2
hysteria2://password@example.com:443?sni=example.com#HY2-Example
hy2://password@example.com:443?sni=example.com#HY2-Short
```

注意：

- 一行一个节点；
- 节点名称建议包含地区关键词，方便自动分组；
- XHTTP 建议显式写 `type=xhttp` 和 `mode=stream-up`；
- XHTTP 不建议带 `flow=xtls-rprx-vision`；
- REALITY 节点需要保留 `sni`、`fp`、`pbk`、`sid`。

---

## 部署方式

### Cloudflare Pages + GitHub 导入

推荐使用 GitHub 仓库部署，因为项目是模块化结构。

主要文件：

```text
_worker.js
utils.js
convert.js
yaml.js
dashboard.js
```

步骤：

1. Fork 或导入本仓库；
2. 打开 Cloudflare Dashboard；
3. 进入 **Workers & Pages**；
4. 创建 Pages 项目并连接 GitHub 仓库；
5. 构建命令留空；
6. 部署完成后添加环境变量：
   - `TOKEN`
   - `LINK`
   - `SUBNAME`
   - `ADMIN_USER`
   - `ADMIN_PASS`
   - `SESSION_SECRET`
7. 绑定自定义域名。

---

### 普通 Worker 部署

如果使用普通 Worker，需要确保模块文件一起上传。

不要只复制 `_worker.js`，因为它依赖：

```text
utils.js
convert.js
yaml.js
dashboard.js
```

如果 Cloudflare 控制台只允许单文件粘贴，需要先自行打包成单文件版本。

---

## 面板安全设计

面板默认只做“可用性展示”，不做敏感信息展示。

不会显示：

```text
订阅完整 URL
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

会显示：

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

---

## 推荐客户端

| 客户端 | 推荐入口 |
|---|---|
| Clash Verge Rev | `?clash` |
| Mihomo Party | `?clash` |
| FlClash | `?clash` |
| Clash Meta for Android | `?clash` |
| OpenClash / Nikki | `?clash` |
| v2rayN | `?b64` |
| NekoBox | `?b64` |
| Hiddify | `?b64` |
| Shadowrocket | `?b64`，视版本协议支持情况 |

---

## 常见问题

### 为什么面板里的国旗不用 emoji？

部分系统或 WebView 会把国旗 emoji 显示成：

```text
GB
SG
NG
```

所以面板左侧图标使用内联 SVG 国旗，不依赖系统 emoji 字体，也不依赖外链图片。

节点名称里的国旗 emoji 会被自动隐藏，避免重复和乱码。

---

### 为什么面板不显示 IP 和端口？

因为这是私有订阅面板，公开截图或浏览器展示时不应该泄露节点连接信息。

复制订阅、扫码导入仍然可用，只是不在页面上明文显示。

---

### 为什么 VLESS 要显示更多信息？

VLESS 有多种常见变体：

```text
VLESS + REALITY + Vision
VLESS + REALITY + XHTTP
VLESS + TLS + WS
VLESS + TLS + gRPC
```

只显示 `vless` 无法判断节点形态，所以面板会显示网络层、安全层和关键模式。

---

## 开发检查清单

修改代码后建议检查：

- `?clash` 能生成 YAML；
- `?b64` 能生成 Base64；
- 面板不显示订阅链接；
- 面板不显示节点 IP 和端口；
- VLESS XHTTP 保留 `network: xhttp` 和 `xhttp-opts.mode`；
- VLESS Vision 保留 `flow=xtls-rprx-vision`；
- XHTTP 不输出 Vision `flow`；
- Spotify / ChatGPT / Google 走美国应用组；
- X / Netflix 走新加坡应用组；
- 节点名称中的国旗 emoji 不再显示，左侧 SVG 图标正常。

---

## License

Private / personal-use subscription worker.
