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
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='18' fill='%235f6df8'/%3E%3Cpath d='M27 30h46v9H27zm0 17h46v9H27zm0 17h31v9H27z' fill='white'/%3E%3C/svg%3E">
<title>${escapeHtml(config.subName)} 登录</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}:root{color-scheme:dark;--bg:#101216;--panel:#181b21;--panel-2:#1e222a;--border:#2c313b;--border-strong:#3a414e;--text:#f1f4f8;--muted:#929baa;--primary:#6875f5;--primary-hover:#7c87ff;--danger:#ef6a72;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif}body{min-width:320px;min-height:100vh;background:var(--bg);color:var(--text);font-size:14px;line-height:1.55}.site{display:flex;min-height:100vh;flex-direction:column}.topbar{height:56px;flex:0 0 auto;border-bottom:1px solid var(--border);background:#14171c}.topbar-inner{display:flex;width:min(1080px,calc(100% - 32px));height:100%;margin:auto;align-items:center}.brand{display:flex;align-items:center;gap:10px;font-weight:700}.brand-mark{display:grid;width:27px;height:27px;place-items:center;border-radius:6px;background:var(--primary);font-size:13px}.brand-subtitle{margin-left:3px;color:var(--muted);font-size:12px;font-weight:500}.login-main{display:grid;width:min(100% - 28px,1080px);flex:1;margin:auto;place-items:center;padding:44px 0}.login-shell{width:min(370px,100%)}.login-card{padding:25px;background:var(--panel);border:1px solid var(--border);border-radius:9px;box-shadow:0 18px 50px rgba(0,0,0,.24)}.card-heading{margin-bottom:21px;text-align:center}.card-heading h1{font-size:20px;line-height:1.3}.card-heading p{margin-top:6px;color:var(--muted);font-size:12px}.error{margin-bottom:14px;padding:9px 10px;border:1px solid #5a3037;border-radius:6px;background:#352126;color:#f5a8ae;font-size:12px}.field{margin-bottom:15px}.field label{display:block;margin-bottom:6px;color:#d5dae2;font-size:12px;font-weight:650}.field input{display:block;width:100%;height:40px;padding:8px 10px;border:1px solid var(--border-strong);border-radius:6px;background:#111318;color:var(--text);font:inherit;outline:none}.field input:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(104,117,245,.14)}.submit{width:100%;height:40px;margin-top:2px;border:0;border-radius:6px;background:var(--primary);color:#fff;font:inherit;font-weight:700;cursor:pointer;transition:background-color .15s}.submit:hover{background:var(--primary-hover)}.hint{margin-top:15px;color:#798291;font-size:11px;text-align:center}.footer{height:54px;flex:0 0 auto;display:grid;place-items:center;border-top:1px solid var(--border);color:#6f7887;font-size:11px}@media(max-width:480px){.brand-subtitle{display:none}.login-main{align-items:start;padding-top:64px}.login-card{padding:21px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<div class="site">
  <header class="topbar"><div class="topbar-inner"><div class="brand"><span class="brand-mark">S</span><span>订阅控制台</span><span class="brand-subtitle">${escapeHtml(config.subName)}</span></div></div></header>
  <main class="login-main"><section class="login-shell" aria-labelledby="login-title"><form class="login-card" method="POST" action="/login" autocomplete="on"><div class="card-heading"><h1 id="login-title">管理员登录</h1><p>登录后管理订阅节点与导出链接</p></div>${error}<div class="field"><label for="username">用户名</label><input id="username" name="username" autocomplete="username" required autofocus></div><div class="field"><label for="password">密码</label><input id="password" name="password" type="password" autocomplete="current-password" required></div><button class="submit" type="submit">登录控制台</button><p class="hint">登录后将进入当前会话专属的随机路径</p></form></section></main>
  <footer class="footer">Private subscription administration</footer>
</div>
</body>
</html>`;
}
function parseProxies(config) {
  const allLines = String(config.link || '')
    .split(/\r?\n/)
    .map(line => line.replace(/^\uFEFF/, '').trim())
    .filter(Boolean);

  // 单次顺序解析，保证 LINK / LINK1 / LINK2 的原始排列不会因协议分组而改变。
  const proxies = allLines.map((line) => {
    const scheme = line.match(/^([a-z][a-z0-9+.-]*):\/\//i)?.[1]?.toLowerCase();
    if (scheme === 'vless') return convertVlessToClashProxy(line);
    if (scheme === 'hysteria2') return convertHysteria2ToClashProxy(line);
    return null;
  }).filter(Boolean);

  return { allLines, proxies };
}

function normalizeSubscriptionLines(value) {
  return [...new Set(String(value || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\uFEFF/, '').trim())
    .filter(Boolean))];
}

function parseSubscriptionInput(value) {
  const lines = normalizeSubscriptionLines(value);
  const invalid = lines
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => !SUPPORTED_LINK_PATTERN.test(line));
  if (invalid.length) {
    const numbers = invalid.map(({ number }) => number).join('、');
    throw new Error(`第 ${numbers} 行协议不受支持，仅接受 vless://、hysteria2://`);
  }
  return [...new Set(lines)];
}

async function loadSubscriptions(env, config) {
  if (!env?.SUBSCRIPTIONS) {
    return { links: normalizeSubscriptionLines(config.link).filter((link) => SUPPORTED_LINK_PATTERN.test(link)), kvBound: false, saved: false };
  }
  const stored = await env.SUBSCRIPTIONS.get(SUBSCRIPTIONS_KEY);
  if (stored === null) {
    return { links: normalizeSubscriptionLines(config.link).filter((link) => SUPPORTED_LINK_PATTERN.test(link)), kvBound: true, saved: false };
  }
  let links;
  try {
    links = JSON.parse(stored);
  } catch {
    throw new Error('KV 中的订阅数据不是有效 JSON，请检查 subscription_links');
  }
  if (!Array.isArray(links) || links.some((link) => typeof link !== 'string')) {
    throw new Error('KV 中的订阅数据格式错误，应为节点链接数组');
  }
  return { links: normalizeSubscriptionLines(links.join('\n')).filter((link) => SUPPORTED_LINK_PATTERN.test(link)), kvBound: true, saved: true };
}

function configWithSubscriptions(config, subscriptions) {
  return { ...config, link: subscriptions.links.join('\n') };
}

function subscriptionSummary(link, index) {
  const scheme = link.match(/^([^:]+):\/\//)?.[1]?.toLowerCase() || 'unknown';
  const fragment = link.includes('#') ? link.slice(link.indexOf('#') + 1) : '';
  let name = '未命名节点';
  if (fragment) {
    try { name = decodeURIComponent(fragment).trim() || name; } catch { name = fragment.trim() || name; }
  }
  name = name.replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '').trim() || '未命名节点';
  const relay = name.match(/^(.+?)[-—–_\s]+(中转|中轉|前置|反连|反連)[-—–_\s]+(.+)$/);
  if (relay?.[1] && relay?.[3]) name = `${relay[3].trim()}(${relay[1].trim()}${relay[2]})`;
  return { id: String(index), protocol: scheme, name };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: noStoreHeaders({ 'Content-Type': 'application/json; charset=utf-8' }),
  });
}

async function handleSubscriptionManagement(request, env, config, session) {
  if (!session) return jsonResponse({ error: '请先登录后再管理订阅' }, 401);

  let current;
  try {
    current = await loadSubscriptions(env, config);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  if (request.method === 'GET') {
    return jsonResponse({
      items: current.links.map(subscriptionSummary),
      kvBound: current.kvBound,
      source: current.saved ? 'kv' : 'env',
    });
  }
  if (request.method !== 'POST' && request.method !== 'DELETE') {
    return jsonResponse({ error: '不支持的请求方法' }, 405);
  }
  if (!current.kvBound) {
    return jsonResponse({ error: '尚未绑定 Cloudflare KV：请创建 KV 命名空间并以 SUBSCRIPTIONS 绑定后再保存' }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: '请求内容必须是有效 JSON' }, 400);
  }

  if (request.method === 'POST') {
    let added;
    try {
      added = parseSubscriptionInput(payload?.links);
    } catch (error) {
      return jsonResponse({ error: error.message }, 400);
    }
    if (!added.length) return jsonResponse({ error: '请至少粘贴一个节点链接' }, 400);
    const links = [...new Set([...current.links, ...added])];
    try {
      await env.SUBSCRIPTIONS.put(SUBSCRIPTIONS_KEY, JSON.stringify(links));
    } catch {
      return jsonResponse({ error: '写入 Cloudflare KV 失败，请稍后重试' }, 500);
    }
    return jsonResponse({ items: links.map(subscriptionSummary), added: links.length - current.links.length });
  }

  const index = Number(payload?.id);
  if (!Number.isInteger(index) || index < 0 || index >= current.links.length) {
    return jsonResponse({ error: '要删除的订阅不存在，请刷新后重试' }, 404);
  }
  const links = current.links.filter((_, itemIndex) => itemIndex !== index);
  try {
    await env.SUBSCRIPTIONS.put(SUBSCRIPTIONS_KEY, JSON.stringify(links));
  } catch {
    return jsonResponse({ error: '写入 Cloudflare KV 失败，请稍后重试' }, 500);
  }
  return jsonResponse({ items: links.map(subscriptionSummary), deleted: 1 });
}

function getSubscriptionKind(params) {
  const type = (params.get('type') || '').toLowerCase();
  if (type === 'clash') return 'clash';
  if (type === 'loon') return 'loon';
  if (type === 'base64') return 'base64';
  return '';
}

function renderSubscription(kind, config) {
  const { allLines, proxies } = parseProxies(config);
  const subscriptionContentDisposition = "inline; filename*=UTF-8''" + encodeURIComponent(config.subName);

  if (kind === 'clash') {
    if (!proxies.length) {
      return new Response('没有可转换为 Mihomo 的有效节点', {
        status: 422,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    const yaml = generateClashYaml(proxies, config.subName);
    return new Response(yaml, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'content-disposition': subscriptionContentDisposition,
        'profile-title': encodeURIComponent(config.subName),
        'profile-update-interval': '6',
      },
    });
  }

  if (kind === 'loon') {
    if (!proxies.length) {
      return new Response('没有可转换为 Loon 的有效节点', {
        status: 422,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    return new Response(generateLoonConfig(proxies), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'content-disposition': subscriptionContentDisposition,
        'profile-title': encodeURIComponent(config.subName),
        'profile-update-interval': '6',
      },
    });
  }

  if (kind === 'base64') {
    const linkList = allLines.map(l => {
      const t = l.trim();
      return t.startsWith('vless://') ? t.replace(/[?&]flow=(&|$)/g, '$1') : t;
    }).join('\n');
    return new Response(encodeBase64(linkList), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response('Not Found', { status: 404 });
}

async function handleLogin(request, config) {
  if (request.method !== 'POST') {
    return new Response(renderLoginPage(config), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const form = await request.formData();
  const username = String(form.get('username') || '');
  const password = String(form.get('password') || '');
  if (username !== config.adminUser || password !== config.adminPass) {
    return new Response(renderLoginPage(config, '用户名或密码错误'), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const session = await createSessionCookie(config);
  return new Response(null, {
    status: 303,
    headers: {
      Location: session.homePath,
      'Set-Cookie': session.cookie,
    },
  });
}

function noStoreHeaders(extra = {}) {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
    ...extra,
  };
}

function parentCookieDomains(hostname) {
  const parts = hostname.split('.').filter(Boolean);
  const domains = [hostname];
  for (let i = 1; i < parts.length - 1; i++) {
    domains.push(parts.slice(i).join('.'));
  }
  return [...new Set(domains)];
}

function buildClearSessionHeaders(url) {
  const headers = new Headers(noStoreHeaders({
    Location: '/login',
    'Clear-Site-Data': '"cache"',
  }));
  const cookieAttrs = 'Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
  for (const name of [SESSION_COOKIE, 'sw_session']) {
    headers.append('Set-Cookie', `${name}=; ${cookieAttrs}`);
    for (const domain of parentCookieDomains(url.hostname)) {
      headers.append('Set-Cookie', `${name}=; Domain=${domain}; ${cookieAttrs}`);
    }
  }
  return headers;
}

// ==================== 路由处理 ====================
async function handleRequest(request, env) {
  const config = loadConfig(env);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const params = url.searchParams;
  const baseUrl = url.protocol + '//' + url.host;

  if (path === '/api/health') {
    let component = 'session-crypto';
    try {
      await signSessionPayload('health-check', config.sessionSecret);
      component = 'subscription-storage';
      const subscriptions = await loadSubscriptions(env, config);
      component = 'proxy-parser';
      const activeConfig = configWithSubscriptions(config, subscriptions);
      const { proxies } = parseProxies(activeConfig);
      component = 'dashboard-renderer';
      renderDashboard(activeConfig, proxies, baseUrl, {
        kvBound: subscriptions.kvBound,
        source: subscriptions.saved ? 'kv' : 'env',
        items: subscriptions.links.map(subscriptionSummary),
      });
      return jsonResponse({
        ok: true,
        storage: subscriptions.kvBound ? 'kv' : 'env',
        formats: ['clash', 'loon', 'base64'],
        legacySubscriptionUrls: false,
        loonSyntax: 'nsloon',
      });
    } catch {
      return jsonResponse({ ok: false, component }, 503);
    }
  }

  if (path === '/api/manage/subscriptions') {
    const session = await getValidSession(request, config);
    return handleSubscriptionManagement(request, env, config, session);
  }

  if (path === '/api/sub') {
    if (!config.token || params.get('token') !== config.token) return new Response('Not Found', { status: 404 });
    try {
      const subscriptions = await loadSubscriptions(env, config);
      return renderSubscription(getSubscriptionKind(params), configWithSubscriptions(config, subscriptions));
    } catch (error) {
      return new Response(error.message, { status: 500, headers: noStoreHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }) });
    }
  }

  if (path === '/login') return handleLogin(request, config);

  if (path === '/logout') {
    return new Response(null, {
      status: 303,
      headers: buildClearSessionHeaders(url),
    });
  }

  if (path === '/') {
    const session = await getValidSession(request, config);
    return new Response(null, {
      status: 303,
      headers: { Location: session ? session.homePath : '/login' },
    });
  }

  const session = await getValidSession(request, config);
  if (session && path === session.homePath) {
    try {
      const subscriptions = await loadSubscriptions(env, config);
      const activeConfig = configWithSubscriptions(config, subscriptions);
      const { proxies } = parseProxies(activeConfig);
      return new Response(renderDashboard(activeConfig, proxies, baseUrl, {
        kvBound: subscriptions.kvBound,
        source: subscriptions.saved ? 'kv' : 'env',
        items: subscriptions.links.map(subscriptionSummary),
      }), {
        headers: noStoreHeaders({ 'Content-Type': 'text/html; charset=utf-8' }),
      });
    } catch (error) {
      return new Response(error.message, { status: 500, headers: noStoreHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }) });
    }
  }

  return new Response('Not Found', { status: 404 });
}

// ==================== Worker 入口 ====================
export default {
  fetch: handleRequest,
};
