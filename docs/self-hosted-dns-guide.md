# 自建 DNS 服务器完整指南 — DediOne (144.225.187.178)

> 适用场景：中国大陆代理用户，需要 DNS 分流 + 去广告 + 流媒体解锁
> 最后更新：2026-06-08

---

## 目录

1. [架构总览](#1-架构总览)
2. [组件安装](#2-组件安装)
3. [mosdns 配置（分流核心）](#3-mosdns-配置分流核心)
4. [unbound 配置（纯递归 + 解锁域名）](#4-unbound-配置纯递归--解锁域名)
5. [nginx SNI 代理（流媒体转发）](#5-nginx-sni-代理流媒体转发)
6. [cloudflared 隧道（对外 DoH）](#6-cloudflared-隧道对外-doh)
7. [Clash/mihomo DNS 配置](#7-clashmihomo-dns-配置)
8. [iptables 安全加固](#8-iptables-安全加固)
9. [功能验收清单](#9-功能验收清单)
10. [排障指南](#10-排障指南)
11. [架构迁移记录](#11-架构迁移记录)

---

## 1. 架构总览

```
                         ┌─────────────────────────────────────┐
                         │         DediOne (144.225.187.178)    │
                         │  ┌───────────┐                      │
公网 DoH 入口 ───────────┼─→│cloudflared│ dns.357561.xyz       │
  (iOS/Clash DNS)        │  └─────┬─────┘                      │
                         │        │ 127.0.0.1:5443              │
                         │        ↓                             │
                         │  ┌──────────────────────────────┐    │
                         │  │         mosdns                │    │
                         │  │  :53 ← 6台授权机器 UDP/TCP   │    │
                         │  │  :5443 ← 127.0.0.1 DoH       │    │
                         │  │                              │    │
                         │  │  geosite_unlock.txt ───┬──→ unbound  │
                         │  │  geosite:cn     ───┬──→ 223.5.5.5 DoH │
                         │  │  geosite:ads   ─────→ REJECT (不返回)│
                         │  │  其他           ─────→ unbound        │
                         │  └──────────────────────────────┘    │
                         │              ↑ :5300                  │
                         │        ┌─────┴──────┐                │
                         │        │  unbound    │                │
                         │        │  纯递归     │                │
                         │        │  unlock.conf│← 解锁域名覆写  │
                         │        └────────────┘                │
                         │                                      │
                         │  ┌──────────────────────┐            │
                         │  │  nginx :443           │            │
                         │  │  stream SNI 转发      │            │
                         │  │  unlock 域名 → 落地点  │            │
                         │  └──────────────────────┘            │
                         └─────────────────────────────────────┘
                                     ↑
                              DNS 返回 DediOne IP
                                     ↑
  ┌─────────────┐     ┌──────────────┴──────────────┐
  │  客户端      │────→│    代理节点（日本/美国/..）   │
  │  Clash      │     │    resolv.conf → DediOne    │
  │  curl 等    │     │    流量出口 → 落地点机        │
  └─────────────┘     └─────────────────────────────┘
```

### 核心流程（以 Netflix 为例）

```
1. 用户请求 netflix.com
2. Clash DNS → dns.357561.xyz (cloudflared 隧道)
3. mosdns 收到 → 匹配 geosite_unlock.txt → 转发到 unbound
4. unbound 查 unlock.conf → 返回 144.225.187.178 (DediOne IP)
5. 客户端浏览器 → 代理节点 → 连接 DediOne:443
6. nginx 嗅探 SNI = netflix.com → stream 转发到落地点
7. 落地点 → Netflix CDN → 内容返回
```

### 核心三要素

DNS 解锁流媒体需要 **三层同时覆盖**，缺一不可：

| 层 | 组件 | 文件 | 作用 |
|----|------|------|------|
| 1 | **unbound** | `unlock.conf` | local-zone redirect，返回 DediOne IP |
| 2 | **mosdns** | `geosite_unlock.txt` | 匹配域名→走 unbound，跳过缓存 |
| 3 | **nginx** | `stream map` | 443 端口收流量，SNI 转发到落地点 |

---

## 2. 组件安装

### 2.1 mosdns

```bash
# 下载预编译二进制
wget https://github.com/IrineSistiana/mosdns/releases/latest/download/mosdns-linux-amd64.zip
unzip mosdns-linux-amd64.zip
cp mosdns /usr/local/bin/
chmod +x /usr/local/bin/mosdns

# systemd 服务
cat > /etc/systemd/system/mosdns.service << 'EOF'
[Unit]
Description=mosdns DNS forwarder
After=network.target

[Service]
ExecStart=/usr/local/bin/mosdns start -c /etc/mosdns/config.yaml -d /etc/mosdns
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now mosdns
```

### 2.2 unbound

```bash
apt install -y unbound

# root.hints（根服务器列表，避免被污染）
wget -O /etc/unbound/root.hints https://www.internic.net/domain/named.cache

# systemd 默认装好就有
systemctl enable --now unbound
```

### 2.3 nginx（stream 模块）

```bash
apt install -y nginx
# stream 模块默认包含，检查：
nginx -V 2>&1 | grep -o stream
```

### 2.4 cloudflared

```bash
# 安装 cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
cp cloudflared-linux-amd64 /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# 登录并创建隧道
cloudflared tunnel login
cloudflared tunnel create dns-tunnel

# 启动
systemctl enable --now cloudflared
```

> ⚠️ cloudflared ingress 配置由 Cloudflare 面板远程管理，本地 `config.yml` 会被覆盖。
> 入口配置：`dns.357561.xyz` → `https://localhost:5443` (noTLSVerify: true)

---

## 3. mosdns 配置（分流核心）

### 3.1 config.yaml

```yaml
# /etc/mosdns/config.yaml
log:
  level: warn
plugins:
  # === 规则文件加载 ===
  - tag: geosite_cn
    type: domain_set
    args:
      files:
        - /etc/mosdns/rules/geosite_cn.txt
  - tag: geosite_ads
    type: domain_set
    args:
      files:
        - /etc/mosdns/rules/geosite_ads.txt
  - tag: geosite_reject_extra
    type: domain_set
    args:
      files:
        - /etc/mosdns/rules/geosite_reject_extra.txt
  - tag: geosite_unlock
    type: domain_set
    args:
      files:
        - /etc/mosdns/rules/geosite_unlock.txt

  # === 上游 DNS ===
  - tag: upstream_local
    type: forward
    args:
      concurrent: 2
      upstreams:
        - addr: https://223.5.5.5/dns-query
        - addr: https://1.12.12.12/dns-query
  - tag: upstream_remote
    type: forward
    args:
      upstreams:
        - addr: 127.0.0.1:5300

  # === 缓存 ===
  - tag: cache
    type: cache
    args:
      size: 4096
      lazy_cache_ttl: 86400

  # === 主处理链 ===
  - tag: main_sequence
    type: sequence
    args:
      - exec: prefer_ipv4
      # 1. 解锁域名 → 直接走 unbound，跳过缓存
      - matches:
          - qname $geosite_unlock
        exec: $upstream_remote
      - matches:
          - has_resp
        exec: accept
      # 2. 广告 → 拒绝返回空
      - matches:
          - qname $geosite_ads
        exec: reject 3
      - matches:
          - qname $geosite_reject_extra
        exec: reject 3
      # 3. 查缓存
      - exec: $cache
      - matches:
          - has_resp
        exec: accept
      # 4. 国内 → AliDNS DoH
      - matches:
          - qname $geosite_cn
        exec: $upstream_local
      - matches:
          - has_resp
        exec: accept
      # 5. 其他 → unbound 递归
      - exec: $upstream_remote
      - matches:
          - has_resp
        exec: accept

  # === 网络监听 ===
  - tag: udp_server
    type: udp_server
    args:
      entry: main_sequence
      listen: ':53'
  - tag: http_server
    type: http_server
    args:
      entries:
        - exec: main_sequence
          path: /dns-query
      listen: ':5443'
      cert: /etc/mosdns/doh.pem
      key: /etc/mosdns/doh.key
```

### 3.2 geosite_unlock.txt

```
# === Netflix ===
netflix.com
www.netflix.com
nflxvideo.net
nflximg.net
nflxext.com

# === Disney+ ===
disneyplus.com
bamgrid.com
dssott.com
disneystreaming.com

# === Spotify ===
spotify.com
scdn.co
spotifycdn.com

# === YouTube ===
youtube.com
ytimg.com
googlevideo.com
withgoogle.com

# === TikTok ===
tiktok.com
tiktokcdn.com

# === ChatGPT / OpenAI ===
chatgpt.com
openai.com
chat.openai.com
ios.chat.openai.com

# === Claude ===
claude.ai
anthropic.com

# === Gemini ===
gemini.google.com

# === Prime Video ===
primevideo.com

# === Bahamut Anime ===
gamer.com.tw
bahamut.com.tw

# === Others ===
hulu.com
reddit.com
max.com
paramountplus.com
```

---

## 4. unbound 配置（纯递归 + 解锁域名）

### 4.1 unbound.conf

```yaml
server:
  interface: 127.0.0.1
  port: 5300
  do-ip4: yes
  do-ip6: no
  do-udp: yes
  do-tcp: yes
  access-control: 127.0.0.0/8 allow
  hide-version: yes
  hide-identity: yes
  cache-min-ttl: 3600
  cache-max-ttl: 86400
  prefetch: yes
  rrset-roundrobin: yes
  use-caps-for-id: yes
  val-clean-additional: yes
  root-hints: /etc/unbound/root.hints
  include: /etc/unbound/unlock.conf
```

> ⚠️ 用 `local-zone redirect` 通配符而非 `local-data` 逐条写子域名。
> 错误做法：`local-data: "www.netflix.com A 144.225.187.178"`（子域名在 redirect zone 里不合法）
> 正确做法：`local-zone: "netflix.com" redirect` + `local-data: "netflix.com A 144.225.187.178"`

### 4.2 unlock.conf（完整版）

```yaml
# /etc/unbound/unlock.conf
# === Disney+ ===
local-zone: "disneyplus.com" redirect
local-data: "disneyplus.com A 144.225.187.178"
local-zone: "bamgrid.com" redirect
local-data: "bamgrid.com A 144.225.187.178"
local-zone: "dssott.com" redirect
local-data: "dssott.com A 144.225.187.178"
local-zone: "disneystreaming.com" redirect
local-data: "disneystreaming.com A 144.225.187.178"

# === Netflix ===
local-zone: "netflix.com" redirect
local-data: "netflix.com A 144.225.187.178"
local-zone: "nflxvideo.net" redirect
local-data: "nflxvideo.net A 144.225.187.178"
local-zone: "nflximg.net" redirect
local-data: "nflximg.net A 144.225.187.178"

# === Spotify ===
local-zone: "spotify.com" redirect
local-data: "spotify.com A 144.225.187.178"
local-zone: "scdn.co" redirect
local-data: "scdn.co A 144.225.187.178"
local-zone: "spotifycdn.com" redirect
local-data: "spotifycdn.com A 144.225.187.178"

# === YouTube ===
local-zone: "youtube.com" redirect
local-data: "youtube.com A 144.225.187.178"
local-zone: "ytimg.com" redirect
local-data: "ytimg.com A 144.225.187.178"
local-zone: "googlevideo.com" redirect
local-data: "googlevideo.com A 144.225.187.178"
local-zone: "withgoogle.com" redirect
local-data: "withgoogle.com A 144.225.187.178"

# === TikTok ===
local-zone: "tiktok.com" redirect
local-data: "tiktok.com A 144.225.187.178"
local-zone: "tiktokcdn.com" redirect
local-data: "tiktokcdn.com A 144.225.187.178"

# === ChatGPT / OpenAI ===
local-zone: "chatgpt.com" redirect
local-data: "chatgpt.com A 144.225.187.178"
local-zone: "openai.com" redirect
local-data: "openai.com A 144.225.187.178"

# === Claude / Anthropic ===
local-zone: "claude.ai" redirect
local-data: "claude.ai A 144.225.187.178"
local-zone: "anthropic.com" redirect
local-data: "anthropic.com A 144.225.187.178"

# === Gemini ===（单个域名，不适用 redirect）
local-data: "gemini.google.com A 144.225.187.178"

# === Prime Video ===
local-zone: "primevideo.com" redirect
local-data: "primevideo.com A 144.225.187.178"

# === Bahamut Anime ===
local-zone: "gamer.com.tw" redirect
local-data: "gamer.com.tw A 144.225.187.178"
local-zone: "bahamut.com.tw" redirect
local-data: "bahamut.com.tw A 144.225.187.178"

# === Others ===
local-zone: "hulu.com" redirect
local-data: "hulu.com A 144.225.187.178"
local-zone: "reddit.com" redirect
local-data: "reddit.com A 144.225.187.178"
local-zone: "max.com" redirect
local-data: "max.com A 144.225.187.178"
local-zone: "paramountplus.com" redirect
local-data: "paramountplus.com A 144.225.187.178"
```

### 4.3 验证 unbound

```bash
# 配置检查
unbound-checkconf

# 重启
systemctl restart unbound

# 测试（经过 mosdns → unbound）
dig @127.0.0.1 netflix.com +short
# 应返回: 144.225.187.178

# 测试子域名通配（redirect zone 自动覆盖）
dig @127.0.0.1 abcd.netflix.com +short
# 应返回: 144.225.187.178
```

---

## 5. nginx SNI 代理（流媒体转发）

### 5.1 nginx.conf（stream 配置）

```nginx
# /etc/nginx/nginx.conf — stream 块
stream {
    resolver 1.1.1.1 valid=300s;
    resolver_timeout 5s;

    map $ssl_preread_server_name $upstream {
        include /etc/nginx/stream-map.conf;
        default server.example.com:443;  # 兜底
    }

    server {
        listen 443;
        proxy_pass $upstream;
        ssl_preread on;
        proxy_connect_timeout 5s;
    }
}
```

### 5.2 stream-map.conf

```nginx
# /etc/nginx/stream-map.conf
# === Disney+ ===
disneyplus.com             disneyplus.com:443;
www.disneyplus.com         disneyplus.com:443;
bamgrid.com                disneyplus.com:443;
dssott.com                 disneyplus.com:443;
disneystreaming.com        disneyplus.com:443;

# === Netflix ===
netflix.com                netflix.com:443;
www.netflix.com            netflix.com:443;
nflxvideo.net              netflix.com:443;
nflximg.net                netflix.com:443;
nflxext.com                netflix.com:443;

# === Spotify ===
spotify.com                spotify.com:443;
www.spotify.com            spotify.com:443;
scdn.co                    spotify.com:443;
spotifycdn.com             spotify.com:443;

# === YouTube ===
youtube.com                youtube.com:443;
www.youtube.com            youtube.com:443;
ytimg.com                  youtube.com:443;
googlevideo.com            youtube.com:443;
withgoogle.com             youtube.com:443;
m.youtube.com              youtube.com:443;

# === TikTok ===
tiktok.com                 tiktok.com:443;
www.tiktok.com             tiktok.com:443;
m.tiktok.com               tiktok.com:443;
tiktokcdn.com              tiktok.com:443;

# === OpenAI ===
openai.com                 openai.com:443;
chat.openai.com            openai.com:443;
ios.chat.openai.com        openai.com:443;

# === Claude ===
claude.ai                  claude.ai:443;
www.claude.ai              claude.ai:443;

# === Gemini ===
gemini.google.com          gemini.google.com:443;

# === Prime Video ===
primevideo.com             primevideo.com:443;
www.primevideo.com         primevideo.com:443;

# === Bahamut ===
gamer.com.tw               gamer.com.tw:443;
ani.gamer.com.tw           gamer.com.tw:443;

# === Others ===
hulu.com                   hulu.com:443;
reddit.com                 reddit.com:443;
max.com                    max.com:443;
paramountplus.com          paramountplus.com:443;
```

> ⚠️ `stream-map.conf` 更新后需重启 nginx：
> ```bash
> nginx -t && systemctl restart nginx
> ```

---

## 6. cloudflared 隧道（对外 DoH）

### 6.1 安装与登录

```bash
cloudflared tunnel login
cloudflared tunnel create dns-tunnel
```

### 6.2 Cloudflare 面板 ingress 配置

```json
{
  "ingress": [
    {
      "hostname": "dns.357561.xyz",
      "service": "https://localhost:5443",
      "originRequest": {
        "noTLSVerify": true
      }
    },
    {
      "service": "http_status:404"
    }
  ]
}
```

> ⚠️ cloudflared ingress 由 Cloudflare 面板远程管理，本地 `config.yml` 会被覆盖。
> 必须在 Cloudflare Dashboard → Zero Trust → Tunnels 中修改。

---

## 7. Clash/mihomo DNS 配置

### 7.1 订阅模板配置（_worker.js 中）

```yaml
dns:
  enable: true
  ipv6: false
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  fake-ip-filter:
    - "*.lan"
    - "*.local"
  default-nameserver:
    - 223.5.5.5
    - 1.1.1.1
  nameserver:
    - 'https://dns.357561.xyz/dns-query'
  proxy-server-nameserver:
    - https://1.1.1.1/dns-query
```

### 7.2 关键参数说明

| 参数 | 值 | 说明 |
|------|----|------|
| `default-nameserver` | 223.5.5.5, 1.1.1.1 | 启动时用来解析 DoH 域名，只用一次 |
| `nameserver` | dns.357561.xyz | 所有 DNS 查询走自建 DoH |
| `enhanced-mode` | fake-ip 或 redir-host | fake-ip 更快但客户端测不准；redir-host 更兼容 |
| `proxy-server-nameserver` | 1.1.1.1 | 解析代理节点域名用的公网 DNS |

### 7.3 fake-ip vs redir-host

| 模式 | 优点 | 缺点 |
|------|------|------|
| fake-ip | 速度快，防 DNS 污染 | Clash 不解析真实 IP，代理节点自己解析 DNS |
| redir-host | DNS 走自建，解锁稳定 | 多一次 DNS 查询延迟 |

---

## 8. iptables 安全加固

### 8.1 当前端口策略

| 端口 | 协议 | 规则 | 用途 |
|------|------|------|------|
| 443 | TCP | 全开 | nginx SNI 代理（解锁用） |
| 48256 | TCP | 全开 (rate-limit) | SSH |
| 53 | UDP+TCP | **仅限 6 台授权** | mosdns DNS |
| 5443 | UDP+TCP | **仅限 127.0.0.1** | mosdns DoH (cloudflared) |

### 8.2 DROP 策略

```bash
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# 放行回环
iptables -A INPUT -i lo -j ACCEPT

# 放行已建立连接
iptables -A INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT

# SSH
iptables -A INPUT -p tcp --dport 48256 -m connlimit --connlimit-above 5 -j REJECT
iptables -A INPUT -p tcp --dport 48256 -j ACCEPT

# nginx
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# mosdns DNS（仅限授权机器）
iptables -A INPUT -p udp --dport 53 -s 198.46.147.71 -j ACCEPT
iptables -A INPUT -p tcp --dport 53 -s 198.46.147.71 -j ACCEPT
iptables -A INPUT -p udp --dport 53 -s 38.55.198.243 -j ACCEPT
iptables -A INPUT -p tcp --dport 53 -s 38.55.198.243 -j ACCEPT
iptables -A INPUT -p udp --dport 53 -s 50.114.113.90 -j ACCEPT
iptables -A INPUT -p tcp --dport 53 -s 50.114.113.90 -j ACCEPT
iptables -A INPUT -p udp --dport 53 -s 154.7.181.147 -j ACCEPT
iptables -A INPUT -p tcp --dport 53 -s 154.7.181.147 -j ACCEPT
iptables -A INPUT -p udp --dport 53 -s 43.130.59.20 -j ACCEPT
iptables -A INPUT -p tcp --dport 53 -s 43.130.59.20 -j ACCEPT
iptables -A INPUT -p udp --dport 53 -s 45.153.247.84 -j ACCEPT
iptables -A INPUT -p tcp --dport 53 -s 45.153.247.84 -j ACCEPT

# mosdns DoH（仅限本地）
iptables -A INPUT -p tcp --dport 5443 -s 127.0.0.1 -j ACCEPT

# ping
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 10/second -j ACCEPT

# 持久化
apt install -y iptables-persistent
netfilter-persistent save
```

---

## 9. 功能验收清单

### 9.1 DNS 解析测试

```bash
# 从 DediOne 本地
dig @127.0.0.1 google.com +short    # 国外，unbound 递归
dig @127.0.0.1 baidu.com +short      # 国内，223.5.5.5
dig @127.0.0.1 doubleclick.net +short # 广告，返回空

# 从代理 VPS
dig @144.225.187.178 netflix.com +short          # → 144.225.187.178
dig @144.225.187.178 youtube.com +short           # → 144.225.187.178
dig @144.225.187.178 spotify.com +short           # → 144.225.187.178
dig @144.225.187.178 abcd.spotify.com +short      # → 144.225.187.178 (通配)
```

### 9.2 HTTP 访问测试

```bash
# 从 DediOne 测试 SNI 转发
curl -4s -o /dev/null -w "%{http_code}" --resolve "netflix.com:443:144.225.187.178" https://netflix.com
curl -4s -o /dev/null -w "%{http_code}" --resolve "disneyplus.com:443:144.225.187.178" https://disneyplus.com
curl -4s -o /dev/null -w "%{http_code}" --resolve "spotify.com:443:144.225.187.178" https://spotify.com
curl -4s -o /dev/null -w "%{http_code}" --resolve "www.youtube.com:443:144.225.187.178" https://www.youtube.com
```

### 9.3 DoH 测试

```bash
# 标准 RFC 8484 格式
curl -s "https://dns.357561.xyz/dns-query?name=google.com&type=A" \
  -H "Accept: application/dns-message" \
  -H "user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
```

### 9.4 完整解锁列表

| 服务 | DNS 通配 | nginx SNI | 实测 |
|------|---------|-----------|------|
| Netflix | ✅ | ✅ | ✅ |
| Disney+ | ✅ | ✅ | ✅ |
| Spotify | ✅ | ✅ | ✅ |
| YouTube | ✅ | ✅ | ✅ |
| TikTok | ✅ | ✅ | ✅ |
| ChatGPT | ✅ | ✅ | ✅ |
| Claude | ✅ | ✅ | ✅ |
| Gemini | ✅ | ✅ | ✅ |
| Prime Video | ✅ | ✅ | ✅ |
| Bahamut | ✅ | ✅ | ✅ |
| Hulu | ✅ | ✅ | ✅ |
| Reddit | ✅ | ✅ | ✅ |
| Max | ✅ | ✅ | ✅ |
| Paramount+ | ✅ | ✅ | ✅ |

---

## 10. 排障指南

### 10.1 常见问题

#### Q: Clash 面板显示未解锁，但实际能看？

面板检测不经过 DNS 解锁链路，它直接测节点出口 IP。实际浏览器挂代理能打开就是解锁成功。

#### Q: 修改配置后不生效？

三步走：
1. `systemctl restart mosdns`（geosite 规则文件变更后必须重启）
2. `systemctl restart unbound`（unlock.conf 变更后必须重启）
3. `nginx -t && systemctl restart nginx`（stream 配置变更后）

#### Q: Disney+ SSL 握手失败？

`www.disneyplus.com` 和 `disneyplus.com` 走不同 CDN（Google vs Akamai），证书不共用。
nginx stream 里需要配 `www.disneyplus.com` 单独一条。

#### Q: unbound-checkconf 报 "local-data in redirect zone must reside at top of zone"？

把 `local-data: "www.xxx.com A ..."` 从 redirect zone 里删掉，redirect 会自动覆盖子域名。

### 10.2 快速诊断

```bash
# 1. 检查 unbound 配置
unbound-checkconf

# 2. 检查 mosdns 日志
journalctl -u mosdns --since "1 min ago" --no-pager

# 3. 检查 DNS 链
dig @144.225.187.178 netflix.com +short
# 应返回 DediOne IP

# 4. 检查 nginx 状态
curl -4s -o /dev/null -w "%{http_code}" --resolve "netflix.com:443:144.225.187.178" https://netflix.com

# 5. 检查 iptables
iptables -L INPUT -n
```

---

## 11. 架构迁移记录

### v1 — 软银单机

- 软银 (50.114.113.90) 上同时跑 mosdns + unbound + xray 代理
- 内存 457MB 紧张（xray + mosdns + unbound + cloudflared 挤在一起）

### v2 — 软银 mosdns + 9929 unbound

- unbound 搬到 9929（内存更充裕）
- 软银只跑 mosdns + xray
- 但 DNS 查询多一跳：软银→9929，延迟增加

### v3 — 全迁 DediOne（当前，稳定）

- **DediOne (144.225.187.178)**：mosdns + unbound + nginx + cloudflared
- **9929 (154.7.181.147)**：xray 代理
- **软银 (50.114.113.90)**：xray 代理，无 DNS 服务
- 所有 VPS resolv.conf → `144.225.187.178`
- 资源：DediOne 1GB RAM + 1GB swap，绰绰有余
- unbound 去掉 adblock 后仅 ~18MB

---

> 本文档维护于 [`docs/self-hosted-dns-guide.md`](docs/self-hosted-dns-guide.md)
> 配套文件：
> - `mihomo-dns-config.yaml` — Clash/mihomo DNS 配置参考
> - `_worker.js` — sub-worker 订阅生成代码（含 DNS 模板）
