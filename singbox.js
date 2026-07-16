// sing-box JSON generator — enriched DNS + streaming / AI template
// ==============================================================

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
  return [
    { tag: 'region-hk', members: matchNames(proxies, /\bHK\b|香港|港|hong\s*kong/i) },
    { tag: 'region-tw', members: matchNames(proxies, /\bTW\b|台湾|臺灣|taiwan/i) },
    { tag: 'region-sg', members: matchNames(proxies, /\bSG\b|新加坡|狮城|singapore/i) },
    { tag: 'region-jp', members: matchNames(proxies, /\bJP\b|日本|东京|大阪|软银|iij|japan/i) },
    { tag: 'region-us', members: matchNames(proxies, /\bUS\b|美国|洛杉矶|硅谷|纽约|西雅图|圣何塞|达拉斯|堪萨斯|atlanta|los\s*angeles|united\s*states/i) },
  ].filter(group => group.members.length > 0);
}

function buildTls(proxy) {
  if (!proxy.tls && proxy.type !== 'trojan' && proxy.type !== 'hysteria2') return undefined;
  const tls = {
    enabled: true,
    insecure: Boolean(proxy['skip-cert-verify']),
  };
  const serverName = proxy.sni || proxy.servername || proxy.server;
  if (serverName) tls.server_name = serverName;
  if (proxy.alpn?.length) tls.alpn = proxy.alpn;
  if (proxy['client-fingerprint']) {
    tls.utls = {
      enabled: true,
      fingerprint: proxy['client-fingerprint'],
    };
  }
  if (proxy['reality-opts']) {
    tls.reality = {
      enabled: true,
      public_key: proxy['reality-opts']['public-key'],
      short_id: proxy['reality-opts']['short-id'] || '',
    };
  }
  return tls;
}

function buildTransport(proxy) {
  if (proxy['ws-opts']) {
    return {
      type: 'ws',
      path: proxy['ws-opts'].path || '/',
      headers: proxy['ws-opts'].headers || {},
    };
  }
  if (proxy['grpc-opts']) {
    return {
      type: 'grpc',
      service_name: proxy['grpc-opts']['grpc-service-name'] || '',
    };
  }
  if (proxy['xhttp-opts']) {
    const transport = {
      type: 'http',
      path: proxy['xhttp-opts'].path || '/',
    };
    if (proxy['xhttp-opts'].host) transport.host = [proxy['xhttp-opts'].host];
    return transport;
  }
  return undefined;
}

function proxyToSingboxOutbound(proxy) {
  if (proxy.type === 'vless') {
    const outbound = {
      type: 'vless',
      tag: proxy.name,
      server: proxy.server,
      server_port: proxy.port,
      uuid: proxy.uuid,
      network: proxy.network || 'tcp',
      packet_encoding: 'xudp',
    };
    if (proxy.flow) outbound.flow = proxy.flow;
    const tls = buildTls(proxy);
    if (tls) outbound.tls = tls;
    const transport = buildTransport(proxy);
    if (transport) outbound.transport = transport;
    return outbound;
  }

  if (proxy.type === 'trojan') {
    const outbound = {
      type: 'trojan',
      tag: proxy.name,
      server: proxy.server,
      server_port: proxy.port,
      password: proxy.password,
      tls: buildTls(proxy) || { enabled: true, insecure: false },
    };
    return outbound;
  }

  if (proxy.type === 'hysteria2') {
    const outbound = {
      type: 'hysteria2',
      tag: proxy.name,
      server: proxy.server,
      server_port: proxy.port,
      password: proxy.password,
      tls: buildTls(proxy) || { enabled: true, insecure: false },
    };
    if (Number.isFinite(proxy.up)) outbound.up_mbps = proxy.up;
    if (Number.isFinite(proxy.down)) outbound.down_mbps = proxy.down;
    if (proxy.obfs && proxy['obfs-password']) {
      outbound.obfs = {
        type: proxy.obfs,
        password: proxy['obfs-password'],
      };
    }
    return outbound;
  }

  return null;
}

function remoteRuleSet(tag, url) {
  return {
    tag,
    type: 'remote',
    format: 'binary',
    url,
    download_detour: 'direct',
  };
}

function selector(tag, outbounds, defaultOutbound) {
  return {
    type: 'selector',
    tag,
    outbounds: uniq(outbounds),
    default: defaultOutbound,
    interrupt_exist_connections: false,
  };
}

function urlTest(tag, outbounds) {
  return {
    type: 'urltest',
    tag,
    outbounds: uniq(outbounds),
    url: 'http://www.gstatic.com/generate_204',
    interval: '5m',
    tolerance: 50,
    interrupt_exist_connections: false,
  };
}

export function generateSingboxConfig(inputProxies, subName) {
  const proxies = dedupeProxyNames(inputProxies || []);
  const nodeOutbounds = proxies.map(proxyToSingboxOutbound).filter(Boolean);
  const nodeTags = nodeOutbounds.map(node => node.tag);
  const regionGroups = buildRegionGroups(proxies);
  const regionTags = regionGroups.map(group => group.tag);
  const miscMembers = proxies
    .filter(p => !regionGroups.some(group => group.members.includes(p.name)))
    .map(p => p.name);

  const proxyOptions = uniq(['auto', ...regionTags, ...(miscMembers.length ? ['region-other'] : []), 'direct']);
  const commonOptions = uniq(['proxy', 'auto', ...regionTags, ...(miscMembers.length ? ['region-other'] : []), 'direct']);
  const aiOptions = uniq(['proxy', 'auto', 'region-sg', 'region-jp', 'region-us', 'region-hk', 'direct'].filter(tag => tag === 'proxy' || tag === 'auto' || tag === 'direct' || regionTags.includes(tag)));
  const directPreferred = uniq(['direct', 'proxy', 'auto', ...regionTags, ...(miscMembers.length ? ['region-other'] : [])]);

  const outbounds = [
    selector('proxy', proxyOptions, 'auto'),
    urlTest('auto', nodeTags),
    selector('streaming', commonOptions, 'proxy'),
    selector('ai', aiOptions, 'proxy'),
    selector('telegram', commonOptions, 'proxy'),
    selector('google', commonOptions, 'proxy'),
    selector('github', commonOptions, 'proxy'),
    selector('social', commonOptions, 'proxy'),
    selector('apple', directPreferred, 'direct'),
    selector('microsoft', directPreferred, 'direct'),
    selector('games', directPreferred, 'direct'),
    { type: 'direct', tag: 'direct' },
    { type: 'block', tag: 'block' },
  ];

  for (const group of regionGroups) {
    outbounds.splice(outbounds.length - 2, 0, urlTest(group.tag, group.members));
  }
  if (miscMembers.length) {
    outbounds.splice(outbounds.length - 2, 0, urlTest('region-other', miscMembers));
  }
  outbounds.push(...nodeOutbounds);

  const ruleSets = [
    remoteRuleSet('geosite-category-ads-all', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/category-ads-all.srs'),
    remoteRuleSet('geosite-openai', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/openai.srs'),
    remoteRuleSet('geosite-anthropic', 'https://testingcf.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set/geosite-anthropic.srs'),
    remoteRuleSet('geosite-google-gemini', 'https://testingcf.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set/geosite-google-gemini.srs'),
    remoteRuleSet('geosite-google', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/google.srs'),
    remoteRuleSet('geosite-youtube', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/youtube.srs'),
    remoteRuleSet('geosite-github', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/github.srs'),
    remoteRuleSet('geosite-telegram', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/telegram.srs'),
    remoteRuleSet('geosite-twitter', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/twitter.srs'),
    remoteRuleSet('geosite-facebook', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/facebook.srs'),
    remoteRuleSet('geosite-tiktok', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/tiktok.srs'),
    remoteRuleSet('geosite-netflix', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/netflix.srs'),
    remoteRuleSet('geosite-disney', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/disney.srs'),
    remoteRuleSet('geosite-primevideo', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/primevideo.srs'),
    remoteRuleSet('geosite-hbo', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/hbo.srs'),
    remoteRuleSet('geosite-spotify', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/spotify.srs'),
    remoteRuleSet('geosite-bahamut', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/bahamut.srs'),
    remoteRuleSet('geosite-bilibili', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/bilibili.srs'),
    remoteRuleSet('geosite-apple', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/apple.srs'),
    remoteRuleSet('geosite-apple-cn', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/apple-cn.srs'),
    remoteRuleSet('geosite-microsoft', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/microsoft.srs'),
    remoteRuleSet('geosite-microsoft-cn', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/microsoft@cn.srs'),
    remoteRuleSet('geosite-steam-cn', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/steam@cn.srs'),
    remoteRuleSet('geosite-category-games', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/category-games.srs'),
    remoteRuleSet('geosite-category-games-cn', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/category-games@cn.srs'),
    remoteRuleSet('geosite-private', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/private.srs'),
    remoteRuleSet('geosite-cn', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/cn.srs'),
    remoteRuleSet('geoip-private', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geoip/private.srs'),
    remoteRuleSet('geoip-cn', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geoip/cn.srs'),
  ];

  const config = {
    log: {
      level: 'info',
      timestamp: true,
    },
    dns: {
      servers: [
        {
          tag: 'dns-direct-ali',
          type: 'https',
          server: '223.5.5.5',
          server_port: 443,
          path: '/dns-query',
          detour: 'direct',
          tls: { enabled: true, server_name: 'dns.alidns.com' },
        },
        {
          tag: 'dns-direct-tencent',
          type: 'https',
          server: '1.12.12.12',
          server_port: 443,
          path: '/dns-query',
          detour: 'direct',
          tls: { enabled: true, server_name: 'doh.pub' },
        },
        {
          tag: 'dns-remote-cf',
          type: 'https',
          server: '1.1.1.1',
          server_port: 443,
          path: '/dns-query',
          detour: 'proxy',
          tls: { enabled: true, server_name: 'cloudflare-dns.com' },
        },
        {
          tag: 'dns-remote-google',
          type: 'https',
          server: '8.8.8.8',
          server_port: 443,
          path: '/dns-query',
          detour: 'proxy',
          tls: { enabled: true, server_name: 'dns.google' },
        },
      ],
      rules: [
        {
          rule_set: ['geosite-private', 'geosite-cn', 'geosite-apple-cn', 'geosite-microsoft-cn', 'geosite-steam-cn', 'geosite-category-games-cn', 'geosite-bilibili'],
          action: 'route',
          server: 'dns-direct-ali',
        },
        {
          rule_set: ['geosite-openai', 'geosite-anthropic', 'geosite-google-gemini', 'geosite-google', 'geosite-youtube', 'geosite-github', 'geosite-telegram', 'geosite-twitter', 'geosite-facebook', 'geosite-tiktok', 'geosite-netflix', 'geosite-disney', 'geosite-primevideo', 'geosite-hbo', 'geosite-spotify', 'geosite-bahamut'],
          action: 'route',
          server: 'dns-remote-cf',
        },
      ],
      final: 'dns-remote-cf',
      strategy: 'ipv4_only',
      disable_cache: false,
      cache_capacity: 4096,
      reverse_mapping: true,
      timeout: '10s',
    },
    inbounds: [
      {
        type: 'mixed',
        tag: 'mixed-in',
        listen: '127.0.0.1',
        listen_port: 7890,
        sniff: true,
        sniff_override_destination: true,
        set_system_proxy: false,
      },
    ],
    outbounds,
    route: {
      auto_detect_interface: true,
      final: 'proxy',
      rule_set: ruleSets,
      rules: [
        { ip_is_private: true, outbound: 'direct' },
        { rule_set: 'geosite-category-ads-all', outbound: 'block' },
        { rule_set: ['geosite-openai', 'geosite-anthropic', 'geosite-google-gemini'], outbound: 'ai' },
        { rule_set: 'geosite-telegram', outbound: 'telegram' },
        { rule_set: 'geosite-github', outbound: 'github' },
        { rule_set: ['geosite-google', 'geosite-youtube'], outbound: 'google' },
        { rule_set: ['geosite-twitter', 'geosite-facebook', 'geosite-tiktok'], outbound: 'social' },
        { rule_set: ['geosite-netflix', 'geosite-disney', 'geosite-primevideo', 'geosite-hbo', 'geosite-spotify', 'geosite-bahamut'], outbound: 'streaming' },
        { rule_set: 'geosite-bilibili', outbound: 'direct' },
        { rule_set: 'geosite-apple-cn', outbound: 'direct' },
        { rule_set: 'geosite-apple', outbound: 'apple' },
        { rule_set: 'geosite-microsoft-cn', outbound: 'direct' },
        { rule_set: 'geosite-microsoft', outbound: 'microsoft' },
        { rule_set: 'geosite-steam-cn', outbound: 'direct' },
        { rule_set: 'geosite-category-games-cn', outbound: 'direct' },
        { rule_set: 'geosite-category-games', outbound: 'games' },
        { rule_set: ['geoip-private', 'geosite-private'], outbound: 'direct' },
        { rule_set: ['geoip-cn', 'geosite-cn'], outbound: 'direct' },
      ],
    },
    experimental: {
      cache_file: {
        enabled: true,
        path: 'cache.db',
        store_fakeip: true,
      },
    },
  };

  const output = {
    _meta: {
      name: subName,
      generated_for: 'sing-box',
      node_count: proxies.length,
      profile_style: 'full-config',
    },
    ...config,
  };

  return JSON.stringify(output, null, 2) + '\n';
}
