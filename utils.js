// Utility functions — config loader + Base64
// =========================================

export function loadConfig(env) {
  const token = env?.TOKEN || '';
  const adminPass = env?.ADMIN_PASS || '';
  return {
    token,
    subName: env?.SUBNAME || '小岛航线',
    adminUser: env?.ADMIN_USER || '',
    adminPass,
    sessionSecret: env?.SESSION_SECRET || token || (adminPass ? `sub-worker-session:${adminPass}` : ''),
  };
}


// ==================== Base64 生成 ====================
export function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
