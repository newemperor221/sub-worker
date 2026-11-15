// Loon subscription renderer for VLESS and Hysteria2 nodes.

function cleanName(value) {
  return String(value || '未命名节点')
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .replace(/[,=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '未命名节点';
}

function quote(value) {
  const text = String(value ?? '');
  return /[,\s"=]/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
}

function quoteAlways(value) {
  return `"${String(value ?? '').replace(/"/g, '\\"')}"`;
}

function uniqueName(name, counts) {
  const base = cleanName(name);
  const count = counts.get(base) || 0;
  counts.set(base, count + 1);
  return count ? `${base}_${count}` : base;
}

function appendTls(parts, proxy) {
  const sni = proxy.sni || proxy.servername;
  if (sni) parts.push(`sni=${quote(sni)}`);
  parts.push(`skip-cert-verify=${proxy['skip-cert-verify'] === true}`);
  if (Array.isArray(proxy.alpn) && proxy.alpn.length) parts.push(`alpn=${quote(proxy.alpn[0])}`);
  if (proxy['client-fingerprint']) parts.push(`tls-profile=${quote(proxy['client-fingerprint'])}`);
  parts.push('udp=true', 'block-quic=false', 'ip-mode=prefer-v4');
}

function renderVless(proxy, name) {
  const parts = [`${name} = VLESS`, proxy.server, String(proxy.port), quoteAlways(proxy.uuid || '')];
  parts.push(`transport=${proxy.network || 'tcp'}`);
  if (proxy.flow) parts.push(`flow=${quote(proxy.flow)}`);
  if (proxy['reality-opts']) {
    if (proxy['reality-opts']['public-key']) {
      parts.push(`public-key=${quote(proxy['reality-opts']['public-key'])}`);
    }
    if (proxy['reality-opts']['short-id']) {
      parts.push(`short-id=${quote(proxy['reality-opts']['short-id'])}`);
    }
  }
  if (proxy.tls) parts.push('over-tls=true');
  appendTls(parts, proxy);
  return parts.join(', ');
}

function renderHysteria2(proxy, name) {
  const parts = [
    `${name} = Hysteria2`,
    proxy.server,
    String(proxy.port),
    quoteAlways(proxy.password || ''),
  ];
  appendTls(parts, proxy);
  return parts.join(', ');
}

export function generateLoonConfig(inputProxies) {
  const counts = new Map();
  const lines = [];
  for (const proxy of inputProxies || []) {
    if (!proxy?.server || !proxy?.port) continue;
    const name = uniqueName(proxy.name, counts);
    if (proxy.type === 'vless') lines.push(renderVless(proxy, name));
    if (proxy.type === 'hysteria2') lines.push(renderHysteria2(proxy, name));
  }
  return `[Proxy]\n${lines.join('\n')}${lines.length ? '\n' : ''}`;
}
