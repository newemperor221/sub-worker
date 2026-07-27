// Dashboard HTML renderer — Excalidraw whiteboard theme
// ====================================================

export function renderDashboard(config, proxies, baseUrl) {
  const links = {
    clash: baseUrl + '/api/sub?token=' + encodeURIComponent(config.token) + '&type=clash',
    b64: baseUrl + '/api/sub?token=' + encodeURIComponent(config.token) + '&type=b64',
  };

  var html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#f8f4e8">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect x='16' y='20' width='68' height='58' rx='10' fill='%23fff3bf' stroke='%231e1e1e' stroke-width='5'/%3E%3Cpath d='M30 40h39M30 55h26' stroke='%231e1e1e' stroke-width='5' stroke-linecap='round'/%3E%3C/svg%3E">
<title>订阅白板</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Noto+Sans+SC:wght@500;700;900&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg: #f8f4e8;
  --paper: #fffdf5;
  --ink: #1e1e1e;
  --muted: #6b6b6b;
  --blue: #a5d8ff;
  --green: #b2f2bb;
  --yellow: #fff3bf;
  --orange: #ffd8a8;
  --purple: #d0bfff;
  --red: #ffc9c9;
  --teal: #c3fae8;
  --shadow: rgba(30, 30, 30, .12);
  --ease: cubic-bezier(.22,.7,.2,1);
}
html { min-height: 100%; background: var(--bg); }
body {
  min-height: 100vh;
  overflow-x: hidden;
  color: var(--ink);
  font-family: Kalam, 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  font-weight: 700;
  background:
    radial-gradient(circle, rgba(30,30,30,.12) 1px, transparent 1.4px) 0 0 / 28px 28px,
    linear-gradient(180deg, #fbf7ed 0%, #f5efdf 100%);
}
button { font: inherit; }
button, .route-card, .node-row { -webkit-tap-highlight-color: transparent; }

.whiteboard {
  width: min(100% - 28px, 1120px);
  margin: 26px auto 74px;
  position: relative;
  padding: clamp(18px, 3vw, 34px);
  background: rgba(255,253,245,.78);
  border: 3px solid var(--ink);
  border-radius: 20px 28px 22px 30px;
  box-shadow: 7px 9px 0 rgba(30,30,30,.10), 0 20px 50px rgba(30,30,30,.08);
}
.whiteboard:before {
  content: "";
  position: absolute;
  inset: 7px -7px -7px 7px;
  border: 2px solid rgba(30,30,30,.42);
  border-radius: 26px 20px 30px 22px;
  pointer-events: none;
}
.tape { position:absolute; width:86px; height:24px; background:rgba(255,243,191,.82); border:1px solid rgba(30,30,30,.18); box-shadow:0 2px 5px rgba(30,30,30,.09); z-index:2; }
.tape.t1 { left:70px; top:-12px; transform:rotate(-7deg); }
.tape.t2 { right:105px; top:-10px; transform:rotate(6deg); }
.tape.t3 { left:50%; bottom:-12px; transform:translateX(-50%) rotate(2deg); }

.topbar { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:24px; position:relative; z-index:1; }
.brand { display:flex; align-items:center; gap:12px; transform:rotate(-1.2deg); }
.brand-mark { width:48px; height:40px; display:grid; place-items:center; border:3px solid var(--ink); border-radius:52% 48% 44% 56%; background:var(--yellow); font-size:24px; line-height:1; }
.brand-text { line-height:1; }
.brand-text small { display:block; color:var(--muted); font-size:15px; letter-spacing:.08em; }
.brand-text b { display:block; margin-top:4px; font-size:24px; }
.logout-btn { min-width:86px; min-height:44px; display:inline-flex; align-items:center; justify-content:center; padding:7px 16px; color:var(--ink); background:#fff; border:3px solid var(--ink); border-radius:999px 880px 999px 820px; text-decoration:none; font-size:18px; box-shadow:4px 5px 0 var(--shadow); transform:rotate(2deg); transition:transform .16s var(--ease), box-shadow .16s var(--ease), background .16s var(--ease); }
.logout-btn:hover { background:var(--red); transform:translateY(-2px) rotate(2deg); box-shadow:6px 7px 0 var(--shadow); }
.logout-btn:active { transform:translateY(2px) rotate(2deg); box-shadow:1px 2px 0 var(--shadow); }
.logout-btn:focus-visible { outline:4px solid var(--blue); outline-offset:3px; }

.hero { position:relative; z-index:1; min-height:230px; display:grid; grid-template-columns:minmax(0,1.1fr) minmax(270px,.9fr); gap:24px; align-items:center; }
.hero-copy { position:relative; padding:24px 24px 26px; border:3px solid var(--ink); border-radius:28px 20px 32px 22px; background:var(--blue); box-shadow:6px 8px 0 var(--shadow); transform:rotate(-.4deg); }
.hero-copy:after { content:""; position:absolute; right:26px; bottom:-20px; width:120px; height:48px; border-bottom:3px solid var(--ink); border-right:3px solid var(--ink); border-radius:0 0 35px 0; transform:rotate(-4deg); }
.kicker { display:inline-block; padding:3px 10px; border:2px solid var(--ink); border-radius:999px; background:var(--paper); color:var(--muted); font-size:16px; letter-spacing:.08em; }
h1 { margin-top:14px; font-size:clamp(42px, 8vw, 78px); line-height:.94; letter-spacing:.02em; }
.hero-copy p { margin-top:15px; max-width:650px; color:#2d2d2d; font-family:'Noto Sans SC', sans-serif; font-size:16px; line-height:1.75; font-weight:700; }
.hero-stats { display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; }
.stat { min-height:105px; display:flex; flex-direction:column; justify-content:center; align-items:center; border:3px solid var(--ink); border-radius:22px 18px 24px 19px; box-shadow:4px 5px 0 var(--shadow); background:var(--paper); }
.stat:nth-child(1) { background:var(--green); transform:rotate(1.5deg); }
.stat:nth-child(2) { background:var(--yellow); transform:rotate(-1.8deg); }
.stat:nth-child(3) { background:var(--orange); transform:rotate(1deg); }
.stat b { font-size:34px; line-height:1; }
.stat span { margin-top:7px; color:#4d4d4d; font-family:'Noto Sans SC', sans-serif; font-size:12px; }

.section { position:relative; z-index:1; margin-top:34px; }
.section-title { display:inline-flex; align-items:center; gap:9px; margin:0 0 17px 12px; padding:6px 14px; border:3px solid var(--ink); border-radius:14px 18px 12px 20px; background:var(--purple); box-shadow:4px 5px 0 var(--shadow); transform:rotate(-1deg); font-size:22px; }
.section-title .dot { width:10px; height:10px; border:2px solid var(--ink); border-radius:50%; background:var(--paper); }
.route-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; }
.route-card { position:relative; min-height:218px; padding:22px; text-align:left; cursor:pointer; border:3px solid var(--ink); border-radius:26px 18px 30px 20px; box-shadow:7px 8px 0 var(--shadow); transition:transform .18s var(--ease), box-shadow .18s var(--ease); }
.route-card:before { content:""; position:absolute; inset:7px -6px -6px 7px; border:2px solid rgba(30,30,30,.35); border-radius:20px 28px 20px 30px; pointer-events:none; }
.route-card.clash { background:var(--teal); transform:rotate(-.7deg); }
.route-card.b64 { background:var(--yellow); transform:rotate(.8deg); }
.route-card:hover { transform:translateY(-5px) rotate(0deg); box-shadow:10px 12px 0 var(--shadow); }
.route-card:focus-visible { outline:4px solid var(--orange); outline-offset:4px; }
.route-tag { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; }
.route-tag span { color:var(--muted); font-size:15px; letter-spacing:.12em; }
.route-tag b { font-size:38px; line-height:.85; }
.route-head { margin-top:18px; display:flex; align-items:center; gap:14px; }
.route-icon { width:58px; height:58px; display:grid; place-items:center; border:3px solid var(--ink); border-radius:20px 16px 23px 17px; background:rgba(255,255,255,.45); font-size:30px; }
.route-card h2 { font-size:31px; line-height:1; }
.route-card .hint { margin-top:5px; color:#555; font-family:'Noto Sans SC', sans-serif; font-size:13px; }
.route-line { position:relative; margin:18px 0 15px; padding:10px 12px; border:2px dashed var(--ink); border-radius:14px 17px 13px 16px; background:rgba(255,255,255,.45); color:#555; font-family:'Noto Sans SC', sans-serif; font-size:12px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.route-line:before { content:"PRIVATE"; position:absolute; right:10px; top:-9px; padding:0 5px; background:inherit; color:var(--muted); font-family:Kalam, sans-serif; font-size:11px; font-weight:700; }
.route-actions { display:flex; gap:10px; }
.action-btn { min-height:40px; display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:7px 14px; border:3px solid var(--ink); border-radius:999px 850px 999px 820px; background:var(--paper); color:var(--ink); cursor:pointer; font-size:17px; box-shadow:3px 4px 0 var(--shadow); transition:transform .16s var(--ease), box-shadow .16s var(--ease), background .16s var(--ease); }
.action-btn.primary { flex:1; background:#fff; }
.action-btn:hover { transform:translateY(-2px); box-shadow:5px 6px 0 var(--shadow); }
.action-btn:active { transform:translateY(2px); box-shadow:1px 2px 0 var(--shadow); }
.action-btn:focus-visible { outline:4px solid var(--blue); outline-offset:3px; }

.node-board { position:relative; padding:20px; border:3px solid var(--ink); border-radius:24px 18px 30px 20px; background:rgba(255,255,255,.46); box-shadow:7px 8px 0 var(--shadow); }
.node-board:before { content:""; position:absolute; inset:10px; pointer-events:none; opacity:.20; background:repeating-linear-gradient(0deg, transparent 0 27px, #1e1e1e 28px 29px); }
.node-top { position:relative; display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin-bottom:14px; }
.node-title { display:flex; align-items:center; gap:10px; font-size:24px; }
.node-title .pin { width:38px; height:38px; display:grid; place-items:center; border:3px solid var(--ink); border-radius:50% 46% 50% 44%; background:var(--red); transform:rotate(-7deg); }
.node-sub { color:var(--muted); font-family:'Noto Sans SC', sans-serif; font-size:12px; text-align:right; }
.node-list { position:relative; display:grid; gap:12px; }
.node-row { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:13px; min-height:76px; padding:12px 14px 12px 11px; border:3px solid var(--ink); border-radius:20px 16px 23px 17px; background:var(--paper); box-shadow:3px 4px 0 var(--shadow); transition:transform .18s var(--ease); }
.node-row:nth-child(3n+1) { transform:rotate(-.45deg); }
.node-row:nth-child(3n+2) { transform:rotate(.35deg); }
.node-row:nth-child(3n) { transform:rotate(-.15deg); }
.node-row:hover { transform:translateX(5px) rotate(0deg); }
.node-mark { width:48px; height:48px; display:grid; place-items:center; border:3px solid var(--ink); color:var(--ink); border-radius:50% 46% 50% 43%; background:var(--node-color,#a5d8ff); font-size:21px; }
.node-mark .flag-svg { width:31px; height:22px; display:block; border:1px solid rgba(30,30,30,.45); border-radius:4px; background:#fff; overflow:hidden; }
.node-mark .flag-svg svg { width:100%; height:100%; display:block; }
.node-main { min-width:0; }
.node-name { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; color:var(--ink); font-size:18px; }
.node-meta { margin-top:2px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; color:var(--muted); font-family:'Noto Sans SC', sans-serif; font-size:11px; }
.node-detail { margin-top:7px; display:flex; flex-wrap:wrap; gap:6px; }
.detail-pill { padding:3px 8px; border:2px solid var(--ink); border-radius:999px; background:var(--blue); color:var(--ink); font-size:12px; line-height:1; }
.node-badges { display:flex; justify-content:flex-end; align-items:center; flex-wrap:wrap; gap:6px; }
.proto { padding:4px 9px; border:2px solid var(--ink); border-radius:999px; background:var(--green); color:var(--ink); font-size:12px; letter-spacing:.04em; }
.empty { padding:30px 16px; border:3px dashed var(--ink); border-radius:18px; color:var(--muted); text-align:center; background:rgba(255,255,255,.5); font-family:'Noto Sans SC', sans-serif; }

.arrow { position:absolute; pointer-events:none; color:var(--ink); opacity:.82; }
.arrow.a1 { right:30px; top:238px; width:210px; height:96px; transform:rotate(3deg); }
.arrow.a2 { left:34px; bottom:38px; width:160px; height:74px; transform:rotate(-5deg); }

.modal { display:none; position:fixed; inset:0; z-index:20; align-items:center; justify-content:center; padding:20px; background:rgba(30,30,30,.28); backdrop-filter:blur(4px); }
.modal.on { display:flex; }
.modal-card { width:min(410px,100%); position:relative; padding:38px 24px 24px; text-align:center; border:3px solid var(--ink); border-radius:28px 21px 30px 24px; background:var(--paper); box-shadow:8px 10px 0 var(--shadow); animation:pop .22s var(--ease); }
.modal-card .tape { left:50%; top:-13px; transform:translateX(-50%) rotate(-4deg); }
.modal-card h3 { font-size:29px; }
.modal-card p { margin:6px 0 16px; color:var(--muted); font-family:'Noto Sans SC', sans-serif; font-size:12px; }
.qr-frame { width:224px; height:224px; margin:0 auto 16px; padding:12px; display:grid; place-items:center; border:3px solid var(--ink); border-radius:20px 18px 23px 17px; background:#fff; box-shadow:4px 5px 0 var(--shadow); }
.qr-frame img { width:100%; height:100%; display:block; border-radius:6px; }
.modal-link { max-height:45px; overflow:auto; padding:9px 11px; border:2px dashed var(--ink); border-radius:12px; background:rgba(165,216,255,.24); color:var(--muted); font-family:'Noto Sans SC', sans-serif; font-size:11px; line-height:1.45; word-break:break-all; text-align:left; }
.modal-actions { display:flex; gap:10px; margin-top:16px; }
.modal-actions .action-btn { flex:1; }
#toast { position:fixed; left:50%; bottom:28px; z-index:30; padding:10px 17px; border:3px solid var(--ink); border-radius:999px; background:var(--green); box-shadow:5px 6px 0 var(--shadow); color:var(--ink); font-size:18px; opacity:0; transform:translate(-50%,110px) rotate(-1deg); transition:opacity .22s var(--ease),transform .22s var(--ease); pointer-events:none; }
#toast.on { opacity:1; transform:translate(-50%,0) rotate(-1deg); }
@keyframes pop { from { opacity:0; transform:translateY(9px) scale(.96); } to { opacity:1; transform:none; } }
@media (max-width: 820px) {
  .whiteboard { width:min(100% - 18px, 760px); margin-top:18px; padding:18px; }
  .topbar { flex-wrap:wrap; }
  .logout-btn { margin-left:auto; }
  .hero { grid-template-columns:1fr; }
  .hero-copy { padding:22px 18px; }
  .hero-stats { grid-template-columns:repeat(3,1fr); }
  .route-grid { grid-template-columns:1fr; }
  .arrow { display:none; }
}
@media (max-width: 520px) {
  h1 { font-size:44px; }
  .brand-text b { font-size:21px; }
  .hero-stats { gap:8px; }
  .stat { min-height:82px; }
  .stat b { font-size:26px; }
  .section-title { font-size:20px; margin-left:0; }
  .route-card { padding:18px 14px; }
  .route-card h2 { font-size:27px; }
  .node-board { padding:14px; }
  .node-row { grid-template-columns:auto minmax(0,1fr); }
  .node-badges { grid-column:2; justify-content:flex-start; }
  .node-top { align-items:flex-start; } .node-sub { display:none; }
}
</style>
</head>
<body>
<main class="whiteboard">
  <span class="tape t1"></span><span class="tape t2"></span><span class="tape t3"></span>
  <svg class="arrow a1" viewBox="0 0 220 100" aria-hidden="true"><path d="M12 72C55 14 125 8 190 45" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M190 45l-24 2 13-21" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
  <svg class="arrow a2" viewBox="0 0 170 80" aria-hidden="true"><path d="M12 36c42 32 82 31 135 2" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M147 38l-20-1 9 17" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>

  <div class="topbar">
    <div class="brand"><div class="brand-mark">✎</div><div class="brand-text"><small>EXCALIDRAW SUB</small><b>订阅白板</b></div></div>
    <a class="logout-btn" href="/logout" title="退出登录">退出</a>
  </div>

  <header class="hero">
    <section class="hero-copy">
      <span class="kicker">hand drawn dashboard</span>
      <h1>订阅白板</h1>
      <p>{{SUB_NAME}} · 完全白板化的 Excalidraw 风格面板：手绘黑线、便签色块、虚线标注和草图节点卡。订阅地址默认隐藏，只保留复制和二维码。</p>
    </section>
    <section class="hero-stats" aria-label="订阅统计">
      <div class="stat"><b>{{COUNT}}</b><span>节点</span></div>
      <div class="stat"><b>02</b><span>导出</span></div>
      <div class="stat"><b>QR</b><span>扫码</span></div>
    </section>
  </header>

  <section class="section">
    <h2 class="section-title"><span class="dot"></span>导出路线</h2>
    <div class="route-grid">
      <article class="route-card clash" role="button" tabindex="0" onclick="cp('clash')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();cp('clash')}">
        <div class="route-tag"><span>ROUTE</span><b>01</b></div>
        <div class="route-head"><div class="route-icon">C</div><div><h2>Clash / Meta</h2><p class="hint">桌面与规则客户端</p></div></div>
        <div class="route-line" id="u-clash">订阅链接已隐藏，点击复制或扫码使用</div>
        <div class="route-actions">
          <button class="action-btn primary" type="button" onclick="event.stopPropagation();cp('clash')">复制路线</button>
          <button class="action-btn" type="button" onclick="event.stopPropagation();qrKey('clash','Clash / Meta')" aria-label="打开 Clash 二维码">QR</button>
        </div>
      </article>
      <article class="route-card b64" role="button" tabindex="0" onclick="cp('b64')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();cp('b64')}">
        <div class="route-tag"><span>ROUTE</span><b>02</b></div>
        <div class="route-head"><div class="route-icon">B</div><div><h2>Base64</h2><p class="hint">通用 / 移动端客户端</p></div></div>
        <div class="route-line" id="u-b64">订阅链接已隐藏，点击复制或扫码使用</div>
        <div class="route-actions">
          <button class="action-btn primary" type="button" onclick="event.stopPropagation();cp('b64')">复制路线</button>
          <button class="action-btn" type="button" onclick="event.stopPropagation();qrKey('b64','Base64')" aria-label="打开 Base64 二维码">QR</button>
        </div>
      </article>
    </div>
  </section>

  <section class="section">
    <h2 class="section-title"><span class="dot"></span>节点草图</h2>
    <div class="node-board">
      <div class="node-top">
        <div class="node-title"><span class="pin">⌖</span><span>节点航线簿</span></div>
        <div class="node-sub">只展示协议、REALITY/TLS、传输层；地址端口隐藏</div>
      </div>
      <div class="node-list" id="nodeList"><div class="empty">正在绘制节点草图……</div></div>
    </div>
  </section>
</main>

<div class="modal" id="qrModal" role="dialog" aria-modal="true" aria-labelledby="qrTitle">
  <div class="modal-card">
    <span class="tape"></span>
    <h3 id="qrTitle">路线二维码</h3>
    <p>打开客户端扫一扫，就能导入这条路线。</p>
    <div class="qr-frame"><img id="qrImg" src="" alt="二维码"></div>
    <div class="modal-link" id="qrLink">订阅链接已隐藏，可直接扫码或复制。</div>
    <div class="modal-actions">
      <button class="action-btn primary" type="button" onclick="copyModalLink()">复制链接</button>
      <button class="action-btn" type="button" onclick="cq()">关闭</button>
    </div>
  </div>
</div>
<div id="toast" role="status" aria-live="polite">已复制到剪贴板</div>

<script>
var proxies = [];
var routeLinks = __ROUTE_LINKS__;
function esc(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, function(c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[c];
  });
}
function protocolColor(type) {
  var t = String(type || "").toLowerCase();
  if (t.indexOf("vless") >= 0) return "#b2f2bb";
  if (t.indexOf("trojan") >= 0) return "#ffd8a8";
  if (t.indexOf("hysteria") >= 0 || t.indexOf("hy2") >= 0) return "#a5d8ff";
  if (t.indexOf("tuic") >= 0) return "#d0bfff";
  if (t.indexOf("ss") >= 0) return "#fff3bf";
  return "#c3fae8";
}
function flagIcon(code, label) {
  var flags = {
    gb: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#012169"/><path d="M0 0l60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" stroke-width="4"/><path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="13"/><path d="M30 0v40M0 20h60" stroke="#C8102E" stroke-width="8"/></svg>',
    ng: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="40" fill="#008751"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#008751"/></svg>',
    sg: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="20" fill="#EF3340"/><rect y="20" width="60" height="20" fill="#fff"/><circle cx="16" cy="10" r="7" fill="#fff"/><circle cx="19" cy="10" r="6" fill="#EF3340"/><g fill="#fff"><circle cx="27" cy="5" r="1.4"/><circle cx="31" cy="8" r="1.4"/><circle cx="29.5" cy="13" r="1.4"/><circle cx="24.5" cy="13" r="1.4"/><circle cx="23" cy="8" r="1.4"/></g></svg>',
    us: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#fff"/><g fill="#B22234"><rect y="0" width="60" height="3.08"/><rect y="6.15" width="60" height="3.08"/><rect y="12.31" width="60" height="3.08"/><rect y="18.46" width="60" height="3.08"/><rect y="24.62" width="60" height="3.08"/><rect y="30.77" width="60" height="3.08"/><rect y="36.92" width="60" height="3.08"/></g><rect width="24" height="21.54" fill="#3C3B6E"/></svg>',
    hk: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#DE2910"/><g fill="#fff" transform="translate(30 20)"><ellipse rx="3" ry="8" transform="rotate(0) translate(0 -8)"/><ellipse rx="3" ry="8" transform="rotate(72) translate(0 -8)"/><ellipse rx="3" ry="8" transform="rotate(144) translate(0 -8)"/><ellipse rx="3" ry="8" transform="rotate(216) translate(0 -8)"/><ellipse rx="3" ry="8" transform="rotate(288) translate(0 -8)"/></g></svg>',
    tw: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#FE0000"/><rect width="30" height="20" fill="#000095"/><circle cx="15" cy="10" r="6" fill="#fff"/></svg>',
    jp: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#fff"/><circle cx="30" cy="20" r="11" fill="#BC002D"/></svg>'
  };
  return '<span class="flag-svg" role="img" aria-label="' + esc(label || code.toUpperCase()) + '" title="' + esc(label || code.toUpperCase()) + '">' + (flags[code] || '') + '</span>';
}
function regionIcon(name, server) {
  var text = String((name || "") + " " + (server || "")).toLowerCase();
  if (text.indexOf("🇬🇧") >= 0) return flagIcon("gb", "英国");
  if (text.indexOf("🇳🇬") >= 0) return flagIcon("ng", "尼日利亚");
  if (text.indexOf("🇺🇸") >= 0) return flagIcon("us", "美国");
  if (text.indexOf("🇸🇬") >= 0) return flagIcon("sg", "新加坡");
  if (text.indexOf("🇭🇰") >= 0) return flagIcon("hk", "香港");
  if (text.indexOf("🇹🇼") >= 0) return flagIcon("tw", "台湾");
  if (text.indexOf("🇯🇵") >= 0) return flagIcon("jp", "日本");
  if (/\b(uk|gb|london|united[ -]*kingdom|great[ -]*britain)\b|英国|英國|倫敦|伦敦/.test(text)) return flagIcon("gb", "英国");
  if (/\b(ng|nigeria|lagos|abuja)\b|尼日利亚|尼日利亞|奈及利亚|奈及利亞/.test(text)) return flagIcon("ng", "尼日利亚");
  if (/\b(hk|hong[ -]*kong)\b|香港|港/.test(text)) return flagIcon("hk", "香港");
  if (/\b(tw|taiwan)\b|台湾|臺灣/.test(text)) return flagIcon("tw", "台湾");
  if (/\b(sg|singapore)\b|新加坡|狮城/.test(text)) return flagIcon("sg", "新加坡");
  if (/\b(jp|japan|tokyo|osaka)\b|日本|东京|東京|大阪|软银|iij/.test(text)) return flagIcon("jp", "日本");
  if (/\b(us|usa|united[ -]*states|los[ -]*angeles|new[ -]*york|seattle|san[ -]*jose|dallas|atlanta)\b|美国|美國|洛杉矶|洛杉磯|硅谷|纽约|紐約|西雅图|西雅圖|圣何塞|聖何塞|达拉斯|達拉斯|堪萨斯|堪薩斯/.test(text)) return flagIcon("us", "美国");
  return "";
}
function nodeIcon(name, server, type) {
  var flag = regionIcon(name, server);
  if (flag) return flag;
  var t = String(type || "").toLowerCase();
  if (t.indexOf("vless") >= 0) return "V";
  if (t.indexOf("trojan") >= 0) return "T";
  if (t.indexOf("hysteria") >= 0 || t.indexOf("hy2") >= 0) return "H";
  if (t.indexOf("tuic") >= 0) return "U";
  if (t.indexOf("ss") >= 0) return "S";
  return "N";
}
function displayName(name) {
  var clean = String(name || "未命名节点")
    .replace(/[🇦-🇿]{2}/gu, "")
    .replace(/^\s*[-|｜·•:：_]+\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  var relay = clean.match(/^(.+?)[-—–_\s]*(中转|中轉|前置|反连|反連)[-—–_\s]*(.+)$/);
  if (relay && relay[1] && relay[3]) {
    clean = relay[3].trim() + "出口（" + relay[1].trim() + relay[2] + "）";
  }
  return clean || "未命名节点";
}
function detailPill(text) { return '<span class="detail-pill">' + esc(text) + '</span>'; }
function vlessDetails(n) {
  var parts = ["VLESS"];
  if (n && n["reality-opts"]) parts.push("REALITY");
  else if (n && n.tls) parts.push("TLS");
  var network = String(n && n.network || "tcp").toUpperCase();
  parts.push(network);
  if (n && n.flow) parts.push(String(n.flow).replace(/^xtls-rprx-/, ""));
  return parts.slice(0, 4).map(detailPill).join("");
}
function nodeDetails(n) {
  var type = String(n && n.type || "").toLowerCase();
  if (type === "vless") return vlessDetails(n);
  if (type === "trojan") return detailPill("Trojan") + (n && n.sni ? detailPill("SNI " + n.sni) : "");
  if (type === "hysteria2") return detailPill("Hysteria2") + (n && n.sni ? detailPill("SNI " + n.sni) : "");
  return detailPill(type || "Proxy");
}
function renderNodes() {
  var el = document.getElementById("nodeList");
  if (!el) return;
  if (!Array.isArray(proxies) || !proxies.length) {
    el.innerHTML = '<div class="empty">这张白板暂时还是空的。</div>';
    return;
  }
  el.innerHTML = proxies.map(function(n) {
    var name = esc(displayName(n && n.name));
    var type = esc(n && n.type || "Unknown");
    var color = protocolColor(n && n.type || "");
    var icon = nodeIcon(n && n.name || "", "", n && n.type || "");
    var details = nodeDetails(n || {});
    return '<div class="node-row">' +
      '<div class="node-mark" style="--node-color:' + color + '">' + icon + '</div>' +
      '<div class="node-main"><div class="node-name">' + name + '</div><div class="node-meta">连接地址与端口已隐藏</div><div class="node-detail">' + details + '</div></div>' +
      '<div class="node-badges"><span class="proto">' + type + '</span></div>' +
      '</div>';
  }).join("");
}
function copyText(text, successText) {
  function done() { t(successText || "已复制到剪贴板"); }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(function(){ fallbackCopy(text, done); });
  } else {
    fallbackCopy(text, done);
  }
}
function fallbackCopy(text, done) {
  var ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; ta.style.pointerEvents = "none";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); } catch (e) {}
  document.body.removeChild(ta); done();
}
function cp(k) { copyText(routeLinks[k] || "", "路线链接已复制"); }
function qrKey(k, name) { qr(routeLinks[k] || "", name); }
function qr(url, name) {
  document.getElementById("qrTitle").textContent = name + " 路线二维码";
  document.getElementById("qrImg").src = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(url);
  document.getElementById("qrLink").textContent = "订阅链接已隐藏，可直接扫码或复制。";
  document.getElementById("qrLink").dataset.url = url;
  document.getElementById("qrModal").classList.add("on");
}
function copyModalLink() { copyText(document.getElementById("qrLink").dataset.url || "", "二维码链接已复制"); }
function cq() { document.getElementById("qrModal").classList.remove("on"); }
document.getElementById("qrModal").addEventListener("click", function(e) { if (e.target === this) cq(); });
document.addEventListener("keydown", function(e) { if (e.key === "Escape") cq(); });
function t(message) {
  var el = document.getElementById("toast");
  el.textContent = message; el.classList.add("on");
  clearTimeout(el._timer); el._timer = setTimeout(function(){ el.classList.remove("on"); }, 2300);
}
renderNodes();
</script>
</body>
</html>`;

  html = html.replace(/\{\{SUB_NAME\}\}/g, config.subName);
  html = html.replace(/\{\{COUNT\}\}/g, proxies.length);
  html = html.replace('__ROUTE_LINKS__', JSON.stringify(links));

  const panelProxies = proxies.map((p) => ({
    name: p.name,
    type: p.type,
    network: p.network,
    tls: p.tls,
    flow: p.flow,
    'reality-opts': p['reality-opts'] ? {} : undefined,
    'xhttp-opts': p['xhttp-opts'] ? {} : undefined,
    'grpc-opts': p['grpc-opts'] ? {} : undefined,
    'ws-opts': p['ws-opts'] ? {} : undefined,
  }));
  html = html.replace('var proxies = [];', 'var proxies = ' + JSON.stringify(panelProxies) + ';');

  return html;
}
