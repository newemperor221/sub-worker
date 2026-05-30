// ==UserScript==
// CF-Workers-SUB - 美观版 | 支持二维码、暗色主题、环境变量全配置
// ==/UserScript==

// ==================== 默认配置（环境变量会覆盖） ====================
const DEFAULT_CONFIG = {
  mytoken: 'auto',
  guestToken: '',
  SUBNAME: 'MyNodes',
  SUBUpdateTime: 6,
  total: 99,
  timestamp: 4102329600000,
  MainData: '',
  subConverter: '',
  subConfig: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_MultiCountry.ini',
  subProtocol: 'https',
};

// ==================== 环境变量加载 ====================
function loadConfig(env) {
  return {
    mytoken: env?.TOKEN || DEFAULT_CONFIG.mytoken,
    guestToken: env?.GUEST || env?.GUESTTOKEN || DEFAULT_CONFIG.guestToken,
    BotToken: env?.TGTOKEN || '',
    ChatID: env?.TGID || '',
    TG: env?.TG || 0,
    SUBNAME: env?.SUBNAME || DEFAULT_CONFIG.SUBNAME,
    SUBUpdateTime: parseInt(env?.SUBUPTIME) || DEFAULT_CONFIG.SUBUpdateTime,
    total: parseInt(env?.TOTAL) || DEFAULT_CONFIG.total,
    timestamp: parseInt(env?.TIMESTAMP) || DEFAULT_CONFIG.timestamp,
    MainData: env?.LINK || DEFAULT_CONFIG.MainData,
    subConverter: env?.SUBAPI || DEFAULT_CONFIG.subConverter,
    subConfig: env?.SUBCONFIG || DEFAULT_CONFIG.subConfig,
    subProtocol: DEFAULT_CONFIG.subProtocol,
    URL302: env?.URL302 || '',
    URL: env?.URL || '',
    WARP: env?.WARP || '',
  };
}

// ==================== 辅助函数 ====================
const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function MD5MD5(text) {
  const firstPass = await crypto.subtle.digest('MD5', encoder.encode(text));
  const firstHex = Array.from(new Uint8Array(firstPass)).map(b => b.toString(16).padStart(2, '0')).join('');
  const secondPass = await crypto.subtle.digest('MD5', encoder.encode(firstHex.slice(7, 27)));
  return Array.from(new Uint8Array(secondPass)).map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
}

async function getUrl(request, url, ua) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': ua || 'Mozilla/5.0' },
    });
    return resp;
  } finally {
    clearTimeout(timeout);
  }
}

function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(str) {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch {
    return atob(str);
  }
}

// ==================== HTML 前端页面 ====================
function renderDashboard(config, nodes, subUrl, kvAvailable) {
  const token = config.mytoken;
  const guest = config.guestToken || (token ? '' : '');
  const baseUrl = `https://${subUrl}`;
  
  // Build all subscription links
  const links = {};
  const formats = [
    { key: 'clash', label: 'Clash / Meta', icon: '⚔️', tip: 'Clash Verge, Clash Meta 等' },
    { key: 'singbox', label: 'Sing-box', icon: '📦', tip: 'sing-box, SFI 等' },
    { key: 'surge', label: 'Surge', icon: '🌊', tip: 'Surge 4+' },
    { key: 'quanx', label: 'Quantumult X', icon: '🐧', tip: 'Quantumult X' },
    { key: 'loon', label: 'Loon', icon: '🌙', tip: 'Loon' },
    { key: 'b64', label: 'Base64', icon: '📄', tip: '通用 / Shadowrocket / v2rayNG' },
  ];
  
  formats.forEach(f => {
    const param = f.key === 'b64' ? '' : `?${f.key}`;
    links[f.key] = `${baseUrl}/${token}${param}`;
  });
  
  const guestLink = guest ? `${baseUrl}/sub?token=${guest}` : null;
  const nodeCount = nodes.length || 0;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>订阅管理器 - ${config.SUBNAME}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

:root {
  --bg-deep: #050510;
  --bg-surface: #0a0e1a;
  --bg-card: rgba(255,255,255,0.05);
  --bg-card-hover: rgba(255,255,255,0.08);
  --border: rgba(255,255,255,0.10);
  --border-hover: rgba(16,185,129,0.25);
  --accent: #10b981;
  --accent2: #818cf8;
  --accent-gradient: linear-gradient(135deg, #10b981, #818cf8);
  --text: #f0fdf4;
  --text-secondary: rgba(240,253,244,0.65);
  --text-muted: rgba(240,253,244,0.40);
  --danger: #ef4444;
  --radius: 14px;
  --radius-sm: 8px;
  --blur: blur(24px) saturate(140%);
}

* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg-deep);
  color: var(--text);
  min-height: 100vh;
  line-height: 1.6;
}
.bg-layer {
  position: fixed; inset:0; z-index:-1;
  background: radial-gradient(ellipse 80% 60% at 50% -20%, rgba(16,185,129,0.08), transparent),
              radial-gradient(ellipse 60% 50% at 80% 100%, rgba(129,140,248,0.06), transparent);
}
.container { max-width: 1000px; margin:0 auto; padding: 2rem 1.5rem; }

/* Header */
.header {
  text-align: center; margin-bottom: 2.5rem;
}
.header h1 {
  font-size: 2rem; font-weight: 800;
  background: var(--accent-gradient);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
}
.header p { color: var(--text-secondary); font-size: 0.95rem; }
.header .badge {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 0.75rem; padding: 4px 14px;
  border-radius: 999px; font-size: 0.8rem; font-weight: 500;
  background: rgba(16,185,129,0.12);
  border: 1px solid rgba(16,185,129,0.2);
  color: var(--accent);
}

/* Card */
.card {
  background: var(--bg-card);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin-bottom: 1.25rem;
  transition: border-color 0.2s, background 0.2s;
}
.card:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
.card-title {
  font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--text-muted); margin-bottom: 1rem;
  display: flex; align-items: center; gap: 8px;
}

/* Subscription links */
.sub-item {
  display: flex; align-items: center; gap: 12px;
  padding: 0.85rem 1rem;
  background: rgba(0,0,0,0.2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  margin-bottom: 8px;
  transition: all 0.2s;
  cursor: pointer;
  position: relative;
}
.sub-item:hover {
  border-color: var(--accent);
  background: rgba(16,185,129,0.06);
}
.sub-item .icon { font-size: 1.3rem; flex-shrink:0; }
.sub-item .info { flex:1; min-width:0; }
.sub-item .info .label { font-size: 0.9rem; font-weight: 600; }
.sub-item .info .desc { font-size: 0.75rem; color: var(--text-muted); }
.sub-item .info .url {
  font-size: 0.75rem; color: var(--text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 400px;
}
.sub-item .actions { display: flex; gap: 6px; flex-shrink:0; }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  padding: 6px 14px; border-radius: var(--radius-sm);
  font-size: 0.8rem; font-weight: 500;
  border: none; cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  font-family: inherit;
}
.btn-primary { background: var(--accent); color: #000; }
.btn-primary:hover { background: #0d9668; transform: translateY(-1px); }
.btn-secondary { background: rgba(255,255,255,0.08); color: var(--text); }
.btn-secondary:hover { background: rgba(255,255,255,0.14); transform: translateY(-1px); }
.btn-icon {
  width: 34px; height: 34px; padding: 0;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: transparent; color: var(--text-secondary);
  cursor: pointer; transition: all 0.2s;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 1rem;
}
.btn-icon:hover { color: var(--accent); border-color: var(--accent); background: rgba(16,185,129,0.08); }

/* Stats grid */
.stats-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px; margin-bottom: 1.25rem;
}
.stat-card {
  background: var(--bg-card);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem 1.2rem;
  text-align: center;
  transition: border-color 0.2s;
}
.stat-card:hover { border-color: var(--border-hover); }
.stat-card .num {
  font-size: 1.6rem; font-weight: 700;
  background: var(--accent-gradient);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.stat-card .lbl { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }

/* QR Modal */
.modal-overlay {
  display: none; position: fixed; inset:0; z-index:1000;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(8px);
  align-items: center; justify-content: center;
}
.modal-overlay.active { display: flex; }
.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2rem;
  max-width: 400px; width: 90%;
  text-align: center;
}
.modal h3 { margin-bottom: 0.5rem; }
.modal img { width: 240px; height: 240px; margin: 1rem auto; border-radius: var(--radius-sm); display:block; }
.modal .close-btn {
  margin-top: 1rem; padding: 8px 24px;
  background: rgba(255,255,255,0.08); color: var(--text);
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  cursor: pointer; font-size: 0.9rem; font-family: inherit;
  transition: background 0.2s;
}
.modal .close-btn:hover { background: rgba(255,255,255,0.14); }

/* Config info */
.config-grid {
  display: grid; grid-template-columns: auto 1fr;
  gap: 6px 16px; font-size: 0.85rem;
}
.config-grid .key { color: var(--text-muted); white-space: nowrap; }
.config-grid .value { color: var(--text-secondary); word-break: break-all; }

/* Toast */
.toast {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%) translateY(100px);
  background: var(--bg-card); backdrop-filter: var(--blur);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  padding: 10px 20px;
  color: var(--text);
  font-size: 0.85rem;
  opacity: 0; transition: all 0.4s ease;
  z-index: 2000;
}
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

@media (max-width: 640px) {
  .container { padding: 1rem; }
  .sub-item { flex-wrap: wrap; }
  .sub-item .info .url { max-width: 200px; }
  .header h1 { font-size: 1.5rem; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
</head>
<body>
<div class="bg-layer"></div>

<div class="container">
  <div class="header">
    <h1>🌐 订阅管理器</h1>
    <p>${config.SUBNAME} · 一键导入 · 多格式支持</p>
    <div class="badge">${nodeCount} 个节点 · ${formats.length} 种格式</div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-card"><div class="num">${nodeCount}</div><div class="lbl">节点数量</div></div>
    <div class="stat-card"><div class="num">${formats.length}</div><div class="lbl">输出格式</div></div>
    <div class="stat-card"><div class="num">${config.SUBUpdateTime}h</div><div class="lbl">更新间隔</div></div>
    <div class="stat-card"><div class="num">${config.subConverter ? '✅' : '❌'}</div><div class="lbl">转换后端</div></div>
  </div>

  <!-- Subscription Links -->
  <div class="card">
    <div class="card-title">📡 订阅链接 · 点击复制</div>
    ${formats.map(f => `
    <div class="sub-item" onclick="copyUrl('${f.key}')">
      <span class="icon">${f.icon}</span>
      <div class="info">
        <div class="label">${f.label}</div>
        <div class="desc">${f.tip}</div>
        <div class="url" id="url-${f.key}">${links[f.key]}</div>
      </div>
      <div class="actions">
        <button class="btn-icon" onclick="event.stopPropagation();showQR('${links[f.key]}', '${f.label}')" title="二维码">📱</button>
        <a class="btn-icon" href="${links[f.key]}" target="_blank" onclick="event.stopPropagation()" title="打开">🔗</a>
        <button class="btn-icon" onclick="event.stopPropagation();copyUrl('${f.key}')" title="复制">📋</button>
      </div>
    </div>
    `).join('')}
    ${guestLink ? `
    <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
      <div class="card-title" style="margin-bottom:0.5rem">👤 访客订阅</div>
      <div class="sub-item" onclick="copyText('${guestLink}')">
        <span class="icon">👤</span>
        <div class="info">
          <div class="label">访客订阅</div>
          <div class="url">${guestLink}</div>
        </div>
        <button class="btn-icon" onclick="event.stopPropagation();showQR('${guestLink}','访客订阅')" title="二维码">📱</button>
      </div>
    </div>
    ` : ''}
  </div>

  <!-- Config Display -->
  <div class="card">
    <div class="card-title">⚙️ 当前配置</div>
    <div class="config-grid">
      <span class="key">TOKEN</span><span class="value">${config.mytoken}</span>
      <span class="key">SUBAPI</span><span class="value">${config.subConverter || '未设置'}</span>
      <span class="key">SUBNAME</span><span class="value">${config.SUBNAME}</span>
      <span class="key">SUBCONFIG</span><span class="value" style="font-size:0.75rem">${config.subConfig?.substring(0,80)}${config.subConfig?.length > 80 ? '...' : ''}</span>
      <span class="key">SUBUPTIME</span><span class="value">${config.SUBUpdateTime}h</span>
    </div>
  </div>

  <!-- Node List -->
  <div class="card">
    <div class="card-title">📋 节点列表 (${nodeCount})</div>
    ${nodes.length > 0 ? `
    <div style="font-size:0.8rem;color:var(--text-secondary);max-height:200px;overflow-y:auto">
      ${nodes.map(n => `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)">${n}</div>`).join('')}
    </div>
    ` : '<div style="color:var(--text-muted);font-size:0.85rem">暂无节点数据 — 请配置 LINK 环境变量</div>'}
  </div>
</div>

<!-- QR Modal -->
<div class="modal-overlay" id="qrModal">
  <div class="modal">
    <h3 id="qrTitle">二维码</h3>
    <img id="qrImage" src="" alt="QR Code">
    <p style="font-size:0.8rem;color:var(--text-muted);word-break:break-all" id="qrLink"></p>
    <button class="close-btn" onclick="closeQR()">关闭</button>
  </div>
</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<script>
function copyUrl(key) {
  const url = document.getElementById('url-' + key).textContent;
  copyText(url);
}
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ 已复制到剪贴板');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast('✅ 已复制到剪贴板');
  });
}
function showQR(url, name) {
  document.getElementById('qrTitle').textContent = name + ' 二维码';
  document.getElementById('qrImage').src = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(url);
  document.getElementById('qrLink').textContent = url;
  document.getElementById('qrModal').classList.add('active');
}
function closeQR() {
  document.getElementById('qrModal').classList.remove('active');
}
document.getElementById('qrModal').addEventListener('click', function(e) {
  if (e.target === this) closeQR();
});
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeQR(); });

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}
</script>
</body>
</html>`;
}

// ==================== Nginx 欢迎页（未授权时显示） ====================
function renderLandingPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>订阅服务</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  background:#050510;color:#f0fdf4;min-height:100vh;
  display:flex;align-items:center;justify-content:center;
  background: radial-gradient(ellipse 80% 60% at 50% -20%, rgba(16,185,129,0.08), transparent);
}
.card{
  text-align:center;padding:3rem 2rem;
  background:rgba(255,255,255,0.04);
  backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.08);
  border-radius:16px;max-width:420px;
}
h1{font-size:1.8rem;font-weight:700;margin-bottom:0.5rem;
  background:linear-gradient(135deg,#10b981,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;
}
p{color:rgba(240,253,244,0.5);font-size:0.9rem;margin-bottom:1.5rem;}
code{padding:8px 16px;background:rgba(255,255,255,0.06);border-radius:8px;font-size:0.85rem;color:rgba(240,253,244,0.7);}
</style></head>
<body>
<div class="card">
  <h1>🌐 订阅服务</h1>
  <p>私有订阅聚合与转换服务</p>
  <code>访问 /your-token 获取订阅</code>
</div>
</body></html>`;
}

// ==================== 错误页面 ====================
function renderError(msg) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>错误</title>
<style>body{font-family:sans-serif;background:#050510;color:#f0fdf4;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;}
.card{background:rgba(255,255,255,0.04);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:2rem;max-width:500px;text-align:center;}
h2{color:#ef4444;margin-bottom:0.5rem;}p{color:rgba(240,253,244,0.6);}</style></head>
<body>
<div class="card"><h2>⚠️ 配置错误</h2><p>${msg}</p></div>
</body></html>`;
}

// ==================== 核心处理逻辑 ====================
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const search = url.search;
  const config = loadConfig(env);
  const ua = (request.headers.get('User-Agent') || '').toLowerCase();
  const isBrowser = ua.includes('mozilla') || ua.includes('chrome') || ua.includes('safari');
  const isBot = ua.includes('telegram') || ua.includes('slack') || ua.includes('discord');

  // Check for KV binding
  const kvAvailable = typeof KV !== 'undefined';

  // Extract token from path or query
  let token = url.searchParams.get('token') || '';
  if (!token && path.startsWith('/')) {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 1) token = parts[0];
  }
  if (!token && path.startsWith('/sub') && url.searchParams.get('token')) {
    token = url.searchParams.get('token');
  }

  // Compute fake token (daily changing)
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fakeToken = await MD5MD5(config.mytoken + today);

  // Determine guest token
  let guestToken = config.guestToken || '';
  if (!guestToken) {
    guestToken = await MD5MD5(config.mytoken);
  }

  // Authenticate
  const isAuthed = token === config.mytoken || token === fakeToken || token === guestToken;
  const isMainUser = token === config.mytoken || token === fakeToken;

  if (!isAuthed) {
    // Handle unauthenticated requests
    if (config.URL302 && !isBot) {
      return Response.redirect(config.URL302, 302);
    }
    if (config.URL && !isBot) {
      const proxys = config.URL.split(',').map(s => s.trim()).filter(Boolean);
      if (proxys.length > 0) {
        const target = proxys[Math.floor(Math.random() * proxys.length)];
        const proxyUrl = target + url.pathname + url.search;
        return fetch(proxyUrl, { headers: request.headers });
      }
    }
    // Show landing page for unauthorized
    return new Response(renderLandingPage(), {
      headers: { 'Content-Type': 'text/html;charset=utf-8' }
    });
  }

  // --- Authenticated ---

  // If browser accessing main token with no search params -> show dashboard
  if (isBrowser && isMainUser && !url.search && !search.includes('?')) {
    // Gather data for dashboard
    let nodeData = await gatherNodes(config, env, kvAvailable);
    return new Response(renderDashboard(config, nodeData.nodes, url.hostname, kvAvailable), {
      headers: { 'Content-Type': 'text/html;charset=utf-8' }
    });
  }

  // If guest token access with no search -> redirect to sub
  if (isBrowser && !isMainUser && !search) {
    return Response.redirect(`${url.origin}/sub?token=${token}`, 302);
  }

  // Determine output format
  let format = 'b64'; // default
  if (search.includes('clash')) format = 'clash';
  else if (search.includes('sb') || search.includes('singbox')) format = 'singbox';
  else if (search.includes('surge')) format = 'surge';
  else if (search.includes('quanx')) format = 'quanx';
  else if (search.includes('loon')) format = 'loon';
  // Auto-detect by UA
  else if (ua.includes('clash') || ua.includes('meta') || ua.includes('stash') || ua.includes('clashmeta')) format = 'clash';
  else if (ua.includes('sing-box') || ua.includes('singbox')) format = 'singbox';
  else if (ua.includes('surge')) format = 'surge';
  else if (ua.includes('quantumult%20x') || ua.includes('quantumultx')) format = 'quanx';
  else if (ua.includes('loon')) format = 'loon';

  // Build subscription
  try {
    const nodeData = await gatherNodes(config, env, kvAvailable);
    let result = '';

    if (format === 'b64') {
      // Base64 output
      result = nodeData.nodes.join('\n');
      if (!result.trim()) {
        return new Response(renderError('没有可用的节点'), {
          headers: { 'Content-Type': 'text/html;charset=utf-8' }
        });
      }
      const b64Content = encodeBase64(result);
      const resp = new Response(b64Content, {
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          'Profile-Update-Interval': String(config.SUBUpdateTime),
          'Profile-web-page-url': `${url.protocol}//${url.hostname}/`,
          'Cache-Control': 'no-store',
        }
      });
      if (!isBrowser) {
        resp.headers.set('Content-Disposition', `attachment; filename*=utf-8''${encodeURIComponent(config.SUBNAME)}.txt`);
      }
      return resp;
    } else {
      // Need subscription converter
      if (!config.subConverter) {
        return new Response(renderError('需要配置 SUBAPI 环境变量指向订阅转换后端'), {
          headers: { 'Content-Type': 'text/html;charset=utf-8' }
        });
      }

      // Build the aggregation URL (self-referencing with fake token)
      const allRemoteSubs = nodeData.remoteSubs.join('|');
      let aggUrl = `${url.protocol}//${url.hostname}/${fakeToken}&sub=${encodeURIComponent(allRemoteSubs)}`;
      if (allRemoteSubs) {
        aggUrl = `${url.protocol}//${url.hostname}/${fakeToken}?sub=${encodeURIComponent(allRemoteSubs)}`;
      } else {
        aggUrl = `${url.protocol}//${url.hostname}/${fakeToken}`;
      }

      // Map format to target
      const formatMap = {
        'clash': 'clash',
        'singbox': 'singbox',
        'surge': 'surge',
        'quanx': 'quantumult%20x',
        'loon': 'loon',
      };
      const target = formatMap[format] || 'clash';

      // 302 redirect to subconverter - client fetches directly, avoids CF loop
      const redirectUrl = `${config.subProtocol}://${config.subConverter}/sub?target=${target}` +
        `&url=${encodeURIComponent(aggUrl)}` +
        `&insert=false` +
        `&config=${encodeURIComponent(config.subConfig)}` +
        `&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;

      try {
        return Response.redirect(redirectUrl, 302);
      } catch (e) {
        return new Response(renderError(`订阅转换失败: ${e.message}`), {
          headers: { 'Content-Type': 'text/html;charset=utf-8' }
        });
      }
    }
  } catch (e) {
    return new Response(renderError(`处理错误: ${e.message}`), {
      headers: { 'Content-Type': 'text/html;charset=utf-8' }
    });
  }
}

// ==================== 节点数据聚合 ====================
async function gatherNodes(config, env, kvAvailable) {
  let lines = [];
  let remoteSubs = [];

  // Read from KV or LINK env
  if (kvAvailable) {
    try {
      const kvData = await KV.get('LINK.txt');
      if (kvData) lines = kvData.split('\n').filter(Boolean);
    } catch (e) {}
  }

  if (lines.length === 0 && config.MainData) {
    lines = config.MainData.split('\n').filter(Boolean);
  }

  // Also read LINKSUB
  let subLines = [];
  if (env?.LINKSUB) {
    subLines = env.LINKSUB.split('\n').filter(Boolean);
  }

  // Separate regular nodes and subscription links
  const nodes = [];
  for (const line of lines) {
    if (line.startsWith('http://') || line.startsWith('https://')) {
      if (!subLines.includes(line)) subLines.push(line);
    } else {
      nodes.push(line);
    }
  }

  // Fetch remote subscriptions
  const subContents = [];
  if (subLines.length > 0) {
    const promises = subLines.map(subUrl =>
      getUrl(new Request(subUrl), subUrl, 'Mozilla/5.0')
        .then(r => r.ok ? r.text() : null)
        .catch(() => null)
    );
    const results = await Promise.allSettled(promises);
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const text = result.value;
        if (text.includes('proxies:') || text.includes('- name:')) {
          // Clash format - keep as remote sub
          remoteSubs.push(subLines[results.indexOf(result)]);
        } else {
          // Try to parse as base64 or plain text
          try {
            const decoded = decodeBase64(text.trim());
            const proxyLines = decoded.split('\n').filter(l => l.includes('://'));
            nodes.push(...proxyLines);
          } catch {
            const proxyLines = text.split('\n').filter(l => l.includes('://'));
            nodes.push(...proxyLines);
          }
        }
      }
    }
  }

  // Add WARP nodes if configured
  if (config.WARP) {
    const warpLines = config.WARP.split('\n').filter(Boolean);
    nodes.push(...warpLines);
  }

  // Deduplicate
  const unique = [...new Set(nodes)];

  return { nodes: unique, remoteSubs };
}

// ==================== Clash WireGuard Fix ====================
function clashFix(content) {
  if (content.includes('wireguard') && !content.includes('remote-dns-resolve')) {
    return content.replace(/(wireguard[^]*?mtu:\s*\d+,\s*udp:\s*true)/g, (match) => {
      return match.replace('udp: true', 'remote-dns-resolve: true, udp: true');
    });
  }
  return content;
}

// ==================== Worker Entry ====================
export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  }
};
