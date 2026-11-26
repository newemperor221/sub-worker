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
  const otherRegions = miscMembers.length ? ['🌍 其它地区'] : [];

  const membersOf = name => findRegionGroup(regionGroups, name)?.members || [];
  const usMembers = membersOf('🇺🇸 美国节点');

  // 与「出去看看」同步。节点仍由订阅提供，地区组只包含当前存在的节点。
  const US = '🇺🇸 美国节点';
  const USF = '🇺🇸 美国固定节点';
  const SG = '🇸🇬 新加坡节点';
  const JP = '🇯🇵 日本节点';
  const HK = '🇭🇰 香港节点';
  const NG = '🇳🇬 尼日利亚节点';
  const UK = '🇬🇧 英国节点';
  const DE = '🇩🇪 德国节点';
  const hasGroup = name => name === USF || regionNames.includes(name);
  const pick = names => names.filter(hasGroup);

  const nodeNames = new Set(proxies.map(proxy => proxy.name));
  const cn2 = '洛杉矶 CN2';
  const losAngelesFirst = ['洛杉矶', cn2].filter(name => nodeNames.has(name));
  const cn2First = [...losAngelesFirst].reverse();
  const miscPreferred = cn2First.filter(name => miscMembers.includes(name));
  const githubDefault = nodeNames.has(cn2) ? cn2 : USF;

  // 其它订阅仍可通过固定美国组优先选择名称含 CN2 的美国节点。
  const usFixedMembers = uniq([
    ...losAngelesFirst,
    ...usMembers.filter(name => /cn2/i.test(name)),
    ...usMembers,
  ]);
  const usFixedChoices = usFixedMembers.length
    ? usFixedMembers
    : ['Proxy', 'DIRECT'];

  const serviceGroups = [
    ['🤖 AI', uniq([...losAngelesFirst, USF, 'Proxy', 'DIRECT'])],
    ['📲 Telegram', uniq([...pick([SG, JP]), 'Proxy', 'DIRECT'])],
    ['🔎 Google', uniq([...losAngelesFirst, USF, 'Proxy', 'DIRECT'])],
    ['🎵 Spotify', uniq([...pick([NG]), 'Proxy', 'DIRECT'])],
    ['𝕏 Twitter', uniq([...cn2First, ...pick([US, JP, SG]), 'Proxy', 'DIRECT'])],
    ['🎬 Netflix', uniq([...pick([SG, NG]), 'Proxy', 'DIRECT'])],
    ['📹 YouTube', uniq([...cn2First, ...pick([US, USF]), 'Proxy', 'DIRECT'])],
    ['📖 Reddit', uniq([...losAngelesFirst, ...pick([US]), 'Proxy', ...pick([SG, JP, NG]), ...otherRegions, 'DIRECT'])],
    ['🎶 TikTok', uniq([...cn2First, ...pick([US, SG, JP, NG]), 'Proxy', 'DIRECT'])],
    ['🐙 GitHub', uniq([githubDefault, ...pick([SG, JP]), 'Proxy', 'DIRECT'])],
    ['💳 PayPal', uniq([...losAngelesFirst, USF, 'Proxy', 'DIRECT'])],
    ['♾️ Meta', uniq([...losAngelesFirst, ...pick([US, JP, SG]), 'Proxy', 'DIRECT'])],
    ['🎬 流媒体', uniq(['Proxy', ...pick([SG, JP, NG]), ...otherRegions, 'DIRECT'])],
    ['🐦 社交媒体', uniq(['Proxy', ...pick([SG, JP, NG]), ...otherRegions, 'DIRECT'])],
    ['🍎 Apple', uniq(['DIRECT', 'Proxy', ...pick([SG, JP, NG]), ...otherRegions])],
    ['🪟 Microsoft', uniq(['DIRECT', 'Proxy', ...pick([SG, JP, NG]), ...otherRegions])],
    ['🎮 游戏', uniq([...pick([SG, JP]), 'DIRECT', 'Proxy', ...pick([NG]), ...otherRegions])],
  ];

  const deferredRegionNames = new Set([US, SG, JP, HK, NG]);

  const lines = [
    `# 订阅: ${commentText(subName)}`,
    '# 生成目标: mihomo / Clash.Meta',
    '# 路由与 DNS 模板来源: newemperor221/mt3600be-mihomo mihomo.yaml',
    '',
    'mixed-port: 7893',
    'port: 7890',
    'socks-port: 7891',
    'redir-port: 7892',
    'tproxy-port: 7895',
    'allow-lan: false',
    'bind-address: 127.0.0.1',
    'mode: rule',
    'log-level: warning',
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
    '  geoip: https://testingcf.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat',
    '  geosite: https://testingcf.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat',
    '  mmdb: https://testingcf.jsdelivr.net/gh/alecthw/mmdb_china_ip_list@release/lite/Country.mmdb',
    '  asn: https://testingcf.jsdelivr.net/gh/xishang0128/geoip@release/GeoLite2-ASN.mmdb',
    '',
    'profile:',
    '  store-selected: true',
    '  store-fake-ip: true',
    '',
    'sniffer:',
    '  enable: true',
    '  override-destination: false',
    '  sniff:',
    '    QUIC:',
    '      ports:',
    '      - 443',
    '    TLS:',
    '      ports:',
    '      - 443',
    '      - 8443',
    '    HTTP:',
    '      ports:',
    '      - 80',
    '      - 8080-8880',
    '      override-destination: false',
    '  force-domain:',
    '  - "+.netflix.com"',
    '  - "+.nflxvideo.net"',
    '  - "+.amazonaws.com"',
    '  - "+.media.dssott.com"',
    '  skip-domain:',
    '  - Mijia Cloud',
    '  - dlg.io.mi.com',
    '  - "+.oray.com"',
    '  - "+.sunlogin.net"',
    '  - "+.push.apple.com"',
    '  parse-pure-ip: true',
    '',
    'dns:',
    '  enable: true',
    '  cache-algorithm: arc',
    '  ipv6: false',
    '  prefer-h3: false',
    '  use-hosts: true',
    '  use-system-hosts: true',
    '  respect-rules: true',
    '  listen: 127.0.0.1:7874',
    '  enhanced-mode: fake-ip',
    '  fake-ip-range: 198.18.0.1/16',
    '  fake-ip-filter-mode: blacklist',
    '  fake-ip-filter:',
    '  - "*.lan"',
    '  - "*.local"',
    '  - "*.arpa"',
    '  - localhost.ptlogin2.qq.com',
    '  - time.*.com',
    '  - time.*.gov',
    '  - time.*.apple.com',
    '  - time1.cloud.tencent.com',
    '  - time.ustc.edu.cn',
    '  - "*.ntp.org"',
    '  - "*.stun.*.*"',
    '  - stun.*.*',
    '  - stun.*.*.*',
    '  - "*.msftconnecttest.com"',
    '  - "*.msftncsi.com"',
    '  - "*.srv.nintendo.net"',
    '  - "*.stun.playstation.net"',
    '  - xbox.*.*.microsoft.com',
    '  - "*.xboxlive.com"',
    '  - "*.ipv6.microsoft.com"',
    '  - rule-set:oc-cn-domain',
    '  - geosite:category-ads-all',
    '  - "+.ts.net"',
    '  default-nameserver:',
    '  - 223.5.5.5',
    '  - 119.29.29.29',
    '  proxy-server-nameserver:',
    '  - https://dns.alidns.com/dns-query#DIRECT',
    '  - https://doh.pub/dns-query#DIRECT',
    '  direct-nameserver:',
    '  - https://dns.alidns.com/dns-query#DIRECT',
    '  - https://doh.pub/dns-query#DIRECT',
    '  direct-nameserver-follow-policy: true',
    '  nameserver-policy:',
    '    geosite:category-ads-all:',
    '    - rcode://success',
    '    geosite:youtube:',
    '    - "https://1.1.1.1/dns-query#📹 YouTube"',
    '    - "https://8.8.8.8/dns-query#📹 YouTube"',
    '    geosite:tiktok:',
    '    - "https://1.1.1.1/dns-query#🎶 TikTok"',
    '    - "https://8.8.8.8/dns-query#🎶 TikTok"',
    '    "geosite:private,cn,apple-cn,microsoft@cn,steam@cn,category-games@cn,bilibili":',
    '    - https://dns.alidns.com/dns-query#DIRECT',
    '    - https://doh.pub/dns-query#DIRECT',
    '    "geosite:openai,google-gemini":',
    '    - "https://1.1.1.1/dns-query#🤖 AI"',
    '    - "https://8.8.8.8/dns-query#🤖 AI"',
    '    "+.chatgpt.com,+.openai.com,+.oaistatic.com,+.oaiusercontent.com,+.claude.ai":',
    '    - "https://1.1.1.1/dns-query#🤖 AI"',
    '    - "https://8.8.8.8/dns-query#🤖 AI"',
    '    geosite:twitter:',
    '    - "https://1.1.1.1/dns-query#𝕏 Twitter"',
    '    - "https://8.8.8.8/dns-query#𝕏 Twitter"',
    '    geosite:netflix:',
    '    - "https://1.1.1.1/dns-query#🎬 Netflix"',
    '    - "https://8.8.8.8/dns-query#🎬 Netflix"',
    '    geosite:spotify:',
    '    - https://1.1.1.1/dns-query#Proxy',
    '    - https://8.8.8.8/dns-query#Proxy',
    '    geosite:google:',
    '    - "https://1.1.1.1/dns-query#🔎 Google"',
    '    - "https://8.8.8.8/dns-query#🔎 Google"',
    '  nameserver:',
    '  - https://1.1.1.1/dns-query#Proxy',
    '  - https://8.8.8.8/dns-query#Proxy',
    '  - https://9.9.9.9/dns-query#Proxy',
    '',
    'proxies:',
  ];

  for (const proxy of proxies) appendProxy(lines, proxy);

  lines.push('');
  lines.push('proxy-groups:');
  appendSelectGroup(lines, 'Proxy', uniq([...cn2First, ...regionNames, ...otherRegions, 'DIRECT']));
  if (miscMembers.length) appendSelectGroup(lines, '🌍 其它地区', [...miscPreferred, ...miscMembers]);
  // 德国/英国等不参与服务策略的地区组保持靠前展示，其余地区组统一放在游戏组之后。
  for (const group of regionGroups) {
    if (!deferredRegionNames.has(group.name)) appendSelectGroup(lines, group.name, group.members);
  }
  for (const [name, members] of serviceGroups) appendSelectGroup(lines, name, members);
  for (const group of regionGroups) {
    if (deferredRegionNames.has(group.name)) appendSelectGroup(lines, group.name, group.members);
  }
  appendSelectGroup(lines, USF, usFixedChoices);
  appendSelectGroup(lines, 'AdBlock', ['REJECT', 'DIRECT']);

  lines.push('');
  lines.push('rules:');
  lines.push('  - GEOSITE,category-ads-all,AdBlock');
  lines.push('  - GEOSITE,private,DIRECT');
  lines.push('  - DOMAIN-SUFFIX,local,DIRECT');
  lines.push('  - DOMAIN-SUFFIX,lan,DIRECT');
  lines.push('  - DOMAIN-SUFFIX,arpa,DIRECT');
  lines.push('  - DOMAIN-SUFFIX,x.ai,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,grok.com,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,githubcopilot.com,🐙 GitHub');
  lines.push('  - DOMAIN-SUFFIX,copilot-proxy.githubusercontent.com,🐙 GitHub');
  lines.push('  - IP-CIDR,100.64.0.0/10,DIRECT,no-resolve');
  lines.push('  - GEOSITE,github,🐙 GitHub');
  lines.push('  - GEOSITE,openai,🤖 AI');
  lines.push('  - GEOSITE,google-gemini,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,chatgpt.com,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,openai.com,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,oaistatic.com,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,oaiusercontent.com,🤖 AI');
  lines.push('  - GEOSITE,anthropic,🤖 AI');
  lines.push('  - DOMAIN-SUFFIX,claude.ai,🤖 AI');
  lines.push('  - GEOSITE,category-ai-!cn,🤖 AI');
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
  lines.push('  - GEOSITE,paypal,💳 PayPal');
  lines.push('  - GEOSITE,facebook,♾️ Meta');
  lines.push('  - DOMAIN-SUFFIX,instagram.com,♾️ Meta');
  lines.push('  - DOMAIN-SUFFIX,threads.net,♾️ Meta');
  lines.push('  - DOMAIN-SUFFIX,whatsapp.com,♾️ Meta');
  lines.push('  - GEOSITE,meta,♾️ Meta');
  lines.push('  - GEOSITE,instagram,♾️ Meta');
  lines.push('  - GEOSITE,whatsapp,♾️ Meta');
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
  lines.push('  - GEOSITE,category-games-cn,DIRECT');
  lines.push('  - GEOSITE,cn,DIRECT');
  lines.push('  - GEOSITE,category-games,🎮 游戏');
  lines.push('  - GEOIP,LAN,DIRECT,no-resolve');
  lines.push('  - GEOIP,telegram,📲 Telegram,no-resolve');
  lines.push('  - GEOIP,CN,DIRECT,no-resolve');
  lines.push('  - MATCH,Proxy');

  lines.push('');
  lines.push('external-ui: "./dashboard"');
  lines.push('external-ui-name: metacubexd');
  lines.push('external-ui-url: https://codeload.github.com/MetaCubeX/metacubexd/zip/refs/heads/gh-pages');
  lines.push('keep-alive-interval: 15');
  lines.push('keep-alive-idle: 600');
  lines.push('experimental:');
  lines.push('  quic-go-disable-gso: true');
  lines.push('ntp:');
  lines.push('  enable: false');
  lines.push('  server: time.apple.com');
  lines.push('  port: 123');
  lines.push('  interval: 30');
  lines.push('  write-to-system: false');
  lines.push('rule-providers:');
  lines.push('  oc-cn-domain:');
  lines.push('    type: http');
  lines.push('    interval: 43200');
  lines.push('    behavior: domain');
  lines.push('    format: mrs');
  lines.push('    url: https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs');
  lines.push('    path: "./rule_provider/oc-cn-domain.mrs"');

  return lines.join('\n');
}
