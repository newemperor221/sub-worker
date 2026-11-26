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
    sessionSecret: env?.SESSION_SECRET || '',
  };
}


// ==================== Base64 生成 ====================
export function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

export function validateAdminConfig(config) {
  const missing = [['ADMIN_USER', config.adminUser], ['ADMIN_PASS', config.adminPass], ['SESSION_SECRET', config.sessionSecret]]
    .filter(([, value]) => typeof value !== 'string' || !value.trim()).map(([key]) => key);
  if (missing.length) throw new Error(`管理员配置缺失：${missing.join(', ')}`);
  if (config.sessionSecret === config.token || config.sessionSecret === config.adminPass) throw new Error('SESSION_SECRET 必须独立于 TOKEN 和 ADMIN_PASS');
}
