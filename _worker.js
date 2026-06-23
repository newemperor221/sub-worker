// ==UserScript==
// Sub Worker — 订阅聚合与转换 | 模块化架构
// ==/UserScript==

import { loadConfig, encodeBase64 } from './utils.js';
import { convertVlessToClashProxy, convertTrojanToClashProxy } from './convert.js';
import { generateClashYaml } from './yaml.js';
import { renderDashboard } from './dashboard.js';

// ==================== 路由处理 ====================
async function handleRequest(request, env) {
  const config = loadConfig(env);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const search = url.search;

  // 提取 token（路径第一段）
  const pathParts = path.split('/').filter(Boolean);
  const token = pathParts[0] || '';

  // Token 验证
  if (!token || token !== config.token) {
    return new Response('Not Found', { status: 404 });
  }

  // 解析 vless / trojan 链接
  const allLines = config.link.split('\n').filter(l => l.trim());
  const vlessLines = allLines.filter(l => l.startsWith('vless://'));
  const trojanLines = allLines.filter(l => l.startsWith('trojan://'));
  const vlessProxies = vlessLines.map(l => convertVlessToClashProxy(l.trim())).filter(Boolean);
  const trojanProxies = trojanLines.map(l => convertTrojanToClashProxy(l.trim())).filter(Boolean);
  const proxies = [...vlessProxies, ...trojanProxies];

  // Base URL for subscription links
  const baseUrl = url.protocol + '//' + url.host;

  // ====== Clash YAML ======
  if (search.includes('clash')) {
    const yaml = generateClashYaml(proxies, config.subName);
    return new Response(yaml, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'content-disposition': 'inline; filename="' + config.subName + '"; filename*=UTF-8\'\'' + encodeURIComponent(config.subName),
        'profile-title': config.subName,
        'profile-update-interval': '6',
      },
    });
  }

  // ====== Base64 ======
  if (search.includes('b64')) {
    // 清理空值的 flow 参数
    const linkList = allLines.map(l => {
      const t = l.trim();
      return t.startsWith('vless://') ? t.replace(/[?&]flow=(&|$)/g, '$1') : t;
    }).join('\n');
    const b64 = encodeBase64(linkList);
    return new Response(b64, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'content-disposition': 'inline; filename="' + config.subName + '"; filename*=UTF-8\'\'' + encodeURIComponent(config.subName),
        'profile-title': config.subName,
        'profile-update-interval': '6',
      },
    });
  }

  // ====== 管理面板 ======
  return new Response(renderDashboard(config, proxies, baseUrl), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ==================== Worker 入口 ====================
export default {
  fetch: handleRequest,
};
