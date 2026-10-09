// Mihomo / Clash.Meta YAML generator — enriched DNS + streaming / AI template
// =======================================================================

function quote(value) {
  // JSON 字符串是合法的 YAML 双引号标量，并会完整转义换行/控制字符。
  return JSON.stringify(String(value ?? ''));
}

function commentText(value) {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim();
}

function dedupeProxyNames(proxies) {
  const reserved = new Set([
    'DIRECT', 'REJECT', 'Proxy', 'AdBlock',
    '🇺🇸 美国节点', '🇺🇸 美国固定节点', '🇸🇬 新加坡节点', '🇯🇵 日本节点',
    '🇭🇰 香港节点', '🇳🇬 尼日利亚节点', '🇬🇧 英国节点', '🇩🇪 德国节点', '🌍 其它地区',
    '🤖 AI', '📲 Telegram', '🔎 Google', '🎵 Spotify', '𝕏 Twitter', '🎬 Netflix',
    '📹 YouTube', '📖 Reddit', '🎶 TikTok', '🐙 GitHub', '💳 PayPal', '♾️ Meta',
    '🍎 Apple', '🪟 Microsoft', '🎮 游戏', '🎬 流媒体', '🐦 社交媒体',
  ]);
  return proxies.map((proxy, index) => {
    const raw = (proxy?.name || `节点 ${index + 1}`).trim() || `节点 ${index + 1}`;
    let name = raw;
    let count = 2;
    while (reserved.has(name)) name = `${raw} #${count++}`;
    reserved.add(name);
    return {
      ...proxy,
      name,
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
    // 只识别名称开头的出口地区，避免“新加坡(东京中转)”被同时归到日本组。
    { name: '🇺🇸 美国节点', re: /^(?:🇺🇸|美国|美國|United\s*States|USA|US|Los\s*Angeles|San\s*Jose|Seattle|New\s*York|Dallas|Chicago)(?:[^A-Za-z]|\d|$)/i },
    { name: '🇸🇬 新加坡节点', re: /^(?:🇸🇬|新加坡|狮城|獅城|Singapore|SGP|SG)(?:[^A-Za-z]|\d|$)/i },
    { name: '🇯🇵 日本节点', re: /^(?:🇯🇵|日本|东京|東京|大阪|Japan|Tokyo|Osaka|JPN|JP)(?:[^A-Za-z]|\d|$)/i },
    { name: '🇭🇰 香港节点', re: /^(?:🇭🇰|香港|Hong\s*Kong|HongKong|HKG|HK)(?:[^A-Za-z]|\d|$)/i },
    { name: '🇳🇬 尼日利亚节点', re: /^(?:🇳🇬|尼日利亚|尼日利亞|奈及利亚|奈及利亞|Nigeria|Nigerian|Lagos|Abuja|拉各斯|阿布贾|NGA|NG)(?:[^A-Za-z]|\d|$)/i },
    { name: '🇬🇧 英国节点', re: /^(?:🇬🇧|英国|英國|伦敦|倫敦|United\s*Kingdom|England|London|Manchester|GBR|UK|GB)(?:[^A-Za-z]|\d|$)/i },
    { name: '🇩🇪 德国节点', re: /^(?:🇩🇪|德国|德國|Germany|Berlin|Frankfurt|Munich|法兰克福|法蘭克福|慕尼黑|柏林|DEU|DE)(?:[^A-Za-z]|\d|$)/i },
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
    if (p.tls) lines.push(`    skip-cert-verify: ${Boolean(p['skip-cert-verify'])}`);
    if (p.tls && p.servername) lines.push(`    servername: ${quote(p.servername)}`);
    if (p.flow) lines.push(`    flow: ${quote(p.flow)}`);
    if (p.encryption) lines.push(`    encryption: ${quote(p.encryption)}`);
    if (p['packet-encoding']) lines.push(`    packet-encoding: ${quote(p['packet-encoding'])}`);
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
      if (p['xhttp-opts'].mode) lines.push(`      mode: ${quote(p['xhttp-opts'].mode)}`);
      lines.push(`      path: ${quote(p['xhttp-opts'].path || '/')}`);
      if (p['xhttp-opts'].host) lines.push(`      host: ${quote(p['xhttp-opts'].host)}`);
    }
    for (const key of ['http-opts', 'h2-opts']) {
      if (!p[key]) continue;
      lines.push(`    ${key}:`);
      if (p[key].path?.length) lines.push(`      path: [${p[key].path.map(quote).join(', ')}]`);
      if (p[key].host?.length) lines.push(`      host: [${p[key].host.map(quote).join(', ')}]`);
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
    if (p.network) lines.push(`    network: ${quote(p.network)}`);
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
  } else if (p.type === 'hysteria2') {
    lines.push(`    password: ${quote(p.password || '')}`);
    lines.push('    udp: true');
    if (p.sni) lines.push(`    sni: ${quote(p.sni)}`);
    if (p.alpn?.length) lines.push(`    alpn: [${p.alpn.map(quote).join(', ')}]`);
    if (p.obfs) lines.push(`    obfs: ${quote(p.obfs)}`);
    if (p['obfs-password']) lines.push(`    obfs-password: ${quote(p['obfs-password'])}`);
    if (Number.isFinite(p.up)) lines.push(`    up: ${p.up}`);
    if (Number.isFinite(p.down)) lines.push(`    down: ${p.down}`);
    if (p.fingerprint) lines.push(`    fingerprint: ${quote(p.fingerprint)}`);
    lines.push(`    skip-cert-verify: ${Boolean(p['skip-cert-verify'])}`);
  }
}

function appendSelectGroup(lines, name, members) {
  if (!members.length) return;
  lines.push(`  - name: ${quote(name)}`);
  lines.push('    type: select');
  lines.push(`    proxies: [${uniq(members).map(quote).join(', ')}]`);
}

export function generateClashYaml(inputProxies, subName) {
  const proxies = dedupeProxyNames(inputProxies || []);
  const regionGroups = buildRegionGroups(proxies);
  const regionNames = regionGroups.map(g => g.name);
  const miscMembers = proxies
    .filter(p => !regionGroups.some(group => group.members.includes(p.name)))
    .map(p => p.name);

  const proxyChoices = uniq([...regionNames, ...(miscMembers.length ? ['🌍 其它地区'] : []), 'DIRECT']);
  const commonChoices = uniq(['Proxy', ...regionNames, ...(miscMembers.length ? ['🌍 其它地区'] : []), 'DIRECT']);
  const membersOf = name => findRegionGroup(regionGroups, name)?.members || [];
  const availableRegions = names => names.filter(name => regionNames.includes(name));
  const usMembers = membersOf('🇺🇸 美国节点');
  const usFixedChoices = usMembers.length ? usMembers : ['Proxy', 'DIRECT'];
  const usServiceChoices = uniq(['🇺🇸 美国固定节点', 'Proxy', 'DIRECT']);
  const serviceChoices = {
    telegram: uniq([...availableRegions(['🇸🇬 新加坡节点', '🇭🇰 香港节点', '🇺🇸 美国节点', '🇯🇵 日本节点', '🇬🇧 英国节点', '🇩🇪 德国节点']), 'Proxy', 'DIRECT']),
    spotify: uniq([...availableRegions(['🇺🇸 美国节点', '🇳🇬 尼日利亚节点']), 'Proxy', 'DIRECT']),
    twitter: uniq([...availableRegions(['🇭🇰 香港节点', '🇯🇵 日本节点', '🇸🇬 新加坡节点', '🇺🇸 美国节点', '🇬🇧 英国节点', '🇩🇪 德国节点']), 'Proxy', 'DIRECT']),
    netflix: uniq([...availableRegions(['🇸🇬 新加坡节点', '🇳🇬 尼日利亚节点']), 'Proxy', 'DIRECT']),
    youtube: uniq([...availableRegions(['🇺🇸 美国节点']), '🇺🇸 美国固定节点', 'Proxy', 'DIRECT']),
    reddit: uniq(['Proxy', ...regionNames, ...(miscMembers.length ? ['🌍 其它地区'] : []), 'DIRECT']),
    tiktok: uniq([...availableRegions(['🇸🇬 新加坡节点', '🇺🇸 美国节点', '🇯🇵 日本节点', '🇭🇰 香港节点', '🇳🇬 尼日利亚节点', '🇬🇧 英国节点', '🇩🇪 德国节点']), 'Proxy', 'DIRECT']),
    github: uniq([...availableRegions(['🇺🇸 美国节点', '🇸🇬 新加坡节点', '🇯🇵 日本节点', '🇭🇰 香港节点', '🇬🇧 英国节点', '🇩🇪 德国节点']), 'Proxy', 'DIRECT']),
    meta: uniq([...availableRegions(['🇯🇵 日本节点', '🇸🇬 新加坡节点', '🇺🇸 美国节点', '🇭🇰 香港节点', '🇬🇧 英国节点', '🇩🇪 德国节点']), 'Proxy', 'DIRECT']),
  };
  const directPreferredChoices = uniq(['DIRECT', 'Proxy', ...regionNames, ...(miscMembers.length ? ['🌍 其它地区'] : [])]);

  const lines = [
    `# 订阅: ${commentText(subName)}`,
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
    '    "geosite:openai,google-gemini":',
    '      - https://1.1.1.1/dns-query#🤖 AI',
    '      - https://8.8.8.8/dns-query#🤖 AI',
    '    "+.chatgpt.com,+.openai.com,+.oaistatic.com,+.oaiusercontent.com,+.claude.ai":',
    '      - https://1.1.1.1/dns-query#🤖 AI',
    '      - https://8.8.8.8/dns-query#🤖 AI',
    '    "geosite:google,youtube":',
    '      - https://1.1.1.1/dns-query#🔎 Google',
    '      - https://8.8.8.8/dns-query#🔎 Google',
    '    "geosite:twitter":',
    '      - https://1.1.1.1/dns-query#𝕏 Twitter',
    '      - https://8.8.8.8/dns-query#𝕏 Twitter',
    '    "geosite:netflix":',
    '      - https://1.1.1.1/dns-query#🎬 Netflix',
    '      - https://8.8.8.8/dns-query#🎬 Netflix',
    '    "geosite:spotify":',
    '      - https://1.1.1.1/dns-query#🎵 Spotify',
    '      - https://8.8.8.8/dns-query#🎵 Spotify',
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
  if (miscMembers.length) appendSelectGroup(lines, '🌍 其它地区', miscMembers);
  const deferredRegionNames = new Set([
    '🇺🇸 美国节点', '🇸🇬 新加坡节点', '🇯🇵 日本节点', '🇭🇰 香港节点', '🇳🇬 尼日利亚节点',
  ]);
  for (const group of regionGroups) {
    if (!deferredRegionNames.has(group.name)) appendSelectGroup(lines, group.name, group.members);
  }
  appendSelectGroup(lines, '🇺🇸 美国固定节点', usFixedChoices);

  appendSelectGroup(lines, '🤖 AI', usServiceChoices);
  appendSelectGroup(lines, '📲 Telegram', serviceChoices.telegram);
  appendSelectGroup(lines, '🔎 Google', usServiceChoices);
  appendSelectGroup(lines, '🎵 Spotify', serviceChoices.spotify);
  appendSelectGroup(lines, '𝕏 Twitter', serviceChoices.twitter);
  appendSelectGroup(lines, '🎬 Netflix', serviceChoices.netflix);
  appendSelectGroup(lines, '📹 YouTube', serviceChoices.youtube);
  appendSelectGroup(lines, '📖 Reddit', serviceChoices.reddit);
  appendSelectGroup(lines, '🎶 TikTok', serviceChoices.tiktok);
  appendSelectGroup(lines, '🐙 GitHub', serviceChoices.github);
  appendSelectGroup(lines, '💳 PayPal', usServiceChoices);
  appendSelectGroup(lines, '♾️ Meta', serviceChoices.meta);
  appendSelectGroup(lines, '🎬 流媒体', commonChoices);
  appendSelectGroup(lines, '🐦 社交媒体', commonChoices);
  appendSelectGroup(lines, '🍎 Apple', directPreferredChoices);
  appendSelectGroup(lines, '🪟 Microsoft', directPreferredChoices);
  appendSelectGroup(lines, '🎮 游戏', directPreferredChoices);
  for (const group of regionGroups) {
    if (deferredRegionNames.has(group.name)) appendSelectGroup(lines, group.name, group.members);
  }
  appendSelectGroup(lines, 'AdBlock', ['REJECT', 'DIRECT']);

  lines.push('');
  lines.push('rules:');
  lines.push('  - GEOSITE,category-ads-all,AdBlock');
  lines.push('  - GEOSITE,private,DIRECT');
  lines.push('  - DOMAIN-SUFFIX,local,DIRECT');
  lines.push('  - DOMAIN-SUFFIX,lan,DIRECT');
  lines.push('  - DOMAIN-SUFFIX,arpa,DIRECT');
  // 特例先于综合 AI：Grok 跟随 X，Copilot 跟随 GitHub。
  lines.push('  - DOMAIN-SUFFIX,x.ai,𝕏 Twitter');
  lines.push('  - DOMAIN-SUFFIX,grok.com,𝕏 Twitter');
  lines.push('  - DOMAIN-SUFFIX,githubcopilot.com,🐙 GitHub');
  lines.push('  - DOMAIN-SUFFIX,copilot-proxy.githubusercontent.com,🐙 GitHub');
  lines.push('  - GEOSITE,github,🐙 GitHub');
  lines.push('  - GEOSITE,openai,🤖 AI');
  lines.push('  - GEOSITE,google-gemini,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,chatgpt.com,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,openai.com,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,oaistatic.com,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,oaiusercontent.com,🤖 AI');
  lines.push('  - GEOSITE,anthropic,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,claude.ai,🤖 AI');
  lines.push('  - GEOSITE,youtube,📹 YouTube');
  lines.push('  - GEOSITE,google,🔎 Google');
  lines.push('  - GEOSITE,telegram,📲 Telegram');
  lines.push('  - GEOSITE,spotify,🎵 Spotify');
  lines.push('  - GEOSITE,twitter,𝕏 Twitter');
  lines.push('  - DOMAIN-SUFFIX,x.com,𝕏 Twitter');
  lines.push('  - DOMAIN-SUFFIX,twimg.com,𝕏 Twitter');
  lines.push('  - GEOSITE,netflix,🎬 Netflix');
  lines.push('  - DOMAIN-SUFFIX,nflxvideo.net,🎬 Netflix');
  lines.push('  - GEOSITE,reddit,📖 Reddit');
  lines.push('  - GEOSITE,tiktok,🎶 TikTok');
  lines.push('  - DOMAIN-SUFFIX,paypal.com,💳 PayPal');
  lines.push('  - GEOSITE,facebook,♾️ Meta');
  lines.push('  - DOMAIN-SUFFIX,instagram.com,♾️ Meta');
  lines.push('  - DOMAIN-SUFFIX,threads.net,♾️ Meta');
  lines.push('  - DOMAIN-SUFFIX,whatsapp.com,♾️ Meta');
  lines.push('  - GEOSITE,disney,🎬 流媒体');
  lines.push('  - GEOSITE,primevideo,🎬 流媒体');
  lines.push('  - GEOSITE,hbo,🎬 流媒体');
  lines.push('  - DOMAIN-SUFFIX,scdn.co,🎵 Spotify');
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
