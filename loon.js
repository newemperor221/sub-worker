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

function uniqueName(name, counts) {
  const base = cleanName(name);
  const count = counts.get(base) || 0;
  counts.set(base, count + 1);
  return count ? `${base}_${count}` : base;
}

function appendTls(parts, proxy) {
  const sni = proxy.sni || proxy.servername;
  if (sni) parts.push(`sni=${quote(sni)}`);
  if (proxy['skip-cert-verify'] === true) parts.push('skip-cert-verify=true');
  if (Array.isArray(proxy.alpn) && proxy.alpn.length) parts.push(`alpn=${quote(proxy.alpn[0])}`);
  if (proxy['client-fingerprint']) parts.push(`client-fingerprint=${quote(proxy['client-fingerprint'])}`);
}

function renderVless(proxy, name) {
  const parts = [`${name} = vless`, proxy.server, String(proxy.port), quote(proxy.uuid || '')];
  if (proxy.flow) parts.push(`flow=${quote(proxy.flow)}`);
  parts.push(`transport=${proxy.network || 'tcp'}`);
  if (proxy.tls) parts.push('over-tls=true');
  if (proxy['reality-opts']) {
    parts.push('reality=true');
    if (proxy['reality-opts']['public-key']) {
      parts.push(`public-key=${quote(proxy['reality-opts']['public-key'])}`);
    }
    if (proxy['reality-opts']['short-id']) {
      parts.push(`short-id=${quote(proxy['reality-opts']['short-id'])}`);
    }
  }
  appendTls(parts, proxy);
  return parts.join(', ');
}

function renderHysteria2(proxy, name) {
  const parts = [
    `${name} = hysteria2`,
    proxy.server,
    String(proxy.port),
    quote(proxy.password || ''),
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
