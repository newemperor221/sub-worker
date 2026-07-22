# Sub Worker — 多用户私有订阅面板

运行在 **Cloudflare Workers / Pages** 的私有订阅聚合面板。当前版本支持：

- 一个环境变量管理员账号；
- 多个普通用户；
- 管理员新增 / 删除 / 查看 / 修改普通用户；
- 普通用户只能登录自己的面板，不能查看或修改其它用户；
- 每个普通用户都有自己的代理链接、订阅名称和专属 token；
- 客户端通过用户自己的 token 拉取订阅。

---

## 路由结构

```text
GET  /                         未登录跳转 /login；已登录跳转当前会话主页
GET  /login                    登录页
POST /login                    登录提交
GET  /随机字符/home             普通用户面板
GET  /随机字符/admin            管理员后台
POST /随机字符/admin/users      管理员新增 / 修改 / 删除普通用户
GET  /logout                   退出登录
GET  /api/sub?token=...&type=clash  用户 Clash / Mihomo 订阅
GET  /api/sub?token=...&type=b64    用户 Base64 订阅
```

登录成功后会进入随机路径，例如：

```text
普通用户：https://sub.example.com/Z0i9J3VjQ1uJkQOe6I_ZCA/home
管理员：  https://sub.example.com/Z0i9J3VjQ1uJkQOe6I_ZCA/admin
```

---

## 用户权限

| 角色 | 能力 |
|---|---|
| 管理员 | 账号固定来自 `ADMIN_USER` / `ADMIN_PASS`；只负责管理普通用户；没有订阅链接和 token |
| 普通用户 | 只能看自己的面板和自己的订阅链接；不能进入管理员后台 |

管理员后台不会给普通用户开放。普通用户即使猜到 `/随机字符/admin` 也会返回 404。D1 数据库只保存普通用户，管理员不写入 `users` 表。

---

## Cloudflare 配置

### 必需绑定

需要一个 D1 数据库绑定：

```text
Binding name: DB
```

可以使用仓库内的：

```text
schema.sql
```

初始化表结构。

### 环境变量

| 变量名 | 必填 | 说明 |
|---|---:|---|
| `ADMIN_USER` | ✅ | 管理员用户名，只来自环境变量，不写入 D1 |
| `ADMIN_PASS` | ✅ | 管理员密码，只来自环境变量，不写入 D1 |
| `SESSION_SECRET` | ✅ | Cookie 签名密钥，建议 `openssl rand -hex 32` |
| `SUBNAME` | ❌ | 默认订阅名 / 登录页标题 |
| `TOKEN` | ❌ | 无 D1 时的单用户兼容 token |
| `LINK` | ❌ | 无 D1 时的单用户兼容节点链接 |

推荐生成：

```bash
openssl rand -hex 32
```

---

## D1 表结构

核心表：

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 保留字段；普通用户固定为 user
  token TEXT NOT NULL UNIQUE,
  link TEXT NOT NULL DEFAULT '',
  subname TEXT NOT NULL DEFAULT '我的订阅',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Worker 启动时也会自动执行 `CREATE TABLE IF NOT EXISTS`，但仍建议用 `schema.sql` 明确初始化。管理员账号不在这张表里。

---

## 管理员后台

管理员登录后进入：

```text
/随机字符/admin
```

管理员不需要订阅链接，只管理普通用户字段：

- 用户名；
- 密码；
- 订阅 token；
- 代理链接 `link`；
- 订阅名称 `subname`；
- 启用 / 禁用。

后台会限制：

- 管理员账号不在用户列表里；
- 后台新增时只能新增普通用户；
- 普通用户不能访问后台；
- 普通用户不能查看其它用户。

---

## 每个用户的订阅地址

每个普通用户都有自己的专属 token，也就是这个普通用户的订阅/代理入口：

```text
https://sub.example.com/api/sub?token=用户TOKEN&type=clash
https://sub.example.com/api/sub?token=用户TOKEN&type=b64
```

Worker 会根据 token 找到对应普通用户，只使用该普通用户自己的 `link` 生成订阅。管理员没有 token，不能通过 `/api/sub` 拉订阅。

---

## Cookie 与退出

新会话 Cookie 名：

```text
sub_worker_session
```

退出时会同时清理：

```text
sub_worker_session
sw_session  # 旧版本兼容清理
```

并清理当前域名和父域名作用域，避免旧 Cookie 造成“退出不了”。

---

## 本地测试

```bash
npm test
```

当前测试覆盖：

- 登录页；
- 普通用户登录到 `/随机字符/home`；
- 管理员登录到 `/随机字符/admin`；
- 普通用户不能访问管理员后台；
- 管理员账号来自 `ADMIN_USER` / `ADMIN_PASS`，不在 D1 用户表里；
- 管理员可新增、修改、删除普通用户；
- 订阅 API 按用户 token 返回对应用户链接；
- 退出清理新旧 Cookie。

---

## 注意事项

- 不要把真实节点链接、token、密码提交到仓库；
- 仓库建议保持私有；
- 如果用户 token 泄露，只需要在后台改该用户 token；
- 如果 `SESSION_SECRET` 泄露，需要更换它，所有用户会重新登录；
- 修改 D1 binding 或环境变量后，等待 Cloudflare Pages 重新部署生效。

---

## License

Private / personal-use subscription worker.
