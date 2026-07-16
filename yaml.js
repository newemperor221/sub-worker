// Mihomo / Clash.Meta YAML generator — self-contained DNS + routing profile
// ======================================================================

function escapeYamlString(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function quote(value) {
  return '"' + escapeYamlString(value) + '"';
}

function dedupeProxyNames(proxies) {
  const seen = new Map();
  return proxies.map((proxy, index) => {
    const raw = (proxy?.name || `节点 ${index + 1}`).trim() || `节点 ${index + 1}`;
    const count = (seen.get(raw) || 0) + 1;
    seen.set(raw, count);
    return {
      ...proxy,
      name: count === 1 ? raw : `${raw} #${count}`,
    };
  });
}

function matchNames(proxies, re) {
  return proxies.filter(p => re.test(p.name)).map(p => p.name);
}

function buildRegionGroups(proxies) {
  return [
    { name: '🇭🇰 香港节点', members: matchNames(proxies, /\bHK\b|香港|港|hong\s*kong/i) },
    { name: '🇹🇼 台湾节点', members: matchNames(proxies, /\bTW\b|台湾|臺灣|taiwan/i) },
    { name: '🇸🇬 新加坡节点', members: matchNames(proxies, /\bSG\b|新加坡|狮城|singapore/i) },
    { name: '🇯🇵 日本节点', members: matchNames(proxies, /\bJP\b|日本|东京|大阪|软银|iij|japan/i) },
    { name: '🇺🇸 美国节点', members: matchNames(proxies, /\bUS\b|美国|洛杉矶|硅谷|纽约|西雅图|圣何塞|达拉斯|堪萨斯|atlanta|los\s*angeles|united\s*states/i) },
  ].filter(group => group.members.length > 0);
}

function appendProxy(lines, p) {
  lines.push(`  - name: ${quote(p.name)}`);
  lines.push(`    type: ${p.type}`);
  lines.push(`    server: ${quote(p.server)}`);
  lines.push(`    port: ${p.port}`);

  if (p.type === 'vless') {
    lines.push(`    uuid: ${quote(p.uuid || '')}`);
    lines.push(`    network: ${quote(p.network || 'tcp')}`);
    lines.push(`    tls: ${Boolean(p.tls)}`);
    lines.push(`    udp: true`);
    lines.push(`    skip-cert-verify: ${Boolean(p['skip-cert-verify'])}`);
    if (p.servername) lines.push(`    servername: ${quote(p.servername)}`);
    if (p.sni) lines.push(`    sni: ${quote(p.sni)}`);
    if (p.flow) lines.push(`    flow: ${quote(p.flow)}`);
    if (p.alpn?.length) lines.push(`    alpn: [${p.alpn.map(quote).join(', ')}]`);
    if (p['client-fingerprint']) lines.push(`    client-fingerprint: ${quote(p['client-fingerprint'])}`);
    if (p['ws-opts']) {
      lines.push('    ws-opts:');
      lines.push(`      path: ${quote(p['ws-opts'].path || '/')}`);
      if (p['ws-opts'].headers?.Host) {
        lines.push('      headers:');
        lines.push(`        Host: ${quote(p['ws-opts'].headers.Host)}`);
      }
    }
    if (p['grpc-opts']) {
      lines.push('    grpc-opts:');
      lines.push(`      grpc-service-name: ${quote(p['grpc-opts']['grpc-service-name'] || '')}`);
    }
    if (p['xhttp-opts']) {
      lines.push('    xhttp-opts:');
      lines.push(`      mode: ${quote(p['xhttp-opts'].mode || 'packet-up')}`);
      lines.push(`      path: ${quote(p['xhttp-opts'].path || '/')}`);
      if (p['xhttp-opts'].host) {
        lines.push(`      host: ${quote(p['xhttp-opts'].host)}`);
      }
    }
    if (p['reality-opts']) {
      lines.push('    reality-opts:');
      lines.push(`      public-key: ${quote(p['reality-opts']['public-key'] || '')}`);
      lines.push(`      short-id: ${quote(p['reality-opts']['short-id'] || '')}`);
    }
  } else if (p.type === 'trojan') {
    lines.push(`    password: ${quote(p.password || '')}`);
    lines.push('    udp: true');
    lines.push(`    skip-cert-verify: ${Boolean(p['skip-cert-verify'])}`);
    if (p.sni) lines.push(`    sni: ${quote(p.sni)}`);
    if (p.alpn?.length) lines.push(`    alpn: [${p.alpn.map(quote).join(', ')}]`);
  } else if (p.type === 'hysteria2') {
    lines.push(`    password: ${quote(p.password || '')}`);
    lines.push('    udp: true');
    if (p.sni) lines.push(`    sni: ${quote(p.sni)}`);
    if (p.alpn?.length) lines.push(`    alpn: [${p.alpn.map(quote).join(', ')}]`);
    if (p.obfs) lines.push(`    obfs: ${quote(p.obfs)}`);
    if (p['obfs-password']) lines.push(`    obfs-password: ${quote(p['obfs-password'])}`);
    if (Number.isFinite(p.up)) lines.push(`    up: ${p.up}`);
    if (Number.isFinite(p.down)) lines.push(`    down: ${p.down}`);
    lines.push(`    skip-cert-verify: ${Boolean(p['skip-cert-verify'])}`);
  }

  lines.push('    keep-alive-interval: 1800');
}

function appendUrlTestGroup(lines, name, members, url = 'http://www.gstatic.com/generate_204') {
  if (!members.length) return;
  lines.push(`  - name: ${quote(name)}`);
  lines.push('    type: url-test');
  lines.push(`    proxies: [${members.map(quote).join(', ')}]`);
  lines.push(`    url: ${quote(url)}`);
  lines.push('    interval: 300');
  lines.push('    tolerance: 50');
}

export function generateClashYaml(inputProxies, subName) {
  const proxies = dedupeProxyNames(inputProxies || []);
  const allNames = proxies.map(p => p.name);
  const regionGroups = buildRegionGroups(proxies);
  const regionNames = regionGroups.map(g => g.name);
  const miscMembers = proxies
    .filter(p => !regionGroups.some(group => group.members.includes(p.name)))
    .map(p => p.name);
  const smartCandidates = ['Auto', ...regionNames, ...(miscMembers.length ? ['🌍 其它地区'] : []), 'DIRECT'];
  const generalCandidates = ['Proxy', 'Auto', ...regionNames, ...(miscMembers.length ? ['🌍 其它地区'] : []), 'DIRECT'];
  const aiCandidates = ['Proxy', 'Auto', '🇸🇬 新加坡节点', '🇯🇵 日本节点', '🇺🇸 美国节点', '🇭🇰 香港节点', 'DIRECT']
    .filter((name, idx, arr) => idx === arr.indexOf(name) && (name === 'DIRECT' || name === 'Proxy' || name === 'Auto' || regionNames.includes(name)));

  const lines = [
    `# 订阅: ${subName}`,
    '# 生成目标: mihomo / Clash.Meta',
    '',
    'mixed-port: 7890',
    'allow-lan: true',
    'bind-address: "*"',
    'mode: rule',
    'log-level: info',
    'ipv6: false',
    'find-process-mode: strict',
    'unified-delay: true',
    'tcp-concurrent: true',
    'geodata-mode: true',
    'geodata-loader: memconservative',
    'global-ua: clash.meta',
    'external-controller: 127.0.0.1:9090',
    '',
    'geox-url:',
    '  geoip: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat"',
    '  geosite: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat"',
    '  mmdb: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb"',
    '',
    'profile:',
    '  store-selected: true',
    '  store-fake-ip: true',
    '',
    'sniffer:',
    '  enable: true',
    '  parse-pure-ip: true',
    '  sniff:',
    '    TLS:',
    '      ports: [443, 8443]',
    '    HTTP:',
    '      ports: [80, 8080-8880]',
    '    QUIC:',
    '      ports: [443, 8443]',
    '',
    'dns:',
    '  enable: true',
    '  ipv6: false',
    '  prefer-h3: false',
    '  use-hosts: true',
    '  use-system-hosts: true',
    '  respect-rules: true',
    '  listen: 127.0.0.1:1053',
    '  enhanced-mode: fake-ip',
    '  fake-ip-range: 198.18.0.1/16',
    '  fake-ip-filter-mode: blacklist',
    '  fake-ip-filter:',
    '    - "*.lan"',
    '    - "*.local"',
    '    - "localhost.ptlogin2.qq.com"',
    '    - "time.*.com"',
    '    - "time.*.gov"',
    '    - "time.*.apple.com"',
    '    - "*.ntp.org"',
    '    - "*.stun.*.*"',
    '    - "stun.*.*"',
    '    - "stun.*.*.*"',
    '    - "*.msftconnecttest.com"',
    '    - "*.msftncsi.com"',
    '  default-nameserver:',
    '    - 223.5.5.5',
    '    - 119.29.29.29',
    '  proxy-server-nameserver:',
    '    - https://doh.pub/dns-query',
    '    - https://dns.alidns.com/dns-query',
    '  nameserver-policy:',
    '    "geosite:private,cn,apple-cn,microsoft@cn,steam@cn,category-games@cn":',
    '      - https://doh.pub/dns-query',
    '      - https://dns.alidns.com/dns-query',
    '    "geosite:google,youtube,github,telegram,netflix,disney,spotify":',
    '      - tls://1.1.1.1',
    '      - tls://8.8.8.8',
    '    "+.openai.com,+.chatgpt.com,+.oaistatic.com,+.oaiusercontent.com":',
    '      - tls://1.1.1.1',
    '      - tls://8.8.8.8',
    '  nameserver:',
    '    - https://doh.pub/dns-query',
    '    - https://dns.alidns.com/dns-query',
    '  fallback:',
    '    - tls://1.1.1.1',
    '    - tls://8.8.8.8',
    '  fallback-filter:',
    '    geoip: true',
    '    geoip-code: CN',
    '    geosite:',
    '      - gfw',
    '    ipcidr:',
    '      - 240.0.0.0/4',
    '    domain:',
    '      - "+.google.com"',
    '      - "+.facebook.com"',
    '      - "+.youtube.com"',
    '      - "+.openai.com"',
    '',
    'proxies:',
  ];

  for (const proxy of proxies) appendProxy(lines, proxy);

  lines.push('');
  lines.push('proxy-groups:');
  lines.push('  - name: "Proxy"');
  lines.push('    type: select');
  lines.push(`    proxies: [${smartCandidates.map(quote).join(', ')}]`);

  appendUrlTestGroup(lines, 'Auto', allNames);

  lines.push('  - name: "🎬 流媒体"');
  lines.push('    type: select');
  lines.push(`    proxies: [${generalCandidates.map(quote).join(', ')}]`);

  lines.push('  - name: "🤖 AI"');
  lines.push('    type: select');
  lines.push(`    proxies: [${aiCandidates.map(quote).join(', ')}]`);

  lines.push('  - name: "📨 Telegram"');
  lines.push('    type: select');
  lines.push(`    proxies: [${['Proxy', 'Auto', ...regionNames, 'DIRECT'].filter((name, idx, arr) => idx === arr.indexOf(name)).map(quote).join(', ')}]`);

  lines.push('  - name: "🔎 Google"');
  lines.push('    type: select');
  lines.push(`    proxies: [${generalCandidates.map(quote).join(', ')}]`);

  lines.push('  - name: "🐙 GitHub"');
  lines.push('    type: select');
  lines.push(`    proxies: [${['Proxy', 'Auto', ...regionNames, 'DIRECT'].filter((name, idx, arr) => idx === arr.indexOf(name)).map(quote).join(', ')}]`);

  lines.push('  - name: "🍎 Apple"');
  lines.push('    type: select');
  lines.push(`    proxies: [${['DIRECT', 'Proxy', 'Auto', ...regionNames].filter((name, idx, arr) => idx === arr.indexOf(name)).map(quote).join(', ')}]`);

  lines.push('  - name: "🪟 Microsoft"');
  lines.push('    type: select');
  lines.push(`    proxies: [${['DIRECT', 'Proxy', 'Auto', ...regionNames].filter((name, idx, arr) => idx === arr.indexOf(name)).map(quote).join(', ')}]`);

  lines.push('  - name: "🎮 游戏"');
  lines.push('    type: select');
  lines.push(`    proxies: [${['DIRECT', 'Proxy', 'Auto', ...regionNames].filter((name, idx, arr) => idx === arr.indexOf(name)).map(quote).join(', ')}]`);

  if (miscMembers.length) appendUrlTestGroup(lines, '🌍 其它地区', miscMembers);
  for (const group of regionGroups) appendUrlTestGroup(lines, group.name, group.members);

  lines.push('  - name: "AdBlock"');
  lines.push('    type: select');
  lines.push('    proxies: [REJECT, DIRECT]');

  lines.push('');
  lines.push('rules:');
  lines.push('  - GEOSITE,category-ads-all,AdBlock');
  lines.push('  - GEOSITE,private,DIRECT');
  lines.push('  - DOMAIN-SUFFIX,local,DIRECT');
  lines.push('  - DOMAIN-SUFFIX,lan,DIRECT');
  lines.push('  - DOMAIN-SUFFIX,arpa,DIRECT');
  lines.push('  - DOMAIN-SUFFIX,openai.com,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,chatgpt.com,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,oaistatic.com,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,oaiusercontent.com,🤖 AI');
  lines.push('  - GEOSITE,telegram,📨 Telegram');
  lines.push('  - GEOSITE,github,🐙 GitHub');
  lines.push('  - GEOSITE,google,🔎 Google');
  lines.push('  - GEOSITE,youtube,🎬 流媒体');
  lines.push('  - GEOSITE,netflix,🎬 流媒体');
  lines.push('  - GEOSITE,disney,🎬 流媒体');
  lines.push('  - GEOSITE,spotify,🎬 流媒体');
  lines.push('  - GEOSITE,apple-cn,DIRECT');
  lines.push('  - GEOSITE,apple,🍎 Apple');
  lines.push('  - GEOSITE,microsoft@cn,DIRECT');
  lines.push('  - GEOSITE,microsoft,🪟 Microsoft');
  lines.push('  - GEOSITE,steam@cn,DIRECT');
  lines.push('  - GEOSITE,category-games@cn,DIRECT');
  lines.push('  - GEOSITE,category-games,🎮 游戏');
  lines.push('  - GEOIP,LAN,DIRECT,no-resolve');
  lines.push('  - GEOSITE,cn,DIRECT');
  lines.push('  - GEOIP,CN,DIRECT,no-resolve');
  lines.push('  - MATCH,Proxy');

  return lines.join('\n');
}
