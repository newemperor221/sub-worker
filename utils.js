// Utility functions — config loader + Base64
// =========================================

function collectLinks(env) {
  if (!env) return '';

  const links = [];
  const addValue = (value) => {
    String(value || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => links.push(line));
  };

  // Backward compatibility: LINK can still hold one link, or legacy multi-line values.
  addValue(env.LINK);

  // Cloudflare variable UI may reject or mangle multi-line LINK values. Prefer LINK1, LINK2...
  // for one proxy share link per environment variable.
  Object.keys(env)
    .filter((key) => /^LINK\d+$/.test(key))
    .sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)))
    .forEach((key) => addValue(env[key]));

  return links.join('\n');
}

export function loadConfig(env) {
  const token = env?.TOKEN || '';
  return {
    token,
    link: collectLinks(env),
    subName: env?.SUBNAME || '小岛航线',
    adminUser: env?.ADMIN_USER || '',
    adminPass: env?.ADMIN_PASS || '',
    sessionSecret: env?.SESSION_SECRET || token,
  };
}


// ==================== Base64 生成 ====================
export function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
