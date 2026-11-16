// ==UserScript==
// Sub Worker — 订阅聚合与转换 | 模块化架构
// ==/UserScript==

import { loadConfig, encodeBase64 } from './utils.js';
import { convertVlessToClashProxy, convertHysteria2ToClashProxy } from './convert.js';
import { generateClashYaml } from './yaml.js';
import { generateLoonConfig } from './loon.js';
import { renderDashboard } from './dashboard.js';

const SESSION_COOKIE = 'sub_worker_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const SUBSCRIPTIONS_KEY = 'subscription_links';
const SUPPORTED_LINK_PATTERN = /^(vless|hysteria2):\/\//i;
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="#5f6df8"/><path d="M27 30h46v9H27zm0 17h46v9H27zm0 17h31v9H27z" fill="white"/></svg>`;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function parseCookies(header) {
  const cookies = {};
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function signSessionPayload(payload, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return bytesToHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
}

function randomUrlToken(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function createSessionCookie(config) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const homeId = randomUrlToken();
  const payload = `${expiresAt}:${homeId}`;
  const signature = await signSessionPayload(payload, config.sessionSecret);
  const value = encodeURIComponent(`${payload}.${signature}`);
  return {
    cookie: `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
    homePath: `/${homeId}/home`,
  };
}

async function getValidSession(request, config) {
  const value = parseCookies(request.headers.get('Cookie'))[SESSION_COOKIE];
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const [expiresAt, homeId] = payload.split(':');
  if (!expiresAt || !homeId) return null;
  if (!/^\d+$/.test(expiresAt)) return null;
  if (!/^[A-Za-z0-9_-]{22,}$/.test(homeId)) return null;
  if (Number(expiresAt) < Math.floor(Date.now() / 1000)) return null;
  const expected = await signSessionPayload(payload, config.sessionSecret);
  if (!constantTimeEqual(signature, expected)) return null;
  return { expiresAt: Number(expiresAt), homeId, homePath: `/${homeId}/home` };
}

function renderLoginPage(config, errorMessage = '') {
  const error = errorMessage ? `<div class="error" role="alert">${escapeHtml(errorMessage)}</div>` : '';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#101216">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<title>${escapeHtml(config.subName)} 登录</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}:root{color-scheme:dark;--bg:#0b0d12;--nav:#101218;--panel:#14171a;--raised:#191c23;--field:#101319;--border:#272b35;--border2:#3a404c;--text:#f4f5f8;--soft:#d3d7df;--muted:#8e96a5;--dim:#697281;--accent:#727cf5;--accent2:#858eff;--accentSoft:#232847;--danger:#f07880;--dangerSoft:#321f24;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}body{min-width:320px;min-height:100vh;background:var(--bg);color:var(--text);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}button,input{font:inherit}:focus-visible{outline:2px solid #a0a6ff;outline-offset:2px}svg{display:block}.site{display:flex;min-height:100vh;flex-direction:column}.topbar{height:58px;flex:none;border-bottom:1px solid var(--border);background:var(--nav)}.topbar-inner{display:flex;width:min(1040px,calc(100% - 40px));height:100%;margin:auto;align-items:center;justify-content:space-between}.brand{display:flex;min-width:0;align-items:center;gap:10px}.brand-mark{display:grid;width:30px;height:30px;flex:none;place-items:center;border:1px solid #8d95ff;border-radius:7px;background:var(--accent);color:white}.brand-mark svg{width:17px}.brand-copy{display:grid;line-height:1.15}.brand-name{font-size:13px;font-weight:750}.brand-subtitle{max-width:240px;margin-top:3px;overflow:hidden;color:var(--muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.secure-label{display:flex;padding:4px 8px;align-items:center;gap:6px;border:1px solid var(--border);border-radius:999px;color:var(--muted);font-size:10px}.secure-label svg{width:12px;color:#74d59d}
.login-main{display:grid;width:min(100% - 40px,900px);flex:1;margin:auto;grid-template-columns:minmax(0,1fr) 370px;align-items:center;gap:76px;padding:52px 0}.login-intro{max-width:390px}.eyebrow{margin-bottom:10px;color:#999fff;font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.login-intro h1{font-size:30px;font-weight:730;line-height:1.18;letter-spacing:-.035em}.login-intro>p{margin-top:13px;color:var(--muted);font-size:12px;line-height:1.7}.feature-list{display:grid;margin-top:25px;gap:12px;list-style:none}.feature-list li{display:flex;align-items:center;gap:10px;color:var(--soft);font-size:11px}.feature-icon{display:grid;width:28px;height:28px;flex:none;place-items:center;border:1px solid var(--border);border-radius:6px;background:var(--panel);color:#9fa5ff}.feature-icon svg{width:14px}.login-shell{width:100%}.login-card{padding:24px;border:1px solid var(--border);border-radius:9px;background:var(--panel);box-shadow:0 24px 60px rgba(0,0,0,.28)}.card-heading{margin-bottom:20px}.card-heading h2{font-size:17px;font-weight:720}.card-heading p{margin-top:5px;color:var(--muted);font-size:10px}.error{display:flex;margin-bottom:14px;padding:9px 10px;align-items:center;gap:8px;border:1px solid #65414a;border-radius:6px;background:var(--dangerSoft);color:#f4abb1;font-size:11px}.error:before{display:grid;width:16px;height:16px;flex:none;place-items:center;border:1px solid currentColor;border-radius:50%;font-size:10px;font-weight:800;content:"!"}.field{margin-bottom:14px}.field label{display:block;margin-bottom:6px;color:var(--soft);font-size:11px;font-weight:650}.input-wrap{position:relative}.input-wrap svg{position:absolute;top:12px;left:11px;width:15px;color:var(--dim);pointer-events:none}.field input{display:block;width:100%;height:40px;padding:8px 10px 8px 36px;border:1px solid var(--border2);border-radius:6px;background:var(--field);color:var(--text);font:inherit;outline:none}.field input:hover{border-color:#4c5360}.field input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(114,124,245,.13)}.field input:focus+svg{color:#aab0ff}.submit{display:flex;width:100%;height:40px;margin-top:3px;align-items:center;justify-content:center;gap:7px;border:1px solid #7a84fa;border-radius:6px;background:var(--accent);color:white;font-weight:700;cursor:pointer}.submit svg{width:14px}.submit:hover{background:var(--accent2)}.hint{display:flex;margin-top:14px;align-items:center;justify-content:center;gap:5px;color:var(--dim);font-size:9px}.hint svg{width:11px}.footer{display:flex;width:min(1040px,calc(100% - 40px));height:54px;flex:none;margin:auto;align-items:center;justify-content:space-between;border-top:1px solid var(--border);color:var(--dim);font-size:9px}.footer strong{color:var(--muted);font-weight:600}
@media(max-width:780px){.login-main{width:min(100% - 28px,390px);grid-template-columns:1fr;gap:28px;padding:44px 0}.login-intro{text-align:center}.login-intro h1{font-size:24px}.login-intro>p{margin-right:auto;margin-left:auto}.feature-list{display:none}.footer{width:min(100% - 28px,1040px)}}@media(max-width:480px){.topbar-inner{width:calc(100% - 24px)}.brand-subtitle,.secure-label{display:none}.login-main{align-items:start;padding-top:38px}.login-card{padding:20px}.footer span:last-child{display:none}}/* Larger interface type and icon scale */body{font-size:16px;line-height:1.55}.brand-name{font-size:15px}.brand-subtitle,.secure-label{font-size:12px}.eyebrow{font-size:11px}.login-intro h1{font-size:34px}.login-intro>p{font-size:14px}.feature-list li{font-size:13px}.card-heading h2{font-size:20px}.card-heading p{font-size:12px}.error{font-size:13px}.field label{font-size:13px}.field input{height:44px;padding-left:42px;font-size:15px}.submit{height:44px;font-size:14px}.hint{font-size:11px}.footer{font-size:12px}.brand-mark{width:34px;height:34px}.brand-mark svg{width:20px}.secure-label svg{width:15px}.feature-icon{width:34px;height:34px}.feature-icon svg{width:18px}.input-wrap svg{top:13px;left:12px;width:18px}.submit svg{width:17px}.hint svg{width:14px}@media(max-width:780px){.login-intro h1{font-size:28px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<div class="site">
  <header class="topbar"><div class="topbar-inner"><div class="brand"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M6 6.5h12M6 12h12M6 17.5h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span><span class="brand-copy"><span class="brand-name">订阅控制台</span><span class="brand-subtitle">${escapeHtml(config.subName)}</span></span></div><span class="secure-label"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6V10Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>安全管理入口</span></div></header>
  <main class="login-main"><section class="login-intro" aria-labelledby="welcome-title"><div class="eyebrow">Private workspace</div><h1 id="welcome-title">管理节点，<br>保持订阅井然有序。</h1><p>一个专注的私有工作区，用于维护节点顺序并为常用客户端生成订阅入口。</p><ul class="feature-list"><li><span class="feature-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="4" width="16" height="6" rx="2" stroke="currentColor" stroke-width="1.7"/><rect x="4" y="14" width="16" height="6" rx="2" stroke="currentColor" stroke-width="1.7"/></svg></span>节点凭据在管理界面中保持隐藏</li><li><span class="feature-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7.5C5 5.6 8.1 4 12 4s7 1.6 7 3.5S15.9 11 12 11 5 9.4 5 7.5Z" stroke="currentColor" stroke-width="1.7"/><path d="M5 7.5v8c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5v-8" stroke="currentColor" stroke-width="1.7"/></svg></span>以 D1 管理节点，并同步 KV 兼容备份</li><li><span class="feature-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 12h10M14 9l3 3-3 3M5 5h14v14H5z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>快速导出 Clash、Loon 与 Base64</li></ul></section><section class="login-shell" aria-labelledby="login-title"><form class="login-card" method="POST" action="/login" autocomplete="on"><div class="card-heading"><h2 id="login-title">管理员登录</h2><p>验证身份后进入订阅工作区</p></div>${error}<div class="field"><label for="username">用户名</label><div class="input-wrap"><input id="username" name="username" autocomplete="username" required autofocus><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.7"/><path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" stroke-width="1.7"/></svg></div></div><div class="field"><label for="password">密码</label><div class="input-wrap"><input id="password" name="password" type="password" autocomplete="current-password" required><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6V10Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></div></div><button class="submit" type="submit">登录控制台<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></button><p class="hint"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6V10Z" stroke="currentColor" stroke-width="1.8"/></svg>登录后进入当前会话专属的随机路径</p></form></section></main>
  <footer class="footer"><strong>Private subscription administration</strong><span>Protected workspace</span></footer>
</div>
</body>
</html>`;
}
function parseProxies(config) {
  const allLines = String(config.link || '').split(/\r?\n/).map(line => line.replace(/^\uFEFF/, '').trim()).filter(Boolean);
  const proxies = allLines.map((line) => {
    const scheme = line.match(/^([a-z][a-z0-9+.-]*):\/\//i)?.[1]?.toLowerCase();
    if (scheme === 'vless') return convertVlessToClashProxy(line);
    if (scheme === 'hysteria2') return convertHysteria2ToClashProxy(line);
    return null;
  }).filter(Boolean);
  return { allLines, proxies };
}

function normalizeSubscriptionLines(value) {
  return [...new Set(String(value || '').split(/\r?\n/).map(line => line.replace(/^\uFEFF/, '').trim()).filter(Boolean))];
}

function parseSubscriptionInput(value) {
  const lines = normalizeSubscriptionLines(value);
  const invalid = lines.map((line, index) => ({ line, number: index + 1 })).filter(({ line }) => !SUPPORTED_LINK_PATTERN.test(line));
  if (invalid.length) throw new Error(`第 ${invalid.map(({ number }) => number).join('、')} 行协议不受支持，仅接受 vless://、hysteria2://`);
  return lines;
}

const STRUCTURED_KEY = 'subscription_nodes_v2';
const MIGRATION_KEY = 'kv_nodes_migrated_v2';
const d1Initialization = new WeakMap();
const MAX_GROUP_LENGTH = 64;
const MAX_NOTE_LENGTH = 500;
const MAX_TAGS = 12;
const MAX_TAG_LENGTH = 32;

function newNodeId() {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : randomUrlToken(18);
}

function displaySummary(url) {
  const scheme = url.match(/^([^:]+):\/\//)?.[1]?.toLowerCase() || 'unknown';
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  let name = '未命名节点';
  if (fragment) {
    try { name = decodeURIComponent(fragment).trim() || name; } catch { name = fragment.trim() || name; }
  }
  name = name.replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '').trim() || '未命名节点';
  const relay = name.match(/^(.+?)[-—–_\s]+(中转|中轉|前置|反连|反連)[-—–_\s]+(.+)$/);
  if (relay?.[1] && relay?.[3]) name = `${relay[3].trim()}(${relay[1].trim()}${relay[2]})`;
  return { protocol: scheme, name };
}

function normalizeTags(value) {
  if (!Array.isArray(value)) throw new Error('标签必须是数组');
  if (value.length > MAX_TAGS) throw new Error(`标签最多 ${MAX_TAGS} 个`);
  const tags = [];
  const seen = new Set();
  for (const raw of value) {
    if (typeof raw !== 'string') throw new Error('标签必须是文本');
    const tag = raw.trim();
    if (!tag) continue;
    if (tag.length > MAX_TAG_LENGTH) throw new Error(`单个标签不能超过 ${MAX_TAG_LENGTH} 个字符`);
    const key = tag.toLocaleLowerCase();
    if (!seen.has(key)) { seen.add(key); tags.push(tag); }
  }
  return tags;
}

function normalizeMetadata(payload, current = {}) {
  const group = payload.group === undefined ? String(current.group || '') : String(payload.group).trim();
  const note = payload.note === undefined ? String(current.note || '') : String(payload.note).trim();
  const tags = payload.tags === undefined ? [...(current.tags || [])] : normalizeTags(payload.tags);
  const enabled = payload.enabled === undefined ? current.enabled !== false : payload.enabled;
  if (group.length > MAX_GROUP_LENGTH) throw new Error(`分组不能超过 ${MAX_GROUP_LENGTH} 个字符`);
  if (note.length > MAX_NOTE_LENGTH) throw new Error(`备注不能超过 ${MAX_NOTE_LENGTH} 个字符`);
  if (typeof enabled !== 'boolean') throw new Error('启用状态必须是布尔值');
  return { group, tags, note, enabled };
}

function makeNode(url, position, metadata = {}) {
  const now = new Date().toISOString();
  const clean = normalizeMetadata(metadata, { enabled: true, tags: [] });
  return { id: newNodeId(), url, position, ...clean, createdAt: now, updatedAt: now };
}

function normalizeStoredNode(raw, position) {
  if (!raw || typeof raw !== 'object' || typeof raw.url !== 'string' || !SUPPORTED_LINK_PATTERN.test(raw.url.trim())) return null;
  const clean = normalizeMetadata({ group: raw.group ?? raw.group_name ?? '', tags: Array.isArray(raw.tags) ? raw.tags : [], note: raw.note ?? '', enabled: raw.enabled === undefined ? true : raw.enabled });
  const now = new Date().toISOString();
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newNodeId(), url: raw.url.trim(), position,
    ...clean, createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : (typeof raw.created_at === 'string' ? raw.created_at : now),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : (typeof raw.updated_at === 'string' ? raw.updated_at : now),
  };
}

function publicNode(node) {
  return { id: node.id, position: node.position, ...displaySummary(node.url), group: node.group, tags: node.tags, note: node.note, enabled: node.enabled, createdAt: node.createdAt, updatedAt: node.updatedAt };
}

async function readKvNodes(env) {
  if (!env?.SUBSCRIPTIONS) return { nodes: [], kvBound: false };
  const structured = await env.SUBSCRIPTIONS.get(STRUCTURED_KEY);
  if (structured !== null) {
    let parsed;
    try { parsed = JSON.parse(structured); } catch { throw new Error(`KV 中的 ${STRUCTURED_KEY} 不是有效 JSON`); }
    if (!Array.isArray(parsed)) throw new Error(`KV 中的 ${STRUCTURED_KEY} 必须是数组`);
    return { nodes: parsed.map(normalizeStoredNode).filter(Boolean), kvBound: true };
  }
  const legacy = await env.SUBSCRIPTIONS.get(SUBSCRIPTIONS_KEY);
  let links = [];
  if (legacy !== null) {
    try { links = JSON.parse(legacy); } catch { throw new Error('KV 中的订阅数据不是有效 JSON，请检查 subscription_links'); }
    if (!Array.isArray(links) || links.some(link => typeof link !== 'string')) throw new Error('KV 中的订阅数据格式错误，应为节点链接数组');
  }
  const nodes = normalizeSubscriptionLines(links.join('\n')).filter(link => SUPPORTED_LINK_PATTERN.test(link)).map(makeNode);
  await backupNodes(env, nodes);
  return { nodes, kvBound: true };
}

async function backupNodes(env, nodes) {
  if (!env?.SUBSCRIPTIONS) return false;
  const positioned = nodes.map((node, position) => ({ ...node, position }));
  await env.SUBSCRIPTIONS.put(STRUCTURED_KEY, JSON.stringify(positioned));
  await env.SUBSCRIPTIONS.put(SUBSCRIPTIONS_KEY, JSON.stringify(positioned.map(node => node.url)));
  return true;
}

async function initializeD1(env) {
  const db = env?.SUBSCRIPTIONS_DB;
  if (!db) return null;
  if (!d1Initialization.has(db)) {
    const initialize = (async () => {
      await db.exec(`CREATE TABLE IF NOT EXISTS nodes (id TEXT PRIMARY KEY, url TEXT NOT NULL UNIQUE, position INTEGER NOT NULL, group_name TEXT NOT NULL DEFAULT '', tags_json TEXT NOT NULL DEFAULT '[]', note TEXT NOT NULL DEFAULT '', enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS idx_nodes_position ON nodes(position); CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
      const marker = await db.prepare('SELECT value FROM app_meta WHERE key = ?').bind(MIGRATION_KEY).first();
      if (!marker) {
        const kv = await readKvNodes(env);
        const statements = kv.nodes.map(node => db.prepare('INSERT OR IGNORE INTO nodes (id,url,position,group_name,tags_json,note,enabled,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(node.id, node.url, node.position, node.group, JSON.stringify(node.tags), node.note, node.enabled ? 1 : 0, node.createdAt, node.updatedAt));
        statements.push(db.prepare('INSERT OR REPLACE INTO app_meta (key,value) VALUES (?,?)').bind(MIGRATION_KEY, new Date().toISOString()));
        await db.batch(statements);
      }
      return db;
    })();
    d1Initialization.set(db, initialize);
    initialize.catch(() => d1Initialization.delete(db));
  }
  return d1Initialization.get(db);
}

function nodeFromD1(row) {
  let tags = [];
  try { tags = JSON.parse(row.tags_json || '[]'); } catch { tags = []; }
  return normalizeStoredNode({ id: row.id, url: row.url, group: row.group_name, tags, note: row.note, enabled: row.enabled === 1 || row.enabled === true, created_at: row.created_at, updated_at: row.updated_at }, Number(row.position));
}

async function loadNodes(env) {
  if (env?.SUBSCRIPTIONS_DB) {
    try {
      const db = await initializeD1(env);
      const result = await db.prepare('SELECT * FROM nodes ORDER BY position ASC, created_at ASC').all();
      return { nodes: (result.results || []).map(nodeFromD1).filter(Boolean), source: 'd1', storage: 'd1', kvBound: !!env.SUBSCRIPTIONS, d1Bound: true, writable: true };
    } catch (d1Error) {
      const kv = await readKvNodes(env);
      return { ...kv, source: kv.kvBound ? 'kv' : 'unbound', storage: kv.kvBound ? 'kv' : 'unbound', d1Bound: true, writable: false, d1Error };
    }
  }
  const kv = await readKvNodes(env);
  return { ...kv, source: kv.kvBound ? 'kv' : 'unbound', storage: kv.kvBound ? 'kv' : 'unbound', d1Bound: false, writable: kv.kvBound };
}

async function saveNodes(env, state, nodes) {
  const positioned = nodes.map((node, position) => ({ ...node, position }));
  if (state.d1Bound) {
    if (state.source !== 'd1' || !state.writable) throw new Error('D1 当前不可写，为避免数据分叉已拒绝管理操作');
    const db = env.SUBSCRIPTIONS_DB;
    const statements = [db.prepare('DELETE FROM nodes')];
    for (const node of positioned) statements.push(db.prepare('INSERT INTO nodes (id,url,position,group_name,tags_json,note,enabled,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(node.id, node.url, node.position, node.group, JSON.stringify(node.tags), node.note, node.enabled ? 1 : 0, node.createdAt, node.updatedAt));
    await db.batch(statements);
    let backupUpdated = false;
    try { backupUpdated = await backupNodes(env, positioned); } catch { backupUpdated = false; }
    return { nodes: positioned, backupUpdated };
  }
  if (!state.kvBound) throw new Error('尚未绑定 Cloudflare KV：请以 SUBSCRIPTIONS 绑定后再保存');
  await backupNodes(env, positioned);
  return { nodes: positioned, backupUpdated: true };
}

function configWithNodes(config, state) {
  return { ...config, link: state.nodes.filter(node => node.enabled).map(node => node.url).join('\n') };
}

function managementState(state) {
  return { items: state.nodes.map(publicNode), kvBound: state.kvBound, d1Bound: state.d1Bound, writable: state.writable, source: state.source };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: noStoreHeaders({ 'Content-Type': 'application/json; charset=utf-8' }) });
}

async function handleSubscriptionManagement(request, env, config, session) {
  if (!session) return jsonResponse({ error: '请先登录后再管理订阅' }, 401);
  let current;
  try { current = await loadNodes(env); } catch (error) { return jsonResponse({ error: error.message }, 500); }
  if (request.method === 'GET') return jsonResponse(managementState(current));
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) return jsonResponse({ error: '不支持的请求方法' }, 405);
  if (!current.writable) return jsonResponse({ error: current.d1Bound ? 'D1 当前不可写，为避免数据分叉已拒绝管理操作' : '尚未绑定 Cloudflare KV：请以 SUBSCRIPTIONS 绑定后再保存' }, 503);
  let payload;
  try { payload = await request.json(); } catch { return jsonResponse({ error: '请求内容必须是有效 JSON' }, 400); }

  let nodes = [...current.nodes];
  let result = {};
  if (request.method === 'POST') {
    let links;
    try { links = parseSubscriptionInput(payload?.links); } catch (error) { return jsonResponse({ error: error.message }, 400); }
    if (!links.length) return jsonResponse({ error: '请至少粘贴一个节点链接' }, 400);
    const known = new Set(nodes.map(node => node.url));
    const added = links.filter(link => !known.has(link)).map(link => makeNode(link, nodes.length));
    nodes.push(...added); result.added = added.length;
  } else {
    const index = nodes.findIndex(node => node.id === payload?.id);
    if (index < 0) return jsonResponse({ error: '指定的节点不存在，请刷新后重试' }, 404);
    if (request.method === 'PATCH') {
      const offset = payload?.direction === 'up' ? -1 : payload?.direction === 'down' ? 1 : 0;
      if (!offset) return jsonResponse({ error: '移动方向必须是 up 或 down' }, 400);
      const target = index + offset;
      if (target < 0 || target >= nodes.length) return jsonResponse({ error: '节点已经位于列表边界' }, 400);
      [nodes[index], nodes[target]] = [nodes[target], nodes[index]]; result.moved = 1;
    } else if (request.method === 'DELETE') {
      nodes.splice(index, 1); result.deleted = 1;
    } else {
      try {
        const metadata = normalizeMetadata(payload, nodes[index]);
        nodes[index] = { ...nodes[index], ...metadata, updatedAt: new Date().toISOString() };
        result.updated = 1;
      } catch (error) { return jsonResponse({ error: error.message }, 400); }
    }
  }
  try {
    const saved = await saveNodes(env, current, nodes);
    return jsonResponse({ items: saved.nodes.map(publicNode), source: current.source, backupUpdated: saved.backupUpdated, ...result });
  } catch (error) { return jsonResponse({ error: error.message || '保存节点失败' }, 500); }
}

function getSubscriptionKind(params, request) {
  const type = (params.get('type') || '').toLowerCase();
  if (['clash', 'loon', 'base64'].includes(type)) return type;
  if (type === 'auto') {
    const ua = (request.headers.get('User-Agent') || '').toLowerCase();
    if (ua.includes('loon')) return 'loon';
    if (/clash|mihomo|stash|openclash|nikki|flclash/.test(ua)) return 'clash';
    return 'base64';
  }
  return '';
}

function renderSubscription(kind, config) {
  const { allLines, proxies } = parseProxies(config);
  const disposition = "inline; filename*=UTF-8''" + encodeURIComponent(config.subName);
  if (kind === 'clash') {
    if (!proxies.length) return new Response('没有可转换为 Mihomo 的有效节点', { status: 422, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    return new Response(generateClashYaml(proxies, config.subName), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'content-disposition': disposition, 'profile-title': encodeURIComponent(config.subName), 'profile-update-interval': '6' } });
  }
  if (kind === 'loon') {
    if (!proxies.length) return new Response('没有可转换为 Loon 的有效节点', { status: 422, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    return new Response(generateLoonConfig(proxies), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'content-disposition': disposition, 'profile-title': encodeURIComponent(config.subName), 'profile-update-interval': '6' } });
  }
  if (kind === 'base64') {
    const links = allLines.map(line => line.startsWith('vless://') ? line.replace(/[?&]flow=(&|$)/g, '$1') : line).join('\n');
    return new Response(encodeBase64(links), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  return new Response('Not Found', { status: 404 });
}

async function handleLogin(request, config) {
  if (request.method !== 'POST') return new Response(renderLoginPage(config), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  const form = await request.formData();
  if (String(form.get('username') || '') !== config.adminUser || String(form.get('password') || '') !== config.adminPass) return new Response(renderLoginPage(config, '用户名或密码错误'), { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  const session = await createSessionCookie(config);
  return new Response(null, { status: 303, headers: { Location: session.homePath, 'Set-Cookie': session.cookie } });
}

function noStoreHeaders(extra = {}) { return { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', Pragma: 'no-cache', Expires: '0', ...extra }; }
function parentCookieDomains(hostname) { const parts = hostname.split('.').filter(Boolean); const domains = [hostname]; for (let i = 1; i < parts.length - 1; i++) domains.push(parts.slice(i).join('.')); return [...new Set(domains)]; }
function buildClearSessionHeaders(url) {
  const headers = new Headers(noStoreHeaders({ Location: '/login', 'Clear-Site-Data': '"cache"' }));
  const attrs = 'Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
  headers.append('Set-Cookie', `${SESSION_COOKIE}=; ${attrs}`);
  for (const domain of parentCookieDomains(url.hostname)) headers.append('Set-Cookie', `${SESSION_COOKIE}=; Domain=${domain}; ${attrs}`);
  return headers;
}

async function handleRequest(request, env) {
  const config = loadConfig(env);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const baseUrl = url.protocol + '//' + url.host;
  if (path === '/favicon.svg') return new Response(FAVICON_SVG, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
  if (path === '/api/health') {
    let component = 'session-crypto';
    try {
      await signSessionPayload('health-check', config.sessionSecret);
      component = 'subscription-storage'; const state = await loadNodes(env);
      component = 'proxy-parser'; const active = configWithNodes(config, state); const { proxies } = parseProxies(active);
      component = 'dashboard-renderer'; renderDashboard(active, proxies, baseUrl, managementState(state));
      return jsonResponse({ ok: true, storage: state.storage, subscriptionSource: state.source, formats: ['auto', 'clash', 'loon', 'base64'], loonSyntax: 'nsloon', subscriptionManagement: ['add', 'reorder', 'delete', 'edit', 'toggle'], capabilities: ['grouping', 'tags', 'notes', 'search', 'toggle'] });
    } catch { return jsonResponse({ ok: false, component }, 503); }
  }
  if (path === '/api/manage/subscriptions') return handleSubscriptionManagement(request, env, config, await getValidSession(request, config));
  if (path === '/api/sub') {
    if (!config.token || url.searchParams.get('token') !== config.token) return new Response('Not Found', { status: 404 });
    try {
      const state = await loadNodes(env);
      if (state.source === 'unbound') return new Response('SUBSCRIPTIONS KV is not bound and D1 is unavailable', { status: 503, headers: noStoreHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }) });
      const response = renderSubscription(getSubscriptionKind(url.searchParams, request), configWithNodes(config, state));
      if ((url.searchParams.get('type') || '').toLowerCase() === 'auto') response.headers.set('Vary', 'User-Agent');
      return response;
    } catch (error) { return new Response(error.message, { status: 500, headers: noStoreHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }) }); }
  }
  if (path === '/login') return handleLogin(request, config);
  if (path === '/logout') return new Response(null, { status: 303, headers: buildClearSessionHeaders(url) });
  if (path === '/') { const session = await getValidSession(request, config); return new Response(null, { status: 303, headers: { Location: session ? session.homePath : '/login' } }); }
  const session = await getValidSession(request, config);
  if (session && path === session.homePath) {
    try {
      const state = await loadNodes(env); const active = configWithNodes(config, state); const { proxies } = parseProxies(active);
      return new Response(renderDashboard(active, proxies, baseUrl, managementState(state)), { headers: noStoreHeaders({ 'Content-Type': 'text/html; charset=utf-8' }) });
    } catch (error) { return new Response(error.message, { status: 500, headers: noStoreHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }) }); }
  }
  return new Response('Not Found', { status: 404 });
}

export default { fetch: handleRequest };
