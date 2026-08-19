// Dashboard HTML renderer — Paper Playground hand-drawn theme
// ===========================================================

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
<meta name="theme-color" content="#fffdf7">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect x='16' y='20' width='68' height='58' rx='10' fill='%23ffec99' stroke='%2325262b' stroke-width='5'/%3E%3Cpath d='M30 40h39M30 55h26' stroke='%2325262b' stroke-width='5' stroke-linecap='round'/%3E%3C/svg%3E">
<title>纸边订阅白板</title>
<script src="https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.min.js" defer></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{color-scheme:light;font-synthesis:none;text-rendering:optimizeLegibility;--paper:#fffdf7;--paper-secondary:#f6f1e7;--ink:#25262b;--ink-muted:#68645e;--blue:#a5d8ff;--blue-strong:#5f7fe7;--yellow:#ffec99;--red:#ffc9c9;--red-strong:#d9485f;--purple:#d0bfff;--green:#b2f2bb;--teal:#c3fae8;--orange:#ffd8a8;--content-width:1120px;--section-gap:clamp(4.5rem,8vw,7rem);--header-height:74px;--title-font:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif;--body-font:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif}
html{min-height:100%;scroll-behavior:smooth;scroll-padding-top:calc(var(--header-height) + 28px);background:var(--paper);overflow-x:clip}
body{min-width:320px;min-height:100vh;overflow-x:clip;color:var(--ink);background:var(--paper);font-family:var(--body-font);line-height:1.7}
body:before{position:fixed;inset:0;z-index:-1;background-image:radial-gradient(circle at center,rgba(37,38,43,.085) .7px,transparent .8px);background-size:22px 22px;content:"";pointer-events:none;opacity:.42}
button,a{font:inherit;color:inherit}button{border:0;background:transparent;cursor:pointer}a{text-decoration:none}svg{display:block}.skip-link{position:fixed;top:10px;left:12px;z-index:100;padding:.55rem .85rem;color:var(--paper);background:var(--ink);transform:translateY(-160%)}.skip-link:focus{transform:translateY(0)}
.rough-outline{position:absolute;inset:0;z-index:0;width:100%;height:100%;overflow:visible;pointer-events:none}.rough-fallback{position:absolute;inset:5px;border:1.8px solid var(--ink);border-radius:24px 19px 27px 18px;pointer-events:none}.section-shell{width:min(calc(100% - 40px),var(--content-width));margin-inline:auto}
.site-header{position:sticky;top:0;z-index:50;background:rgba(255,253,247,.96);backdrop-filter:blur(8px)}.site-header:after{position:absolute;right:0;bottom:-3px;left:0;height:5px;border-top:1px solid rgba(37,38,43,.22);content:"";transform:rotate(-.06deg)}.nav-shell{display:flex;width:min(calc(100% - 40px),var(--content-width));min-height:var(--header-height);margin-inline:auto;align-items:center;justify-content:space-between;gap:1rem}.site-logo{display:inline-flex;min-height:44px;align-items:center;gap:.55rem;font-family:var(--title-font);font-size:1.03rem;font-weight:800;letter-spacing:-.02em}.site-logo__mark{display:grid;width:29px;height:29px;place-items:center;color:var(--red-strong);font-size:1.28rem;transition:transform 220ms ease}.site-logo:hover .site-logo__mark{transform:rotate(15deg)}.nav-links{display:flex;align-items:center;gap:clamp(1.1rem,3vw,2.4rem)}.nav-links a{position:relative;display:inline-grid;min-height:44px;place-items:center;color:var(--ink-muted);font-size:.94rem;font-weight:700;letter-spacing:.02em}.nav-links a:hover{color:var(--ink)}.logout-link{color:var(--red-strong)!important}
.hero{display:grid;min-height:calc(100svh - var(--header-height));padding-block:clamp(4rem,8vw,6.4rem) clamp(4.5rem,8vw,6.5rem);grid-template-columns:minmax(0,1.02fr) minmax(340px,.98fr);gap:clamp(2rem,5vw,5rem);align-items:center}.hero__copy{position:relative;z-index:2}.eyebrow{display:flex;margin-bottom:1.3rem;align-items:center;gap:.55rem;color:var(--ink-muted);font-family:var(--title-font);font-size:.82rem;font-weight:700;letter-spacing:.11em;text-transform:uppercase}.eyebrow span{color:var(--red-strong);font-size:1.12rem}.hero h1{max-width:760px;margin-bottom:1.75rem;font-family:var(--title-font);font-size:clamp(3rem,6vw,5.35rem);font-weight:800;line-height:1.12;letter-spacing:-.065em}.hero h1 .line{display:inline-block}.hero h1 .blue{color:var(--blue-strong);transform:rotate(-1deg)}.hero__intro{max-width:35rem;margin-bottom:2.1rem;color:var(--ink-muted);font-size:clamp(1.05rem,1.5vw,1.2rem);line-height:1.9}.hero__actions{display:flex;flex-wrap:wrap;gap:.75rem 1rem;align-items:center}.hero__nudge{position:absolute;right:4%;bottom:-5.2rem;display:flex;color:var(--ink-muted);font-family:var(--title-font);font-size:.78rem;line-height:1.2;transform:rotate(-5deg)}.hero-sketch{position:relative;min-height:430px;transform:rotate(.6deg)}.hero-sketch svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.hero-sketch__label{position:absolute;top:20.5%;right:10%;z-index:2;padding:.2rem .55rem;color:var(--ink-muted);background:var(--yellow);font-family:var(--title-font);font-size:.72rem;font-weight:700;transform:rotate(2deg)}
.sketch-button{position:relative;display:inline-flex;min-height:52px;align-items:stretch;transition:transform 180ms ease,filter 180ms ease}.sketch-button__control{position:relative;z-index:1;display:inline-flex;min-width:154px;min-height:52px;padding:.76rem 1.2rem;align-items:center;justify-content:center;gap:.7rem;color:var(--ink);background:transparent;font-size:.96rem;font-weight:800;line-height:1.2}.sketch-button:hover{transform:translateY(-2px)}.sketch-button:active{transform:translate(1px,2px)}.sketch-button--text .sketch-button__control{min-width:0;padding-inline:.55rem}.sketch-button--text .sketch-button__control:after{position:absolute;right:.35rem;bottom:7px;left:.35rem;height:7px;border-bottom:2px solid var(--blue-strong);content:"";transform:rotate(-1.2deg)}.button-arrow{width:35px;height:20px;transition:transform 180ms ease}.sketch-button:hover .button-arrow{transform:translateX(4px)}
.section{padding-block:var(--section-gap)}.section-heading{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr);gap:clamp(2rem,8vw,7rem);align-items:end}.section-kicker{margin-bottom:1rem;color:var(--ink-muted);font-family:var(--title-font);font-size:.82rem;font-weight:700;letter-spacing:.11em;text-transform:uppercase}.section-kicker:before{display:inline-block;width:22px;height:2px;margin-right:.55rem;vertical-align:middle;background:var(--red-strong);content:"";transform:rotate(-4deg)}.section-heading h2{margin-bottom:0;font-family:var(--title-font);font-size:clamp(2rem,4.6vw,3.8rem);font-weight:700;line-height:1.22;letter-spacing:-.045em}.section-heading h2 span{color:var(--blue-strong)}.section-heading>p{max-width:33rem;margin-bottom:.35rem;color:var(--ink-muted);font-size:1rem;line-height:1.85}.section-divider{width:100%;height:20px;margin-block:2rem clamp(2.3rem,5vw,4rem);overflow:visible}
.route-grid,.node-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(1rem,2.2vw,1.75rem)}.node-grid{grid-template-columns:repeat(auto-fit,minmax(255px,1fr))}.paper-card{position:relative;display:flex;min-height:260px;padding:clamp(1.35rem,3vw,1.8rem);flex-direction:column;transition:transform 200ms ease,background-color 200ms ease}.paper-card>:not(.rough-outline):not(.rough-fallback){position:relative;z-index:1}.paper-card:hover{background:rgba(255,236,153,.14);transform:translateY(-6px)}.paper-card:nth-child(2n){margin-top:1.05rem}.paper-card:nth-child(3n){margin-top:-.45rem}.paper-card__top{display:flex;min-height:70px;margin-bottom:1.25rem;align-items:flex-start;justify-content:space-between}.paper-card__icon{display:grid;width:66px;height:66px;place-items:center;transition:transform 200ms ease}.paper-card:hover .paper-card__icon{transform:rotate(-5deg)}.icon-badge{display:grid;width:58px;height:58px;place-items:center;color:var(--ink);background:var(--icon-paper,var(--yellow));border-radius:50%;font-family:var(--title-font);font-size:1.45rem;font-weight:800}.paper-card__index{color:var(--ink-muted);font-family:var(--title-font);font-size:.8rem;font-weight:800;letter-spacing:.12em}.paper-card h3{margin-bottom:.85rem;font-family:var(--title-font);font-size:clamp(1.3rem,2vw,1.65rem);line-height:1.35}.paper-card>p{margin-bottom:1.5rem;color:var(--ink-muted);font-size:.95rem;line-height:1.82}.paper-card__footer{display:flex;margin-top:auto;gap:1rem;align-items:flex-end;justify-content:space-between}.tag-list{display:flex;margin:0;padding:0;flex-wrap:wrap;gap:.45rem;list-style:none}.tag-list li{padding:.16rem .52rem;color:var(--ink-muted);background:var(--paper-secondary);font-size:.72rem;line-height:1.6;transform:rotate(-.4deg)}.tag-list li:nth-child(2n){transform:rotate(.6deg)}.route-card:nth-child(1) .icon-badge{--icon-paper:var(--yellow)}.route-card:nth-child(2) .icon-badge{--icon-paper:var(--teal)}.node-card{min-height:300px}.node-card .paper-card__top{margin-bottom:.95rem}.node-card__name{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.node-meta{color:var(--ink-muted);font-size:.82rem}.empty{position:relative;grid-column:1/-1;min-height:180px;padding:2rem;font-family:var(--title-font);font-weight:800;text-align:center}.work-note{width:max-content;max-width:calc(100% - 20px);margin:clamp(3rem,6vw,5rem) auto 0;font-family:var(--title-font);font-weight:700;transform:rotate(-.8deg)}
.modal{display:none;position:fixed;inset:0;z-index:80;align-items:center;justify-content:center;padding:20px;background:rgba(37,38,43,.22);backdrop-filter:blur(4px)}.modal.on{display:flex}.modal-card{position:relative;width:min(410px,100%);padding:2.5rem 1.6rem 1.6rem;background:var(--paper);text-align:center}.modal-card>:not(.rough-outline):not(.rough-fallback){position:relative;z-index:1}.modal-card h3{margin-bottom:.35rem;font-family:var(--title-font);font-size:1.7rem}.modal-card p{margin-bottom:1rem;color:var(--ink-muted);font-size:.9rem}.qr-frame{width:224px;height:224px;margin:0 auto 1rem;padding:12px;background:#fff}.qr-frame img{width:100%;height:100%;display:block}.modal-link{max-height:45px;overflow:auto;margin-bottom:1rem;padding:.6rem .7rem;border:1px dashed rgba(37,38,43,.35);background:var(--paper-secondary);color:var(--ink-muted);font-size:.72rem;line-height:1.45;word-break:break-all;text-align:left}.modal-actions{display:flex;gap:.7rem}.modal-actions .sketch-button,.modal-actions .sketch-button__control{flex:1;min-width:0}#toast{position:fixed;left:50%;bottom:28px;z-index:90;padding:.65rem 1rem;color:var(--ink);background:var(--green);font-family:var(--title-font);font-weight:800;opacity:0;transform:translate(-50%,110px) rotate(-1deg);transition:opacity 220ms ease,transform 220ms ease;pointer-events:none}#toast.on{opacity:1;transform:translate(-50%,0) rotate(-1deg)}
@media(max-width:1024px){.hero{grid-template-columns:minmax(0,1fr) minmax(330px,.82fr);gap:1.5rem}.route-grid{grid-template-columns:1fr}.paper-card:nth-child(2n),.paper-card:nth-child(3n){margin-top:0}}
@media(max-width:780px){:root{--header-height:66px}.section-shell,.nav-shell{width:min(calc(100% - 28px),var(--content-width))}.nav-links{gap:.9rem}.hero{min-height:auto;padding-block:4.2rem 5.5rem;grid-template-columns:1fr}.hero-sketch{width:min(100%,540px);min-height:360px;margin-inline:auto}.section-heading{grid-template-columns:1fr;gap:1.4rem}.node-grid{grid-template-columns:1fr}.paper-card{min-height:270px}.paper-card__footer{align-items:flex-start;flex-direction:column}}
@media(max-width:480px){.section-shell,.nav-shell{width:min(calc(100% - 24px),var(--content-width))}.site-logo{font-size:.94rem}.nav-links a:not(.logout-link){display:none}.hero{padding-top:3.6rem}.hero h1{font-size:clamp(2.45rem,12vw,3.35rem);line-height:1.18}.hero__actions{align-items:stretch;flex-direction:column}.sketch-button,.sketch-button__control{width:100%}.hero-sketch{min-height:280px}.modal-actions{flex-direction:column}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
</style>
</head>
<body>
<a class="skip-link" href="#main-content">跳到主要内容</a>
<header class="site-header">
  <nav class="nav-shell" aria-label="主导航">
    <a class="site-logo" href="#home"><span class="site-logo__mark">✎</span><span>纸边订阅白板</span></a>
    <div class="nav-links">
      <a href="#routes">导出</a>
      <a href="#nodes">节点</a>
      <a class="logout-link" href="/logout">退出</a>
    </div>
  </nav>
</header>
<main id="main-content">
  <section id="home" class="hero section-shell" aria-labelledby="hero-title">
    <div class="hero__copy">
      <p class="eyebrow"><span aria-hidden="true">✦</span> Creative subscription · 手绘交互</p>
      <h1 id="hero-title"><span class="line">把订阅</span><br><span class="line blue">画成白板</span></h1>
      <p class="hero__intro">{{SUB_NAME}} · 节点、导出和二维码都被整理成纸边小卡片。链接默认隐藏，只留下可复制、可扫码、可导入的轻量入口。</p>
      <div class="hero__actions">
        <span class="sketch-button sketch-button--primary" data-rough-fill="var(--yellow)"><span class="rough-fallback"></span><svg class="rough-outline"></svg><button class="sketch-button__control" type="button" onclick="document.getElementById('routes').scrollIntoView()"><span>翻翻导出卡</span><svg class="button-arrow" viewBox="0 0 44 24"><path d="M3 13 C13 6 26 18 39 11 M31 5 L40 11 L30 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></span>
        <span class="sketch-button sketch-button--text"><button class="sketch-button__control" type="button" onclick="document.getElementById('nodes').scrollIntoView()"><span>看节点草稿</span><svg class="button-arrow" viewBox="0 0 44 24"><path d="M3 13 C13 6 26 18 39 11 M31 5 L40 11 L30 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></span>
      </div>
      <div class="hero__nudge" aria-hidden="true">从这里开始</div>
    </div>
    <div class="hero-sketch" aria-hidden="true">
      <span class="hero-sketch__label">可点击的草稿</span>
      <svg viewBox="0 0 520 430" preserveAspectRatio="xMidYMid meet">
        <rect x="48" y="55" width="405" height="290" rx="12" fill="#fffdf7" stroke="#25262b" stroke-width="2"/>
        <path d="M52 101H449" stroke="#25262b" stroke-width="2"/>
        <circle cx="78" cy="79" r="11" fill="#ffc9c9" stroke="#25262b" stroke-width="2"/><circle cx="101" cy="79" r="11" fill="#ffec99" stroke="#25262b" stroke-width="2"/><circle cx="124" cy="79" r="11" fill="#b2f2bb" stroke="#25262b" stroke-width="2"/>
        <rect x="82" y="138" width="145" height="155" rx="10" fill="#e7f5ff" stroke="#5f7fe7" stroke-width="2"/>
        <path d="M257 151H404M257 180H386M257 209H417M257 255H347" stroke="#25262b" stroke-width="2" stroke-linecap="round"/>
        <circle cx="153" cy="206" r="69" fill="none" stroke="#d9485f" stroke-width="3"/>
        <path d="M124 210 L145 231 L184 181" fill="none" stroke="#3a8f5b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M70 373 C160 351 235 391 329 364 C376 351 431 365 474 348 M453 334 L477 348 L458 367" fill="none" stroke="#5f7fe7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M394 18 L402 41 L425 49 L403 56 L395 79 L388 56 L365 49 L387 41 Z" fill="#ffec99" stroke="#25262b" stroke-width="2"/>
      </svg>
    </div>
  </section>
  <section id="routes" class="section section-shell" aria-labelledby="routes-title">
    <div class="section-heading">
      <div><p class="section-kicker">导出路线</p><h2 id="routes-title">两张入口卡，<br><span>一键拿走</span></h2></div>
      <p>像作品卡一样放置订阅出口。点整张卡即可复制，QR 按钮负责扫码导入。</p>
    </div>
    <svg class="section-divider" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M1 6 C18 1 32 9 50 5 C68 1 83 8 99 4" fill="none" stroke="#d9485f" stroke-width="1.5" stroke-linecap="round"/></svg>
    <div class="route-grid">
      <article class="paper-card route-card" role="button" tabindex="0" onclick="cp('clash')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();cp('clash')}" data-rough-fill="var(--paper)">
        <span class="rough-fallback"></span><svg class="rough-outline"></svg>
        <div class="paper-card__top"><div class="paper-card__icon"><span class="icon-badge">C</span></div><span class="paper-card__index">ROUTE 01</span></div>
        <h3>Clash / Meta</h3><p>桌面与规则客户端。订阅链接已隐藏，点击复制或扫码使用。</p>
        <div class="paper-card__footer"><ul class="tag-list"><li>Mihomo</li><li>YAML</li><li>规则客户端</li></ul><button type="button" onclick="event.stopPropagation();qrKey('clash','Clash / Meta')">QR →</button></div>
      </article>
      <article class="paper-card route-card" role="button" tabindex="0" onclick="cp('b64')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();cp('b64')}" data-rough-fill="var(--paper)">
        <span class="rough-fallback"></span><svg class="rough-outline"></svg>
        <div class="paper-card__top"><div class="paper-card__icon"><span class="icon-badge">B</span></div><span class="paper-card__index">ROUTE 02</span></div>
        <h3>Base64</h3><p>通用 / 移动端客户端。保留传统订阅格式，适合 Shadowrocket / v2rayNG。</p>
        <div class="paper-card__footer"><ul class="tag-list"><li>Base64</li><li>Mobile</li><li>通用</li></ul><button type="button" onclick="event.stopPropagation();qrKey('b64','Base64')">QR →</button></div>
      </article>
    </div>
  </section>
  <section id="nodes" class="section section-shell" aria-labelledby="nodes-title">
    <div class="section-heading">
      <div><p class="section-kicker">节点草稿</p><h2 id="nodes-title">{{COUNT}} 个节点，<br><span>贴在纸上</span></h2></div>
      <p>地址和端口不展示，只留下协议、传输层、REALITY/TLS 和必要标签，像小项目卡一样快速扫一眼。</p>
    </div>
    <svg class="section-divider" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M1 5 C16 8 26 1 42 5 C62 10 78 0 99 6" fill="none" stroke="#5f7fe7" stroke-width="1.5" stroke-linecap="round"/></svg>
    <div class="node-grid" id="nodeList"><div class="empty"><span class="rough-fallback"></span><svg class="rough-outline"></svg>正在整理节点草稿……</div></div>
    <p class="work-note">小节点，也值得被认真放好。</p>
  </section>
</main>
<div class="modal" id="qrModal" role="dialog" aria-modal="true" aria-labelledby="qrTitle">
  <div class="modal-card" data-rough-fill="var(--paper)"><span class="rough-fallback"></span><svg class="rough-outline"></svg><h3 id="qrTitle">路线二维码</h3><p>打开客户端扫一扫，就能导入这条路线。</p><div class="qr-frame"><img id="qrImg" src="" alt="二维码"></div><div class="modal-link" id="qrLink">订阅链接已隐藏，可直接扫码或复制。</div><div class="modal-actions"><span class="sketch-button sketch-button--primary" data-rough-fill="var(--yellow)"><span class="rough-fallback"></span><svg class="rough-outline"></svg><button class="sketch-button__control" type="button" onclick="copyModalLink()">复制链接</button></span><span class="sketch-button sketch-button--secondary" data-rough-fill="var(--paper)"><span class="rough-fallback"></span><svg class="rough-outline"></svg><button class="sketch-button__control" type="button" onclick="cq()">关闭</button></span></div></div>
</div>
<div id="toast" role="status" aria-live="polite">已复制到剪贴板</div>
<script>
var proxies = [];
var routeLinks = __ROUTE_LINKS__;
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c];});}
function protocolColor(type){var t=String(type||"").toLowerCase();if(t.indexOf("vless")>=0)return "#b2f2bb";if(t.indexOf("trojan")>=0)return "#ffd8a8";if(t.indexOf("hysteria")>=0||t.indexOf("hy2")>=0)return "#a5d8ff";if(t.indexOf("tuic")>=0)return "#d0bfff";if(t.indexOf("ss")>=0)return "#ffec99";return "#c3fae8";}
function flagIcon(code,label){var flags={gb:'<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#012169"/><path d="M0 0l60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" stroke-width="4"/><path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="13"/><path d="M30 0v40M0 20h60" stroke="#C8102E" stroke-width="8"/></svg>',ng:'<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="40" fill="#008751"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#008751"/></svg>',sg:'<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="20" fill="#EF3340"/><rect y="20" width="60" height="20" fill="#fff"/><circle cx="16" cy="10" r="7" fill="#fff"/><circle cx="19" cy="10" r="6" fill="#EF3340"/></svg>',us:'<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#fff"/><g fill="#B22234"><rect y="0" width="60" height="3.08"/><rect y="6.15" width="60" height="3.08"/><rect y="12.31" width="60" height="3.08"/><rect y="18.46" width="60" height="3.08"/><rect y="24.62" width="60" height="3.08"/><rect y="30.77" width="60" height="3.08"/><rect y="36.92" width="60" height="3.08"/></g><rect width="24" height="21.54" fill="#3C3B6E"/></svg>',hk:'<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#DE2910"/><g fill="#fff" transform="translate(30 20)"><ellipse rx="3" ry="8" transform="rotate(0) translate(0 -8)"/><ellipse rx="3" ry="8" transform="rotate(72) translate(0 -8)"/><ellipse rx="3" ry="8" transform="rotate(144) translate(0 -8)"/><ellipse rx="3" ry="8" transform="rotate(216) translate(0 -8)"/><ellipse rx="3" ry="8" transform="rotate(288) translate(0 -8)"/></g></svg>',tw:'<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#FE0000"/><rect width="30" height="20" fill="#000095"/><circle cx="15" cy="10" r="6" fill="#fff"/></svg>',jp:'<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#fff"/><circle cx="30" cy="20" r="11" fill="#BC002D"/></svg>'};return '<span class="flag-svg" role="img" aria-label="'+esc(label||code.toUpperCase())+'">'+(flags[code]||'')+'</span>';}
function regionIcon(name,server){var text=String((name||"")+" "+(server||"")).toLowerCase();if(text.indexOf("🇬🇧")>=0)return flagIcon("gb","英国");if(text.indexOf("🇳🇬")>=0)return flagIcon("ng","尼日利亚");if(text.indexOf("🇺🇸")>=0)return flagIcon("us","美国");if(text.indexOf("🇸🇬")>=0)return flagIcon("sg","新加坡");if(text.indexOf("🇭🇰")>=0)return flagIcon("hk","香港");if(text.indexOf("🇹🇼")>=0)return flagIcon("tw","台湾");if(text.indexOf("🇯🇵")>=0)return flagIcon("jp","日本");if(/\b(uk|gb|london|united[ -]*kingdom|great[ -]*britain)\b|英国|英國|倫敦|伦敦/.test(text))return flagIcon("gb","英国");if(/\b(ng|nigeria|lagos|abuja)\b|尼日利亚|尼日利亞|奈及利亚|奈及利亞/.test(text))return flagIcon("ng","尼日利亚");if(/\b(hk|hong[ -]*kong)\b|香港|港/.test(text))return flagIcon("hk","香港");if(/\b(tw|taiwan)\b|台湾|臺灣/.test(text))return flagIcon("tw","台湾");if(/\b(sg|singapore)\b|新加坡|狮城/.test(text))return flagIcon("sg","新加坡");if(/\b(jp|japan|tokyo|osaka)\b|日本|东京|東京|大阪|软银|iij/.test(text))return flagIcon("jp","日本");if(/\b(us|usa|united[ -]*states|los[ -]*angeles|new[ -]*york|seattle|san[ -]*jose|dallas|atlanta)\b|美国|美國|洛杉矶|洛杉磯|硅谷|纽约|紐約|西雅图|西雅圖|圣何塞|聖何塞|达拉斯|達拉斯|堪萨斯|堪薩斯/.test(text))return flagIcon("us","美国");return "";}
function nodeIcon(name,server,type){var flag=regionIcon(name,server);if(flag)return flag;var t=String(type||"").toLowerCase();if(t.indexOf("vless")>=0)return "V";if(t.indexOf("trojan")>=0)return "T";if(t.indexOf("hysteria")>=0||t.indexOf("hy2")>=0)return "H";if(t.indexOf("tuic")>=0)return "U";if(t.indexOf("ss")>=0)return "S";return "N";}
function displayName(name){var clean=String(name||"未命名节点").replace(/[🇦-🇿]{2}/gu,"").replace(/^\\s*[-|｜·•:：_]+\\s*/,"").replace(/\\s{2,}/g," ").trim();var relay=clean.match(/^(.+?)[-—–_\\s]*(中转|中轉|前置|反连|反連)[-—–_\\s]*(.+)$/);if(relay&&relay[1]&&relay[3])clean=relay[3].trim()+"出口（"+relay[1].trim()+relay[2]+"）";return clean||"未命名节点";}
function detailPill(text){return '<li>'+esc(text)+'</li>';}
function vlessDetails(n){var parts=["VLESS"];if(n&&n["reality-opts"])parts.push("REALITY");else if(n&&n.tls)parts.push("TLS");parts.push(String(n&&n.network||"tcp").toUpperCase());if(n&&n.flow)parts.push(String(n.flow).replace(/^xtls-rprx-/,""));return parts.slice(0,4).map(detailPill).join("");}
function nodeDetails(n){var type=String(n&&n.type||"").toLowerCase();if(type==="vless")return vlessDetails(n);if(type==="trojan")return detailPill("Trojan")+(n&&n.sni?detailPill("SNI "+n.sni):"");if(type==="hysteria2")return detailPill("Hysteria2")+(n&&n.sni?detailPill("SNI "+n.sni):"");return detailPill(type||"Proxy");}
function renderNodes(){var el=document.getElementById("nodeList");if(!el)return;if(!Array.isArray(proxies)||!proxies.length){el.innerHTML='<div class="empty" data-rough-fill="var(--paper)"><span class="rough-fallback"></span><svg class="rough-outline"></svg>这张白板暂时还是空的。</div>';drawRoughSoon();return;}el.innerHTML=proxies.map(function(n,i){var name=esc(displayName(n&&n.name));var type=esc(n&&n.type||"Unknown");var color=protocolColor(n&&n.type||"");var icon=nodeIcon(n&&n.name||"","",n&&n.type||"");var details=nodeDetails(n||{});var fill=["var(--paper)","#fffdf7","#fff9db","#f8f1ff"][i%4];return '<article class="paper-card node-card" data-rough-fill="'+fill+'"><span class="rough-fallback"></span><svg class="rough-outline"></svg><div class="paper-card__top"><div class="paper-card__icon"><span class="icon-badge" style="--icon-paper:'+color+'">'+icon+'</span></div><span class="paper-card__index">NODE '+String(i+1).padStart(2,"0")+'</span></div><h3 class="node-card__name">'+name+'</h3><p class="node-meta">连接地址与端口已隐藏</p><div class="paper-card__footer"><ul class="tag-list">'+details+'</ul><span class="paper-card__index">'+type+'</span></div></article>';}).join("");drawRoughSoon();}
function drawRoughSoon(){setTimeout(drawRoughOutlines,0);}
function drawRoughOutlines(){if(!window.rough)return;document.querySelectorAll('svg.rough-outline').forEach(function(svg,idx){var parent=svg.parentElement;if(!parent)return;var r=parent.getBoundingClientRect();var w=Math.max(1,Math.round(r.width));var h=Math.max(1,Math.round(r.height));svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+w+' '+h);var rc=rough.svg(svg);var fill=parent.getAttribute('data-rough-fill')||'transparent';var shape=rc.rectangle(5,5,Math.max(1,w-10),Math.max(1,h-10),{seed:91+idx,stroke:'#25262b',strokeWidth:1.8,roughness:1.45,bowing:1.35,fill:fill,fillStyle:'solid',fillWeight:1.2});svg.appendChild(shape);});}
function copyText(text,successText){function done(){t(successText||"已复制到剪贴板");}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done).catch(function(){fallbackCopy(text,done);});}else fallbackCopy(text,done);}
function fallbackCopy(text,done){var ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";ta.style.pointerEvents="none";document.body.appendChild(ta);ta.select();try{document.execCommand("copy");}catch(e){}document.body.removeChild(ta);done();}
function cp(k){copyText(routeLinks[k]||"","路线链接已复制");}
function qrKey(k,name){qr(routeLinks[k]||"",name);}
function qr(url,name){document.getElementById("qrTitle").textContent=name+" 路线二维码";document.getElementById("qrImg").src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data="+encodeURIComponent(url);document.getElementById("qrLink").textContent="订阅链接已隐藏，可直接扫码或复制。";document.getElementById("qrLink").dataset.url=url;document.getElementById("qrModal").classList.add("on");drawRoughSoon();}
function copyModalLink(){copyText(document.getElementById("qrLink").dataset.url||"","二维码链接已复制");}
function cq(){document.getElementById("qrModal").classList.remove("on");}
document.getElementById("qrModal").addEventListener("click",function(e){if(e.target===this)cq();});document.addEventListener("keydown",function(e){if(e.key==="Escape")cq();});window.addEventListener('resize',drawRoughOutlines);window.addEventListener('load',drawRoughOutlines);function t(message){var el=document.getElementById("toast");el.textContent=message;el.classList.add("on");clearTimeout(el._timer);el._timer=setTimeout(function(){el.classList.remove("on");},2300);}renderNodes();drawRoughSoon();
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
