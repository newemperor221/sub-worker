// ==UserScript==
// Sub Worker — 订阅聚合与转换 | 多用户 / D1 架构
// ==/UserScript==

import { loadConfig, encodeBase64 } from './utils.js';
import { convertVlessToClashProxy, convertTrojanToClashProxy, convertHysteria2ToClashProxy } from './convert.js';
import { generateClashYaml } from './yaml.js';
import { renderDashboard } from './dashboard.js';

const SESSION_COOKIE = 'sub_worker_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const PASSWORD_ITERATIONS = 120000;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function parseCookies(header) {
  const cookies = {};
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(payload, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
}

function randomUrlToken(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hashPassword(password) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PASSWORD_ITERATIONS, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$${PASSWORD_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(bits)}`;
}

async function verifyPassword(password, stored) {
  if (!stored) return false;
  if (stored.startsWith('plain:')) return constantTimeEqual(password, stored.slice(6));
  if (!stored.startsWith('pbkdf2$')) return false;
  const [, iter, saltHex, hashHex] = stored.split('$');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: Number(iter), hash: 'SHA-256' }, key, 256);
  return constantTimeEqual(bytesToHex(bits), hashHex);
}

function normalizeUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    username: row.username,
    password_hash: row.password_hash,
    role: row.role || 'user',
    token: row.token || '',
    link: row.link || '',
    subname: row.subname || row.subName || '我的订阅',
    enabled: Number(row.enabled ?? 1),
  };
}

function hasTestUsers(db) {
  return db && Array.isArray(db._users);
}

async function ensureDb(env, config) {
  const db = env?.DB;
  if (!db) return null;
  if (hasTestUsers(db)) {
    if (!db._users.some(u => u.role === 'admin')) {
      db._users.push({ id: db._nextId++, username: config.adminUser, password_hash: 'plain:' + config.adminPass, role: 'admin', token: randomUrlToken(), link: '', subname: config.subName, enabled: 1 });
    }
    return db;
  }
  await db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    token TEXT NOT NULL UNIQUE,
    link TEXT NOT NULL DEFAULT '',
    subname TEXT NOT NULL DEFAULT '我的订阅',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  const existing = await db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").first();
  if (!existing && config.adminUser && config.adminPass) {
    await db.prepare('INSERT INTO users (username,password_hash,role,token,link,subname,enabled) VALUES (?,?,?,?,?,?,1)')
      .bind(config.adminUser, await hashPassword(config.adminPass), 'admin', randomUrlToken(24), '', config.subName).run();
  }
  return db;
}

async function dbGetUserByUsername(db, username) {
  if (hasTestUsers(db)) return normalizeUser(db._users.find(u => u.username === username));
  return normalizeUser(await db.prepare('SELECT * FROM users WHERE username = ? LIMIT 1').bind(username).first());
}

async function dbGetUserById(db, id) {
  if (hasTestUsers(db)) return normalizeUser(db._users.find(u => Number(u.id) === Number(id)));
  return normalizeUser(await db.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(id).first());
}

async function dbGetUserByToken(db, token) {
  if (hasTestUsers(db)) return normalizeUser(db._users.find(u => u.token === token && Number(u.enabled) === 1));
  return normalizeUser(await db.prepare('SELECT * FROM users WHERE token = ? AND enabled = 1 LIMIT 1').bind(token).first());
}

async function dbListUsers(db) {
  if (hasTestUsers(db)) return db._users.map(normalizeUser).sort((a, b) => a.id - b.id);
  const result = await db.prepare('SELECT id, username, role, token, subname, enabled FROM users ORDER BY id ASC').all();
  return (result.results || []).map(normalizeUser);
}

async function dbCreateUser(db, data) {
  const user = {
    id: hasTestUsers(db) ? db._nextId++ : undefined,
    username: data.username,
    password_hash: await hashPassword(data.password || randomUrlToken()),
    role: data.role === 'admin' ? 'admin' : 'user',
    token: data.token || randomUrlToken(24),
    link: data.link || '',
    subname: data.subname || data.username || '我的订阅',
    enabled: data.enabled ? 1 : 0,
  };
  if (hasTestUsers(db)) {
    db._users.push(user);
    return normalizeUser(user);
  }
  await db.prepare('INSERT INTO users (username,password_hash,role,token,link,subname,enabled) VALUES (?,?,?,?,?,?,?)')
    .bind(user.username, user.password_hash, user.role, user.token, user.link, user.subname, user.enabled).run();
  return dbGetUserByUsername(db, user.username);
}

async function dbUpdateUser(db, id, data) {
  const user = await dbGetUserById(db, id);
  if (!user || user.role === 'admin') return false;
  const patch = {
    username: data.username || user.username,
    password_hash: data.password ? await hashPassword(data.password) : user.password_hash,
    token: data.token || user.token,
    link: data.link ?? user.link,
    subname: data.subname || user.subname,
    enabled: data.enabled ? 1 : 0,
  };
  if (hasTestUsers(db)) {
    const idx = db._users.findIndex(u => Number(u.id) === Number(id));
    db._users[idx] = { ...db._users[idx], ...patch };
    return true;
  }
  await db.prepare('UPDATE users SET username=?, password_hash=?, token=?, link=?, subname=?, enabled=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND role != \'admin\'')
    .bind(patch.username, patch.password_hash, patch.token, patch.link, patch.subname, patch.enabled, id).run();
  return true;
}

async function dbDeleteUser(db, id) {
  const user = await dbGetUserById(db, id);
  if (!user || user.role === 'admin') return false;
  if (hasTestUsers(db)) {
    db._users = db._users.filter(u => Number(u.id) !== Number(id));
    return true;
  }
  await db.prepare('DELETE FROM users WHERE id=? AND role != \'admin\'').bind(id).run();
  return true;
}

function parseProxiesFromLink(link) {
  const allLines = String(link || '').split('\n').filter(l => l.trim());
  const vlessLines = allLines.filter(l => l.startsWith('vless://'));
  const trojanLines = allLines.filter(l => l.startsWith('trojan://'));
  const hysteria2Lines = allLines.filter(l => l.startsWith('hysteria2://') || l.startsWith('hy2://'));
  return {
    allLines,
    proxies: [
      ...vlessLines.map(l => convertVlessToClashProxy(l.trim())).filter(Boolean),
      ...trojanLines.map(l => convertTrojanToClashProxy(l.trim())).filter(Boolean),
      ...hysteria2Lines.map(l => convertHysteria2ToClashProxy(l.trim().replace(/^hy2:\/\//, 'hysteria2://'))).filter(Boolean),
    ],
  };
}

function configForUser(user, fallbackConfig) {
  return { ...fallbackConfig, token: user.token, link: user.link, subName: user.subname || fallbackConfig.subName };
}

function getSubscriptionKind(params) {
  const type = (params.get('type') || '').toLowerCase();
  if (params.has('clash') || type === 'clash' || type === 'mihomo') return 'clash';
  if (params.has('b64') || type === 'b64' || type === 'base64') return 'b64';
  return '';
}

function renderSubscription(kind, userConfig) {
  const { allLines, proxies } = parseProxiesFromLink(userConfig.link);
  if (kind === 'clash') {
    return new Response(generateClashYaml(proxies, userConfig.subName), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'content-disposition': "inline; filename*=UTF-8''" + encodeURIComponent(userConfig.subName),
        'profile-title': userConfig.subName,
        'profile-update-interval': '6',
      },
    });
  }
  if (kind === 'b64') {
    const linkList = allLines.map(l => {
      const t = l.trim();
      return t.startsWith('vless://') ? t.replace(/[?&]flow=(&|$)/g, '$1') : t;
    }).join('\n');
    return new Response(encodeBase64(linkList), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  return new Response('Not Found', { status: 404 });
}

function renderLoginPage(config, errorMessage = '') {
  const error = errorMessage ? `<div class="error">${escapeHtml(errorMessage)}</div>` : '';
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(config.subName)} 登录</title><style>*{box-sizing:border-box}body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px;background:linear-gradient(180deg,#9dd5bd,#d7ebcc);font-family:'Noto Sans SC','Microsoft YaHei',system-ui,sans-serif;color:#5d3e24}.card{width:min(420px,100%);padding:30px;border:4px solid #795735;border-radius:28px;background:#f8f2dd;box-shadow:0 12px 0 rgba(94,62,36,.28)}h1{text-align:center}.sub{text-align:center;color:#8b6b44;font-weight:700}.field{margin:14px 0}label{display:block;margin-bottom:7px;font-weight:900}input{width:100%;height:46px;padding:0 14px;border:2px solid #795735;border-radius:14px;background:#fffdf7;color:#5d3e24;font:inherit}button{width:100%;height:48px;margin-top:18px;border:2px solid #5d3e24;border-radius:999px;background:#58c5ae;color:#fffaf0;font:inherit;font-weight:900;cursor:pointer}.error{margin-bottom:14px;padding:10px 12px;border:2px solid #ed947c;border-radius:13px;background:#fff0e4;color:#9a3f2d;font-weight:800}.hint{margin-top:18px;text-align:center;font-size:12px;color:#8b6b44}</style></head><body><main class="card"><h1>订阅小岛</h1><p class="sub">${escapeHtml(config.subName)} 管理面板登录</p>${error}<form method="POST" action="/login" autocomplete="on"><div class="field"><label for="username">用户名</label><input id="username" name="username" autocomplete="username" required autofocus></div><div class="field"><label for="password">密码</label><input id="password" name="password" type="password" autocomplete="current-password" required></div><button type="submit">登录</button></form><div class="hint">管理员进入后台，普通用户进入自己的随机主页</div></main></body></html>`;
}

async function createSessionCookie(user, config) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const homeId = randomUrlToken();
  const role = user.role === 'admin' ? 'admin' : 'user';
  const payload = `${expiresAt}:${homeId}:${user.id}:${role}`;
  const signature = await hmacHex(payload, config.sessionSecret);
  const value = encodeURIComponent(`${payload}.${signature}`);
  return { cookie: `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`, homePath: role === 'admin' ? `/${homeId}/admin` : `/${homeId}/home` };
}

async function getValidSession(request, config, db) {
  const value = parseCookies(request.headers.get('Cookie'))[SESSION_COOKIE];
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const [expiresAt, homeId, userId, role] = payload.split(':');
  if (!/^\d+$/.test(expiresAt) || !/^[A-Za-z0-9_-]{22,}$/.test(homeId) || !/^\d+$/.test(userId)) return null;
  if (role !== 'admin' && role !== 'user') return null;
  if (Number(expiresAt) < Math.floor(Date.now() / 1000)) return null;
  if (!constantTimeEqual(signature, await hmacHex(payload, config.sessionSecret))) return null;
  const user = db ? await dbGetUserById(db, userId) : null;
  if (db && (!user || !user.enabled)) return null;
  return { expiresAt: Number(expiresAt), homeId, userId: Number(userId), role, user, homePath: role === 'admin' ? `/${homeId}/admin` : `/${homeId}/home` };
}

async function handleLogin(request, config, db) {
  if (request.method !== 'POST') return new Response(renderLoginPage(config), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  const form = await request.formData();
  const username = String(form.get('username') || '');
  const password = String(form.get('password') || '');
  let user;
  if (db) user = await dbGetUserByUsername(db, username);
  else if (username === config.adminUser && password === config.adminPass) user = { id: 1, username, role: 'admin', enabled: 1, password_hash: 'plain:' + config.adminPass, token: config.token, link: config.link, subname: config.subName };
  if (!user || !user.enabled || !(await verifyPassword(password, user.password_hash))) {
    return new Response(renderLoginPage(config, '用户名或密码错误'), { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  const session = await createSessionCookie(user, config);
  return new Response(null, { status: 303, headers: { Location: session.homePath, 'Set-Cookie': session.cookie } });
}

function noStoreHeaders(extra = {}) {
  return { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', Pragma: 'no-cache', Expires: '0', ...extra };
}

function parentCookieDomains(hostname) {
  const parts = hostname.split('.').filter(Boolean);
  const domains = [hostname];
  for (let i = 1; i < parts.length - 1; i++) domains.push(parts.slice(i).join('.'));
  return [...new Set(domains)];
}

function buildClearSessionHeaders(url) {
  const headers = new Headers(noStoreHeaders({ Location: '/login', 'Clear-Site-Data': '"cache"' }));
  const cookieAttrs = 'Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
  for (const name of [SESSION_COOKIE, 'sw_session']) {
    headers.append('Set-Cookie', `${name}=; ${cookieAttrs}`);
    for (const domain of parentCookieDomains(url.hostname)) headers.append('Set-Cookie', `${name}=; Domain=${domain}; ${cookieAttrs}`);
  }
  return headers;
}

function redirect(location) { return new Response(null, { status: 303, headers: { Location: location } }); }

function renderAdminPage(users, message = '') {
  const rows = users.map(u => `<tr><td>${u.id}</td><td>${escapeHtml(u.username)}</td><td>${escapeHtml(u.role)}</td><td>${u.enabled ? '启用' : '禁用'}</td><td><code>${escapeHtml(u.token)}</code></td><td>${u.role === 'admin' ? '管理员不可操作' : `<form method="POST" action="./admin/users" style="display:inline"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="${u.id}"><button>删除</button></form>`}</td></tr>`).join('');
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>用户管理</title><style>body{font-family:system-ui,'Noto Sans SC',sans-serif;background:#f8f2dd;color:#5d3e24;padding:24px}input,textarea,button{font:inherit;margin:4px;padding:8px}textarea{width:min(760px,100%);height:110px}table{border-collapse:collapse;width:100%;background:#fffdf7}td,th{border:1px solid #d7c39d;padding:8px;text-align:left}.card{background:#fffaf0;border:2px solid #795735;border-radius:14px;padding:16px;margin:16px 0}</style></head><body><h1>管理员后台</h1><p><a href="/logout">退出</a></p>${message ? `<p><b>${escapeHtml(message)}</b></p>` : ''}<section class="card"><h2>新增普通用户</h2><form method="POST" action="./admin/users"><input type="hidden" name="action" value="create"><input name="username" placeholder="用户名" required><input name="password" placeholder="密码" required><input name="subname" placeholder="订阅名"><input name="token" placeholder="token 留空自动生成"><br><textarea name="link" placeholder="代理链接，每行一个"></textarea><br><label><input type="checkbox" name="enabled" checked>启用</label><button>新增</button></form></section><section class="card"><h2>用户列表</h2><table><thead><tr><th>ID</th><th>用户名</th><th>角色</th><th>状态</th><th>Token</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></section><section class="card"><h2>修改普通用户</h2><form method="POST" action="./admin/users"><input type="hidden" name="action" value="update"><input name="id" placeholder="用户ID" required><input name="username" placeholder="新用户名"><input name="password" placeholder="新密码（留空不改）"><input name="subname" placeholder="订阅名"><input name="token" placeholder="token"><br><textarea name="link" placeholder="代理链接"></textarea><br><label><input type="checkbox" name="enabled" checked>启用</label><button>保存</button></form></section></body></html>`;
}

async function handleAdminUsers(request, db) {
  const form = await request.formData();
  const action = String(form.get('action') || '');
  if (action === 'create') await dbCreateUser(db, { username: String(form.get('username') || ''), password: String(form.get('password') || ''), token: String(form.get('token') || ''), link: String(form.get('link') || ''), subname: String(form.get('subname') || ''), enabled: form.has('enabled') });
  if (action === 'update') await dbUpdateUser(db, Number(form.get('id')), { username: String(form.get('username') || ''), password: String(form.get('password') || ''), token: String(form.get('token') || ''), link: String(form.get('link') || ''), subname: String(form.get('subname') || ''), enabled: form.has('enabled') });
  if (action === 'delete') await dbDeleteUser(db, Number(form.get('id')));
}

async function handleRequest(request, env) {
  const config = loadConfig(env);
  const db = await ensureDb(env, config);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const params = url.searchParams;
  const baseUrl = url.protocol + '//' + url.host;

  if (path === '/api/sub') {
    if (db) {
      const user = await dbGetUserByToken(db, params.get('token') || '');
      if (!user) return new Response('Not Found', { status: 404 });
      return renderSubscription(getSubscriptionKind(params), configForUser(user, config));
    }
    if (params.get('token') !== config.token) return new Response('Not Found', { status: 404 });
    return renderSubscription(getSubscriptionKind(params), config);
  }

  const pathParts = path.split('/').filter(Boolean);
  const legacyToken = pathParts[0] || '';
  if (!db && legacyToken && legacyToken === config.token) return renderSubscription(getSubscriptionKind(params), config);
  if (path === '/login') return handleLogin(request, config, db);
  if (path === '/logout') return new Response(null, { status: 303, headers: buildClearSessionHeaders(url) });

  const session = await getValidSession(request, config, db);
  if (path === '/') return redirect(session ? session.homePath : '/login');

  if (session && session.role === 'admin' && path === session.homePath) {
    if (!db) return new Response('D1 DB is required for admin users', { status: 500 });
    return new Response(renderAdminPage(await dbListUsers(db)), { headers: noStoreHeaders({ 'Content-Type': 'text/html; charset=utf-8' }) });
  }
  if (session && session.role === 'admin' && path === `/${session.homeId}/admin/users`) {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    await handleAdminUsers(request, db);
    return redirect(session.homePath);
  }
  if (session && session.role === 'user' && path === session.homePath) {
    const userConfig = db ? configForUser(session.user, config) : config;
    const { proxies } = parseProxiesFromLink(userConfig.link);
    return new Response(renderDashboard(userConfig, proxies, baseUrl), { headers: noStoreHeaders({ 'Content-Type': 'text/html; charset=utf-8' }) });
  }
  return new Response('Not Found', { status: 404 });
}

export default { fetch: handleRequest };
