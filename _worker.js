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
<meta name="theme-color" content="#a9d9bd">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🏝️%3C/text%3E%3C/svg%3E">
<title>${escapeHtml(config.subName)} 登录</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700;800;900&family=Noto+Sans+SC:wght@400;500;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}:root{--sky:#a9d9bd;--cream:#fffaf0;--paper:#f8f2dd;--brown:#795735;--brown-deep:#5d3e24;--brown-soft:#a3835d;--mint:#58c5ae;--yellow:#ffd267;--coral:#ed947c;--leaf:#62a95a;--white:#fffdf7;--ease:cubic-bezier(.25,.8,.25,1)}html{min-height:100%;background:var(--sky)}body{min-height:100vh;overflow-x:hidden;color:var(--brown);font-family:Nunito,'Noto Sans SC','Microsoft YaHei',sans-serif;font-weight:600;letter-spacing:.01em;background:radial-gradient(circle at 18% 0%,rgba(255,255,255,.82) 0 9px,transparent 10px) 0 0/56px 56px,radial-gradient(circle at 58% 20%,rgba(255,255,255,.55) 0 5px,transparent 6px) 0 0/42px 42px,linear-gradient(180deg,#9dd5bd 0%,#bfe1c6 50%,#d7ebcc 100%)}button,input{font:inherit}.scene{position:fixed;inset:0;pointer-events:none;z-index:-1;overflow:hidden}.cloud{position:absolute;background:rgba(255,255,255,.78);filter:drop-shadow(0 5px 0 rgba(89,149,115,.10));border-radius:999px}.cloud:before,.cloud:after{content:"";position:absolute;background:inherit;border-radius:50%}.cloud.one{width:164px;height:48px;top:70px;left:6%;animation:drift 20s ease-in-out infinite}.cloud.one:before{width:76px;height:76px;left:24px;bottom:15px}.cloud.one:after{width:64px;height:64px;right:26px;bottom:12px}.cloud.two{width:116px;height:35px;top:160px;right:8%;opacity:.75;animation:drift 24s -8s ease-in-out infinite}.cloud.two:before{width:56px;height:56px;left:17px;bottom:8px}.cloud.two:after{width:50px;height:50px;right:18px;bottom:8px}.sun{position:absolute;width:74px;height:74px;right:14%;top:56px;border-radius:50%;background:#ffe499;box-shadow:0 0 0 10px rgba(255,228,153,.30),0 0 0 19px rgba(255,228,153,.12);transform:rotate(8deg)}.wave{position:absolute;bottom:-2px;height:135px;border-radius:50% 50% 0 0;background:#8fc9b8;opacity:.92}.wave.one{left:-8%;width:58%;transform:rotate(-2deg)}.wave.two{right:-9%;width:66%;height:112px;bottom:-12px;background:#6fb4a4;transform:rotate(3deg)}.grassline{position:absolute;bottom:0;left:0;right:0;height:86px;background:#8cbd69;border-radius:48% 52% 0 0/25% 28% 0 0}.grassline:before{content:"";position:absolute;inset:-14px 0 auto;height:31px;background:radial-gradient(25px 17px at 18px 17px,#8cbd69 98%,transparent 100%) 0 0/53px 31px repeat-x}.tree{position:absolute;bottom:52px;width:84px;height:154px;transform-origin:bottom center}.tree.left{left:5.5%;transform:rotate(-7deg)}.tree.right{right:5%;transform:rotate(8deg) scale(.86)}.tree .trunk{position:absolute;width:22px;height:96px;bottom:0;left:30px;border:3px solid var(--brown);border-radius:50% 50% 42% 42%;background:repeating-linear-gradient(90deg,#c48e58 0 7px,#dfac70 7px 13px)}.tree .leaf{position:absolute;width:58px;height:58px;border:3px solid #4a8447;background:#76bd6b;border-radius:50% 45% 50% 45%}.tree .a{left:0;top:8px;transform:rotate(-15deg)}.tree .b{right:0;top:0;transform:rotate(18deg)}.tree .c{left:14px;top:40px;transform:rotate(3deg)}.shell{width:min(100% - 32px,620px);min-height:100vh;margin:0 auto;padding:38px 0 96px;display:grid;place-items:center;position:relative}.corner-note{position:absolute;top:22px;left:-8px;display:flex;gap:9px;align-items:center;color:var(--brown);font-size:12px;font-weight:900;transform:rotate(-4deg)}.corner-note .mini-leaf{width:30px;height:24px;border:2px solid var(--brown);background:var(--leaf);border-radius:46% 54% 42% 58%;transform:rotate(-16deg);position:relative}.corner-note .mini-leaf:after{content:"";position:absolute;width:2px;height:17px;left:13px;top:2px;background:rgba(255,255,255,.65);transform:rotate(36deg);border-radius:99px}.login-card{width:min(100%,430px);position:relative;z-index:1;padding:28px 26px 24px;border:4px solid var(--brown);border-radius:34px 30px 36px 28px;background:linear-gradient(90deg,rgba(186,154,99,.12) 1px,transparent 1px) 0 0/26px 26px,linear-gradient(rgba(186,154,99,.10) 1px,transparent 1px) 0 0/26px 26px,var(--paper);box-shadow:0 12px 0 rgba(94,62,36,.30),0 20px 32px rgba(79,73,47,.20),inset 0 0 0 4px rgba(255,255,255,.48)}.login-card:before,.login-card:after{content:"";position:absolute;width:54px;height:15px;top:-10px;background:rgba(255,242,171,.82);border:1px solid rgba(154,109,51,.25)}.login-card:before{left:18%;transform:rotate(-6deg)}.login-card:after{right:18%;transform:rotate(7deg)}.sign-wrap{display:block;text-align:center;position:relative;padding:4px 12px 18px}.sign{position:relative;margin:0 auto;padding:22px 38px 18px;border:4px solid var(--brown-deep);border-radius:34px 38px 34px 39px;background:repeating-linear-gradient(5deg,transparent 0 13px,rgba(111,73,38,.09) 13px 15px),linear-gradient(135deg,#efc98e,#d99b5a);box-shadow:0 8px 0 #a76c3d,inset 0 2px 0 rgba(255,246,214,.66);color:#fff9e9}.sign:before,.sign:after{content:"";position:absolute;width:14px;height:14px;top:14px;border:3px solid var(--brown-deep);border-radius:50%;background:#f6d79e}.sign:before{left:17px}.sign:after{right:17px}.sign h1{font-size:clamp(27px,7vw,38px);line-height:1.05;font-weight:900;letter-spacing:.06em;text-shadow:0 3px 0 rgba(100,58,31,.38)}.sign p{margin-top:6px;color:rgba(255,250,232,.93);font-size:13px;font-weight:800}.gate-label{width:max-content;margin:0 auto 14px;padding:6px 12px;display:flex;align-items:center;gap:6px;border:2px solid rgba(107,77,43,.82);border-radius:999px;background:rgba(255,252,240,.88);color:var(--brown);font-size:12px;font-weight:900;box-shadow:0 2px 0 rgba(119,81,43,.42)}.dot{width:8px;height:8px;background:var(--leaf);border:1px solid #4b7c42;border-radius:50%;box-shadow:0 0 0 2px rgba(255,255,255,.7)}.field{margin:14px 0}label{display:block;margin:0 0 7px 4px;font-size:13px;font-weight:900;color:var(--brown-deep)}input{width:100%;height:48px;padding:0 14px;border:2px solid var(--brown);border-radius:16px;background:var(--white);color:var(--brown-deep);font-weight:800;outline:none;box-shadow:inset 0 2px 0 rgba(121,87,53,.08)}input:focus{box-shadow:0 0 0 3px var(--yellow),inset 0 2px 0 rgba(121,87,53,.08)}button{width:100%;height:48px;margin-top:16px;border:2px solid var(--brown);border-radius:999px;background:var(--mint);color:#fffaf0;font-weight:900;cursor:pointer;box-shadow:0 5px 0 #3c9c8b;transition:transform .16s var(--ease),box-shadow .16s var(--ease)}button:hover{transform:translateY(-1px);box-shadow:0 6px 0 #3c9c8b}button:active{transform:translateY(3px);box-shadow:0 1px 0 #3c9c8b}.error{margin:0 0 14px;padding:10px 12px;border:2px solid var(--coral);border-radius:15px;background:#fff0e4;color:#9a3f2d;font-weight:900}.hint{margin-top:17px;text-align:center;font-size:12px;color:var(--brown-soft);font-weight:800}@keyframes drift{0%,100%{transform:translateX(0)}50%{transform:translateX(28px)}}@media(max-width:760px){.shell{width:min(100% - 22px,520px);padding-top:30px}.corner-note{position:relative;top:auto;left:auto;margin:0 0 12px 8px;justify-content:center}.tree{opacity:.45}.tree.left{left:-16px}.tree.right{right:-23px}.sun{top:13px;right:4%;transform:scale(.75)}}
</style>
</head>
<body>
<div class="scene" aria-hidden="true">
  <div class="cloud one"></div><div class="cloud two"></div><div class="sun"></div>
  <div class="wave one"></div><div class="wave two"></div><div class="grassline"></div>
  <div class="tree left"><i class="trunk"></i><i class="leaf a"></i><i class="leaf b"></i><i class="leaf c"></i></div>
  <div class="tree right"><i class="trunk"></i><i class="leaf a"></i><i class="leaf b"></i><i class="leaf c"></i></div>
</div>
<main class="shell">
  <div class="corner-note"><span class="mini-leaf"></span><span>ISLAND GATE</span></div>
  <section class="login-card">
    <div class="sign-wrap">
      <div class="sign">
        <h1>订阅小岛</h1>
        <p>${escapeHtml(config.subName)} 管理面板登录</p>
      </div>
    </div>
    <div class="gate-label"><span class="dot"></span><span>PRIVATE DASHBOARD</span></div>
    ${error}
    <form method="POST" action="/login" autocomplete="on">
      <div class="field"><label for="username">用户名</label><input id="username" name="username" autocomplete="username" required autofocus></div>
      <div class="field"><label for="password">密码</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
      <button type="submit">登岛登录</button>
    </form>
    <div class="hint">登录成功后会跳转到本次会话专属的随机主页路径</div>
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
