// Dashboard HTML renderer — 订阅小岛 theme
// =========================================

// ==================== 管理面板（小岛主题 by GPT） ====================
export function renderDashboard(config, proxies, baseUrl) {
  const links = {
    clash: baseUrl + '/' + config.token + '?clash',
    b64: baseUrl + '/' + config.token + '?b64',
  };

  var html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#a9d9bd">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🏝️%3C/text%3E%3C/svg%3E">
<title>订阅小岛</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700;800;900&family=Noto+Sans+SC:wght@400;500;700;900&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --sky: #a9d9bd;
  --cream: #fffaf0;
  --paper: #f8f2dd;
  --brown: #795735;
  --brown-deep: #5d3e24;
  --brown-soft: #a3835d;
  --mint: #58c5ae;
  --yellow: #ffd267;
  --coral: #ed947c;
  --leaf: #62a95a;
  --white: #fffdf7;
  --ease: cubic-bezier(.25,.8,.25,1);
}
html { min-height: 100%; background: var(--sky); }
body {
  min-height: 100vh; overflow-x: hidden;
  color: var(--brown);
  font-family: Nunito, 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  font-weight: 600; letter-spacing: .01em;
  background:
    radial-gradient(circle at 18% 0%, rgba(255,255,255,.82) 0 9px, transparent 10px) 0 0 / 56px 56px,
    radial-gradient(circle at 58% 20%, rgba(255,255,255,.55) 0 5px, transparent 6px) 0 0 / 42px 42px,
    linear-gradient(180deg, #9dd5bd 0%, #bfe1c6 50%, #d7ebcc 100%);
}
button { font: inherit; }
button, .route-card, .node-row { -webkit-tap-highlight-color: transparent; }

.scene { position: fixed; inset: 0; pointer-events: none; z-index: -1; overflow: hidden; }
.cloud { position: absolute; background: rgba(255,255,255,.78); filter: drop-shadow(0 5px 0 rgba(89,149,115,.10)); border-radius: 999px; }
.cloud:before, .cloud:after { content: ""; position: absolute; background: inherit; border-radius: 50%; }
.cloud.one { width: 164px; height: 48px; top: 70px; left: 6%; animation: drift 20s ease-in-out infinite; }
.cloud.one:before { width: 76px; height: 76px; left: 24px; bottom: 15px; }
.cloud.one:after { width: 64px; height: 64px; right: 26px; bottom: 12px; }
.cloud.two { width: 116px; height: 35px; top: 160px; right: 8%; opacity: .75; animation: drift 24s -8s ease-in-out infinite; }
.cloud.two:before { width: 56px; height: 56px; left: 17px; bottom: 8px; }
.cloud.two:after { width: 50px; height: 50px; right: 18px; bottom: 8px; }
.sun { position: absolute; width: 74px; height: 74px; right: 14%; top: 56px; border-radius: 50%; background: #ffe499; box-shadow: 0 0 0 10px rgba(255,228,153,.30), 0 0 0 19px rgba(255,228,153,.12); transform: rotate(8deg); }
.wave { position: absolute; bottom: -2px; height: 135px; border-radius: 50% 50% 0 0; background: #8fc9b8; opacity: .92; }
.wave.one { left: -8%; width: 58%; transform: rotate(-2deg); }
.wave.two { right: -9%; width: 66%; height: 112px; bottom: -12px; background: #6fb4a4; transform: rotate(3deg); }
.grassline { position:absolute; bottom: 0; left: 0; right: 0; height: 86px; background: #8cbd69; border-radius: 48% 52% 0 0 / 25% 28% 0 0; }
.grassline:before { content: ""; position: absolute; inset: -14px 0 auto; height: 31px; background: radial-gradient(25px 17px at 18px 17px, #8cbd69 98%, transparent 100%) 0 0 / 53px 31px repeat-x; }
.tree { position:absolute; bottom: 52px; width: 84px; height: 154px; transform-origin: bottom center; }
.tree.left { left: 5.5%; transform: rotate(-7deg); }
.tree.right { right: 5%; transform: rotate(8deg) scale(.86); }
.tree .trunk { position:absolute; width: 22px; height: 96px; bottom: 0; left: 30px; border: 3px solid var(--brown); border-radius: 50% 50% 42% 42%; background: repeating-linear-gradient(90deg,#c48e58 0 7px,#dfac70 7px 13px); }
.tree .leaf { position: absolute; width: 58px; height: 58px; border: 3px solid #4a8447; background: #76bd6b; border-radius: 50% 45% 50% 45%; }
.tree .a { left: 0; top: 8px; transform: rotate(-15deg); } .tree .b { right: 0; top: 0; transform: rotate(18deg); } .tree .c { left: 14px; top: 40px; transform: rotate(3deg); }

.shell { width: min(100% - 32px, 1010px); margin: 0 auto; padding: 38px 0 118px; position: relative; }
.corner-note { position:absolute; top: 22px; left: -8px; display:flex; gap: 9px; align-items:center; color: var(--brown); font-size: 12px; font-weight:900; transform: rotate(-4deg); }
.corner-note .mini-leaf { width: 30px; height: 24px; border: 2px solid var(--brown); background: var(--leaf); border-radius: 46% 54% 42% 58%; transform: rotate(-16deg); position:relative; }
.corner-note .mini-leaf:after { content:""; position:absolute; width:2px; height:17px; left:13px; top:2px; background:rgba(255,255,255,.65); transform:rotate(36deg); border-radius:99px; }
.status-ticket { position: absolute; right: -10px; top: 24px; min-width: 166px; padding: 11px 17px 10px; border: 2px solid var(--brown); border-radius: 14px; background: #fff4bd; box-shadow: 0 4px 0 #c7a967; color: var(--brown-deep); text-align:center; transform: rotate(4deg); font-size: 12px; font-weight:900; }
.status-ticket:before, .status-ticket:after { content:""; position:absolute; width:11px; height:11px; background:var(--sky); border-radius:50%; top:50%; transform:translateY(-50%); }
.status-ticket:before { left:-7px; } .status-ticket:after { right:-7px; }
.status-ticket b { display:block; color:#639942; font-size:13px; letter-spacing:.06em; }

.hero { position: relative; z-index: 1; text-align: center; padding: 22px 12px 15px; }
.sign-wrap { display:inline-block; position:relative; padding: 10px 22px 16px; }
.sign-wrap:before, .sign-wrap:after { content:""; position:absolute; top:0; width:52px; height:14px; background:rgba(255,248,194,.88); border:1px solid rgba(171,136,77,.32); transform:rotate(-11deg); }
.sign-wrap:before { left: 3px; } .sign-wrap:after { right:3px; transform:rotate(11deg); }
.sign { position:relative; min-width: min(460px, calc(100vw - 76px)); padding: 24px 58px 20px; border: 4px solid var(--brown-deep); border-radius: 34px 38px 34px 39px; background: repeating-linear-gradient(5deg, transparent 0 13px, rgba(111,73,38,.09) 13px 15px), linear-gradient(135deg,#efc98e,#d99b5a); box-shadow: 0 8px 0 #a76c3d, inset 0 2px 0 rgba(255,246,214,.66); color: #fff9e9; }
.sign:before, .sign:after { content:""; position:absolute; width:14px; height:14px; top:14px; border:3px solid var(--brown-deep); border-radius:50%; background:#f6d79e; box-shadow: inset 0 1px rgba(255,255,255,.7); }
.sign:before { left:17px; } .sign:after { right:17px; }
.sign h1 { font-size:clamp(26px,4.1vw,38px); line-height:1.05; font-weight:900; letter-spacing:.06em; text-shadow: 0 3px 0 rgba(100,58,31,.38); }
.sign p { margin-top:6px; color:rgba(255,250,232,.93); font-size:14px; font-weight:700; }
.hero-sub { display:flex; justify-content:center; flex-wrap:wrap; gap:9px; margin-top:16px; }
.chip { min-height:32px; padding:6px 12px; display:inline-flex; align-items:center; gap:6px; border:2px solid rgba(107,77,43,.82); border-radius:999px; background:rgba(255,252,240,.88); color:var(--brown); font-size:12px; font-weight:900; box-shadow:0 2px 0 rgba(119,81,43,.42); }
.chip .dot { width:8px; height:8px; background:var(--leaf); border:1px solid #4b7c42; border-radius:50%; box-shadow:0 0 0 2px rgba(255,255,255,.7); }

.board { position:relative; z-index:1; margin-top:22px; padding:26px; border:4px solid var(--brown); border-radius:34px 30px 36px 28px; background: linear-gradient(90deg, rgba(186,154,99,.12) 1px, transparent 1px) 0 0/26px 26px, linear-gradient(rgba(186,154,99,.10) 1px, transparent 1px) 0 0/26px 26px, var(--paper); box-shadow: 0 12px 0 rgba(94,62,36,.30), 0 20px 32px rgba(79,73,47,.20), inset 0 0 0 4px rgba(255,255,255,.48); }
.board:before, .board:after { content:""; position:absolute; width:46px; height:16px; background:rgba(255,242,171,.82); border:1px solid rgba(154,109,51,.25); top:-10px; }
.board:before { left:15%; transform:rotate(-5deg); } .board:after { right:17%; transform:rotate(6deg); }

.section { position:relative; padding:23px 0 8px; }
.section + .section { margin-top:11px; padding-top:28px; border-top:2px dashed rgba(120,87,53,.38); }
.ribbon { position:absolute; left:50%; top:-1px; transform:translate(-50%,-48%) rotate(-2deg); min-width: 190px; padding: 9px 22px 8px; color:#fffaf0; text-align:center; font-size:14px; font-weight:900; letter-spacing:.06em; background:var(--mint); border:2px solid var(--mint-dark); border-radius:4px; text-shadow:0 1px 0 rgba(47,112,96,.36); box-shadow:0 3px 0 rgba(50,143,126,.44); }
.ribbon:before, .ribbon:after { content:""; position:absolute; top:0; width:15px; height:100%; background:#3c9c8b; z-index:-1; }
.ribbon:before { left:-12px; clip-path:polygon(100% 0, 100% 100%, 0 80%, 0 20%); } .ribbon:after { right:-12px; clip-path:polygon(0 0, 0 100%, 100% 80%, 100% 20%); }

.route-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:17px; padding-top:17px; }
.route-card { position:relative; min-height:218px; overflow:hidden; text-align:left; padding:20px 19px 18px; border:3px solid var(--brown); border-radius:25px 20px 26px 20px; color:var(--brown); background:var(--cream); transition:transform .24s var(--ease), box-shadow .24s var(--ease); cursor:pointer; }
.route-card:hover { transform: translateY(-4px) rotate(-.3deg); box-shadow:0 7px 0 rgba(103,72,43,.44),0 13px 24px rgba(100,78,43,.14); }
.route-card:focus-visible { outline:3px solid var(--yellow); outline-offset:3px; }
.route-card.clash { background:linear-gradient(135deg,#e9fbf4 0%,#f8f3da 100%); }
.route-card.b64 { background:linear-gradient(135deg,#fff0e4 0%,#fff9db 100%); }
.route-card .postmark { position:absolute; top:15px; right:17px; width:48px; height:48px; border:2px dashed rgba(108,73,45,.75); border-radius:50%; color:rgba(108,73,45,.82); display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:9px; line-height:1; font-weight:900; transform:rotate(12deg); }
.route-card .postmark b { font-size:15px; line-height:.9; }
.route-card .route-head { display:flex; align-items:center; gap:11px; padding-right:48px; }
.route-card .route-icon { width:48px; height:48px; flex:0 0 48px; display:grid; place-items:center; border:3px solid var(--brown); border-radius:18px 17px 20px 16px; font-size:24px; box-shadow:0 3px 0 rgba(110,76,45,.30); }
.clash .route-icon { background:#71cdb5; } .b64 .route-icon { background:#f5b67e; }
.route-card h2 { font-size:20px; line-height:1.05; font-weight:900; }
.route-card .hint { margin-top:3px; font-size:12px; color:var(--brown-soft); font-weight:800; }
.route-card .route-line { position:relative; margin:16px 0 13px; padding:10px 12px; border:2px dashed rgba(119,84,49,.43); border-radius:15px; background:rgba(255,255,255,.52); font-family:Nunito,"Noto Sans SC",sans-serif; font-size:12px; line-height:1.35; color:#886742; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.route-card .route-line:before { content:"URL"; position:absolute; left:11px; top:-10px; padding:0 5px; font-family:Nunito,sans-serif; font-size:9px; font-weight:900; color:var(--brown-soft); background:var(--paper); letter-spacing:.08em; }
.route-card .route-line.hidden-line { color:var(--brown-soft); font-weight:900; letter-spacing:.03em; }
.route-card .route-line.hidden-line:before { content:"PRIVATE"; }
.route-actions { display:flex; gap:9px; }
.action-btn { height:38px; min-width:38px; display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:0 13px; border:2px solid var(--brown); border-radius:999px; background:var(--white); color:var(--brown); cursor:pointer; font-size:12px; font-weight:900; line-height:1; box-shadow:0 4px 0 #bba887; transition:transform .16s var(--ease), box-shadow .16s var(--ease), background .16s var(--ease); }
.action-btn.primary { flex:1; background:var(--yellow); }
.action-btn:hover { transform:translateY(-1px); box-shadow:0 5px 0 #bba887; }
.action-btn:active { transform:translateY(3px); box-shadow:0 1px 0 #bba887; }
.action-btn:focus-visible { outline:3px solid var(--mint); outline-offset:2px; }

.summary-strip { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; padding:17px 0 2px; }
.summary-card { min-height:84px; position:relative; display:flex; flex-direction:column; justify-content:center; align-items:center; border:2px solid var(--brown); border-radius:19px 17px 20px 18px; background:#fffbe9; box-shadow:0 3px 0 rgba(120,83,47,.35); }
.summary-card:nth-child(2) { transform:rotate(-1deg); background:#eef8e8; } .summary-card:nth-child(3) { transform:rotate(1deg); background:#fff0e7; }
.summary-card .big { font-size:28px; line-height:1; color:var(--brown-deep); font-weight:900; }
.summary-card .small { margin-top:4px; color:var(--brown-soft); font-size:11px; font-weight:900; }

.node-box { padding-top:21px; }
.node-top { display:flex; align-items:end; justify-content:space-between; gap:12px; margin:0 0 13px; }
.node-title { display:flex; align-items:center; gap:9px; font-size:18px; font-weight:900; }
.node-title .pin { width:30px; height:30px; display:grid; place-items:center; border:2px solid var(--brown); border-radius:13px 14px 13px 10px; background:#f5d37a; transform:rotate(-5deg); font-size:16px; }
.node-sub { font-size:12px; color:var(--brown-soft); font-weight:800; text-align:right; }
.node-list { display:grid; gap:10px; }
.node-row { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:12px; min-height:70px; position:relative; padding:11px 13px 11px 10px; border:2px solid rgba(112,78,43,.74); border-radius:18px 17px 20px 16px; background:rgba(255,253,247,.83); transition:transform .2s var(--ease), background .2s var(--ease); }
.node-row:hover { transform:translateX(4px) rotate(.1deg); background:#fffdf7; }
.node-row:last-child { margin-bottom:0; }
.node-mark { width:43px; height:43px; display:grid; place-items:center; border:2px solid var(--brown); border-radius:50% 46% 50% 43%; background:var(--node-color,#b8d881); font-size:19px; transform:rotate(-9deg); box-shadow:0 2px 0 rgba(107,74,45,.30); }
.node-mark .flag-svg { width:29px; height:21px; display:block; border:1px solid rgba(93,62,36,.42); border-radius:4px; background:#fff; box-shadow:0 1px 0 rgba(255,255,255,.55),0 2px 3px rgba(75,51,31,.22); overflow:hidden; }
.node-mark .flag-svg svg { width:100%; height:100%; display:block; }
.node-main { min-width:0; }
.node-name { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; color:var(--brown-deep); font-size:14px; font-weight:900; }
.node-meta { margin-top:4px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; color:var(--brown-soft); font-size:11px; font-weight:800; }
.node-detail { margin-top:5px; display:flex; flex-wrap:wrap; gap:5px; }
.detail-pill { padding:3px 7px; border:1.5px solid rgba(105,74,44,.46); border-radius:999px; background:#fff7dc; color:var(--brown-deep); font-size:9px; font-weight:900; line-height:1; }
.node-badges { display:flex; justify-content:flex-end; align-items:center; flex-wrap:wrap; gap:6px; }
.proto { padding:4px 7px; border:1.5px solid rgba(105,74,44,.74); border-radius:999px; color:var(--brown-deep); background:#e9f6e9; font-size:9px; font-weight:900; letter-spacing:.04em; }
.port { padding:4px 7px; border:1.5px solid rgba(105,74,44,.58); border-radius:9px; background:#fff2c3; color:var(--brown); font-size:10px; font-weight:900; }
.empty { padding:27px 16px; border:2px dashed rgba(125,91,55,.45); border-radius:20px; color:var(--brown-soft); text-align:center; font-size:13px; font-weight:800; background:rgba(255,255,255,.35); }

.modal { display:none; position:fixed; inset:0; z-index:20; align-items:center; justify-content:center; padding:20px; background:rgba(54,78,61,.40); backdrop-filter:blur(5px); }
.modal.on { display:flex; }
.modal-card { width:min(390px,100%); position:relative; padding:39px 28px 29px; text-align:center; border:3px solid var(--brown); border-radius:34px 31px 38px 29px; background:var(--paper); box-shadow:0 10px 0 rgba(88,59,34,.44),0 25px 56px rgba(41,59,42,.29); animation:pop .25s var(--ease); }
.modal-card:before, .modal-card:after { content:""; position:absolute; width:54px; height:15px; top:-9px; background:rgba(255,244,177,.95); border:1px solid rgba(137,94,46,.24); }
.modal-card:before { left:55px; transform:rotate(-7deg); } .modal-card:after { right:55px; transform:rotate(7deg); }
.modal-card h3 { font-size:22px; font-weight:900; color:var(--brown-deep); }
.modal-card p { margin:5px 0 17px; color:var(--brown-soft); font-size:12px; font-weight:800; }
.qr-frame { width:224px; height:224px; margin:0 auto 17px; padding:12px; display:grid; place-items:center; border:3px solid var(--brown); border-radius:23px 20px 25px 19px; background:#fffef8; box-shadow:inset 0 0 0 5px #dfeccf,0 4px 0 rgba(111,74,43,.32); }
.qr-frame img { width:100%; height:100%; display:block; border-radius:9px; }
.modal-link { max-height:45px; overflow:auto; padding:9px 11px; border:2px dashed rgba(118,82,47,.42); border-radius:13px; background:rgba(255,255,255,.47); color:var(--brown-soft); font-size:11px; line-height:1.45; word-break:break-all; text-align:left; }
.modal-actions { display:flex; gap:10px; margin-top:17px; }
.modal-actions .action-btn { flex:1; }

#toast { position:fixed; left:50%; bottom:27px; z-index:30; padding:10px 17px; display:flex; align-items:center; gap:8px; border:2px solid var(--brown); border-radius:999px; background:#fffbe8; box-shadow:0 4px 0 rgba(102,70,41,.42); color:var(--brown-deep); font-size:13px; font-weight:900; opacity:0; transform:translate(-50%,120px); transition:opacity .25s var(--ease),transform .25s var(--ease); pointer-events:none; }
#toast.on { opacity:1; transform:translate(-50%,0); }

@keyframes drift { 0%,100% { transform:translateX(0); } 50% { transform:translateX(28px); } }
@keyframes pop { from { opacity:0; transform:translateY(9px) scale(.96); } to { opacity:1; transform:none; } }

@media (max-width: 760px) {
  .shell { width:min(100% - 22px, 650px); padding-top:30px; padding-bottom:100px; }
  .corner-note { position:relative; top:auto; left:auto; margin:0 0 12px 8px; justify-content:center; }
  .status-ticket { position:relative; top:auto; right:auto; margin:0 2px 10px auto; width:max-content; transform:rotate(3deg); }
  .hero { padding-top:0; } .sign { min-width:0; width:100%; padding:22px 38px 18px; }
  .board { padding:22px 15px; border-radius:28px 25px 31px 24px; }
  .route-grid { grid-template-columns:1fr; gap:14px; }
  .route-card { min-height:0; }
  .summary-strip { gap:8px; }
  .summary-card { min-height:76px; } .summary-card .big { font-size:23px; } .summary-card .small { font-size:10px; }
  .tree { opacity:.45; } .tree.left { left:-16px; } .tree.right { right:-23px; }
  .sun { top:13px; right:4%; transform:scale(.75); }
}
@media (max-width: 470px) {
  .shell { width:min(100% - 18px, 470px); }
  .sign h1 { font-size:27px; } .sign p { font-size:12px; }
  .chip { font-size:11px; }
  .board { padding:20px 12px; border-width:3px; }
  .section { padding-top:21px; }
  .ribbon { min-width:167px; font-size:12px; padding:8px 16px; }
  .route-card { padding:17px 14px 15px; border-width:2px; }
  .node-row { grid-template-columns:auto minmax(0,1fr); padding-right:9px; }
  .node-badges { grid-column:2; justify-content:flex-start; }
  .node-top { align-items:flex-start; } .node-sub { display:none; }
  .route-actions .action-btn { padding:0 10px; }
  .route-actions .action-btn.primary { flex:1; }
  .modal-card { padding:35px 18px 22px; }
}
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
  <div class="corner-note"><span class="mini-leaf"></span><span>ISLAND NET</span></div>
  <div class="status-ticket"><b>● CONNECTED</b>订阅小岛已开放</div>

  <header class="hero">
    <div class="sign-wrap">
      <div class="sign">
        <h1>订阅小岛</h1>
        <p>{{SUB_NAME}}</p>
      </div>
    </div>
    <div class="hero-sub">
      <span class="chip"><i class="dot"></i><span>{{COUNT}} 条航线已登记</span></span>
      <span class="chip">☀️ 两种导出形式</span>
      <span class="chip">🍃 点击卡片即可复制</span>
    </div>
  </header>

  <section class="board">
    <section class="section">
      <div class="ribbon">✦ 登岛通行证 ✦</div>
      <div class="route-grid">
        <article class="route-card clash" role="button" tabindex="0" onclick="cp('clash')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();cp('clash')}">
          <div class="postmark"><span>ROUTE</span><b>01</b></div>
          <div class="route-head"><div class="route-icon">⚔️</div><div><h2>Clash / Meta</h2><p class="hint">桌面与规则客户端</p></div></div>
          <div class="route-line hidden-line" id="u-clash">订阅链接已隐藏，点击复制或扫码使用</div>
          <div class="route-actions">
            <button class="action-btn primary" type="button" onclick="event.stopPropagation();cp('clash')">📋 复制航线</button>
            <button class="action-btn" type="button" onclick="event.stopPropagation();qrKey('clash','Clash / Meta')" aria-label="打开 Clash 二维码">📱</button>
          </div>
        </article>
        <article class="route-card b64" role="button" tabindex="0" onclick="cp('b64')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();cp('b64')}">
          <div class="postmark"><span>ROUTE</span><b>02</b></div>
          <div class="route-head"><div class="route-icon">📮</div><div><h2>Base64</h2><p class="hint">通用 / 移动端客户端</p></div></div>
          <div class="route-line hidden-line" id="u-b64">订阅链接已隐藏，点击复制或扫码使用</div>
          <div class="route-actions">
            <button class="action-btn primary" type="button" onclick="event.stopPropagation();cp('b64')">📋 复制航线</button>
            <button class="action-btn" type="button" onclick="event.stopPropagation();qrKey('b64','Base64')" aria-label="打开 Base64 二维码">📱</button>
          </div>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="ribbon">✦ 岛屿小报 ✦</div>
      <div class="summary-strip">
        <div class="summary-card"><div class="big">{{COUNT}}</div><div class="small">登记节点</div></div>
        <div class="summary-card"><div class="big">02</div><div class="small">导出形式</div></div>
        <div class="summary-card"><div class="big">24H</div><div class="small">随时取用</div></div>
      </div>
    </section>

    <section class="section node-box">
      <div class="ribbon">✦ 航线地图 ✦</div>
      <div class="node-top">
        <div class="node-title"><span class="pin">📍</span><span>节点航线簿</span></div>
        <div class="node-sub">点开客户端后选择喜欢的航线吧</div>
      </div>
      <div class="node-list" id="nodeList"><div class="empty">正在整理航线地图……</div></div>
    </section>
  </section>
</main>

<div class="modal" id="qrModal" role="dialog" aria-modal="true" aria-labelledby="qrTitle">
  <div class="modal-card">
    <h3 id="qrTitle">航线二维码</h3>
    <p>打开客户端扫一扫，就能登上小岛。</p>
    <div class="qr-frame"><img id="qrImg" src="" alt="二维码"></div>
    <div class="modal-link" id="qrLink">订阅链接已隐藏，可直接扫码或复制。</div>
    <div class="modal-actions">
      <button class="action-btn primary" type="button" onclick="copyModalLink()">📋 复制链接</button>
      <button class="action-btn" type="button" onclick="cq()">关闭</button>
    </div>
  </div>
</div>
<div id="toast" role="status" aria-live="polite">🍃 已复制到剪贴板</div>

<script>
var proxies = [];
var routeBase = window.location.origin + window.location.pathname.replace(/[?#].*$/, "");
var routeLinks = { clash: routeBase + "?clash", b64: routeBase + "?b64" };
function esc(v) {
  return String(v == null ? "" : v).replace(/[&<>"\\'"]/g, function(c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c];
  });
}
function protocolColor(type) {
  var t = String(type || "").toLowerCase();
  if (t.indexOf("vless") >= 0) return "#94d69a";
  if (t.indexOf("trojan") >= 0) return "#f2b98a";
  if (t.indexOf("hysteria") >= 0 || t.indexOf("hy2") >= 0) return "#a9d6e8";
  if (t.indexOf("tuic") >= 0) return "#c8b7df";
  if (t.indexOf("ss") >= 0) return "#f1cb72";
  return "#b8d881";
}
function flagIcon(code, label) {
  var flags = {
    gb: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#012169"/><path d="M0 0l60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" stroke-width="4"/><path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="13"/><path d="M30 0v40M0 20h60" stroke="#C8102E" stroke-width="8"/></svg>',
    ng: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="40" fill="#008751"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#008751"/></svg>',
    sg: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="20" fill="#EF3340"/><rect y="20" width="60" height="20" fill="#fff"/><circle cx="16" cy="10" r="7" fill="#fff"/><circle cx="19" cy="10" r="6" fill="#EF3340"/><g fill="#fff"><circle cx="27" cy="5" r="1.4"/><circle cx="31" cy="8" r="1.4"/><circle cx="29.5" cy="13" r="1.4"/><circle cx="24.5" cy="13" r="1.4"/><circle cx="23" cy="8" r="1.4"/></g></svg>',
    us: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#fff"/><g fill="#B22234"><rect y="0" width="60" height="3.08"/><rect y="6.15" width="60" height="3.08"/><rect y="12.31" width="60" height="3.08"/><rect y="18.46" width="60" height="3.08"/><rect y="24.62" width="60" height="3.08"/><rect y="30.77" width="60" height="3.08"/><rect y="36.92" width="60" height="3.08"/></g><rect width="24" height="21.54" fill="#3C3B6E"/><g fill="#fff"><circle cx="4" cy="4" r="1"/><circle cx="10" cy="4" r="1"/><circle cx="16" cy="4" r="1"/><circle cx="22" cy="4" r="1"/><circle cx="7" cy="9" r="1"/><circle cx="13" cy="9" r="1"/><circle cx="19" cy="9" r="1"/><circle cx="4" cy="14" r="1"/><circle cx="10" cy="14" r="1"/><circle cx="16" cy="14" r="1"/><circle cx="22" cy="14" r="1"/><circle cx="7" cy="19" r="1"/><circle cx="13" cy="19" r="1"/><circle cx="19" cy="19" r="1"/></g></svg>',
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
  // 先匹配更具体的新地区。比如“英国代理出口（反连香港）”同时包含
  // “英国”和“香港”，应显示英国旗，而不是被香港关键字抢先命中。
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
  if (t.indexOf("vless") >= 0) return "🍃";
  if (t.indexOf("trojan") >= 0) return "🐚";
  if (t.indexOf("hysteria") >= 0 || t.indexOf("hy2") >= 0) return "🐟";
  if (t.indexOf("tuic") >= 0) return "🪁";
  if (t.indexOf("ss") >= 0) return "🌻";
  return "⛵";
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
  if (n && n.flow) parts.push("Vision");
  if (n && n["xhttp-opts"] && n["xhttp-opts"].mode) parts.push(String(n["xhttp-opts"].mode));
  if (n && n["grpc-opts"]) parts.push("gRPC");
  if (n && n["ws-opts"]) parts.push("WS");
  var sni = n && (n.sni || n.servername);
  if (sni) parts.push("SNI " + sni);
  return parts.map(detailPill).join("");
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
    el.innerHTML = "<div class=\\"empty\\">这张航线地图暂时还是空的。</div>";
    return;
  }
  el.innerHTML = proxies.map(function(n) {
    var name = esc(n && n.name || "未命名节点");
    var type = esc(n && n.type || "Unknown");
    var color = protocolColor(n && n.type || "");
    var icon = nodeIcon(n && n.name || "", "", n && n.type || "");
    var details = nodeDetails(n || {});
    return "<div class=\\"node-row\\">" +
      "<div class=\\"node-mark\\" style=\\"--node-color:" + color + "\\">" + icon + "</div>" +
      "<div class=\\"node-main\\"><div class=\\"node-name\\">" + name + "</div><div class=\\"node-meta\\">连接地址与端口已隐藏</div><div class=\\"node-detail\\">" + details + "</div></div>" +
      "<div class=\\"node-badges\\"><span class=\\"proto\\">" + type + "</span></div>" +
      "</div>";
  }).join("");
}
function copyText(text, successText) {
  function done() { t(successText || "🍃 已复制到剪贴板"); }
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
function cp(k) {
  copyText(routeLinks[k] || "", "🍃 航线已经装进口袋");
}
function qrKey(k, name) { qr(routeLinks[k] || "", name); }
function qr(url, name) {
  document.getElementById("qrTitle").textContent = name + " 航线二维码";
  document.getElementById("qrImg").src = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(url);
  document.getElementById("qrLink").textContent = "订阅链接已隐藏，可直接扫码或复制。";
  document.getElementById("qrLink").dataset.url = url;
  document.getElementById("qrModal").classList.add("on");
}
function copyModalLink() { copyText(document.getElementById("qrLink").dataset.url || "", "🍃 二维码链接已复制"); }
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

  // 替换占位符
  html = html.replace(/\{\{SUB_NAME\}\}/g, config.subName);
  html = html.replace(/\{\{COUNT\}\}/g, proxies.length);
  html = html.replace(/\{\{CLASH_URL\}\}/g, links.clash);

  html = html.replace(/\{\{B64_URL\}\}/g, links.b64);
  const safeHost = (value) => {
    const v = String(value || '');
    if (!v) return undefined;
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) return undefined;
    if (v.includes(':')) return undefined;
    return v;
  };
  const panelProxies = proxies.map((p) => ({
    name: p.name,
    type: p.type,
    network: p.network,
    tls: p.tls,
    sni: safeHost(p.sni),
    servername: safeHost(p.servername),
    flow: p.flow,
    'reality-opts': p['reality-opts'] ? {} : undefined,
    'xhttp-opts': p['xhttp-opts'] ? { mode: p['xhttp-opts'].mode } : undefined,
    'grpc-opts': p['grpc-opts'] ? {} : undefined,
    'ws-opts': p['ws-opts'] ? {} : undefined,
  }));
  html = html.replace('var proxies = [];', 'var proxies = ' + JSON.stringify(panelProxies) + ';');

  return html;
}
