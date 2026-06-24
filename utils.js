// Utility functions — config loader + Base64
// =========================================

export function loadConfig(env) {
  return {
    token: env?.TOKEN || '',
    link: env?.LINK || '',
    subName: env?.SUBNAME || '小鲨鱼',
  };
}


// ==================== Base64 生成 ====================
export function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
