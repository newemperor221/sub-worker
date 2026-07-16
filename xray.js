// Xray-core JSON generator — self-contained DNS + routing profile
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

function transportForProxy(proxy) {
  const network = proxy.network || 'tcp';
  const stream = {
    network,
    security: proxy['reality-opts'] ? 'reality' : (proxy.tls ? 'tls' : 'none'),
  };

  if (stream.security === 'tls') {
    stream.tlsSettings = {
      serverName: proxy.servername || proxy.sni || proxy.server,
      allowInsecure: Boolean(proxy['skip-cert-verify']),
    };
    if (proxy.alpn?.length) stream.tlsSettings.alpn = proxy.alpn;
    if (proxy['client-fingerprint']) stream.tlsSettings.fingerprint = proxy['client-fingerprint'];
  }

  if (stream.security === 'reality') {
    stream.realitySettings = {
      show: false,
      fingerprint: proxy['client-fingerprint'] || 'chrome',
      serverName: proxy.servername || proxy.sni || proxy.server,
      publicKey: proxy['reality-opts']?.['public-key'] || '',
      shortId: proxy['reality-opts']?.['short-id'] || '',
      spiderX: '/',
    };
  }

  if (network === 'ws' && proxy['ws-opts']) {
    stream.wsSettings = {
      path: proxy['ws-opts'].path || '/',
    };
    if (proxy['ws-opts'].headers?.Host) {
      stream.wsSettings.headers = { Host: proxy['ws-opts'].headers.Host };
    }
  }

  if (network === 'grpc' && proxy['grpc-opts']) {
    stream.grpcSettings = {
      serviceName: proxy['grpc-opts']['grpc-service-name'] || '',
      multiMode: false,
    };
  }

  if (network === 'xhttp' && proxy['xhttp-opts']) {
    stream.xhttpSettings = {
      mode: proxy['xhttp-opts'].mode || 'packet-up',
      path: proxy['xhttp-opts'].path || '/',
    };
    if (proxy['xhttp-opts'].host) {
      stream.xhttpSettings.host = proxy['xhttp-opts'].host;
    }
  }

  return stream;
}

function proxyToXrayOutbound(proxy, index) {
  const tag = `proxy-${index + 1}`;

  if (proxy.type === 'vless') {
    const user = {
      id: proxy.uuid,
      encryption: 'none',
    };
    if (proxy.flow) user.flow = proxy.flow;

    return {
      tag,
      protocol: 'vless',
      settings: {
        vnext: [
          {
            address: proxy.server,
            port: proxy.port,
            users: [user],
          },
        ],
      },
      streamSettings: transportForProxy(proxy),
      mux: { enabled: false },
      _node_meta: {
        name: proxy.name,
        type: proxy.type,
      },
    };
  }

  if (proxy.type === 'trojan') {
    return {
      tag,
      protocol: 'trojan',
      settings: {
        servers: [
          {
            address: proxy.server,
            port: proxy.port,
            password: proxy.password,
          },
        ],
      },
      streamSettings: {
        network: 'tcp',
        security: 'tls',
        tlsSettings: {
          serverName: proxy.sni || proxy.server,
          allowInsecure: Boolean(proxy['skip-cert-verify']),
          alpn: proxy.alpn?.length ? proxy.alpn : undefined,
        },
      },
      mux: { enabled: false },
      _node_meta: {
        name: proxy.name,
        type: proxy.type,
      },
    };
  }

  return null;
}

function cleanObject(value) {
  if (Array.isArray(value)) {
    return value.map(cleanObject).filter(item => item !== undefined);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = cleanObject(v);
    }
    return out;
  }
  return value;
}

export function generateXrayConfig(inputProxies, subName) {
  const proxies = dedupeProxyNames(inputProxies || []);
  const supported = [];
  const skipped = [];

  for (let i = 0; i < proxies.length; i += 1) {
    const outbound = proxyToXrayOutbound(proxies[i], supported.length);
    if (outbound) {
      supported.push(outbound);
    } else {
      skipped.push({
        name: proxies[i].name,
        type: proxies[i].type,
        reason: 'current xray-core export keeps VLESS/Trojan only',
      });
    }
  }

  const firstProxyTag = supported[0]?.tag || 'direct';
  const baseOutbounds = supported.map(({ _node_meta, ...rest }) => rest);

  const config = {
    log: {
      loglevel: 'warning',
    },
    dns: {
      hosts: {
        'domain:localhost': '127.0.0.1',
      },
      queryStrategy: 'UseIPv4',
      disableFallbackIfMatch: true,
      disableCache: false,
      servers: [
        {
          address: 'https://223.5.5.5/dns-query',
          domains: [
            'geosite:private',
            'geosite:cn',
            'geosite:apple-cn',
            'geosite:microsoft@cn',
            'domain:connect.rom.miui.com',
            'domain:msftconnecttest.com',
            'domain:msftncsi.com',
          ],
          expectedIPs: ['geoip:cn', 'geoip:private'],
          skipFallback: true,
        },
        {
          address: 'https://1.1.1.1/dns-query',
          domains: [
            'geosite:geolocation-!cn',
            'geosite:google',
            'geosite:github',
            'geosite:telegram',
            'domain:openai.com',
            'domain:chatgpt.com',
            'domain:oaistatic.com',
            'domain:oaiusercontent.com',
            'domain:netflix.com',
            'domain:nflxvideo.net',
            'domain:disneyplus.com',
            'domain:disney-plus.net',
            'domain:spotify.com',
            'domain:hbomax.com',
            'domain:max.com',
            'domain:primevideo.com',
          ],
          skipFallback: true,
        },
        'https://8.8.8.8/dns-query',
      ],
    },
    inbounds: [
      {
        tag: 'socks-in',
        listen: '127.0.0.1',
        port: 10808,
        protocol: 'socks',
        settings: {
          auth: 'noauth',
          udp: true,
        },
        sniffing: {
          enabled: true,
          destOverride: ['http', 'tls', 'quic'],
          routeOnly: true,
        },
      },
      {
        tag: 'http-in',
        listen: '127.0.0.1',
        port: 10809,
        protocol: 'http',
        settings: {},
        sniffing: {
          enabled: true,
          destOverride: ['http', 'tls'],
          routeOnly: true,
        },
      },
    ],
    outbounds: [
      ...baseOutbounds,
      {
        tag: 'direct',
        protocol: 'freedom',
        settings: {
          domainStrategy: 'UseIPv4',
        },
      },
      {
        tag: 'block',
        protocol: 'blackhole',
        settings: {},
      },
      {
        tag: 'dns-out',
        protocol: 'dns',
        settings: {},
      },
    ],
    observatory: {
      subjectSelector: ['proxy-'],
      probeUrl: 'https://cp.cloudflare.com/generate_204',
      probeInterval: '5m',
      enableConcurrency: false,
    },
    routing: {
      domainStrategy: 'IPIfNonMatch',
      balancers: [
        {
          tag: 'proxy-auto',
          selector: ['proxy-'],
          fallbackTag: firstProxyTag,
          strategy: {
            type: 'leastPing',
          },
        },
        {
          tag: 'streaming-auto',
          selector: ['proxy-'],
          fallbackTag: firstProxyTag,
          strategy: {
            type: 'leastPing',
          },
        },
      ],
      rules: [
        {
          type: 'field',
          port: '53',
          network: 'udp',
          outboundTag: 'dns-out',
        },
        {
          type: 'field',
          domain: ['geosite:category-ads-all'],
          outboundTag: 'block',
        },
        {
          type: 'field',
          domain: ['geosite:private', 'domain:local', 'domain:lan'],
          outboundTag: 'direct',
        },
        {
          type: 'field',
          domain: ['domain:openai.com', 'domain:chatgpt.com', 'domain:oaistatic.com', 'domain:oaiusercontent.com'],
          balancerTag: 'proxy-auto',
        },
        {
          type: 'field',
          domain: ['geosite:telegram'],
          balancerTag: 'proxy-auto',
        },
        {
          type: 'field',
          domain: ['geosite:github'],
          balancerTag: 'proxy-auto',
        },
        {
          type: 'field',
          domain: ['geosite:google'],
          balancerTag: 'proxy-auto',
        },
        {
          type: 'field',
          domain: [
            'geosite:netflix',
            'domain:netflix.com',
            'domain:nflximg.net',
            'domain:nflxvideo.net',
            'domain:nflxso.net',
            'domain:nflxext.com',
            'domain:disneyplus.com',
            'domain:disney-plus.net',
            'domain:primevideo.com',
            'domain:amazonvideo.com',
            'domain:spotify.com',
            'domain:scdn.co',
            'domain:hbomax.com',
            'domain:max.com',
            'domain:hulu.com',
            'domain:bahamut.com.tw',
          ],
          balancerTag: 'streaming-auto',
        },
        {
          type: 'field',
          domain: ['geosite:apple-cn', 'geosite:microsoft@cn', 'geosite:steam@cn', 'geosite:category-games@cn'],
          outboundTag: 'direct',
        },
        {
          type: 'field',
          domain: ['geosite:cn'],
          outboundTag: 'direct',
        },
        {
          type: 'field',
          ip: ['geoip:private', 'geoip:cn'],
          outboundTag: 'direct',
        },
        {
          type: 'field',
          network: 'tcp,udp',
          balancerTag: 'proxy-auto',
        },
      ],
    },
    _meta: {
      name: subName,
      generated_for: 'xray-core',
      supported_outbound_protocols: ['vless', 'trojan'],
      generated_node_count: supported.length,
      skipped_nodes: skipped,
    },
  };

  return JSON.stringify(cleanObject(config), null, 2);
}
