import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
test('deployment preflight exits nonzero without administrator credentials and accepts complete independent config', () => {
  const base = {...process.env,ADMIN_USER:'',ADMIN_PASS:'',SESSION_SECRET:'',TOKEN:'test-token'};
  const bad = spawnSync(process.execPath,['check-config.mjs'],{env:base,encoding:'utf8'});
  assert.equal(bad.status,1);
  const good = spawnSync(process.execPath,['check-config.mjs'],{env:{...base,ADMIN_USER:'admin',ADMIN_PASS:'example-only-password',SESSION_SECRET:'example-only-independent-session-secret'},encoding:'utf8'});
  assert.equal(good.status,0); assert.doesNotMatch(good.stdout+good.stderr,/example-only/);
});
