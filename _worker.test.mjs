import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './_worker.js';

const LINK = 'vless://11111111-1111-4111-8111-111111111111@example.com:443?security=tls&type=tcp#TestNode';
const LINK_A = 'vless://22222222-2222-4222-8222-222222222222@example-a.com:443?security=tls&type=tcp#NodeA';
const LINK_B = 'vless://33333333-3333-4333-8333-333333333333@example-b.com:443?security=tls&type=tcp#NodeB';
const RELAY_LINK = 'vless://44444444-4444-4444-8444-444444444444@example-sg.com:443?security=tls&type=tcp#🇸🇬 东京-中转-新加坡';
const FORMATTED_RELAY_LINK = 'vless://55555555-5555-4555-8555-555555555555@example-sg.com:443?security=tls&type=tcp#🇸🇬 新加坡(东京中转)';
const HK_LINK = 'vless://66666666-6666-4666-8666-666666666666@example-hk.com:443?security=tls&type=tcp#🇭🇰 香港';
const env = {
  TOKEN: 'subtoken',
  LINK,
  SUBNAME: '测试订阅',
  ADMIN_USER: 'admin',
  ADMIN_PASS: 'pass123',
  SESSION_SECRET: 'unit-test-secret',
};
const numberedLinkEnv = {
  ...env,
  LINK: '',
  LINK2: LINK_B,
  LINK1: LINK_A,
  SUBNAME: 'Test Subscription',
};
const relayNameEnv = {
  ...env,
  LINK: RELAY_LINK,
  SUBNAME: 'Test Subscription',
};
const formattedRelayNameEnv = {
  ...env,
  LINK: FORMATTED_RELAY_LINK,
  SUBNAME: 'Test Subscription',
};
const hkNameEnv = {
  ...env,
  LINK: HK_LINK,
  SUBNAME: 'Test Subscription',
};

async function fetchPath(path, init = {}, testEnv = env) {
  return worker.fetch(new Request('https://sub.example.com' + path, init), testEnv);
}

function createKv(initialValue = null) {
  const values = new Map();
  if (initialValue !== null) values.set('subscription_links', JSON.stringify(initialValue));
  return {
    values,
    async get(key) { return values.has(key) ? values.get(key) : null; },
    async put(key, value) { values.set(key, value); },
  };
}

async function loginSession(testEnv = env) {
  const login = await fetchPath('/login', {
    method: 'POST',
    body: new URLSearchParams({ username: 'admin', password: 'pass123' }),
  }, testEnv);
  return {
    cookie: login.headers.get('set-cookie').split(';')[0],
    homePath: login.headers.get('location'),
  };
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
  assert.doesNotMatch(body, /Segoe Print|LXGW WenKai|Kaiti SC|STKaiti|Ma Shan Zheng|cursive/);
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

test('login remains usable without SESSION_SECRET and TOKEN when ADMIN_PASS is configured', async () => {
  const fallbackEnv = { ...env, TOKEN: '', SESSION_SECRET: '' };
  const login = await fetchPath('/login', {
    method: 'POST',
    body: new URLSearchParams({ username: 'admin', password: 'pass123' }),
  }, fallbackEnv);

  assert.equal(login.status, 303);
  assert.match(login.headers.get('set-cookie') || '', /sub_worker_session=/);
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
  assert.doesNotMatch(body, /Segoe Print|LXGW WenKai|Kaiti SC|STKaiti|Ma Shan Zheng|cursive/);
});

test('relay node display name uses half-width parentheses without extra 出口 suffix', async () => {
  const login = await fetchPath('/login', {
    method: 'POST',
    body: new URLSearchParams({ username: 'admin', password: 'pass123' }),
  }, relayNameEnv);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const homePath = login.headers.get('location');

  const res = await fetchPath(homePath, { headers: { cookie } }, relayNameEnv);
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(body, /sg:\"新\"/);
  assert.match(body, /新加坡\(东京中转\)/);
  assert.doesNotMatch(body, /flag-svg|flag-emoji|🇸🇬/);
  assert.doesNotMatch(body, /出口（|）/);
});

test('already formatted relay node display name is not normalized twice', async () => {
  const login = await fetchPath('/login', {
    method: 'POST',
    body: new URLSearchParams({ username: 'admin', password: 'pass123' }),
  }, formattedRelayNameEnv);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const homePath = login.headers.get('location');

  const res = await fetchPath(homePath, { headers: { cookie } }, formattedRelayNameEnv);
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(body, /sg:\"新\"/);
  assert.match(body, /新加坡\(东京中转\)/);
  assert.doesNotMatch(body, /flag-svg|flag-emoji|🇸🇬/);
  assert.doesNotMatch(body, /\)\(.*新加坡|\)\(\)\(/);
});

test('Hong Kong node badge uses CJK text instead of HK regional indicator fallback', async () => {
  const login = await fetchPath('/login', {
    method: 'POST',
    body: new URLSearchParams({ username: 'admin', password: 'pass123' }),
  }, hkNameEnv);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const homePath = login.headers.get('location');

  const res = await fetchPath(homePath, { headers: { cookie } }, hkNameEnv);
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(body, /hk:\"港\"/);
  assert.match(body, /香港/);
  assert.doesNotMatch(body, /🇭🇰|>HK</);
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

  const emptyToken = await fetchPath('/api/sub?token=&type=b64', {}, { ...env, TOKEN: '' });
  assert.equal(emptyToken.status, 404);

  const res = await fetchPath('/api/sub?token=subtoken&type=b64');
  const body = await res.text();
  assert.equal(res.status, 200);
  assert.equal(body, btoa(unescape(encodeURIComponent(LINK))));
});

test('subscription API reads one proxy link per numbered LINK variable in numeric order', async () => {
  const res = await fetchPath('/api/sub?token=subtoken&type=b64', {}, numberedLinkEnv);
  const body = await res.text();
  const expected = [LINK_A, LINK_B].join('\n');

  assert.equal(res.status, 200);
  assert.equal(body, btoa(unescape(encodeURIComponent(expected))));
});

test('Clash output includes proxies from numbered LINK variables', async () => {
  const res = await fetchPath('/api/sub?token=subtoken&type=clash', {}, numberedLinkEnv);
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(body, /name: "NodeA"/);
  assert.match(body, /name: "NodeB"/);
});

test('legacy /TOKEN?b64 subscription URL remains compatible', async () => {
  const res = await fetchPath('/subtoken?b64');
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.equal(body, btoa(unescape(encodeURIComponent(LINK))));
});

test('legacy sources keep only VLESS and Hysteria2 in source order', async () => {
  const mixedEnv = {
    ...env,
    LINK: '',
    LINK1: 'trojan://secret@trojan.example:443?sni=edge.example#First-Trojan',
    LINK2: 'vless://77777777-7777-4777-8777-777777777777@vless.example:443?security=tls&type=tcp#Second-VLESS',
    LINK3: 'hy2://secret@hy2.example:443?sni=hy.example#Third-HY2',
    LINK4: 'hysteria2://secret@hysteria.example:443?sni=hy.example#Fourth-Hysteria2',
  };
  const res = await fetchPath('/api/sub?token=subtoken&type=clash', {}, mixedEnv);
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(body, /name: "Second-VLESS"/);
  assert.match(body, /name: "Fourth-Hysteria2"/);
  assert.ok(body.indexOf('name: "Second-VLESS"') < body.indexOf('name: "Fourth-Hysteria2"'));
  assert.doesNotMatch(body, /First-Trojan|Third-HY2/);

  const b64 = await fetchPath('/api/sub?token=subtoken&type=b64', {}, mixedEnv);
  const decoded = decodeURIComponent(escape(atob(await b64.text())));
  assert.equal(decoded, [mixedEnv.LINK2, mixedEnv.LINK4].join('\n'));
});

test('Clash region groups follow the seven-region exit-prefix logic', async () => {
  const regions = [
    ['新加坡(东京中转)', 'sg.example'],
    ['日本-东京', 'jp.example'],
    ['德国-法兰克福', 'de.example'],
    ['尼日利亚-拉各斯', 'ng.example'],
    ['英国-伦敦', 'uk.example'],
    ['美国-洛杉矶', 'us.example'],
    ['香港-中环', 'hk.example'],
  ];
  const regionEnv = { ...env, LINK: '' };
  regions.forEach(([name, host], index) => {
    regionEnv[`LINK${index + 1}`] = `vless://${index + 1}1111111-1111-4111-8111-111111111111@${host}:443?security=tls&type=tcp#${encodeURIComponent(name)}`;
  });

  const res = await fetchPath('/api/sub?token=subtoken&type=clash', {}, regionEnv);
  const body = await res.text();
  const singaporeGroup = body.match(/name: "🇸🇬 新加坡节点"[\s\S]*?proxies: \[([^\n]+)\]/)?.[1] || '';
  const japanGroup = body.match(/name: "🇯🇵 日本节点"[\s\S]*?proxies: \[([^\n]+)\]/)?.[1] || '';

  assert.equal(res.status, 200);
  assert.match(body, /name: "🇩🇪 德国节点"/);
  assert.match(body, /name: "🇳🇬 尼日利亚节点"/);
  assert.match(body, /name: "🇬🇧 英国节点"/);
  assert.match(singaporeGroup, /新加坡\(东京中转\)/);
  assert.doesNotMatch(japanGroup, /新加坡\(东京中转\)/);
  assert.doesNotMatch(body, /\bAuto\b/);
  const gameIndex = body.indexOf('name: "🎮 游戏"');
  const adBlockIndex = body.indexOf('name: "AdBlock"');
  for (const group of ['🇺🇸 美国节点', '🇸🇬 新加坡节点', '🇯🇵 日本节点', '🇭🇰 香港节点', '🇳🇬 尼日利亚节点']) {
    const groupIndex = body.indexOf(`name: "${group}"`);
    assert.ok(gameIndex < groupIndex, `${group} should appear after 游戏`);
    assert.ok(groupIndex < adBlockIndex, `${group} should appear before AdBlock`);
  }
  const usFixedIndex = body.indexOf('name: "🇺🇸 美国固定节点"');
  assert.ok(usFixedIndex < adBlockIndex, '美国固定节点 should appear before AdBlock');
  assert.doesNotMatch(body.slice(usFixedIndex, adBlockIndex), /\n  - name:/);
});

test('Clash service policies mirror the reference Loon routing priorities', async () => {
  const serviceEnv = {
    ...env,
    LINK: 'vless://88888888-8888-4888-8888-888888888888@us.example:443?security=tls&type=tcp#美国-固定',
  };
  const res = await fetchPath('/api/sub?token=subtoken&type=clash', {}, serviceEnv);
  const body = await res.text();

  assert.equal(res.status, 200);
  for (const group of ['🤖 AI', '🔎 Google', '🎵 Spotify', '𝕏 Twitter', '🎬 Netflix', '📹 YouTube', '📖 Reddit', '🎶 TikTok', '💳 PayPal', '♾️ Meta']) {
    assert.match(body, new RegExp(`name: "${group}"`));
  }
  assert.match(body, /name: "🇺🇸 美国固定节点"[\s\S]*?proxies: \["美国-固定"\]/);
  assert.ok(body.indexOf('DOMAIN-SUFFIX,x.ai,𝕏 Twitter') < body.indexOf('GEOSITE,openai,🤖 AI'));
  assert.ok(body.indexOf('GEOSITE,youtube,📹 YouTube') < body.indexOf('GEOSITE,google,🔎 Google'));
});

test('Clash endpoint returns 422 when every configured node is invalid', async () => {
  const res = await fetchPath('/api/sub?token=subtoken&type=clash', {}, { ...env, LINK: 'ss://unsupported' });
  assert.equal(res.status, 422);
  assert.match(await res.text(), /没有可转换/);
});

test('health endpoint exercises session crypto, storage and dashboard rendering', async () => {
  const kv = createKv([LINK]);
  const res = await fetchPath('/api/health', {}, { ...env, SUBSCRIPTIONS: kv });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, storage: 'kv' });
  assert.match(res.headers.get('cache-control') || '', /no-store/);
});

test('subscription management API rejects unauthenticated requests and disables caching', async () => {
  const res = await fetchPath('/api/manage/subscriptions', {}, { ...env, SUBSCRIPTIONS: createKv() });
  assert.equal(res.status, 401);
  assert.match(res.headers.get('cache-control') || '', /no-store/);
  assert.match((await res.json()).error, /请先登录/);
});

test('logged-in administrator can add, list and delete KV subscriptions', async () => {
  const kv = createKv();
  const testEnv = { ...env, SUBSCRIPTIONS: kv };
  const { cookie } = await loginSession(testEnv);
  const addedLink = 'hysteria2://secret@hysteria.example:443?sni=edge.example#ManagedNode';

  const add = await fetchPath('/api/manage/subscriptions', {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ links: addedLink }),
  }, testEnv);
  const addBody = await add.json();
  assert.equal(add.status, 200);
  assert.equal(addBody.added, 1);
  assert.equal(addBody.items.length, 2);
  assert.equal(addBody.items[1].name, 'ManagedNode');
  assert.equal(JSON.parse(kv.values.get('subscription_links')).length, 2);

  const list = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  const listBody = await list.json();
  assert.equal(list.status, 200);
  assert.equal(listBody.source, 'kv');
  assert.equal(listBody.items[1].protocol, 'hysteria2');
  assert.doesNotMatch(JSON.stringify(listBody), /secret@hysteria\.example/);

  const remove = await fetchPath('/api/manage/subscriptions', {
    method: 'DELETE',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ id: '0' }),
  }, testEnv);
  const removeBody = await remove.json();
  assert.equal(remove.status, 200);
  assert.equal(removeBody.items.length, 1);
  assert.equal(JSON.parse(kv.values.get('subscription_links'))[0], addedLink);
});

test('multi-line add trims, removes blanks and duplicates, and rejects unsupported protocols', async () => {
  const kv = createKv([]);
  const testEnv = { ...env, SUBSCRIPTIONS: kv };
  const { cookie } = await loginSession(testEnv);
  const multiLine = `  ${LINK_A}  \n\n${LINK_A}\r\n${LINK_B}`;
  const add = await fetchPath('/api/manage/subscriptions', {
    method: 'POST', headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ links: multiLine }),
  }, testEnv);
  assert.equal(add.status, 200);
  assert.equal((await add.json()).added, 2);
  assert.deepEqual(JSON.parse(kv.values.get('subscription_links')), [LINK_A, LINK_B]);

  const invalid = await fetchPath('/api/manage/subscriptions', {
    method: 'POST', headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ links: `${LINK_A}\ntrojan://unsupported\nhy2://unsupported` }),
  }, testEnv);
  assert.equal(invalid.status, 400);
  assert.match((await invalid.json()).error, /第 2、3 行协议不受支持.*vless:\/\/、hysteria2:\/\//);
  assert.deepEqual(JSON.parse(kv.values.get('subscription_links')), [LINK_A, LINK_B]);
});

test('management mutation clearly reports a missing SUBSCRIPTIONS binding while env nodes remain usable', async () => {
  const { cookie, homePath } = await loginSession(env);
  const add = await fetchPath('/api/manage/subscriptions', {
    method: 'POST', headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ links: LINK_A }),
  });
  assert.equal(add.status, 503);
  assert.match((await add.json()).error, /尚未绑定 Cloudflare KV.*SUBSCRIPTIONS/);

  const panel = await fetchPath(homePath, { headers: { cookie } });
  const panelBody = await panel.text();
  assert.equal(panel.status, 200);
  assert.match(panelBody, /尚未绑定 SUBSCRIPTIONS KV/);
  assert.match(panelBody, /当前读取：env 回退/);
  assert.match(panelBody, /TestNode/);
});

test('saved KV data overrides env for subscription output and dashboard without exposing full nodes', async () => {
  const kv = createKv([LINK_B]);
  const testEnv = { ...env, SUBSCRIPTIONS: kv };
  const subscription = await fetchPath('/api/sub?token=subtoken&type=b64', {}, testEnv);
  assert.equal(await subscription.text(), btoa(unescape(encodeURIComponent(LINK_B))));

  const { cookie, homePath } = await loginSession(testEnv);
  const panel = await fetchPath(homePath, { headers: { cookie } }, testEnv);
  const body = await panel.text();
  assert.match(body, /NodeB/);
  assert.doesNotMatch(body, /TestNode/);
  assert.doesNotMatch(body, /example-b\.com:443/);
  assert.match(body, /当前读取：KV/);
});

test('empty KV falls back to legacy LINK values until the first save', async () => {
  const kv = createKv();
  const testEnv = { ...numberedLinkEnv, SUBSCRIPTIONS: kv };
  const fallback = await fetchPath('/api/sub?token=subtoken&type=b64', {}, testEnv);
  assert.equal(await fallback.text(), btoa(unescape(encodeURIComponent([LINK_A, LINK_B].join('\n')))));

  const { cookie } = await loginSession(testEnv);
  const list = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  const body = await list.json();
  assert.equal(body.source, 'env');
  assert.equal(body.items.length, 2);
});
