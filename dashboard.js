// Dashboard HTML renderer — Excalidraw sketch theme
// =================================================

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
<meta name="theme-color" content="#101820">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect x='14' y='22' width='72' height='56' rx='10' fill='%23fff3bf' stroke='%231e1e1e' stroke-width='6'/%3E%3Cpath d='M29 42h42M29 56h28' stroke='%231e1e1e' stroke-width='6' stroke-linecap='round'/%3E%3C/svg%3E">
<title>订阅小岛 · Sketch Board</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Noto+Sans+SC:wght@500;700;900&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --ink: #f8f9fa;
  --ink-soft: #c9d4df;
  --muted: #91a4b7;
  --paper: #101820;
  --paper-2: #0b1220;
  --panel: rgba(17, 30, 47, .86);
  --panel-2: rgba(12, 22, 36, .92);
  --cyan: #76e4ff;
  --mint: #89f7c8;
  --yellow: #fff3bf;
  --orange: #ffd8a8;
  --purple: #d0bfff;
  --red: #ffc9c9;
  --blue: #a5d8ff;
  --shadow: rgba(0, 0, 0, .28);
  --ease: cubic-bezier(.25,.8,.25,1);
}
html { min-height: 100%; background: var(--paper-2); }
body {
  min-height: 100vh;
  overflow-x: hidden;
  color: var(--ink);
  font-family: Nunito, 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  font-weight: 700;
  letter-spacing: .01em;
  background:
    radial-gradient(circle at 14% 18%, rgba(118, 228, 255, .17) 0 2px, transparent 3px) 0 0 / 54px 54px,
    radial-gradient(circle at 80% 8%, rgba(137, 247, 200, .18), transparent 30%),
    radial-gradient(circle at 12% 82%, rgba(255, 243, 191, .12), transparent 28%),
    linear-gradient(180deg, #0b1220 0%, #101820 54%, #07111f 100%);
}
button { font: inherit; }
button, .route-card, .node-row { -webkit-tap-highlight-color: transparent; }

/* Excalidraw-like sketch primitives */
.sketch {
  position: relative;
  border: 2px solid currentColor;
  border-radius: 24px 19px 26px 20px;
  box-shadow: 0 10px 28px var(--shadow);
}
.sketch::before {
  content: "";
  position: absolute;
  inset: 4px -5px -5px 5px;
  border: 1.8px solid currentColor;
  border-radius: 21px 25px 19px 27px;
  opacity: .23;
  pointer-events: none;
}
.tape {
  position: absolute;
  width: 74px;
  height: 19px;
  background: rgba(255, 243, 191, .78);
  border: 1px solid rgba(255, 243, 191, .55);
  box-shadow: 0 2px 6px rgba(0,0,0,.12);
  transform: rotate(-8deg);
}

.scene { position: fixed; inset: 0; pointer-events: none; z-index: -1; overflow: hidden; }
.grid {
  position: absolute; inset: 0; opacity: .28;
  background-image:
    linear-gradient(rgba(165,216,255,.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(165,216,255,.16) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: radial-gradient(circle at 50% 26%, black, transparent 78%);
}
.doodle { position:absolute; color: var(--cyan); opacity:.68; filter: drop-shadow(0 0 12px rgba(118,228,255,.18)); }
.doodle.one { left: 4%; top: 110px; width: 170px; height: 110px; transform: rotate(-8deg); }
.doodle.two { right: 4%; top: 82px; width: 170px; height: 120px; transform: rotate(9deg); color: var(--mint); }
.doodle.three { right: 9%; bottom: 90px; width: 210px; height: 105px; color: var(--yellow); opacity: .46; }

.shell { width: min(100% - 32px, 1080px); margin: 0 auto; padding: 36px 0 90px; position: relative; }
.corner-note { display:inline-flex; gap:9px; align-items:center; color: var(--mint); font-size: 12px; font-weight: 900; letter-spacing:.16em; transform: rotate(-2deg); }
.corner-note .scribble { width:34px; height:20px; border:2px solid var(--mint); border-radius: 50% 46% 52% 44%; position:relative; }
.corner-note .scribble:after { content:""; position:absolute; left:6px; right:5px; top:8px; border-top:2px solid var(--mint); transform: rotate(-7deg); }
.status-ticket {
  position:absolute; right:0; top:28px; min-width: 178px; padding: 11px 16px;
  color: var(--mint); background: rgba(9, 20, 32, .74); text-align:center; font-size:12px; font-weight:900;
  transform: rotate(2.2deg);
}
.status-ticket b { display:block; color: var(--ink); font-size:13px; letter-spacing:.09em; }
.status-ticket::after { content:""; position:absolute; inset:auto 18px -9px auto; width:38px; border-top:2px dashed currentColor; transform:rotate(-6deg); opacity:.65; }
.logout-btn { position:absolute; right:0; top:92px; z-index:10; display:flex; align-items:center; justify-content:center; gap:6px; width:92px; min-height:44px; padding:0 16px; border:2px solid var(--orange); border-radius:999px 860px 999px 820px; background:rgba(9,20,32,.82); color:var(--orange); text-decoration:none; font-size:13px; font-weight:900; line-height:1; box-shadow:0 8px 20px rgba(0,0,0,.22); transform:rotate(-2deg); transition:transform .16s var(--ease), background .16s var(--ease); pointer-events:auto; cursor:pointer; user-select:none; touch-action:manipulation; }
.logout-btn:before { content:""; position:absolute; inset:-10px; border-radius:999px; }
.logout-btn:hover { background:rgba(255,216,168,.10); transform:translateY(-1px) rotate(-2deg); }
.logout-btn:active { transform:translateY(2px) rotate(-2deg); }
.logout-btn:focus-visible { outline:3px solid var(--yellow); outline-offset:2px; }

.hero { position: relative; z-index: 1; padding: 46px 0 28px; }
.hero-board {
  color: var(--cyan); background: linear-gradient(135deg, rgba(13, 32, 51, .92), rgba(10, 19, 31, .88));
  padding: 30px clamp(20px, 5vw, 56px); overflow: hidden;
}
.hero-board .tape.a { left: 54px; top: -9px; }
.hero-board .tape.b { right: 72px; top: -7px; transform: rotate(7deg); }
.hero-kicker { color: var(--mint); font-size: 13px; font-weight: 900; letter-spacing: .22em; text-transform: uppercase; }
.hero h1 { margin-top: 9px; font-size: clamp(34px, 7vw, 68px); line-height: .98; color: var(--ink); font-weight: 900; letter-spacing: .04em; text-shadow: 0 4px 0 rgba(118,228,255,.14); }
.hero p { margin-top: 13px; max-width: 650px; color: var(--ink-soft); font-size: clamp(15px, 2vw, 18px); line-height: 1.65; }
.hero-line { position:absolute; right: 34px; bottom: 26px; width: 210px; height: 64px; color: var(--yellow); opacity:.82; }
.hero-sub { display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; }
.chip { min-height:34px; padding:7px 13px; display:inline-flex; align-items:center; gap:8px; border:2px solid currentColor; border-radius: 999px 860px 999px 820px; background: rgba(255,255,255,.035); color: var(--ink-soft); font-size:12px; font-weight:900; }
.chip .dot { width:8px; height:8px; background: var(--mint); border-radius:50%; box-shadow:0 0 0 4px rgba(137,247,200,.12); }

.board { position:relative; z-index:1; margin-top:24px; padding:26px; color: rgba(165,216,255,.88); background: rgba(6, 17, 31, .45); border-radius: 30px; }
.section { position:relative; padding: 30px 0 10px; }
.section + .section { margin-top: 18px; padding-top: 38px; border-top: 2px dashed rgba(165,216,255,.22); }
.ribbon {
  position:absolute; left:22px; top:0; transform: translateY(-50%) rotate(-1.4deg);
  padding: 8px 17px; color: var(--paper-2); background: var(--yellow); border:2px solid #1e1e1e;
  border-radius: 11px 8px 13px 9px; font-size:13px; font-weight:900; letter-spacing:.08em;
  box-shadow: 4px 5px 0 rgba(0,0,0,.18);
}
.route-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; padding-top:10px; }
.route-card {
  min-height: 224px; overflow:hidden; text-align:left; padding:22px 20px 20px; cursor:pointer;
  background: var(--panel); color: var(--cyan); transition: transform .24s var(--ease), box-shadow .24s var(--ease), background .24s var(--ease);
}
.route-card:hover { transform: translateY(-5px) rotate(-.25deg); box-shadow: 0 16px 34px rgba(0,0,0,.32), 0 0 0 1px rgba(118,228,255,.18); }
.route-card:focus-visible { outline:3px solid var(--yellow); outline-offset:4px; }
.route-card.b64 { color: var(--orange); }
.route-card .route-tag { display:flex; justify-content:space-between; align-items:start; gap:16px; color: currentColor; }
.route-card .route-tag span { font-size:12px; letter-spacing:.16em; font-weight:900; }
.route-card .route-tag b { font-size:30px; line-height:.8; color: var(--ink); }
.route-card .route-head { margin-top:24px; display:flex; align-items:center; gap:14px; }
.route-icon { width:54px; height:54px; flex:0 0 54px; display:grid; place-items:center; border:2px solid currentColor; border-radius: 18px 16px 21px 15px; background: rgba(255,255,255,.04); font-size:24px; }
.route-card h2 { font-size:24px; line-height:1.05; color:var(--ink); font-weight:900; }
.route-card .hint { margin-top:4px; font-size:12px; color:var(--muted); font-weight:800; }
.route-line { position:relative; margin:17px 0 14px; padding:11px 13px; border:2px dashed rgba(255,255,255,.25); border-radius:14px; background:rgba(0,0,0,.16); font-size:12px; line-height:1.35; color:var(--ink-soft); overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.route-line:before { content:"PRIVATE"; position:absolute; right:10px; top:-9px; padding:0 5px; font-size:9px; font-weight:900; color:currentColor; background:var(--paper); letter-spacing:.09em; }
.route-actions { display:flex; gap:9px; }
.action-btn { height:39px; min-width:39px; display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:0 14px; border:2px solid currentColor; border-radius: 999px 860px 999px 820px; background: transparent; color: currentColor; cursor:pointer; font-size:12px; font-weight:900; line-height:1; transition:transform .16s var(--ease), background .16s var(--ease); }
.action-btn.primary { flex:1; background: rgba(118,228,255,.12); color: var(--cyan); }
.b64 .action-btn.primary { background: rgba(255,216,168,.12); color: var(--orange); }
.action-btn:hover { transform:translateY(-1px); background:rgba(255,255,255,.08); }
.action-btn:active { transform:translateY(2px); }
.action-btn:focus-visible { outline:3px solid var(--mint); outline-offset:2px; }

.summary-strip { display:grid; grid-template-columns:repeat(3,1fr); gap:13px; padding:11px 0 0; }
.summary-card { min-height:90px; display:flex; flex-direction:column; justify-content:center; align-items:center; color: var(--blue); background: rgba(17, 30, 47, .72); }
.summary-card:nth-child(2) { color: var(--mint); transform:rotate(-.8deg); } .summary-card:nth-child(3) { color: var(--yellow); transform:rotate(.9deg); }
.summary-card .big { font-size:32px; line-height:1; color:var(--ink); font-weight:900; }
.summary-card .small { margin-top:7px; color:currentColor; font-size:11px; font-weight:900; letter-spacing:.08em; }

.node-box { padding-top:34px; }
.node-top { display:flex; align-items:end; justify-content:space-between; gap:12px; margin:0 0 15px; }
.node-title { display:flex; align-items:center; gap:10px; font-size:20px; color: var(--ink); font-weight:900; }
.node-title .pin { width:34px; height:34px; display:grid; place-items:center; border:2px solid var(--mint); border-radius:13px 16px 12px 18px; color:var(--mint); transform:rotate(-5deg); }
.node-sub { font-size:12px; color:var(--muted); font-weight:800; text-align:right; }
.node-list { display:grid; gap:11px; }
.node-row { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:13px; min-height:76px; position:relative; padding:12px 14px 12px 11px; color: var(--blue); background: rgba(12, 22, 36, .82); border:2px solid rgba(165,216,255,.58); border-radius:19px 16px 21px 17px; transition:transform .2s var(--ease), background .2s var(--ease); }
.node-row:hover { transform:translateX(4px) rotate(.1deg); background:rgba(18,34,54,.92); }
.node-mark { width:45px; height:45px; display:grid; place-items:center; border:2px solid var(--node-color,#a5d8ff); color:var(--node-color,#a5d8ff); border-radius:50% 46% 50% 43%; background:rgba(255,255,255,.04); font-size:19px; transform:rotate(-8deg); }
.node-mark .flag-svg { width:30px; height:21px; display:block; border:1px solid rgba(255,255,255,.35); border-radius:4px; background:#fff; overflow:hidden; }
.node-mark .flag-svg svg { width:100%; height:100%; display:block; }
.node-main { min-width:0; }
.node-name { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; color:var(--ink); font-size:14px; font-weight:900; }
.node-meta { margin-top:4px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; color:var(--muted); font-size:11px; font-weight:800; }
.node-detail { margin-top:6px; display:flex; flex-wrap:wrap; gap:5px; }
.detail-pill { padding:3px 7px; border:1.5px solid rgba(165,216,255,.42); border-radius:999px; background:rgba(165,216,255,.08); color:var(--ink-soft); font-size:9px; font-weight:900; line-height:1; }
.node-badges { display:flex; justify-content:flex-end; align-items:center; flex-wrap:wrap; gap:6px; }
.proto { padding:4px 8px; border:1.5px solid rgba(137,247,200,.58); border-radius:999px; color:var(--mint); background:rgba(137,247,200,.08); font-size:9px; font-weight:900; letter-spacing:.04em; }
.empty { padding:29px 16px; border:2px dashed rgba(165,216,255,.35); border-radius:20px; color:var(--muted); text-align:center; font-size:13px; font-weight:800; background:rgba(255,255,255,.035); }

.modal { display:none; position:fixed; inset:0; z-index:20; align-items:center; justify-content:center; padding:20px; background:rgba(3,7,13,.62); backdrop-filter:blur(7px); }
.modal.on { display:flex; }
.modal-card { width:min(400px,100%); position:relative; padding:40px 28px 29px; text-align:center; color: var(--cyan); background: var(--panel-2); animation:pop .25s var(--ease); }
.modal-card .tape { left:50%; top:-10px; transform:translateX(-50%) rotate(-4deg); }
.modal-card h3 { font-size:22px; font-weight:900; color:var(--ink); }
.modal-card p { margin:6px 0 18px; color:var(--muted); font-size:12px; font-weight:800; }
.qr-frame { width:224px; height:224px; margin:0 auto 17px; padding:12px; display:grid; place-items:center; border:2px solid var(--cyan); border-radius:23px 20px 25px 19px; background:#fff; box-shadow:0 0 0 6px rgba(118,228,255,.08); }
.qr-frame img { width:100%; height:100%; display:block; border-radius:9px; }
.modal-link { max-height:45px; overflow:auto; padding:9px 11px; border:2px dashed rgba(165,216,255,.32); border-radius:13px; background:rgba(255,255,255,.04); color:var(--muted); font-size:11px; line-height:1.45; word-break:break-all; text-align:left; }
.modal-actions { display:flex; gap:10px; margin-top:17px; }
.modal-actions .action-btn { flex:1; }
#toast { position:fixed; left:50%; bottom:27px; z-index:30; padding:11px 17px; display:flex; align-items:center; gap:8px; border:2px solid var(--mint); border-radius:999px; background:rgba(9,20,32,.94); box-shadow:0 10px 26px rgba(0,0,0,.28); color:var(--mint); font-size:13px; font-weight:900; opacity:0; transform:translate(-50%,120px); transition:opacity .25s var(--ease),transform .25s var(--ease); pointer-events:none; }
#toast.on { opacity:1; transform:translate(-50%,0); }
@keyframes pop { from { opacity:0; transform:translateY(9px) scale(.96); } to { opacity:1; transform:none; } }
@media (max-width: 760px) {
  .shell { width:min(100% - 22px, 650px); padding-top:28px; }
  .status-ticket { position:relative; top:auto; right:auto; margin:14px 0 0 auto; width:max-content; }
  .logout-btn { position:relative; top:auto; right:auto; margin:0 2px 10px auto; width:92px; min-height:44px; }
  .hero { padding-top:28px; }
  .hero-board { padding:26px 20px; }
  .hero-line { display:none; }
  .board { padding:22px 15px; }
  .route-grid { grid-template-columns:1fr; gap:14px; }
  .route-card { min-height:0; }
  .summary-strip { gap:8px; }
  .summary-card { min-height:78px; } .summary-card .big { font-size:24px; }
  .doodle { opacity:.28; }
}
@media (max-width: 470px) {
  .shell { width:min(100% - 18px, 470px); }
  .hero h1 { font-size:36px; }
  .chip { font-size:11px; }
  .board { padding:20px 12px; }
  .route-card { padding:18px 14px 16px; border-width:2px; }
  .node-row { grid-template-columns:auto minmax(0,1fr); padding-right:9px; }
  .node-badges { grid-column:2; justify-content:flex-start; }
  .node-top { align-items:flex-start; } .node-sub { display:none; }
  .route-actions .action-btn { padding:0 10px; }
  .modal-card { padding:36px 18px 22px; }
}
</style>
</head>
<body>
<div class="scene" aria-hidden="true">
  <div class="grid"></div>
  <svg class="doodle one" viewBox="0 0 180 120"><path d="M18 74C31 28 83 16 118 38c28 18 31 55 7 67-33 17-98 2-107-31Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M48 69h74M57 88h43" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
  <svg class="doodle two" viewBox="0 0 180 120"><path d="M37 32h96v56H37z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M50 48h68M50 66h42M130 82l24 20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
  <svg class="doodle three" viewBox="0 0 220 120"><path d="M20 72c49-44 92-44 130 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M150 72l-17-3 11-13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
</div>

<main class="shell">
  <div class="corner-note"><span class="scribble"></span><span>EXCALIDRAW NET</span></div>
  <div class="status-ticket sketch"><b>● CONNECTED</b>Sketch board online</div>
  <a class="logout-btn" href="/logout" title="退出登录">退出</a>

  <header class="hero">
    <div class="hero-board sketch">
      <span class="tape a"></span><span class="tape b"></span>
      <div class="hero-kicker">SUBSCRIPTION MAP</div>
      <h1>订阅草图板</h1>
      <p>{{SUB_NAME}} · 用 Excalidraw 手绘面板重新整理节点、路线和二维码。链接默认隐藏，只保留复制与扫码入口。</p>
      <div class="hero-sub">
        <span class="chip"><i class="dot"></i><span>{{COUNT}} 个节点已入图</span></span>
        <span class="chip">Mihomo / Clash</span>
        <span class="chip">Base64 通用订阅</span>
      </div>
      <svg class="hero-line" viewBox="0 0 220 80"><path d="M8 50c49-49 102-49 174 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M182 50l-22-5 13-18" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
  </header>

  <section class="board sketch">
    <section class="section">
      <div class="ribbon">导出路线</div>
      <div class="route-grid">
        <article class="route-card clash sketch" role="button" tabindex="0" onclick="cp('clash')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();cp('clash')}">
          <div class="route-tag"><span>ROUTE</span><b>01</b></div>
          <div class="route-head"><div class="route-icon">C</div><div><h2>Clash / Meta</h2><p class="hint">桌面与规则客户端</p></div></div>
          <div class="route-line" id="u-clash">订阅链接已隐藏，点击复制或扫码使用</div>
          <div class="route-actions">
            <button class="action-btn primary" type="button" onclick="event.stopPropagation();cp('clash')">复制路线</button>
            <button class="action-btn" type="button" onclick="event.stopPropagation();qrKey('clash','Clash / Meta')" aria-label="打开 Clash 二维码">QR</button>
          </div>
        </article>
        <article class="route-card b64 sketch" role="button" tabindex="0" onclick="cp('b64')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();cp('b64')}">
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
      <div class="ribbon">统计便签</div>
      <div class="summary-strip">
        <div class="summary-card sketch"><div class="big">{{COUNT}}</div><div class="small">节点</div></div>
        <div class="summary-card sketch"><div class="big">02</div><div class="small">导出形式</div></div>
        <div class="summary-card sketch"><div class="big">24H</div><div class="small">随时取用</div></div>
      </div>
    </section>

    <section class="section node-box">
      <div class="ribbon">节点草图</div>
      <div class="node-top">
        <div class="node-title"><span class="pin">⌖</span><span>节点航线簿</span></div>
        <div class="node-sub">协议、REALITY/TLS、传输层只展示必要信息</div>
      </div>
      <div class="node-list" id="nodeList"><div class="empty">正在绘制节点草图……</div></div>
    </section>
  </section>
</main>

<div class="modal" id="qrModal" role="dialog" aria-modal="true" aria-labelledby="qrTitle">
  <div class="modal-card sketch">
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
  if (t.indexOf("vless") >= 0) return "#89f7c8";
  if (t.indexOf("trojan") >= 0) return "#ffd8a8";
  if (t.indexOf("hysteria") >= 0 || t.indexOf("hy2") >= 0) return "#76e4ff";
  if (t.indexOf("tuic") >= 0) return "#d0bfff";
  if (t.indexOf("ss") >= 0) return "#fff3bf";
  return "#a5d8ff";
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
function detailPill(text) {
  return '<span class="detail-pill">' + esc(text) + '</span>';
}
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
    el.innerHTML = '<div class="empty">这张草图暂时还是空的。</div>';
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
  html = html.replace(/\{\{CLASH_URL\}\}/g, links.clash);
  html = html.replace(/\{\{B64_URL\}\}/g, links.b64);
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
