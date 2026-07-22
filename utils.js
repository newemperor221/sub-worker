// Utility functions — config loader + Base64
// =========================================

export function loadConfig(env) {
  const token = env?.TOKEN || '';
  return {
    token,
    link: env?.LINK || '',
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
