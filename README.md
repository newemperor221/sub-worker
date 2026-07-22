# Sub Worker — 订阅聚合与转换

Cloudflare Workers / Pages 订阅聚合与转换服务。读取环境变量里的节点链接，输出 **Mihomo/Clash YAML** 和 **Base64 原始链接订阅**。

本项目目标是让下面四类协议在两个订阅出口中都可用：

- **Hysteria2 / HY2**
- **Trojan**
- **VLESS + REALITY + Vision**
- **VLESS + REALITY + XHTTP**，包含 `mode=packet-up` / `mode=stream-up` / `mode=stream-one` / `mode=auto`

---

## 输出入口

假设域名是：

```text
https://sub.example.com
```

`TOKEN` 是：

```text
mysecret
```

则订阅地址为：

```text
https://sub.example.com/mysecret          # 管理面板
https://sub.example.com/mysecret?clash    # Mihomo / Clash YAML 节点订阅
https://sub.example.com/mysecret?b64      # Base64 原始链接订阅
```

---

## 协议支持矩阵

| 协议 / 输出 | `?clash` | `?b64` |
|---|---:|---:|
| Hysteria2 / HY2 | ✅ | ✅ |
| Trojan | ✅ | ✅ |
| VLESS + REALITY + Vision | ✅ | ✅ |
| VLESS + REALITY + XHTTP | ✅ | ✅ |
| VLESS + REALITY + XHTTP `mode=stream-up` | ✅ | ✅ |

说明：

- `?clash` 会把 XHTTP 节点转换为 Mihomo 的 `network: xhttp` + `xhttp-opts`。
- `?b64` 会原样保留 `vless://` / `trojan://` / `hysteria2://` 链接。
- `?sb` 已移除；访问 `?sb` 会回到管理面板，不再输出 sing-box 配置。

---

## 功能概览

- 🔗 **Mihomo / Clash YAML**：适合 Clash Verge、Mihomo Party、FlClash、Clash Meta for Android、OpenClash / Nikki 等 Mihomo 内核客户端。
- 📄 **Base64 原始链接订阅**：适合 v2rayN、NekoBox、Hiddify、Shadowrocket 等支持原始分享链接的客户端。
- 🎨 **管理面板**：浏览器访问 Token 路径时显示节点统计、订阅入口和复制按钮。
- 📛 **订阅名称自定义**：通过 `SUBNAME` 环境变量控制客户端显示名称。

---

## 部署方式

### 方式一：Cloudflare Pages + GitHub 导入（推荐）

本仓库是模块化结构，`_worker.js` 会 import：

```text
utils.js
convert.js
yaml.js
dashboard.js
```

因此推荐使用 GitHub 仓库方式部署，避免复制单文件时漏掉模块。

步骤：

1. Fork 本仓库，或推送到自己的 GitHub 仓库。
2. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com)。
3. 进入 **Workers & Pages**。
4. 选择 **Pages** → **Connect to Git**。
5. 选择你的仓库。
6. 构建命令留空或保持默认。
7. 部署完成后，在 Pages 项目里添加环境变量。
8. 可选：Pages → **自定义域** → 添加自己的订阅域名。

### 方式二：Worker 手动部署

如果你使用普通 Worker 手动部署，需要确保所有模块文件都一起上传。不要只复制 `_worker.js`，因为它依赖其它模块文件。

如果 Cloudflare 面板只支持单文件粘贴，需要先自行打包成单文件版本。

---

## 环境变量

| 变量名 | 必填 | 说明 | 示例 |
|---|---:|---|---|
| `TOKEN` | ✅ | 访问令牌，也是订阅路径第一段 | `mysecret` |
| `LINK` | ✅ | 节点链接，一行一条 | `vless://...` |
| `SUBNAME` | ❌ | 客户端里显示的订阅名称 | `MyNodes` |

### `LINK` 示例

```text
# VLESS + REALITY + XHTTP stream-up
vless://uuid@example.com:443?encryption=none&security=reality&sni=tv.apple.com&fp=chrome&pbk=PUBLIC_KEY&sid=SHORT_ID&type=xhttp&path=%2Fxhttp&mode=stream-up#HK-XHTTP

# VLESS + REALITY + Vision
vless://uuid@example.com:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.amazon.com&fp=chrome&pbk=PUBLIC_KEY&sid=SHORT_ID&type=tcp#HK-Vision

# Trojan
trojan://password@example.com:443?sni=example.com#Trojan

# Hysteria2 / HY2
hysteria2://password@example.com:443?sni=example.com#HY2
hy2://password@example.com:443?sni=example.com#HY2-short
```

注意：

- 一行一个节点。
- XHTTP 节点不要带 `flow=xtls-rprx-vision`。
- Vision 节点需要保留 `flow=xtls-rprx-vision`。
- REALITY 节点需要保留 `sni`、`fp`、`pbk`、`sid`。
- XHTTP 节点建议显式写出 `type=xhttp&path=...&mode=...`。

---

## 输出格式说明

### `?clash` — Mihomo / Clash YAML

返回完整 Mihomo / Clash YAML，包含：

- `proxies` 节点列表；
- `proxy-groups` 策略组；
- fake-ip DNS；
- GEOSITE / GEOIP 分流；
- AI、Telegram、Google、GitHub、社交媒体、流媒体、Apple、Microsoft、Games 等分流规则；
- `Spotify`、`ChatGPT/OpenAI`、`Google/YouTube/Gemini` 默认走 **🇺🇸 美国应用**；
- `X/Twitter`、`Netflix` 默认走 **🇸🇬 新加坡应用**。

VLESS + REALITY + XHTTP 会转换为：

```yaml
- name: "HK-XHTTP"
  type: vless
  server: "example.com"
  port: 443
  uuid: "uuid"
  network: "xhttp"
  tls: true
  servername: "tv.apple.com"
  sni: "tv.apple.com"
  client-fingerprint: "chrome"
  xhttp-opts:
    mode: "stream-up"
    path: "/xhttp"
  reality-opts:
    public-key: "PUBLIC_KEY"
    short-id: "SHORT_ID"
```

Vision 节点会保留：

```yaml
flow: "xtls-rprx-vision"
```

XHTTP 节点不会输出 `flow`。

---

### `?b64` — Base64 原始链接订阅

返回 Base64 编码后的原始链接列表。这个输出最大限度保留原始链接参数，适合支持原始分享链接的客户端。

适合：

- v2rayN
- NekoBox
- Hiddify
- Shadowrocket（视版本支持情况）
- 其它支持 Xray / Trojan / Hysteria2 分享链接的客户端

---

## 协议转换细节

### Hysteria2 / HY2

支持：

- `hysteria2://`
- `hy2://`
- `sni` / `peer`
- `insecure` / `allowInsecure`
- `alpn`
- `obfs`
- `obfs-password` / `obfsParam`
- `upmbps` / `up`
- `downmbps` / `down`

### Trojan

支持：

- `trojan://password@host:port`
- `sni`
- 基础 TLS 字段

### VLESS + REALITY + Vision

支持：

- `type=tcp`
- `security=reality`
- `flow=xtls-rprx-vision`
- `sni`
- `fp`
- `pbk`
- `sid`
- `alpn`

### VLESS + REALITY + XHTTP

支持：

- `type=xhttp`
- `security=reality`
- `sni`
- `fp`
- `pbk`
- `sid`
- `path`
- `host`
- `mode`

常见 `mode`：

```text
auto
packet-up
stream-up
stream-one
```

XHTTP 节点不应保留 Vision 的：

```text
flow=xtls-rprx-vision
```

转换器在输出 Clash/Mihomo 时会自动避免给 XHTTP 节点写入 `flow`。

---

## 推荐客户端使用方式

| 客户端类型 | 推荐入口 |
|---|---|
| Mihomo / Clash Verge / Mihomo Party / FlClash | `?clash` |
| v2rayN / NekoBox / Shadowrocket / Hiddify 原始链接导入 | `?b64` |

---

## 常见问题

### 1. XHTTP 为什么不能带 Vision flow？

`flow=xtls-rprx-vision` 是 VLESS + REALITY + TCP/raw Vision 的字段。XHTTP 是另一种 transport，不应该继续带 Vision flow。

正确 XHTTP 链接示例：

```text
vless://uuid@example.com:443?encryption=none&security=reality&sni=tv.apple.com&fp=chrome&pbk=PUBLIC_KEY&sid=SHORT_ID&type=xhttp&path=%2Fxhttp&mode=stream-up#HK-XHTTP
```

### 2. `?sb` 去哪里了？

`?sb` 已清理掉。当前只保留：

```text
?clash
?b64
```

### 3. XHTTP 的 `mode` 不写会怎样？

转换器会尽量保留原链接里的 `mode`。如果你希望固定使用 `stream-up`，请在链接里显式写：

```text
mode=stream-up
```

### 4. 哪个订阅入口最通用？

- Mihomo/Clash 系：`?clash`
- 原始链接客户端：`?b64`

---

## 开发检查清单

修改协议转换逻辑后，至少检查：

- Hysteria2 / HY2 在 `?clash`、`?b64` 都可输出；
- Trojan 在 `?clash`、`?b64` 都可输出；
- VLESS REALITY Vision 在 `?clash`、`?b64` 都保留 `flow=xtls-rprx-vision`；
- VLESS REALITY XHTTP 在 `?clash`、`?b64` 都保留 `type=xhttp` / `path` / `mode`；
- XHTTP 输出不包含 `flow=xtls-rprx-vision`；
- README 的协议矩阵和实际代码保持一致。
