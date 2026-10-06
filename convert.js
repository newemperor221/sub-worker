// Protocol converters — VLESS / Trojan / Hysteria2 → Mihomo proxy
// =================================================================

function safeDecode(value) {
  try { return decodeURIComponent(String(value || '')); } catch { return String(value || ''); }
}

function proxyName(url) {
  const fragment = url.hash.replace(/^#/, '');
  return (fragment ? safeDecode(fragment) : url.hostname).replace(/[\r\n\t]/g, ' ').trim() || url.hostname;
}

function validPort(url, fallback = 443) {
  const port = url.port ? Number(url.port) : fallback;
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
}

function queryBoolean(params, ...names) {
  for (const name of names) {
    if (params.has(name)) return /^(?:1|true|yes)$/i.test(params.get(name) || '');
  }
  return false;
}

function splitList(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function normalizedNetwork(params) {
  const value = (params.get('type') || params.get('network') || 'tcp').toLowerCase();
  return ['tcp', 'ws', 'grpc', 'http', 'h2', 'xhttp'].includes(value) ? value : null;
}

function applyTransport(proxy, params, network) {
  const host = params.get('host') || '';
  const path = params.get('path') || '/';
  const serviceName = params.get('serviceName') || params.get('service-name') || '';

  if (network === 'ws') {
    proxy['ws-opts'] = { path };
    if (host) proxy['ws-opts'].headers = { Host: host };
    const earlyData = Number(params.get('ed'));
    if (Number.isInteger(earlyData) && earlyData > 0) {
      proxy['ws-opts']['max-early-data'] = earlyData;
      proxy['ws-opts']['early-data-header-name'] = params.get('eh') || 'Sec-WebSocket-Protocol';
    }
  } else if (network === 'grpc') {
    proxy['grpc-opts'] = { 'grpc-service-name': serviceName };
  } else if (network === 'http' || network === 'h2') {
    proxy[network === 'h2' ? 'h2-opts' : 'http-opts'] = {
      path: splitList(path),
      ...(host ? { host: splitList(host) } : {}),
    };
  } else if (network === 'xhttp') {
    proxy['xhttp-opts'] = { path };
    const mode = params.get('mode') || '';
    if (['auto', 'stream-one', 'stream-up', 'packet-up'].includes(mode)) proxy['xhttp-opts'].mode = mode;
    if (host) proxy['xhttp-opts'].host = host;
  }
}

export function convertVlessToClashProxy(urlStr) {
  try {
    const url = new URL(String(urlStr).trim());
    if (url.protocol.toLowerCase() !== 'vless:' || !url.hostname || !url.username) return null;
    const params = url.searchParams;
    const port = validPort(url);
    const network = normalizedNetwork(params);
    if (!port || !network) return null;

    const security = (params.get('security') || 'none').toLowerCase();
    if (!['none', 'tls', 'reality'].includes(security)) return null;
    const proxy = {
      name: proxyName(url), type: 'vless', server: url.hostname, port,
      uuid: safeDecode(url.username), network,
      tls: security === 'tls' || security === 'reality', udp: true,
    };

    const encryption = params.get('encryption');
    if (encryption) proxy.encryption = encryption;
    const packetEncoding = params.get('packetEncoding') || params.get('packet-encoding');
    if (packetEncoding) proxy['packet-encoding'] = packetEncoding;

    if (proxy.tls) {
      const sni = params.get('sni') || params.get('serverName') || params.get('servername') || '';
      if (sni) proxy.servername = sni;
      proxy['skip-cert-verify'] = queryBoolean(params, 'allowInsecure', 'insecure');
      const alpn = splitList(params.get('alpn'));
      if (alpn.length) proxy.alpn = alpn;
      const fp = params.get('fp') || params.get('fingerprint') || '';
      if (fp) proxy['client-fingerprint'] = fp;
    }

    if (security === 'reality') {
      const publicKey = params.get('pbk') || params.get('publicKey') || '';
      if (!publicKey) return null;
      proxy['reality-opts'] = { 'public-key': publicKey };
      const shortId = params.get('sid') || params.get('shortId') || '';
      if (shortId) proxy['reality-opts']['short-id'] = shortId;
      if (!proxy['client-fingerprint']) proxy['client-fingerprint'] = 'chrome';
    }

    const flow = params.get('flow') || '';
    if (flow && flow !== 'none' && network !== 'xhttp') proxy.flow = flow;
    applyTransport(proxy, params, network);
    return proxy;
  } catch { return null; }
}

export function convertTrojanToClashProxy(urlStr) {
  try {
    const url = new URL(String(urlStr).trim());
    if (url.protocol.toLowerCase() !== 'trojan:' || !url.hostname || !url.username) return null;
    const params = url.searchParams;
    const port = validPort(url);
    const network = normalizedNetwork(params);
    if (!port || !network || network === 'xhttp') return null;

    const proxy = {
      name: proxyName(url), type: 'trojan', server: url.hostname, port,
      password: safeDecode(url.username + (url.password ? `:${url.password}` : '')),
      udp: true,
      'skip-cert-verify': queryBoolean(params, 'allowInsecure', 'insecure'),
    };
    const sni = params.get('sni') || params.get('peer') || params.get('serverName') || '';
    if (sni) proxy.sni = sni;
    const alpn = splitList(params.get('alpn'));
    if (alpn.length) proxy.alpn = alpn;
    const fp = params.get('fp') || params.get('fingerprint') || '';
    if (fp) proxy['client-fingerprint'] = fp;
    if (network !== 'tcp') proxy.network = network;
    applyTransport(proxy, params, network);
    return proxy;
  } catch { return null; }
}

export function convertHysteria2ToClashProxy(urlStr) {
  try {
    const normalized = String(urlStr).trim().replace(/^hy2:\/\//i, 'hysteria2://');
    const url = new URL(normalized);
    if (url.protocol.toLowerCase() !== 'hysteria2:' || !url.hostname || (!url.username && !url.password)) return null;
    const params = url.searchParams;
    const port = validPort(url);
    if (!port) return null;

    const userInfo = url.username + (url.password ? `:${url.password}` : '');
    const proxy = {
      name: proxyName(url), type: 'hysteria2', server: url.hostname, port,
      password: safeDecode(userInfo), udp: true,
      'skip-cert-verify': queryBoolean(params, 'allowInsecure', 'insecure'),
    };
    const sni = params.get('sni') || params.get('peer') || '';
    if (sni) proxy.sni = sni;
    const alpn = splitList(params.get('alpn'));
    if (alpn.length) proxy.alpn = alpn;
    const obfs = params.get('obfs') || '';
    const obfsPassword = params.get('obfs-password') || params.get('obfsParam') || '';
    if (obfs && obfs !== 'none') proxy.obfs = obfs;
    if (obfsPassword) proxy['obfs-password'] = obfsPassword;
    const up = Number(params.get('upmbps') || params.get('up'));
    const down = Number(params.get('downmbps') || params.get('down'));
    if (Number.isFinite(up) && up > 0) proxy.up = up;
    if (Number.isFinite(down) && down > 0) proxy.down = down;
    const fingerprint = params.get('pinSHA256') || params.get('pin-sha256') || '';
    if (fingerprint) proxy.fingerprint = fingerprint;
    return proxy;
  } catch { return null; }
}
