// Clash YAML generator — ACL4SSR rule-providers style
// ===================================================

// ==================== Clash YAML 生成（ACL4SSR rule-providers 风格） ====================
export function generateClashYaml(proxies, subName) {
  const allNames = proxies.map(p => '"' + p.name + '"').join(', ');
  const lines = ['# 订阅: ' + subName, '', 'proxies:'];
  for (const p of proxies) {
    lines.push('  - name: "' + p.name + '"');
    lines.push('    type: ' + p.type);
    lines.push('    server: "' + p.server + '"');
    lines.push('    port: ' + p.port);
    if (p.type === 'trojan') {
      lines.push('    password: "' + (p.password || '') + '"');
    } else {
      lines.push('    uuid: "' + (p.uuid || '') + '"');
      lines.push('    network: "' + p.network + '"');
      lines.push('    tls: ' + p.tls);
      lines.push('    servername: "' + p.servername + '"');
      if (p.flow) {
        lines.push('    flow: ' + p.flow);
      }
      if (p.alpn && p.alpn.length) {
        lines.push('    alpn: [' + p.alpn.map(x => '"' + x + '"').join(', ') + ']');
      }
      if (p['ws-opts']) {
        lines.push('    ws-opts:');
        lines.push('      path: "' + p['ws-opts'].path + '"');
        if (p['ws-opts'].headers?.Host) {
          lines.push('      headers:');
          lines.push('        Host: "' + p['ws-opts'].headers.Host + '"');
        }
      }
      if (p['grpc-opts']) {
        lines.push('    grpc-opts:');
        lines.push('      grpc-service-name: "' + (p['grpc-opts']['grpc-service-name'] || '') + '"');
      }
      if (p['xhttp-opts']) {
        lines.push('    xhttp-opts:');
        lines.push('      mode: "' + (p['xhttp-opts'].mode || 'packet-up') + '"');
        lines.push('      path: "' + (p['xhttp-opts'].path || '/') + '"');
      }
    }
    lines.push('    udp: true');
    if (p.sni) {
      lines.push('    sni: "' + p.sni + '"');
    }
    lines.push('    skip-cert-verify: ' + (p['skip-cert-verify'] || false));
    if (p['reality-opts']) {
      lines.push('    reality-opts:');
      lines.push('      public-key: "' + p['reality-opts']['public-key'] + '"');
      lines.push('      short-id: "' + p['reality-opts']['short-id'] + '"');
    }
    if (p['client-fingerprint']) {
      lines.push('    client-fingerprint: ' + p['client-fingerprint']);
    }
    lines.push('    keep-alive-interval: 1800');
  }

  // 按地区分类
  function grep(re) { return proxies.filter(p => re.test(p.name)).map(p => '"' + p.name + '"').join(', '); }
  const hk   = grep(/港|HK|hongkong/i);
  const jp   = grep(/东京|大阪|日本|IIJ|软银|jp/i);
  const us   = grep(/洛杉矶|硅谷|堪萨斯|纽约|9929|CN2|us/i);
  const dedi = grep(/不限量|dedione/i);
  const rest = proxies.filter(p =>
    !/港|HK|hongkong|东京|大阪|日本|IIJ|软银|jp|洛杉矶|硅谷|堪萨斯|纽约|9929|CN2|us|不限量|dedione/i.test(p.name)
  ).map(p => '"' + p.name + '"').join(', ');

  const regionGroups = [];
  if (hk)   regionGroups.push('\u{1F1ED}\u{1F1F0}\u9999\u6E2F-\u8282\u70B9');
  if (jp)   regionGroups.push('\u{1F1EF}\u{1F1F5}\u65E5\u672C-\u8282\u70B9');
  if (us)   regionGroups.push('\u{1F1FA}\u{1F1F8}\u7F8E\u56FD-\u8282\u70B9');

  lines.push('');
  lines.push('proxy-groups:');

  // 1) Proxy — 主选择器
  lines.push('  - name: "Proxy"');
  lines.push('    type: select');
  const selectProxies = ['Auto', 'DIRECT'];
  for (const g of regionGroups) selectProxies.push(g);
  if (dedi) selectProxies.push('\u89E3\u9501\u51FA\u53E3');
  if (rest) selectProxies.push('\u5176\u5B83\u5730\u533A');
  lines.push('    proxies: [' + selectProxies.join(', ') + ']');

  // 2) Auto
  lines.push('  - name: "Auto"');
  lines.push('    type: url-test');
  lines.push('    proxies: [' + allNames + ']');
  lines.push('    url: "http://www.gstatic.com/generate_204"');
  lines.push('    interval: 300');
  lines.push('    tolerance: 50');

  // 3) 流媒体
  lines.push('  - name: "\uD83C\uDF7F \u6D41\u5A92\u4F53"');
  lines.push('    type: select');
  lines.push('    proxies: [' + allNames + ']');

  // 4) Google
  lines.push('  - name: "\uD83D\uDCAC \u8C37\u6B4C\u4E0E\u793E\u4EA4"');
  lines.push('    type: select');
  lines.push('    proxies: [' + allNames + ']');

  // 5) GitHub
  lines.push('  - name: "\uD83D\uDC19 GitHub"');
  lines.push('    type: select');
  lines.push('    proxies: [' + allNames + ']');

  // 6) 游戏
  lines.push('  - name: "\uD83C\uDFAE \u6E38\u620F"');
  lines.push('    type: select');
  lines.push('    proxies: [' + allNames + ']');

  // 7) 地区组
  if (hk) {
    lines.push('  - name: "' + '\u{1F1ED}\u{1F1F0}\u9999\u6E2F-\u8282\u70B9' + '"');
    lines.push('    type: url-test');
    lines.push('    proxies: [' + hk + ']');
    lines.push('    url: "http://www.gstatic.com/generate_204"');
    lines.push('    interval: 300');
    lines.push('    tolerance: 50');
  }
  if (jp) {
    lines.push('  - name: "' + '\u{1F1EF}\u{1F1F5}\u65E5\u672C-\u8282\u70B9' + '"');
    lines.push('    type: url-test');
    lines.push('    proxies: [' + jp + ']');
    lines.push('    url: "http://www.gstatic.com/generate_204"');
    lines.push('    interval: 300');
    lines.push('    tolerance: 50');
  }
  if (us) {
    lines.push('  - name: "' + '\u{1F1FA}\u{1F1F8}\u7F8E\u56FD-\u8282\u70B9' + '"');
    lines.push('    type: url-test');
    lines.push('    proxies: [' + us + ']');
    lines.push('    url: "http://www.gstatic.com/generate_204"');
    lines.push('    interval: 300');
    lines.push('    tolerance: 50');
  }
  if (dedi) {
    lines.push('  - name: "\u89E3\u9501\u51FA\u53E3"');
    lines.push('    type: select');
    lines.push('    proxies: [' + dedi + ', DIRECT]');
  }
  if (rest) {
    lines.push('  - name: "\u5176\u5B83\u5730\u533A"');
    lines.push('    type: url-test');
    lines.push('    proxies: [' + rest + ']');
    lines.push('    url: "http://www.gstatic.com/generate_204"');
    lines.push('    interval: 300');
    lines.push('    tolerance: 50');
  }

  // 8) AdBlock
  lines.push('  - name: "AdBlock"');
  lines.push('    type: select');
  lines.push('    proxies: [REJECT, DIRECT]');

  // --- rule-providers (ACL4SSR) ---
  lines.push('');
  lines.push('rule-providers:');
  lines.push('  category-ads-all:');
  lines.push('    type: http');
  lines.push('    behavior: classical');
  lines.push('    url: "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/BanAD.list"');
  lines.push('    path: ./ruleset/ads.yaml');
  lines.push('    interval: 86400');
  lines.push('  category-proxy:');
  lines.push('    type: http');
  lines.push('    behavior: classical');
  lines.push('    url: "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/ProxyLite.list"');
  lines.push('    path: ./ruleset/proxy.yaml');
  lines.push('    interval: 86400');
  lines.push('  category-direct:');
  lines.push('    type: http');
  lines.push('    behavior: classical');
  lines.push('    url: "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Direct.list"');
  lines.push('    path: ./ruleset/direct.yaml');
  lines.push('    interval: 86400');
  lines.push('  category-streaming:');
  lines.push('    type: http');
  lines.push('    behavior: classical');
  lines.push('    url: "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Media.list"');
  lines.push('    path: ./ruleset/media.yaml');
  lines.push('    interval: 86400');
  lines.push('  category-games:');
  lines.push('    type: http');
  lines.push('    behavior: classical');
  lines.push('    url: "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Game.list"');
  lines.push('    path: ./ruleset/games.yaml');
  lines.push('    interval: 86400');

  // --- rules ---
  lines.push('');
  lines.push('rules:');
  lines.push('  - RULE-SET,category-ads-all,AdBlock');
  lines.push('  - RULE-SET,category-direct,DIRECT');
  lines.push('  - RULE-SET,category-streaming,\uD83C\uDF7F \u6D41\u5A92\u4F53');
  lines.push('  - RULE-SET,category-games,\uD83C\uDFAE \u6E38\u620F');
  lines.push('  - geosite,google,\uD83D\uDCAC \u8C37\u6B4C\u4E0E\u793E\u4EA4');
  lines.push('  - geosite,youtube,\uD83D\uDCAC \u8C37\u6B4C\u4E0E\u793E\u4EA4');
  lines.push('  - geosite,telegram,\uD83D\uDCAC \u8C37\u6B4C\u4E0E\u793E\u4EA4');
  lines.push('  - geosite,github,\uD83D\uDC19 GitHub');
  lines.push('  - geosite,netflix,\uD83C\uDF7F \u6D41\u5A92\u4F53');
  lines.push('  - geosite,disney,\uD83C\uDF7F \u6D41\u5A92\u4F53');
  lines.push('  - geosite,spotify,\uD83C\uDF7F \u6D41\u5A92\u4F53');
  lines.push('  - RULE-SET,category-proxy,Proxy');
  lines.push('  - geosite,cn,DIRECT');
  lines.push('  - geoip,cn,DIRECT');
  lines.push('  - match,Proxy');

  return lines.join('\n');
}