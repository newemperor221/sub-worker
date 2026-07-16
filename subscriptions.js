// Share-link generators — subscription forms for node-oriented clients
// ================================================================

function stripEmptyFlowFromVless(link) {
  return link.replace(/[?&]flow=(&|$)/g, '$1').replace(/[?&]$/, '');
}

export function normalizeNodeLinks(lines) {
  return (lines || [])
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.startsWith('vless://') ? stripEmptyFlowFromVless(line) : line);
}

export function generateXrayLinksSubscription(lines) {
  return normalizeNodeLinks(lines).join('\n');
}

export function generateSingboxNodeSubscription(proxies, subName) {
  const seen = new Map();
  const outbounds = [];

  for (const proxy of proxies || []) {
    if (!proxy || !proxy.type) continue;
    const rawName = (proxy.name || proxy.server || 'node').trim() || 'node';
    const count = (seen.get(rawName) || 0) + 1;
    seen.set(rawName, count);
    const tag = count === 1 ? rawName : `${rawName} #${count}`;

    if (proxy.type === 'vless') {
      const outbound = {
        type: 'vless',
        tag,
        server: proxy.server,
        server_port: proxy.port,
        uuid: proxy.uuid,
        packet_encoding: 'xudp',
      };
      if (proxy.flow) outbound.flow = proxy.flow;
      if (proxy.tls || proxy['reality-opts']) {
        outbound.tls = {
          enabled: true,
          server_name: proxy.servername || proxy.sni || proxy.server,
          insecure: Boolean(proxy['skip-cert-verify']),
        };
        if (proxy.alpn?.length) outbound.tls.alpn = proxy.alpn;
      }
      if (proxy['reality-opts']) {
        outbound.tls.reality = {
          enabled: true,
          public_key: proxy['reality-opts']['public-key'] || '',
          short_id: proxy['reality-opts']['short-id'] || '',
        };
        outbound.tls.utls = {
          enabled: true,
          fingerprint: proxy['client-fingerprint'] || 'chrome',
        };
      }
      const network = proxy.network || 'tcp';
      if (network === 'ws' && proxy['ws-opts']) {
        outbound.transport = {
          type: 'ws',
          path: proxy['ws-opts'].path || '/',
          headers: proxy['ws-opts'].headers || undefined,
        };
      } else if (network === 'grpc' && proxy['grpc-opts']) {
        outbound.transport = {
          type: 'grpc',
          service_name: proxy['grpc-opts']['grpc-service-name'] || '',
        };
      } else if (network === 'xhttp' && proxy['xhttp-opts']) {
        outbound.transport = {
          type: 'http',
          path: proxy['xhttp-opts'].path || '/',
          host: proxy['xhttp-opts'].host ? [proxy['xhttp-opts'].host] : undefined,
        };
      }
      outbounds.push(outbound);
      continue;
    }

    if (proxy.type === 'trojan') {
      outbounds.push({
        type: 'trojan',
        tag,
        server: proxy.server,
        server_port: proxy.port,
        password: proxy.password,
        tls: {
          enabled: true,
          server_name: proxy.sni || proxy.server,
          insecure: Boolean(proxy['skip-cert-verify']),
          alpn: proxy.alpn?.length ? proxy.alpn : undefined,
        },
      });
      continue;
    }

    if (proxy.type === 'hysteria2') {
      const outbound = {
        type: 'hysteria2',
        tag,
        server: proxy.server,
        server_port: proxy.port,
        password: proxy.password,
        tls: {
          enabled: true,
          server_name: proxy.sni || proxy.server,
          insecure: Boolean(proxy['skip-cert-verify']),
          alpn: proxy.alpn?.length ? proxy.alpn : undefined,
        },
      };
      if (Number.isFinite(proxy.up)) outbound.up_mbps = proxy.up;
      if (Number.isFinite(proxy.down)) outbound.down_mbps = proxy.down;
      if (proxy.obfs && proxy['obfs-password']) {
        outbound.obfs = {
          type: proxy.obfs,
          password: proxy['obfs-password'],
        };
      }
      outbounds.push(outbound);
    }
  }

  return JSON.stringify({
    _meta: {
      name: subName,
      generated_for: 'sing-box-nodes',
      node_count: outbounds.length,
      note: 'node-only subscription for GUI clients; not a full config',
    },
    outbounds,
  }, null, 2);
}
