// Protocol converters — VLESS / Trojan / Hysteria2 → Clash proxy
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

    const flow = allParams.get('flow') || '';
    const mode = allParams.get('mode') || '';
    const sni = allParams.get('sni') || '';
    const host = allParams.get('host') || '';
    const path = allParams.get('path') || '/';
    const serviceName = allParams.get('serviceName') || '';
    const security = allParams.get('security') || 'tls';
    const fp = allParams.get('fp') || '';
    const pbk = allParams.get('pbk') || '';
    const sid = allParams.get('sid') || '';
    const alpn = allParams.get('alpn') || '';
    const network = allParams.get('type') || 'tcp';

    // 节点名：优先用 URL 片段（#香港），否则用 hostname
    const remark = url.hash ? decodeURIComponent(url.hash.replace(/^#/, '')) : url.hostname;

    const proxy = {
      name: remark,
      type: 'vless',
      server: url.hostname,
      port: parseInt(url.port) || 443,
      uuid: url.username,
      network,
      tls: security !== 'none',
      'skip-cert-verify': true,
      servername: sni || host || url.hostname,
    };

    if (sni && sni !== 'undefined') {
      proxy.sni = sni;
    }
    if (alpn) {
      proxy.alpn = alpn.split(',').map(x => x.trim()).filter(Boolean);
    }

    if (fp) {
      proxy['client-fingerprint'] = fp;
    }

    if (security === 'reality') {
      proxy['reality-opts'] = {
        'public-key': pbk,
        'short-id': sid,
      };
      if (!proxy['client-fingerprint']) {
        proxy['client-fingerprint'] = 'chrome';
      }
    }

    // flow：仅非空且非 xhttp 时保留；xhttp 不需要 flow
    if (flow && flow !== 'none' && network !== 'xhttp') {
      proxy.flow = flow;
    }

    if (network === 'xhttp') {
      proxy['xhttp-opts'] = {
        mode: mode || 'packet-up',
        path,
      };
      if (host) {
        proxy['xhttp-opts'].host = host;
      }
      delete proxy.flow;
    } else if (network === 'grpc') {
      proxy['grpc-opts'] = {
        'grpc-service-name': serviceName,
      };
    } else if (network === 'ws') {
      proxy['ws-opts'] = {
        path,
      };
      if (host) {
        proxy['ws-opts'].headers = { Host: host };
      }
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

// ==================== Hysteria2 → Clash 代理转换 ====================
export function convertHysteria2ToClashProxy(urlStr) {
  try {
    const url = new URL(urlStr);
    const params = new URLSearchParams(url.search.replace(/^\?/, ''));
    const remark = url.hash ? decodeURIComponent(url.hash.replace(/^#/, '')) : url.hostname;

    const proxy = {
      name: remark,
      type: 'hysteria2',
      server: url.hostname,
      port: parseInt(url.port) || 443,
      password: decodeURIComponent(url.username || ''),
      udp: true,
    };

    const sni = params.get('sni') || params.get('peer') || '';
    if (sni) {
      proxy.sni = sni;
    }

    const insecure = params.get('insecure') || params.get('allowInsecure') || '';
    if (insecure === '1' || insecure === 'true') {
      proxy['skip-cert-verify'] = true;
    }

    const alpn = params.get('alpn') || '';
    if (alpn) {
      proxy.alpn = alpn.split(',').map(x => x.trim()).filter(Boolean);
    }

    const obfs = params.get('obfs') || '';
    if (obfs && obfs !== 'none') {
      proxy.obfs = obfs;
    }

    const obfsPassword = params.get('obfs-password') || params.get('obfsParam') || '';
    if (obfsPassword) {
      proxy['obfs-password'] = obfsPassword;
    }

    const up = params.get('upmbps') || params.get('up') || '';
    const down = params.get('downmbps') || params.get('down') || '';
    if (up) {
      proxy.up = parseInt(up, 10);
    }
    if (down) {
      proxy.down = parseInt(down, 10);
    }

    return proxy;
  } catch {
    return null;
  }
}
