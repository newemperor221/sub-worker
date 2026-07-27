import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './_worker.js';

const LINK = 'vless://11111111-1111-4111-8111-111111111111@example.com:443?security=tls&type=tcp#TestNode';
const env = {
  TOKEN: 'subtoken',
  LINK,
  SUBNAME: '测试订阅',
  ADMIN_USER: 'admin',
  ADMIN_PASS: 'pass123',
  SESSION_SECRET: 'unit-test-secret',
};

async function fetchPath(path, init = {}) {
  return worker.fetch(new Request('https://sub.example.com' + path, init), env);
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
  assert.match(body, /login-shell/);
  assert.match(body, /roughjs/);
  assert.match(body, /登录白板/);
  assert.match(body, /纸边/);
});

test('POST /login rejects invalid credentials', async () => {
  const res = await fetchPath('/login', {
    method: 'POST',
    body: new URLSearchParams({ username: 'admin', password: 'wrong' }),
  });
  const body = await res.text();

  assert.equal(res.status, 401);
  assert.match(body, /用户名或密码错误/);
  assert.equal(res.headers.get('set-cookie'), null);
});

test('POST /login accepts valid credentials and redirects to a random home path with HttpOnly session cookie', async () => {
  const res = await fetchPath('/login', {
    method: 'POST',
    body: new URLSearchParams({ username: 'admin', password: 'pass123' }),
  });

  assert.equal(res.status, 303);
  const location = res.headers.get('location') || '';
  assert.match(location, /^\/[A-Za-z0-9_-]{22,}\/home$/);
  const cookie = res.headers.get('set-cookie') || '';
  assert.match(cookie, /sub_worker_session=/);
  assert.doesNotMatch(cookie, /sw_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /pass123|subtoken/);
});

test('GET / with a valid session redirects to that session random home path', async () => {
  const login = await fetchPath('/login', {
    method: 'POST',
    body: new URLSearchParams({ username: 'admin', password: 'pass123' }),
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const homePath = login.headers.get('location');

  const res = await fetchPath('/', { headers: { cookie } });

  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), homePath);
});

test('GET /random/home with a valid matching session renders dashboard', async () => {
  const login = await fetchPath('/login', {
    method: 'POST',
    body: new URLSearchParams({ username: 'admin', password: 'pass123' }),
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const homePath = login.headers.get('location');

  const res = await fetchPath(homePath, { headers: { cookie } });
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(body, /纸边订阅白板/);
  assert.match(body, /\/api\/sub\?token=subtoken&type=clash/);
  assert.match(body, /\/api\/sub\?token=subtoken&type=b64/);
  assert.match(body, /href="\/logout"/);
  assert.match(body, /退出/);
  assert.match(body, /roughjs/);
  assert.match(body, /node-grid/);
  assert.match(res.headers.get('cache-control') || '', /no-store/);
  assert.doesNotMatch(body, /sub\.example\.com\/subtoken\?/);
});

test('GET another random home path with the same session is rejected', async () => {
  const login = await fetchPath('/login', {
    method: 'POST',
    body: new URLSearchParams({ username: 'admin', password: 'pass123' }),
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];

  const res = await fetchPath('/wrong-random-home-id/home', { headers: { cookie } });

  assert.equal(res.status, 404);
});

test('GET /logout clears the browser session and redirects to /login', async () => {
  const res = await fetchPath('/logout');
  const cookie = res.headers.get('set-cookie') || '';

  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/login');
  assert.match(cookie, /sub_worker_session=;/);
  assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Domain=sub\.example\.com/);
  assert.match(cookie, /Domain=example\.com/);
  assert.match(cookie, /sw_session=;/);
  assert.match(cookie, /sw_session=; Domain=sub\.example\.com/);
  assert.match(cookie, /sw_session=; Domain=example\.com/);
  assert.match(res.headers.get('cache-control') || '', /no-store/);
  assert.match(res.headers.get('clear-site-data') || '', /"cache"/);
});

test('subscription API is token protected and does not require browser session', async () => {
  const denied = await fetchPath('/api/sub?type=b64');
  assert.equal(denied.status, 404);

  const res = await fetchPath('/api/sub?token=subtoken&type=b64');
  const body = await res.text();
  assert.equal(res.status, 200);
  assert.equal(body, btoa(unescape(encodeURIComponent(LINK))));
});

test('legacy /TOKEN?b64 subscription URL remains compatible', async () => {
  const res = await fetchPath('/subtoken?b64');
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.equal(body, btoa(unescape(encodeURIComponent(LINK))));
});
