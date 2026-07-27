// ==UserScript==
// Sub Worker — 订阅聚合与转换 | 模块化架构
// ==/UserScript==

import { loadConfig, encodeBase64 } from './utils.js';
import { convertVlessToClashProxy, convertTrojanToClashProxy, convertHysteria2ToClashProxy } from './convert.js';
import { generateClashYaml } from './yaml.js';
import { renderDashboard } from './dashboard.js';

const SESSION_COOKIE = 'sub_worker_session';
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
<meta name="theme-color" content="#f8f4e8">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect x='16' y='20' width='68' height='58' rx='10' fill='%23fff3bf' stroke='%231e1e1e' stroke-width='5'/%3E%3Cpath d='M30 40h39M30 55h26' stroke='%231e1e1e' stroke-width='5' stroke-linecap='round'/%3E%3C/svg%3E">
<title>${escapeHtml(config.subName)} 登录</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Ma+Shan+Zheng&display=swap');
*{margin:0;padding:0;box-sizing:border-box}:root{--bg:#f8f4e8;--paper:#fffdf5;--ink:#030064;--ink-black:#1e1e1e;--muted:#6b6b8a;--blue:#a5d8ff;--green:#b2f2bb;--yellow:#fff3bf;--orange:#ffd8a8;--purple:#d0bfff;--red:#ffc9c9;--teal:#c3fae8;--card-border:#f0efff;--shadow:rgba(30,30,30,.10);--ease:cubic-bezier(.22,.7,.2,1)}html{min-height:100%;background:var(--bg)}body{min-height:100vh;overflow-x:hidden;color:var(--ink);font-family:Kalam,'Ma Shan Zheng',cursive;font-weight:700;background:radial-gradient(circle,rgba(3,0,100,.12) 1px,transparent 1.5px) 0 0/28px 28px,linear-gradient(180deg,#fbf7ed 0%,#f5efdf 100%)}button,input{font:inherit}.page{width:min(100% - 28px,760px);min-height:100vh;margin:0 auto;display:grid;place-items:center;padding:34px 0}.board{position:relative;width:100%;padding:clamp(22px,5vw,42px);background:rgba(255,253,245,.82);border:3px solid var(--ink-black);border-radius:20px 28px 22px 30px;box-shadow:7px 9px 0 rgba(30,30,30,.10),0 20px 50px rgba(30,30,30,.08)}.board:before{content:"";position:absolute;inset:7px -7px -7px 7px;border:2px solid rgba(30,30,30,.34);border-radius:26px 20px 30px 22px;pointer-events:none}.tape{position:absolute;width:86px;height:24px;background:rgba(255,243,191,.82);border:1px solid rgba(30,30,30,.18);box-shadow:0 2px 5px rgba(30,30,30,.09);z-index:2}.tape.t1{left:56px;top:-12px;transform:rotate(-7deg)}.tape.t2{right:70px;top:-10px;transform:rotate(6deg)}.rough-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}.rough-svg path{fill:none;stroke:var(--ink-black);stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round}.rough-svg .soft{stroke-width:1.8;opacity:.48}.brand{display:flex;align-items:center;gap:12px;transform:rotate(-1.2deg);margin-bottom:26px}.brand-mark{width:48px;height:40px;display:grid;place-items:center;border:3px solid var(--ink-black);border-radius:52% 48% 44% 56%;background:var(--yellow);font-size:24px;line-height:1}.brand-text{line-height:1}.brand-text small{display:block;color:var(--muted);font-size:15px;letter-spacing:.08em}.brand-text b{display:block;margin-top:4px;font-size:24px}.hero{position:relative;padding:26px 24px 28px;border:1px solid var(--card-border);border-radius:16px;background:#fff;margin-bottom:20px}.hero .outline{inset:-7px -8px -9px -6px;width:calc(100% + 14px);height:calc(100% + 16px)}.kicker{display:inline-block;padding:3px 10px;border:2px solid var(--ink-black);border-radius:999px;background:var(--yellow);color:var(--muted);font-size:16px;letter-spacing:.08em}h1{margin-top:14px;font-size:clamp(44px,8vw,70px);line-height:.95;color:var(--ink)}.mark{background:linear-gradient(transparent 52%,rgba(255,243,191,.96) 52%,rgba(255,243,191,.96) 86%,transparent 86%);padding:0 .06em}.hero p{margin-top:13px;color:var(--muted);font-size:17px;line-height:1.65}.error{position:relative;margin:0 0 14px;padding:10px 12px;border:2px solid var(--ink-black);border-radius:16px;background:var(--red);color:var(--ink);font-size:17px}.form-card{position:relative;padding:18px;border:1px solid var(--card-border);border-radius:16px;background:var(--teal)}.form-card .outline{inset:-5px -6px -7px -5px;width:calc(100% + 12px);height:calc(100% + 12px)}.field{position:relative;margin-bottom:14px}label{display:block;margin:0 0 6px 4px;color:var(--muted);font-size:17px}input{width:100%;min-height:46px;padding:8px 12px;border:2px solid var(--ink-black);border-radius:0;background:#fff;color:var(--ink);font-size:20px;outline:none}input:focus{background:var(--yellow);box-shadow:0 0 0 4px rgba(165,216,255,.55)}button{width:100%;min-height:46px;margin-top:4px;padding:9px 16px;border:2px solid var(--ink-black);border-radius:0;background:#fff;color:var(--ink);cursor:pointer;font-size:19px;text-transform:uppercase;transition:transform .16s var(--ease),background .16s var(--ease)}button:hover{transform:translateY(-2px);background:var(--blue)}button:active{transform:translateY(2px)}.hint{margin-top:14px;color:var(--muted);font-size:15px;text-align:center}@media(max-width:560px){.page{width:min(100% - 18px,560px)}.board{padding:22px 16px}.brand-text b{font-size:21px}h1{font-size:44px}}
</style>
</head>
<body>
<main class="page">
  <section class="board">
    <span class="tape t1"></span><span class="tape t2"></span>
    <div class="brand"><div class="brand-mark">✎</div><div class="brand-text"><small>EXCALIDRAW GATE</small><b>登录白板</b></div></div>
    <section class="hero">
      <svg class="rough-svg outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M2 8 C18 2 70 4 96 7 C101 22 98 76 94 96 C69 101 24 99 4 94 C0 70 1 29 2 8Z"/><path class="soft" d="M4 6 C31 0 73 3 97 9 C99 32 100 70 93 94 C61 98 31 102 6 92 C3 62 -1 33 4 6Z"/></svg>
      <span class="kicker">private dashboard</span>
      <h1><span class="mark">订阅</span>入口</h1>
      <p>${escapeHtml(config.subName)} · 登录后会跳转到本次会话专属的随机白板路径。</p>
    </section>
    ${error}
    <form class="form-card" method="POST" action="/login" autocomplete="on">
      <svg class="rough-svg outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M4 9 C23 2 74 3 96 8 C99 29 98 72 93 95 C70 100 25 98 6 92 C2 66 1 32 4 9Z"/><path class="soft" d="M2 7 C28 1 70 4 95 6 C101 34 97 68 95 94 C68 99 30 101 5 91 C1 61 -1 31 2 7Z"/></svg>
      <div class="field"><label for="username">用户名</label><input id="username" name="username" autocomplete="username" required autofocus></div>
      <div class="field"><label for="password">密码</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
      <button type="submit">进入白板</button>
    </form>
    <div class="hint">订阅链接不会在页面明文展示，只提供复制和扫码。</div>
  </section>
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
      headers: noStoreHeaders({ 'Content-Type': 'text/html; charset=utf-8' }),
    });
  }

  return new Response('Not Found', { status: 404 });
}

// ==================== Worker 入口 ====================
export default {
  fetch: handleRequest,
};
