// ==UserScript==
// Sub Worker — 订阅聚合与转换 | 暗色玻璃面板 | 无后端依赖
// ==/UserScript==

// ==================== 环境变量加载 ====================
function loadConfig(env) {
  return {
    token: env?.TOKEN || '',
    link: env?.LINK || '',
    subName: env?.SUBNAME || '自用',
  };
}

// ==================== VLESS → Clash 代理转换 ====================
function convertVlessToClashProxy(urlStr) {
  try {
    const url = new URL(urlStr);
    const params = new URLSearchParams(url.search.replace(/^&/, ''));
    const hash = url.hash ? new URLSearchParams(url.hash.replace(/^#/, '')) : new URLSearchParams();

    // 合并 search 和 hash 参数
    const allParams = new URLSearchParams();
    for (const [k, v] of params) allParams.set(k, v);
    for (const [k, v] of hash) allParams.set(k, v);

    // 如果 flow 为空则删掉
    const flow = allParams.get('flow') || '';
    const mode = allParams.get('mode') || '';

    // 节点名：优先用 URL 片段（#香港），否则用 hostname
    const remark = url.hash ? decodeURIComponent(url.hash.replace(/^#/, '')) : url.hostname;

    const proxy = {
      name: remark,
      type: 'vless',
      server: url.hostname,
      port: parseInt(url.port) || 443,
      uuid: url.username,
      network: 'tcp',
      tls: true,
      'skip-cert-verify': true,
      servername: allParams.get('sni') || url.hostname,
    };

    // network 类型
    let network = allParams.get('type') || 'tcp';
    proxy.network = network;

    // Reality
    if (url.protocol.includes('reality') || allParams.get('security') === 'reality') {
      proxy['reality-opts'] = {
        'public-key': allParams.get('pbk') || '',
        'short-id': allParams.get('sid') || '',
      };
      proxy['client-fingerprint'] = allParams.get('fp') || 'chrome';
    }

    // flow（只保留非空值，Reality XTLS 用）
    if (flow && flow !== 'none') {
      proxy.flow = flow;
    }

    // XHTTP / XTLS / gRPC
    if (network === 'xhttp') {
      proxy['xhttp-opts'] = {
        mode: mode || 'packet-up',
        path: allParams.get('path') || '/',
      };
      proxy.flow = '';
    } else if (network === 'grpc') {
      proxy['grpc-opts'] = {
        'grpc-service-name': allParams.get('serviceName') || '',
      };
    } else if (network === 'ws') {
      proxy['ws-opts'] = {
        path: allParams.get('path') || '/',
        headers: allParams.get('host') ? { Host: allParams.get('host') } : undefined,
      };
    } else if (network === 'tcp' && allParams.get('security') === 'reality') {
      proxy['reality-opts'] = {
        'public-key': allParams.get('pbk') || '',
        'short-id': allParams.get('sid') || '',
      };
      proxy['client-fingerprint'] = allParams.get('fp') || 'chrome';
    }

    return proxy;
  } catch {
    return null;
  }
}

// ==================== Clash YAML 生成 ====================
function generateClashYaml(proxies, subName) {
  const yamlLines = [
    '# 订阅: ' + subName,
    'port: 7890',
    'socks-port: 7891',
    'allow-lan: true',
    'mode: rule',
    'log-level: info',
    'external-controller: 127.0.0.1:9090',
    '',
    'proxies:',
  ];

  for (const p of proxies) {
    yamlLines.push('  - {name: "' + p.name + '", type: ' + p.type + ', server: "' + p.server + '", port: ' + p.port + ', uuid: "' + p.uuid + '", network: "' + p.network + '", tls: ' + p.tls + ', "skip-cert-verify": true, servername: "' + p.servername + '"' + formatProxyOpts(p) + '}');
  }

  yamlLines.push('');
  yamlLines.push('proxy-groups:');
  yamlLines.push('  - {name: "Proxy", type: select, proxies: [DIRECT, ' + proxies.map(p => '"' + p.name + '"').join(', ') + ']}');
  yamlLines.push('');
  yamlLines.push('rules:');
  yamlLines.push('  - RULE-SET,reject,REJECT');
  yamlLines.push('  - RULE-SET,icloud,DIRECT');
  yamlLines.push('  - RULE-SET,apple,DIRECT');
  yamlLines.push('  - RULE-SET,google,Proxy');
  yamlLines.push('  - RULE-SET,proxy,Proxy');
  yamlLines.push('  - RULE-SET,direct,DIRECT');
  yamlLines.push('  - RULE-SET,lancidr,DIRECT');
  yamlLines.push('  - RULE-SET,cncidr,DIRECT');
  yamlLines.push('  - RULE-SET,telegramcidr,Proxy');
  yamlLines.push('  - GEOIP,CN,DIRECT');
  yamlLines.push('  - MATCH,Proxy');
  yamlLines.push('');
  yamlLines.push('rule-providers:');
  yamlLines.push('  reject:');
  yamlLines.push('    type: http');
  yamlLines.push('    behavior: domain');
  yamlLines.push('    url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules@release/reject.txt"');
  yamlLines.push('    path: ./ruleset/reject.yaml');
  yamlLines.push('    interval: 86400');
  yamlLines.push('  icloud:');
  yamlLines.push('    type: http');
  yamlLines.push('    behavior: domain');
  yamlLines.push('    url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules@release/icloud.txt"');
  yamlLines.push('    path: ./ruleset/icloud.yaml');
  yamlLines.push('    interval: 86400');
  yamlLines.push('  apple:');
  yamlLines.push('    type: http');
  yamlLines.push('    behavior: domain');
  yamlLines.push('    url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules@release/apple.txt"');
  yamlLines.push('    path: ./ruleset/apple.yaml');
  yamlLines.push('    interval: 86400');
  yamlLines.push('  google:');
  yamlLines.push('    type: http');
  yamlLines.push('    behavior: domain');
  yamlLines.push('    url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules@release/google.txt"');
  yamlLines.push('    path: ./ruleset/google.yaml');
  yamlLines.push('    interval: 86400');
  yamlLines.push('  proxy:');
  yamlLines.push('    type: http');
  yamlLines.push('    behavior: domain');
  yamlLines.push('    url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules@release/proxy.txt"');
  yamlLines.push('    path: ./ruleset/proxy.yaml');
  yamlLines.push('    interval: 86400');
  yamlLines.push('  direct:');
  yamlLines.push('    type: http');
  yamlLines.push('    behavior: domain');
  yamlLines.push('    url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules@release/direct.txt"');
  yamlLines.push('    path: ./ruleset/direct.yaml');
  yamlLines.push('    interval: 86400');
  yamlLines.push('  lancidr:');
  yamlLines.push('    type: http');
  yamlLines.push('    behavior: ipcidr');
  yamlLines.push('    url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules@release/lancidr.txt"');
  yamlLines.push('    path: ./ruleset/lancidr.yaml');
  yamlLines.push('    interval: 86400');
  yamlLines.push('  cncidr:');
  yamlLines.push('    type: http');
  yamlLines.push('    behavior: ipcidr');
  yamlLines.push('    url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules@release/cncidr.txt"');
  yamlLines.push('    path: ./ruleset/cncidr.yaml');
  yamlLines.push('    interval: 86400');
  yamlLines.push('  telegramcidr:');
  yamlLines.push('    type: http');
  yamlLines.push('    behavior: ipcidr');
  yamlLines.push('    url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules@release/telegramcidr.txt"');
  yamlLines.push('    path: ./ruleset/telegramcidr.yaml');
  yamlLines.push('    interval: 86400');

  return yamlLines.join('\n');
}

function formatProxyOpts(p) {
  const parts = [];
  if (p['reality-opts']) {
    parts.push(', reality-opts: { "public-key": "' + p['reality-opts']['public-key'] + '", "short-id": "' + p['reality-opts']['short-id'] + '" }');
    parts.push(', client-fingerprint: "' + (p['client-fingerprint'] || 'chrome') + '"');
  }
  if (p.flow) {
    parts.push(', flow: "' + p.flow + '"');
  }
  if (p['xhttp-opts']) {
    // mihomo 不认 mode=auto，转 packet-up；Shadowrocket 不受影响（走 Base64 原始链接）
    const clashMode = p['xhttp-opts'].mode === 'auto' ? 'packet-up' : p['xhttp-opts'].mode;
    parts.push(', xhttp-opts: { mode: "' + clashMode + '", path: "' + p['xhttp-opts'].path + '" }');
  }
  return parts.join('');
}

// ==================== Base64 生成 ====================
function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// ==================== 管理面板 ====================
function renderDashboard(config, proxies, baseUrl) {
  const links = {
    clash: baseUrl + '/' + config.token + '?clash',
    b64: baseUrl + '/' + config.token + '?b64',
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>订阅管理器 · ${config.subName}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
:root {
  --bg: #050510;
  --card: rgba(255,255,255,0.05);
  --card-hover: rgba(255,255,255,0.08);
  --border: rgba(255,255,255,0.10);
  --accent: #10b981;
  --accent2: #818cf8;
  --grad: linear-gradient(135deg, #10b981, #818cf8);
  --text: #f0fdf4;
  --text2: rgba(240,253,244,0.6);
  --text3: rgba(240,253,244,0.35);
  --radius: 14px;
  --rs: 8px;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg); color: var(--text); min-height: 100vh; line-height: 1.6;
}
.bg {
  position: fixed; inset:0; z-index:-1;
  background:
    radial-gradient(ellipse 80% 60% at 50% -20%, rgba(16,185,129,0.08), transparent),
    radial-gradient(ellipse 60% 50% at 80% 100%, rgba(129,140,248,0.05), transparent);
}
.c { max-width: 720px; margin:0 auto; padding: 2rem 1.5rem; }
.hd { text-align: center; margin-bottom: 2rem; }
.hd h1 {
  font-size: 1.8rem; font-weight: 700;
  background: var(--grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  margin-bottom: 0.4rem;
}
.hd p { color: var(--text2); font-size: 0.9rem; }
.badge {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 0.6rem; padding: 3px 12px;
  border-radius: 999px; font-size: 0.78rem;
  background: rgba(16,185,129,0.12);
  border: 1px solid rgba(16,185,129,0.2);
  color: var(--accent);
}
.card {
  background: var(--card);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin-bottom: 1rem;
  transition: border-color 0.2s, background 0.2s;
}
.card:hover { border-color: rgba(16,185,129,0.2); background: var(--card-hover); }
.ct {
  font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--text3); margin-bottom: 1rem;
}
.si {
  display: flex; align-items: center; gap: 12px;
  padding: 0.8rem 1rem;
  background: rgba(0,0,0,0.25);
  border-radius: var(--rs);
  border: 1px solid var(--border);
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.si:hover { border-color: var(--accent); background: rgba(16,185,129,0.05); }
.si .ic { font-size: 1.3rem; flex-shrink:0; }
.si .inf { flex:1; min-width:0; }
.si .inf .lb { font-size: 0.88rem; font-weight: 600; }
.si .inf .ds { font-size: 0.73rem; color: var(--text3); }
.si .inf .url {
  font-size: 0.73rem; color: var(--text2);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 350px;
}
.si .ac { display: flex; gap: 6px; flex-shrink:0; }
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  border-radius: var(--rs);
  border: 1px solid var(--border);
  background: transparent; color: var(--text2);
  cursor: pointer; font-size: 0.95rem;
  transition: all 0.2s;
  text-decoration: none;
}
.btn:hover { color: var(--accent); border-color: var(--accent); background: rgba(16,185,129,0.08); }
.stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 1rem; }
.sc {
  background: var(--card);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.9rem 1.2rem;
  text-align: center;
}
.sc .n { font-size: 1.5rem; font-weight: 700; background: var(--grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.sc .l { font-size: 0.7rem; color: var(--text3); margin-top: 2px; }

/* QR Modal */
.mo {
  display: none; position: fixed; inset:0; z-index:1000;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(8px);
  align-items: center; justify-content: center;
}
.mo.on { display: flex; }
.m {
  background: #0a0e1a;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2rem;
  max-width: 380px; width: 90%;
  text-align: center;
}
.m img { width: 220px; height: 220px; margin: 1rem auto; border-radius: var(--rs); display:block; }
.m .t { font-size: 0.75rem; color: var(--text3); word-break: break-all; }
.m .cb {
  margin-top: 1rem; padding: 8px 24px;
  background: rgba(255,255,255,0.08); color: var(--text);
  border: 1px solid var(--border); border-radius: var(--rs);
  cursor: pointer; font-size: 0.85rem; font-family: inherit;
}
.m .cb:hover { background: rgba(255,255,255,0.14); }

#toast {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%) translateY(100px);
  background: var(--card); backdrop-filter: blur(24px);
  border: 1px solid var(--accent);
  border-radius: var(--rs);
  padding: 10px 20px;
  color: var(--text);
  font-size: 0.82rem;
  opacity: 0; transition: all 0.35s ease;
  z-index: 2000;
  pointer-events: none;
}
#toast.on { opacity: 1; transform: translateX(-50%) translateY(0); }

@media (max-width: 640px) {
  .c { padding: 1rem; }
  .si .inf .url { max-width: 180px; }
}
</style>
</head>
<body>
<div class="bg"></div>
<div class="c">
  <div class="hd">
    <h1>🌐 订阅</h1>
    <p>${config.subName}</p>
    <div class="badge">${proxies.length} 节点 · 2 种格式</div>
  </div>

  <div class="stats">
    <div class="sc"><div class="n">${proxies.length}</div><div class="l">节点数量</div></div>
    <div class="sc"><div class="n">2</div><div class="l">输出格式</div></div>
  </div>

  <div class="card">
    <div class="ct">📡 订阅链接</div>
    <div class="si" onclick="cp('clash')">
      <span class="ic">⚔️</span>
      <div class="inf">
        <div class="lb">Clash / Meta</div>
        <div class="ds">Clash Verge, Clash Meta 等</div>
        <div class="url" id="u-clash">${links.clash}</div>
      </div>
      <div class="ac">
        <button class="btn" onclick="event.stopPropagation();qr('${links.clash}','Clash')" title="二维码">📱</button>
        <button class="btn" onclick="event.stopPropagation();cp('clash')" title="复制">📋</button>
      </div>
    </div>
    <div class="si" onclick="cp('b64')">
      <span class="ic">📄</span>
      <div class="inf">
        <div class="lb">Base64</div>
        <div class="ds">通用 / Shadowrocket / v2rayNG</div>
        <div class="url" id="u-b64">${links.b64}</div>
      </div>
      <div class="ac">
        <button class="btn" onclick="event.stopPropagation();qr('${links.b64}','Base64')" title="二维码">📱</button>
        <button class="btn" onclick="event.stopPropagation();cp('b64')" title="复制">📋</button>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="ct">📋 节点列表 (${proxies.length})</div>
    ${proxies.map(n => '<div style="padding:5px 0;font-size:0.82rem;color:var(--text2);border-bottom:1px solid rgba(255,255,255,0.04)">' + n.name + ' · ' + n.server + ':' + n.port + '</div>').join('')}
  </div>
</div>

<div class="mo" id="qrModal">
  <div class="m">
    <h4 id="qrTitle" style="margin-bottom:0.3rem">二维码</h4>
    <img id="qrImg" src="" alt="QR">
    <p class="t" id="qrLink"></p>
    <button class="cb" onclick="cq()">关闭</button>
  </div>
</div>

<div id="toast"></div>

<script>
function cp(k) {
  const u = document.getElementById('u-'+k).textContent;
  navigator.clipboard.writeText(u).then(function(){t('✅ 已复制')}).catch(function(){
    const ta=document.createElement('textarea');ta.value=u;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);t('✅ 已复制');
  });
}
function qr(u,n) {
  document.getElementById('qrTitle').textContent = n + ' 二维码';
  document.getElementById('qrImg').src = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data='+encodeURIComponent(u);
  document.getElementById('qrLink').textContent = u;
  document.getElementById('qrModal').classList.add('on');
}
function cq() { document.getElementById('qrModal').classList.remove('on'); }
document.getElementById('qrModal').addEventListener('click', function(e) { if(e.target===this) cq(); });
document.addEventListener('keydown', function(e) { if(e.key==='Escape') cq(); });
function t(m) {
  const el=document.getElementById('toast');
  el.textContent=m; el.classList.add('on');
  clearTimeout(el._t); el._t=setTimeout(function(){el.classList.remove('on')},2500);
}
</script>
</body>
</html>`;
}

// ==================== 路由处理 ====================
async function handleRequest(request, env) {
  const config = loadConfig(env);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const search = url.search;

  // 提取 token（路径第一段）
  const pathParts = path.split('/').filter(Boolean);
  const token = pathParts[0] || '';

  // Token 验证
  if (!token || token !== config.token) {
    return new Response('Not Found', { status: 404 });
  }

  // 解析 vless 链接
  const lines = config.link.split('\n').filter(l => l.trim() && l.startsWith('vless://'));
  const proxies = lines.map(l => convertVlessToClashProxy(l.trim())).filter(Boolean);

  // Base URL for subscription links
  const baseUrl = url.protocol + '//' + url.host;

  // ====== Clash YAML ======
  if (search.includes('clash')) {
    const yaml = generateClashYaml(proxies, config.subName);
    return new Response(yaml, {
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'content-disposition': 'inline; filename="' + config.subName + '"; filename*=UTF-8\'\'' + encodeURIComponent(config.subName),
        'profile-title': config.subName,
        'profile-update-interval': '6',
      },
    });
  }

  // ====== Base64 ======
  if (search.includes('b64')) {
    // 清理空值的 flow 参数（某些客户端如 NekoBox 会报 unknown version: 72）
    const vlessList = lines.map(l => l.trim().replace(/[?&]flow=(&|$)/g, '$1')).join('\n');
    const b64 = encodeBase64(vlessList);
    return new Response(b64, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'content-disposition': 'inline; filename="' + config.subName + '"; filename*=UTF-8\'\'' + encodeURIComponent(config.subName),
        'profile-title': config.subName,
        'profile-update-interval': '6',
      },
    });
  }

  // ====== 管理面板 ======
  return new Response(renderDashboard(config, proxies, baseUrl), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ==================== Worker 入口 ====================
export default {
  fetch: handleRequest,
};
