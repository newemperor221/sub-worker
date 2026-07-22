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

test('GET / without session renders the login page instead of token path dashboard', async () => {
  const res = await fetchPath('/');
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/html/);
  assert.match(body, /<form[^>]+method="POST"[^>]+action="\/login"/);
  assert.match(body, /用户名/);
  assert.match(body, /密码/);
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

test('POST /login accepts valid credentials and redirects back to / with HttpOnly session cookie', async () => {
  const res = await fetchPath('/login', {
    method: 'POST',
    body: new URLSearchParams({ username: 'admin', password: 'pass123' }),
  });

  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/');
  const cookie = res.headers.get('set-cookie') || '';
  assert.match(cookie, /sw_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /pass123|subtoken/);
});

test('GET / with a valid session renders dashboard at the root path', async () => {
  const login = await fetchPath('/login', {
    method: 'POST',
    body: new URLSearchParams({ username: 'admin', password: 'pass123' }),
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];

  const res = await fetchPath('/', { headers: { cookie } });
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(body, /订阅小岛/);
  assert.match(body, /\/api\/sub\?token=subtoken&type=clash/);
  assert.match(body, /\/api\/sub\?token=subtoken&type=b64/);
  assert.doesNotMatch(body, /sub\.example\.com\/subtoken\?/);
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
