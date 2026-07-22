// Mihomo / Clash.Meta YAML generator — enriched DNS + streaming / AI template
// =======================================================================

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

function uniq(values) {
  return values.filter((value, index) => value && index === values.indexOf(value));
}

function buildRegionGroups(proxies) {
  const specs = [
    { name: '🇬🇧 英国节点', re: /🇬🇧|\bUK\b|\bGB\b|英国|英國|伦敦|倫敦|london|united\s*kingdom|great\s*britain/i },
    { name: '🇳🇬 尼日利亚节点', re: /🇳🇬|\bNG\b|尼日利亚|尼日利亞|奈及利亚|奈及利亞|nigeria|lagos|abuja/i },
    { name: '🇭🇰 香港节点', re: /🇭🇰|\bHK\b|香港|港|hong\s*kong/i },
    { name: '🇹🇼 台湾节点', re: /🇹🇼|\bTW\b|台湾|臺灣|taiwan/i },
    { name: '🇸🇬 新加坡节点', re: /🇸🇬|\bSG\b|新加坡|狮城|singapore/i },
    { name: '🇯🇵 日本节点', re: /🇯🇵|\bJP\b|日本|东京|東京|大阪|软银|iij|japan/i },
    { name: '🇺🇸 美国节点', re: /🇺🇸|\bUS\b|\bUSA\b|美国|美國|洛杉矶|洛杉磯|硅谷|纽约|紐約|西雅图|西雅圖|圣何塞|聖何塞|达拉斯|達拉斯|堪萨斯|堪薩斯|atlanta|los\s*angeles|united\s*states/i },
  ];
  const used = new Set();
  const groups = [];
  for (const spec of specs) {
    const members = proxies
      .filter(p => !used.has(p.name) && spec.re.test(p.name))
      .map(p => p.name);
    for (const name of members) used.add(name);
    if (members.length) groups.push({ name: spec.name, members });
  }
  return groups;
}

function findRegionGroup(regionGroups, name) {
  return regionGroups.find(group => group.name === name);
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
    lines.push('    udp: true');
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
      if (p['xhttp-opts'].host) lines.push(`      host: ${quote(p['xhttp-opts'].host)}`);
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

function appendSelectGroup(lines, name, members) {
  if (!members.length) return;
  lines.push(`  - name: ${quote(name)}`);
  lines.push('    type: select');
  lines.push(`    proxies: [${uniq(members).map(quote).join(', ')}]`);
}

function appendUrlTestGroup(lines, name, members, url = 'http://www.gstatic.com/generate_204') {
  if (!members.length) return;
  lines.push(`  - name: ${quote(name)}`);
  lines.push('    type: url-test');
  lines.push(`    proxies: [${uniq(members).map(quote).join(', ')}]`);
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

  const proxyChoices = uniq(['Auto', ...regionNames, ...(miscMembers.length ? ['🌍 其它地区'] : []), 'DIRECT']);
  const commonChoices = uniq(['Proxy', 'Auto', ...regionNames, ...(miscMembers.length ? ['🌍 其它地区'] : []), 'DIRECT']);
  const usGroup = findRegionGroup(regionGroups, '🇺🇸 美国节点');
  const sgGroup = findRegionGroup(regionGroups, '🇸🇬 新加坡节点');
  const usAppChoices = uniq([...(usGroup ? ['🇺🇸 美国节点'] : []), ...(usGroup?.members || []), 'Proxy', 'Auto', 'DIRECT']);
  const sgAppChoices = uniq([...(sgGroup ? ['🇸🇬 新加坡节点'] : []), ...(sgGroup?.members || []), 'Proxy', 'Auto', 'DIRECT']);
  const aiChoices = usAppChoices;
  const overseasChoices = uniq(['Proxy', 'Auto', '🇭🇰 香港节点', '🇹🇼 台湾节点', '🇸🇬 新加坡节点', '🇯🇵 日本节点', '🇺🇸 美国节点', ...(miscMembers.length ? ['🌍 其它地区'] : []), 'DIRECT'].filter(name => name === 'Proxy' || name === 'Auto' || name === 'DIRECT' || name === '🌍 其它地区' || regionNames.includes(name)));
  const directPreferredChoices = uniq(['DIRECT', 'Proxy', 'Auto', ...regionNames, ...(miscMembers.length ? ['🌍 其它地区'] : [])]);

  const lines = [
    `# 订阅: ${subName}`,
    '# 生成目标: mihomo / Clash.Meta',
    '# 风格: fake-ip + 多组策略 + 流媒体/AI/常见服务分流',
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
    'global-client-fingerprint: chrome',
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
    '  skip-domain:',
    '    - "Mijia Cloud"',
    '    - "+.push.apple.com"',
    '',
    'dns:',
    '  enable: true',
    '  cache-algorithm: arc',
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
    '    - "*.arpa"',
    '    - "localhost.ptlogin2.qq.com"',
    '    - "time.*.com"',
    '    - "time.*.gov"',
    '    - "time.*.apple.com"',
    '    - "time1.cloud.tencent.com"',
    '    - "time.ustc.edu.cn"',
    '    - "*.ntp.org"',
    '    - "*.stun.*.*"',
    '    - "stun.*.*"',
    '    - "stun.*.*.*"',
    '    - "*.msftconnecttest.com"',
    '    - "*.msftncsi.com"',
    '    - "*.srv.nintendo.net"',
    '    - "*.stun.playstation.net"',
    '    - "xbox.*.*.microsoft.com"',
    '    - "*.xboxlive.com"',
    '    - "*.ipv6.microsoft.com"',
    '  default-nameserver:',
    '    - 1.1.1.1',
    '    - 8.8.8.8',
    '  proxy-server-nameserver:',
    '    - https://1.1.1.1/dns-query',
    '    - https://8.8.8.8/dns-query',
    '  direct-nameserver:',
    '    - https://1.1.1.1/dns-query',
    '    - https://8.8.8.8/dns-query',
    '  direct-nameserver-follow-policy: true',
    '  nameserver-policy:',
    '    "geosite:private,cn,apple-cn,microsoft@cn,steam@cn,category-games@cn,bilibili":',
    '      - https://1.1.1.1/dns-query',
    '      - https://8.8.8.8/dns-query',
    '    "geosite:openai,google-gemini,google,youtube,spotify":',
    '      - https://1.1.1.1/dns-query#🇺🇸 美国应用',
    '      - https://8.8.8.8/dns-query#🇺🇸 美国应用',
    '    "+.chatgpt.com,+.openai.com,+.oaistatic.com,+.oaiusercontent.com,+.spotify.com,+.scdn.co":',
    '      - https://1.1.1.1/dns-query#🇺🇸 美国应用',
    '      - https://8.8.8.8/dns-query#🇺🇸 美国应用',
    '    "geosite:twitter,netflix":',
    '      - https://1.1.1.1/dns-query#🇸🇬 新加坡应用',
    '      - https://8.8.8.8/dns-query#🇸🇬 新加坡应用',
    '    "+.x.com,+.twimg.com,+.nflxvideo.net,+.netflix.com,+.netflix.net":',
    '      - https://1.1.1.1/dns-query#🇸🇬 新加坡应用',
    '      - https://8.8.8.8/dns-query#🇸🇬 新加坡应用',
    '    "geosite:anthropic,github,telegram,facebook,disney,primevideo,hbo,tiktok,bahamut":',
    '      - https://1.1.1.1/dns-query#Proxy',
    '      - https://8.8.8.8/dns-query#Proxy',
    '    "+.claude.ai":',
    '      - https://1.1.1.1/dns-query#Proxy',
    '      - https://8.8.8.8/dns-query#Proxy',
    '  nameserver:',
    '    - https://1.1.1.1/dns-query#Proxy',
    '    - https://8.8.8.8/dns-query#Proxy',
    '    - https://9.9.9.9/dns-query#Proxy',
    '  fallback:',
    '    - https://1.1.1.1/dns-query#Proxy',
    '    - https://8.8.8.8/dns-query#Proxy',
    '    - https://9.9.9.9/dns-query#Proxy',
    '  fallback-filter:',
    '    geoip: true',
    '    geoip-code: CN',
    '    geosite:',
    '      - gfw',
    '    ipcidr:',
    '      - 240.0.0.0/4',
    '      - 0.0.0.0/32',
    '      - 127.0.0.1/32',
    '      - 100.64.0.0/10',
    '    domain:',
    '      - "+.google.com"',
    '      - "+.facebook.com"',
    '      - "+.youtube.com"',
    '      - "+.openai.com"',
    '      - "+.chatgpt.com"',
    '',
    'proxies:',
  ];

  for (const proxy of proxies) appendProxy(lines, proxy);

  lines.push('');
  lines.push('proxy-groups:');
  appendSelectGroup(lines, 'Proxy', proxyChoices);
  appendUrlTestGroup(lines, 'Auto', allNames);
  appendSelectGroup(lines, '🇺🇸 美国应用', usAppChoices);
  appendSelectGroup(lines, '🇸🇬 新加坡应用', sgAppChoices);
  appendSelectGroup(lines, '🎬 流媒体', commonChoices);
  appendSelectGroup(lines, '🤖 AI', aiChoices);
  appendSelectGroup(lines, '📨 Telegram', overseasChoices);
  appendSelectGroup(lines, '🔎 Google', commonChoices);
  appendSelectGroup(lines, '🐙 GitHub', commonChoices);
  appendSelectGroup(lines, '🐦 社交媒体', commonChoices);
  appendSelectGroup(lines, '🍎 Apple', directPreferredChoices);
  appendSelectGroup(lines, '🪟 Microsoft', directPreferredChoices);
  appendSelectGroup(lines, '🎮 游戏', directPreferredChoices);

  if (miscMembers.length) appendUrlTestGroup(lines, '🌍 其它地区', miscMembers);
  for (const group of regionGroups) appendUrlTestGroup(lines, group.name, group.members);

  appendSelectGroup(lines, 'AdBlock', ['REJECT', 'DIRECT']);

  lines.push('');
  lines.push('rules:');
  lines.push('  - GEOSITE,category-ads-all,AdBlock');
  lines.push('  - GEOSITE,private,DIRECT');
  lines.push('  - DOMAIN-SUFFIX,local,DIRECT');
  lines.push('  - DOMAIN-SUFFIX,lan,DIRECT');
  lines.push('  - DOMAIN-SUFFIX,arpa,DIRECT');
  lines.push('  - GEOSITE,openai,🤖 AI');
  lines.push('  - GEOSITE,google-gemini,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,chatgpt.com,🇺🇸 美国应用');
  lines.push('  - DOMAIN-SUFFIX,openai.com,🇺🇸 美国应用');
  lines.push('  - DOMAIN-SUFFIX,oaistatic.com,🇺🇸 美国应用');
  lines.push('  - DOMAIN-SUFFIX,oaiusercontent.com,🇺🇸 美国应用');
  lines.push('  - GEOSITE,anthropic,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,claude.ai,🤖 AI');
  lines.push('  - GEOSITE,telegram,📨 Telegram');
  lines.push('  - GEOSITE,github,🐙 GitHub');
  lines.push('  - GEOSITE,google,🇺🇸 美国应用');
  lines.push('  - GEOSITE,youtube,🇺🇸 美国应用');
  lines.push('  - GEOSITE,twitter,🇸🇬 新加坡应用');
  lines.push('  - DOMAIN-SUFFIX,x.com,🇸🇬 新加坡应用');
  lines.push('  - DOMAIN-SUFFIX,twimg.com,🇸🇬 新加坡应用');
  lines.push('  - GEOSITE,facebook,🐦 社交媒体');
  lines.push('  - GEOSITE,tiktok,🐦 社交媒体');
  lines.push('  - GEOSITE,netflix,🇸🇬 新加坡应用');
  lines.push('  - DOMAIN-SUFFIX,nflxvideo.net,🇸🇬 新加坡应用');
  lines.push('  - GEOSITE,disney,🎬 流媒体');
  lines.push('  - GEOSITE,primevideo,🎬 流媒体');
  lines.push('  - GEOSITE,hbo,🎬 流媒体');
  lines.push('  - GEOSITE,spotify,🇺🇸 美国应用');
  lines.push('  - DOMAIN-SUFFIX,scdn.co,🇺🇸 美国应用');
  lines.push('  - GEOSITE,bahamut,🎬 流媒体');
  lines.push('  - GEOSITE,bilibili,DIRECT');
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
