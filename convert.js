// Protocol converters — VLESS → Clash proxy, Trojan → Clash proxy
// ==============================================================

// ==================== VLESS → Clash 代理转换 ====================
export function convertVlessToClashProxy(urlStr) {
  try {
    const url = new URL(urlStr);
    const params = new URLSearchParams(url.search.replace(/^&/, ''));
    const hash = url.hash ? new URLSearchParams(url.hash.replace(/^#/, '')) : new URLSearchParams();

    // 合并 search 和 hash 参数
    const allParams = new URLSearchParams();
    for (const [k, v] of params) allParams.set(k, v);
    for (const [k, v] of hash) allParams.set(k, v);

    // 如果 flow 为空则删掉
    const flow = allParams.get('flow') || '';
    const mode = allParams.get('mode') || '';
    const sni = allParams.get('sni') || '';

    // 节点名：优先用 URL 片段（#香港），否则用 hostname
    const remark = url.hash ? decodeURIComponent(url.hash.replace(/^#/, '')) : url.hostname;

    const proxy = {
      name: remark,
      type: 'vless',
      server: url.hostname,
      port: parseInt(url.port) || 443,
      uuid: url.username,
      network: 'tcp',
      tls: true,
      'skip-cert-verify': true,
      servername: sni || url.hostname,
    };

    if (sni && sni !== 'undefined') {
      proxy.sni = sni;
    }

    // network 类型
    let network = allParams.get('type') || 'tcp';
    proxy.network = network;

    // Reality
    if (allParams.get('security') === 'reality') {
      proxy['reality-opts'] = {
        'public-key': allParams.get('pbk') || '',
        'short-id': allParams.get('sid') || '',
      };
      proxy['client-fingerprint'] = allParams.get('fp') || 'chrome';
    }

    // flow（只保留非空值，Reality XTLS 用）
    if (flow && flow !== 'none') {
      proxy.flow = flow;
    }

    // XHTTP / XTLS / gRPC
    if (network === 'xhttp') {
      proxy['xhttp-opts'] = {
        mode: mode || 'packet-up',
        path: allParams.get('path') || '/',
      };
      proxy.flow = '';
    } else if (network === 'grpc') {
      proxy['grpc-opts'] = {
        'grpc-service-name': allParams.get('serviceName') || '',
      };
    } else if (network === 'ws') {
      proxy['ws-opts'] = {
        path: allParams.get('path') || '/',
        headers: allParams.get('host') ? { Host: allParams.get('host') } : undefined,
      };
    } else if (network === 'tcp' && allParams.get('security') === 'reality') {
      proxy['reality-opts'] = {
        'public-key': allParams.get('pbk') || '',
        'short-id': allParams.get('sid') || '',
      };
      proxy['client-fingerprint'] = allParams.get('fp') || 'chrome';
    }

    return proxy;
  } catch {
    return null;
  }
}

// ==================== Trojan → Clash 代理转换 ====================
export function convertTrojanToClashProxy(urlStr) {
  try {
    const url = new URL(urlStr);
    const remark = url.hash ? decodeURIComponent(url.hash.replace(/^#/, '')) : url.hostname;
    const password = url.username;
    const host = url.hostname;
    const port = parseInt(url.port) || 443;

    const proxy = {
      name: remark,
      type: 'trojan',
      server: host,
      port: port,
      password: password,
      udp: true,
      sni: host,
      'skip-cert-verify': false,
    };

    return proxy;
  } catch {
    return null;
  }
}
