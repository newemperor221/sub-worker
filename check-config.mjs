import { validateAdminConfig, loadConfig } from './utils.js';
try {
  validateAdminConfig(loadConfig(process.env));
  console.log('管理员部署配置检查通过');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
