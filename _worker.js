// ==UserScript==
// Sub Worker — 订阅聚合与转换 | 模块化架构
// ==/UserScript==

import { loadConfig, encodeBase64 } from './utils.js';
import { convertVlessToClashProxy, convertTrojanToClashProxy, convertHysteria2ToClashProxy } from './convert.js';
import { generateClashYaml } from './yaml.js';
import { renderDashboard } from './dashboard.js';

const SESSION_COOKIE = 'sw_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

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
  const error = errorMessage ? `<div class="error">${escapeHtml(errorMessage)}</div>` : '';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#a9d9bd">
<title>${escapeHtml(config.subName)} 登录</title>
<style>
*{box-sizing:border-box}body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px;background:linear-gradient(180deg,#9dd5bd,#d7ebcc);font-family:'Noto Sans SC','Microsoft YaHei',system-ui,sans-serif;color:#5d3e24}.card{width:min(420px,100%);padding:30px;border:4px solid #795735;border-radius:28px;background:#f8f2dd;box-shadow:0 12px 0 rgba(94,62,36,.28),0 20px 34px rgba(79,73,47,.18)}h1{margin:0 0 8px;text-align:center;font-size:30px}.sub{margin:0 0 24px;text-align:center;color:#8b6b44;font-weight:700}.field{margin:14px 0}label{display:block;margin-bottom:7px;font-weight:900}input{width:100%;height:46px;padding:0 14px;border:2px solid #795735;border-radius:14px;background:#fffdf7;color:#5d3e24;font:inherit;outline:none}input:focus{box-shadow:0 0 0 3px #ffd267}button{width:100%;height:48px;margin-top:18px;border:2px solid #5d3e24;border-radius:999px;background:#58c5ae;color:#fffaf0;font:inherit;font-weight:900;cursor:pointer;box-shadow:0 5px 0 #3c9c8b}.error{margin-bottom:14px;padding:10px 12px;border:2px solid #ed947c;border-radius:13px;background:#fff0e4;color:#9a3f2d;font-weight:800}.hint{margin-top:18px;text-align:center;font-size:12px;color:#8b6b44}</style>
</head>
<body>
  <main class="card">
    <h1>订阅小岛</h1>
    <p class="sub">${escapeHtml(config.subName)} 管理面板登录</p>
    ${error}
    <form method="POST" action="/login" autocomplete="on">
      <div class="field"><label for="username">用户名</label><input id="username" name="username" autocomplete="username" required autofocus></div>
      <div class="field"><label for="password">密码</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
      <button type="submit">登录</button>
    </form>
    <div class="hint">登录成功后会跳转到随机主页路径</div>
  </main>
</body>
</html>`;
}

function parseProxies(config) {
  const allLines = config.link.split('\n').filter(l => l.trim());
  const vlessLines = allLines.filter(l => l.startsWith('vless://'));
  const trojanLines = allLines.filter(l => l.startsWith('trojan://'));
  const hysteria2Lines = allLines.filter(l => l.startsWith('hysteria2://') || l.startsWith('hy2://'));
  const vlessProxies = vlessLines.map(l => convertVlessToClashProxy(l.trim())).filter(Boolean);
  const trojanProxies = trojanLines.map(l => convertTrojanToClashProxy(l.trim())).filter(Boolean);
  const hysteria2Proxies = hysteria2Lines.map(l => convertHysteria2ToClashProxy(l.trim().replace(/^hy2:\/\//, 'hysteria2://'))).filter(Boolean);
  return { allLines, proxies: [...vlessProxies, ...trojanProxies, ...hysteria2Proxies] };
}

function getSubscriptionKind(params) {
  const type = (params.get('type') || '').toLowerCase();
  if (params.has('clash') || type === 'clash' || type === 'mihomo') return 'clash';
  if (params.has('b64') || type === 'b64' || type === 'base64') return 'b64';
  return '';
}

function renderSubscription(kind, config) {
  const { allLines, proxies } = parseProxies(config);
  const subscriptionContentDisposition = "inline; filename*=UTF-8''" + encodeURIComponent(config.subName);

  if (kind === 'clash') {
    const yaml = generateClashYaml(proxies, config.subName);
    return new Response(yaml, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'content-disposition': subscriptionContentDisposition,
        'profile-title': config.subName,
        'profile-update-interval': '6',
      },
    });
  }

  if (kind === 'b64') {
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

function buildClearSessionHeaders(url) {
  const headers = new Headers(noStoreHeaders({
    Location: '/login',
    'Clear-Site-Data': '"cache"',
  }));
  const cookieAttrs = 'Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
  headers.append('Set-Cookie', `${SESSION_COOKIE}=; ${cookieAttrs}`);
  headers.append('Set-Cookie', `${SESSION_COOKIE}=; Domain=${url.hostname}; ${cookieAttrs}`);
  return headers;
}

// ==================== 路由处理 ====================
async function handleRequest(request, env) {
  const config = loadConfig(env);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const params = url.searchParams;
  const baseUrl = url.protocol + '//' + url.host;

  if (path === '/api/sub') {
    if (params.get('token') !== config.token) return new Response('Not Found', { status: 404 });
    return renderSubscription(getSubscriptionKind(params), config);
  }

  // 兼容旧订阅地址：/TOKEN?clash 与 /TOKEN?b64
  const pathParts = path.split('/').filter(Boolean);
  const token = pathParts[0] || '';
  if (token && token === config.token) {
    return renderSubscription(getSubscriptionKind(params), config);
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
    const { proxies } = parseProxies(config);
    return new Response(renderDashboard(config, proxies, baseUrl), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response('Not Found', { status: 404 });
}

// ==================== Worker 入口 ====================
export default {
  fetch: handleRequest,
};
