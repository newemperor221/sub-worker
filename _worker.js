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
<meta name="theme-color" content="#fffdf7">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect x='16' y='20' width='68' height='58' rx='10' fill='%23ffec99' stroke='%2325262b' stroke-width='5'/%3E%3Cpath d='M30 40h39M30 55h26' stroke='%2325262b' stroke-width='5' stroke-linecap='round'/%3E%3C/svg%3E">
<title>${escapeHtml(config.subName)} 登录</title>
<script src="https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.min.js" defer></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}:root{color-scheme:light;--paper:#fffdf7;--paper-secondary:#f6f1e7;--ink:#25262b;--ink-muted:#68645e;--blue:#a5d8ff;--blue-strong:#5f7fe7;--yellow:#ffec99;--red:#ffc9c9;--red-strong:#d9485f;--green:#b2f2bb;--title-font:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif;--body-font:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif}html{min-height:100%;background:var(--paper)}body{min-width:320px;min-height:100vh;overflow-x:clip;color:var(--ink);background:var(--paper);font-family:var(--body-font);line-height:1.7}body:before{position:fixed;inset:0;z-index:-1;background-image:radial-gradient(circle at center,rgba(37,38,43,.085) .7px,transparent .8px);background-size:22px 22px;content:"";pointer-events:none;opacity:.42}button,input{font:inherit;color:inherit}.page{width:min(100% - 28px,860px);min-height:100vh;margin:0 auto;display:grid;place-items:center;padding:34px 0}.login-shell{position:relative;display:grid;width:100%;grid-template-columns:minmax(0,1fr) minmax(320px,.72fr);gap:clamp(1.4rem,4vw,3rem);align-items:center}.hero-copy{position:relative;z-index:1}.eyebrow{display:flex;margin-bottom:1.3rem;align-items:center;gap:.55rem;color:var(--ink-muted);font-family:var(--title-font);font-size:.82rem;font-weight:700;letter-spacing:.11em;text-transform:uppercase}.eyebrow span{color:var(--red-strong);font-size:1.12rem}h1{max-width:560px;margin-bottom:1.35rem;font-family:var(--title-font);font-size:clamp(2.8rem,7vw,5rem);font-weight:800;line-height:1.12;letter-spacing:-.065em}.blue{display:inline-block;color:var(--blue-strong);transform:rotate(-1deg)}.intro{max-width:34rem;color:var(--ink-muted);font-size:1.05rem;line-height:1.9}.login-card{position:relative;min-height:430px;padding:clamp(1.6rem,4vw,2.15rem);display:flex;flex-direction:column;justify-content:center;background:transparent}.login-card>:not(.rough-outline):not(.rough-fallback){position:relative;z-index:1}.rough-outline{position:absolute;inset:0;z-index:0;width:100%;height:100%;overflow:visible;pointer-events:none}.rough-fallback{position:absolute;inset:5px;border:1.8px solid var(--ink);border-radius:24px 19px 27px 18px;pointer-events:none}.card-top{display:flex;min-height:70px;margin-bottom:1.25rem;align-items:flex-start;justify-content:space-between}.brand-mark{display:grid;width:66px;height:66px;place-items:center;color:var(--ink);background:var(--yellow);border-radius:50%;font-family:var(--title-font);font-size:1.6rem;font-weight:800}.card-index{color:var(--ink-muted);font-family:var(--title-font);font-size:.8rem;font-weight:800;letter-spacing:.12em}.login-card h2{margin-bottom:.35rem;font-family:var(--title-font);font-size:clamp(1.45rem,3vw,2rem);line-height:1.35}.login-card p{margin-bottom:1.35rem;color:var(--ink-muted);font-size:.92rem}.field{display:grid;gap:.42rem;margin-bottom:1rem}.field label{color:var(--ink-muted);font-family:var(--title-font);font-size:.78rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.field input{width:100%;min-height:52px;padding:.72rem .85rem;border:1px dashed rgba(37,38,43,.42);background:var(--paper-secondary);outline:none}.field input:focus{border-color:var(--blue-strong);box-shadow:0 0 0 3px rgba(165,216,255,.45)}.sketch-button{position:relative;display:inline-flex;width:100%;min-height:52px;margin-top:.35rem;align-items:stretch;transition:transform 180ms ease}.sketch-button:hover{transform:translateY(-2px)}.sketch-button__control{position:relative;z-index:1;display:inline-flex;width:100%;min-height:52px;padding:.76rem 1.2rem;border:0;align-items:center;justify-content:center;gap:.7rem;color:var(--ink);background:transparent;cursor:pointer;font-size:.96rem;font-weight:800}.button-arrow{width:35px;height:20px}.error{position:relative;margin-bottom:1rem;padding:.7rem .85rem;color:var(--red-strong);background:rgba(255,201,201,.6);font-family:var(--title-font);font-weight:800;transform:rotate(-.4deg)}.hint{margin-top:1rem;color:var(--ink-muted);font-size:.78rem;text-align:center}.tape{position:absolute;z-index:2;width:74px;height:24px;background:rgba(165,216,255,.68)}.tape--left{top:10%;left:15%;transform:rotate(-17deg)}.tape--right{right:13%;bottom:9%;transform:rotate(-13deg)}.doodle{position:absolute;right:2%;bottom:13%;color:var(--red-strong);font-family:var(--title-font);font-size:2rem;transform:rotate(13deg)}.hero-sketch{position:relative;height:260px;margin-top:2rem;transform:rotate(.6deg)}.hero-sketch svg{width:100%;height:100%;overflow:visible}@media(max-width:780px){.login-shell{grid-template-columns:1fr}.hero-sketch{display:none}.login-card{min-height:390px}}@media(max-width:480px){.page{width:min(100% - 24px,860px)}h1{font-size:clamp(2.45rem,12vw,3.35rem);line-height:1.18}.login-card{padding:1.45rem}}
</style>
</head>
<body>
<main class="page">
  <section class="login-shell" aria-labelledby="login-title">
    <div class="hero-copy">
      <p class="eyebrow"><span aria-hidden="true">✦</span> private dashboard · 手绘入口</p>
      <h1 id="login-title">把订阅<br><span class="blue">打开成白板</span></h1>
      <p class="intro">${escapeHtml(config.subName)} · 登录后会跳转到本次会话专属的随机纸边路径。链接不在入口页明文展示。</p>
      <div class="hero-sketch" aria-hidden="true">
        <svg viewBox="0 0 520 260" preserveAspectRatio="xMidYMid meet"><rect x="48" y="42" width="405" height="170" rx="12" fill="#fffdf7" stroke="#25262b" stroke-width="2"/><path d="M52 88H449" stroke="#25262b" stroke-width="2"/><circle cx="78" cy="66" r="11" fill="#ffc9c9" stroke="#25262b" stroke-width="2"/><circle cx="101" cy="66" r="11" fill="#ffec99" stroke="#25262b" stroke-width="2"/><circle cx="124" cy="66" r="11" fill="#b2f2bb" stroke="#25262b" stroke-width="2"/><path d="M104 132H230M104 162H190M257 132H404M257 162H386" stroke="#25262b" stroke-width="2" stroke-linecap="round"/><path d="M340 215 C383 196 426 209 474 188 M453 174 L477 188 L458 207" fill="none" stroke="#5f7fe7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    </div>
    <form class="login-card" method="POST" action="/login" autocomplete="on" data-rough-fill="var(--paper)">
      <span class="rough-fallback"></span><svg class="rough-outline"></svg><span class="tape tape--left"></span><span class="tape tape--right"></span><span class="doodle">✦</span>
      <div class="card-top"><div class="brand-mark">✎</div><span class="card-index">GATE 01</span></div>
      <h2>登录白板</h2><p>输入管理员账号，继续进入订阅草稿页。</p>
      ${error}
      <div class="field"><label for="username">用户名</label><input id="username" name="username" autocomplete="username" required autofocus></div>
      <div class="field"><label for="password">密码</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
      <span class="sketch-button" data-rough-fill="var(--yellow)"><span class="rough-fallback"></span><svg class="rough-outline"></svg><button class="sketch-button__control" type="submit"><span>进入白板</span><svg class="button-arrow" viewBox="0 0 44 24"><path d="M3 13 C13 6 26 18 39 11 M31 5 L40 11 L30 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></span>
      <div class="hint">订阅链接只在登录后的导出卡里复制或扫码。</div>
    </form>
  </section>
</main>
<script>
function drawRoughOutlines(){if(!window.rough)return;document.querySelectorAll('svg.rough-outline').forEach(function(svg,idx){var parent=svg.parentElement;if(!parent)return;var r=parent.getBoundingClientRect();var w=Math.max(1,Math.round(r.width));var h=Math.max(1,Math.round(r.height));svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+w+' '+h);var rc=rough.svg(svg);svg.appendChild(rc.rectangle(5,5,Math.max(1,w-10),Math.max(1,h-10),{seed:151+idx,stroke:'#25262b',strokeWidth:1.8,roughness:1.45,bowing:1.35,fill:parent.getAttribute('data-rough-fill')||'transparent',fillStyle:'solid',fillWeight:1.2}));});}
window.addEventListener('load',drawRoughOutlines);window.addEventListener('resize',drawRoughOutlines);setTimeout(drawRoughOutlines,120);
</script>
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
