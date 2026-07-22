import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './_worker.js';

const LINK = 'vless://11111111-1111-4111-8111-111111111111@example.com:443?security=tls&type=tcp#TestNode';
const USER2_LINK = 'trojan://password@example.net:443?sni=example.net#UserTwo';

function makeDb() {
  return {
    _nextId: 3,
    _users: [
      { id: 1, username: 'alice', password_hash: 'plain:alicepass', role: 'user', token: 'alicetoken', link: LINK, subname: 'Alice订阅', enabled: 1 },
      { id: 2, username: 'bob', password_hash: 'plain:bobpass', role: 'user', token: 'bobtoken', link: USER2_LINK, subname: 'Bob订阅', enabled: 1 },
    ],
  };
}

function makeEnv() {
  return {
    TOKEN: 'legacytoken',
    LINK,
    SUBNAME: '测试订阅',
    ADMIN_USER: 'admin',
    ADMIN_PASS: 'pass123',
    SESSION_SECRET: 'unit-test-secret',
    DB: makeDb(),
  };
}

async function fetchPath(path, init = {}, env = makeEnv()) {
  return worker.fetch(new Request('https://sub.example.com' + path, init), env);
}

async function loginAs(username, password, env) {
  const res = await fetchPath('/login', { method: 'POST', body: new URLSearchParams({ username, password }) }, env);
  return { res, cookie: res.headers.get('set-cookie').split(';')[0], homePath: res.headers.get('location') };
}

test('GET / without session redirects to /login', async () => {
  const res = await fetchPath('/');
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/login');
});

test('GET /login renders the login page', async () => {
  const res = await fetchPath('/login');
  const body = await res.text();
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/html/);
  assert.match(body, /<form[^>]+method="POST"[^>]+action="\/login"/);
  assert.match(body, /用户名/);
  assert.match(body, /密码/);
});

test('POST /login rejects invalid credentials', async () => {
  const res = await fetchPath('/login', { method: 'POST', body: new URLSearchParams({ username: 'alice', password: 'wrong' }) });
  const body = await res.text();
  assert.equal(res.status, 401);
  assert.match(body, /用户名或密码错误/);
  assert.equal(res.headers.get('set-cookie'), null);
});

test('ordinary user login redirects to random /home and sets specific session cookie', async () => {
  const { res } = await loginAs('alice', 'alicepass', makeEnv());
  assert.equal(res.status, 303);
  assert.match(res.headers.get('location') || '', /^\/[A-Za-z0-9_-]{22,}\/home$/);
  const cookie = res.headers.get('set-cookie') || '';
  assert.match(cookie, /sub_worker_session=/);
  assert.doesNotMatch(cookie, /sw_session=/);
  assert.doesNotMatch(cookie, /alicepass|alicetoken/);
});

test('admin login redirects to random /admin dashboard', async () => {
  const { res } = await loginAs('admin', 'pass123', makeEnv());
  assert.equal(res.status, 303);
  assert.match(res.headers.get('location') || '', /^\/[A-Za-z0-9_-]{22,}\/admin$/);
});

test('ordinary user dashboard only uses that user subscription data', async () => {
  const env = makeEnv();
  const { cookie, homePath } = await loginAs('alice', 'alicepass', env);
  const res = await fetchPath(homePath, { headers: { cookie } }, env);
  const body = await res.text();
  assert.equal(res.status, 200);
  assert.match(body, /Alice订阅/);
  assert.match(body, /\/api\/sub\?token=alicetoken&type=clash/);
  assert.doesNotMatch(body, /bobtoken|admintoken/);
  assert.match(body, /href="\/logout"/);
});

test('ordinary user cannot access admin page or another random home path', async () => {
  const env = makeEnv();
  const { cookie, homePath } = await loginAs('alice', 'alicepass', env);
  const homeId = homePath.split('/')[1];
  assert.equal((await fetchPath(`/${homeId}/admin`, { headers: { cookie } }, env)).status, 404);
  assert.equal((await fetchPath('/wrong-random-home-id/home', { headers: { cookie } }, env)).status, 404);
});

test('admin dashboard manages ordinary D1 users only and does not show admin subscription token', async () => {
  const env = makeEnv();
  const { cookie, homePath } = await loginAs('admin', 'pass123', env);
  const res = await fetchPath(homePath, { headers: { cookie } }, env);
  const body = await res.text();
  assert.equal(res.status, 200);
  assert.match(body, /管理员后台/);
  assert.match(body, /alice/);
  assert.match(body, /bob/);
  assert.doesNotMatch(body, /admintoken|ADMIN_USER|管理员不可操作/);
});

test('admin can create, update, and delete ordinary users only', async () => {
  const env = makeEnv();
  const { cookie, homePath } = await loginAs('admin', 'pass123', env);
  const homeId = homePath.split('/')[1];
  const adminUsersPath = `/${homeId}/admin/users`;

  let res = await fetchPath(adminUsersPath, { headers: { cookie }, method: 'POST', body: new URLSearchParams({ action: 'create', username: 'charlie', password: 'charliepass', token: 'charlietoken', link: USER2_LINK, subname: 'Charlie订阅', enabled: 'on' }) }, env);
  assert.equal(res.status, 303);
  assert.ok(env.DB._users.some(u => u.username === 'charlie' && u.role === 'user'));

  const charlie = env.DB._users.find(u => u.username === 'charlie');
  res = await fetchPath(adminUsersPath, { headers: { cookie }, method: 'POST', body: new URLSearchParams({ action: 'update', id: String(charlie.id), username: 'charlie2', password: '', token: 'charlietoken2', link: LINK, subname: 'Charlie2', enabled: 'on' }) }, env);
  assert.equal(res.status, 303);
  assert.equal(env.DB._users.find(u => u.id === charlie.id).username, 'charlie2');
  assert.equal(env.DB._users.find(u => u.id === charlie.id).token, 'charlietoken2');

  res = await fetchPath(adminUsersPath, { headers: { cookie }, method: 'POST', body: new URLSearchParams({ action: 'delete', id: String(charlie.id) }) }, env);
  assert.equal(res.status, 303);
  assert.equal(env.DB._users.some(u => u.id === charlie.id), false);
  assert.equal(env.DB._users.some(u => u.role === 'admin'), false);
});

test('ADMIN_USER/ADMIN_PASS are env-only and admin has no subscription token', async () => {
  const env = makeEnv();
  assert.equal(env.DB._users.some(u => u.username === 'admin' || u.role === 'admin'), false);

  const { res } = await loginAs('admin', 'pass123', env);
  assert.equal(res.status, 303);
  assert.match(res.headers.get('location') || '', /^\/[A-Za-z0-9_-]{22,}\/admin$/);
  assert.equal((await fetchPath('/api/sub?token=admintoken&type=b64', {}, env)).status, 404);
});

test('subscription API is per-user token protected and returns matching user link', async () => {
  const env = makeEnv();
  assert.equal((await fetchPath('/api/sub?type=b64', {}, env)).status, 404);

  const alice = await fetchPath('/api/sub?token=alicetoken&type=b64', {}, env);
  assert.equal(alice.status, 200);
  assert.equal(await alice.text(), btoa(unescape(encodeURIComponent(LINK))));

  const bob = await fetchPath('/api/sub?token=bobtoken&type=b64', {}, env);
  assert.equal(bob.status, 200);
  assert.equal(await bob.text(), btoa(unescape(encodeURIComponent(USER2_LINK))));
});

test('without D1 binding, legacy single-admin dashboard still works instead of 500', async () => {
  const legacyEnv = {
    TOKEN: 'legacytoken',
    LINK,
    SUBNAME: 'Legacy订阅',
    ADMIN_USER: 'admin',
    ADMIN_PASS: 'pass123',
    SESSION_SECRET: 'unit-test-secret',
  };
  const login = await fetchPath('/login', { method: 'POST', body: new URLSearchParams({ username: 'admin', password: 'pass123' }) }, legacyEnv);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const homePath = login.headers.get('location');
  assert.match(homePath || '', /^\/[A-Za-z0-9_-]{22,}\/admin$/);

  const res = await fetchPath(homePath, { headers: { cookie } }, legacyEnv);
  const body = await res.text();
  assert.equal(res.status, 200);
  assert.match(body, /Legacy订阅/);
  assert.match(body, /\/api\/sub\?token=legacytoken&type=clash/);
});

test('GET /logout clears new and legacy browser sessions and redirects to /login', async () => {
  const res = await fetchPath('/logout');
  const cookie = res.headers.get('set-cookie') || '';
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/login');
  assert.match(cookie, /sub_worker_session=;/);
  assert.match(cookie, /sw_session=;/);
  assert.match(cookie, /Domain=sub\.example\.com/);
  assert.match(cookie, /Domain=example\.com/);
  assert.match(res.headers.get('cache-control') || '', /no-store/);
  assert.match(res.headers.get('clear-site-data') || '', /"cache"/);
});
