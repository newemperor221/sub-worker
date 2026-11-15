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
  SUBSCRIPTIONS: createKv([LINK]),
  SUBNAME: '测试订阅',
  ADMIN_USER: 'admin',
  ADMIN_PASS: 'pass123',
  SESSION_SECRET: 'unit-test-secret',
};
const numberedLinkEnv = {
  ...env,
  SUBSCRIPTIONS: createKv([LINK_A, LINK_B]),
  SUBNAME: 'Test Subscription',
};
const relayNameEnv = {
  ...env,
  SUBSCRIPTIONS: createKv([RELAY_LINK]),
  SUBNAME: 'Test Subscription',
};
const formattedRelayNameEnv = {
  ...env,
  SUBSCRIPTIONS: createKv([FORMATTED_RELAY_LINK]),
  SUBNAME: 'Test Subscription',
};
const hkNameEnv = {
  ...env,
  SUBSCRIPTIONS: createKv([HK_LINK]),
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
  assert.match(body, /管理员登录/);
  assert.match(body, /登录控制台/);
  assert.match(body, /color-scheme:dark/);
  assert.doesNotMatch(body, /roughjs|rough-outline|drawRough|纸边|手绘|白板/i);
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
  assert.match(body, /订阅管理控制台/);
  assert.match(body, /\/api\/sub\?token=subtoken&type=clash/);
  assert.match(body, /\/api\/sub\?token=subtoken&type=loon/);
  assert.match(body, /\/api\/sub\?token=subtoken&type=base64/);
  assert.match(body, /href="\/logout"/);
  assert.match(body, /退出/);
  assert.match(body, /dashboard-grid/);
  assert.match(body, /data-direction="up"/);
  assert.match(body, /data-direction="down"/);
  assert.match(body, /node-grid/);
  assert.doesNotMatch(body, /node-badge|flagIcon|regionIcon/);
  assert.match(body, /color-scheme:dark/);
  assert.doesNotMatch(body, /roughjs|rough-outline|drawRough|纸边|手绘|白板/i);
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
  assert.match(body, /新加坡\(东京中转\)/);
  assert.doesNotMatch(body, /flag-svg|flag-emoji|🇸🇬/);
  assert.doesNotMatch(body, /\)\(.*新加坡|\)\(\)\(/);
});

test('Hong Kong node name renders without a regional image badge', async () => {
  const login = await fetchPath('/login', {
    method: 'POST',
    body: new URLSearchParams({ username: 'admin', password: 'pass123' }),
  }, hkNameEnv);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const homePath = login.headers.get('location');

  const res = await fetchPath(homePath, { headers: { cookie } }, hkNameEnv);
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(body, /香港/);
  assert.doesNotMatch(body, /🇭🇰|>HK<|node-badge/);
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

  assert.match(res.headers.get('cache-control') || '', /no-store/);
  assert.match(res.headers.get('clear-site-data') || '', /"cache"/);
});

test('subscription API is token protected and does not require browser session', async () => {
  const denied = await fetchPath('/api/sub?type=base64');
  assert.equal(denied.status, 404);

  const emptyToken = await fetchPath('/api/sub?token=&type=base64', {}, { ...env, TOKEN: '' });
  assert.equal(emptyToken.status, 404);

  const res = await fetchPath('/api/sub?token=subtoken&type=base64');
  const body = await res.text();
  assert.equal(res.status, 200);
  assert.equal(body, btoa(unescape(encodeURIComponent(LINK))));
});

test('subscription API preserves KV node order', async () => {
  const res = await fetchPath('/api/sub?token=subtoken&type=base64', {}, numberedLinkEnv);
  const body = await res.text();
  const expected = [LINK_A, LINK_B].join('\n');

  assert.equal(res.status, 200);
  assert.equal(body, btoa(unescape(encodeURIComponent(expected))));
});

test('Clash output includes proxies from KV', async () => {
  const res = await fetchPath('/api/sub?token=subtoken&type=clash', {}, numberedLinkEnv);
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(body, /name: "NodeA"/);
  assert.match(body, /name: "NodeB"/);
});

test('Loon output includes VLESS Reality and Hysteria2 proxy lines', async () => {
  const loonEnv = {
    ...env,
    SUBSCRIPTIONS: createKv([
      'vless://77777777-7777-4777-8777-777777777777@vless.example:443?security=reality&type=tcp&flow=xtls-rprx-vision&sni=edge.example&fp=chrome&pbk=public-key&sid=abcd#Reality-Node',
      'hysteria2://secret@hy.example:8443?sni=hy.example&insecure=1#HY2-Node',
    ]),
  };
  const res = await fetchPath('/api/sub?token=subtoken&type=loon', {}, loonEnv);
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(body, /^\[Proxy\]\n/);
  assert.match(body, /Reality-Node = VLESS/);
  assert.doesNotMatch(body, /reality=true/);
  assert.match(body, /public-key=public-key/);
  assert.match(body, /short-id=abcd/);
  assert.match(body, /tls-profile=chrome/);
  assert.match(body, /HY2-Node = Hysteria2, hy\.example, 8443, "secret"/);
  assert.match(body, /skip-cert-verify=true/);
});

test('old subscription aliases and paths are not compatible', async () => {
  assert.equal((await fetchPath('/api/sub?token=subtoken&type=b64')).status, 404);
  assert.equal((await fetchPath('/api/sub?token=subtoken&type=mihomo')).status, 404);
  assert.equal((await fetchPath('/subtoken?base64')).status, 404);
  assert.equal((await fetchPath('/subtoken?loon')).status, 404);
  assert.equal((await fetchPath('/subtoken?clash')).status, 404);
});

test('KV keeps only VLESS and Hysteria2 in source order', async () => {
  const mixedLinks = [
    'trojan://secret@trojan.example:443?sni=edge.example#First-Trojan',
    'vless://77777777-7777-4777-8777-777777777777@vless.example:443?security=tls&type=tcp#Second-VLESS',
    'hy2://secret@hy2.example:443?sni=hy.example#Third-HY2',
    'hysteria2://secret@hysteria.example:443?sni=hy.example#Fourth-Hysteria2',
  ];
  const mixedEnv = {
    ...env,
    SUBSCRIPTIONS: createKv(mixedLinks),
  };
  const res = await fetchPath('/api/sub?token=subtoken&type=clash', {}, mixedEnv);
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(body, /name: "Second-VLESS"/);
  assert.match(body, /name: "Fourth-Hysteria2"/);
  assert.ok(body.indexOf('name: "Second-VLESS"') < body.indexOf('name: "Fourth-Hysteria2"'));
  assert.doesNotMatch(body, /First-Trojan|Third-HY2/);

  const base64 = await fetchPath('/api/sub?token=subtoken&type=base64', {}, mixedEnv);
  const decoded = decodeURIComponent(escape(atob(await base64.text())));
  assert.equal(decoded, [mixedLinks[1], mixedLinks[3]].join('\n'));
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
  const regionLinks = regions.map(([name, host], index) =>
    `vless://${index + 1}1111111-1111-4111-8111-111111111111@${host}:443?security=tls&type=tcp#${encodeURIComponent(name)}`
  );
  const regionEnv = { ...env, SUBSCRIPTIONS: createKv(regionLinks) };

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
    SUBSCRIPTIONS: createKv(['vless://88888888-8888-4888-8888-888888888888@us.example:443?security=tls&type=tcp#美国-固定']),
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
  const res = await fetchPath('/api/sub?token=subtoken&type=clash', {}, { ...env, SUBSCRIPTIONS: createKv(['ss://unsupported']) });
  assert.equal(res.status, 422);
  assert.match(await res.text(), /没有可转换/);
});

test('health endpoint exercises session crypto, storage and dashboard rendering', async () => {
  const kv = createKv([LINK]);
  const res = await fetchPath('/api/health', {}, { ...env, SUBSCRIPTIONS: kv });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    ok: true,
    storage: 'kv',
    subscriptionSource: 'kv',
    formats: ['clash', 'loon', 'base64'],
    loonSyntax: 'nsloon',
    subscriptionManagement: ['add', 'reorder', 'delete'],
  });
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
  assert.equal(addBody.items.length, 1);
  assert.equal(addBody.items[0].name, 'ManagedNode');
  assert.equal(JSON.parse(kv.values.get('subscription_links')).length, 1);

  const list = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  const listBody = await list.json();
  assert.equal(list.status, 200);
  assert.equal(listBody.source, 'kv');
  assert.equal(listBody.items[0].protocol, 'hysteria2');
  assert.doesNotMatch(JSON.stringify(listBody), /secret@hysteria\.example/);

  const remove = await fetchPath('/api/manage/subscriptions', {
    method: 'DELETE',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ id: '0' }),
  }, testEnv);
  const removeBody = await remove.json();
  assert.equal(remove.status, 200);
  assert.equal(removeBody.items.length, 0);
  assert.deepEqual(JSON.parse(kv.values.get('subscription_links')), []);
});

test('logged-in administrator can reorder KV subscriptions', async () => {
  const kv = createKv([LINK_A, LINK_B]);
  const testEnv = { ...env, SUBSCRIPTIONS: kv };
  const { cookie } = await loginSession(testEnv);

  const move = await fetchPath('/api/manage/subscriptions', {
    method: 'PATCH',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ id: '1', direction: 'up' }),
  }, testEnv);
  const moveBody = await move.json();
  assert.equal(move.status, 200);
  assert.equal(moveBody.moved, 1);
  assert.deepEqual(moveBody.items.map((item) => item.name), ['NodeB', 'NodeA']);
  assert.deepEqual(JSON.parse(kv.values.get('subscription_links')), [LINK_B, LINK_A]);

  const subscription = await fetchPath('/api/sub?token=subtoken&type=base64', {}, testEnv);
  const decoded = decodeURIComponent(escape(atob(await subscription.text())));
  assert.equal(decoded, [LINK_B, LINK_A].join('\n'));

  const boundary = await fetchPath('/api/manage/subscriptions', {
    method: 'PATCH',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ id: '0', direction: 'up' }),
  }, testEnv);
  assert.equal(boundary.status, 400);
  assert.match((await boundary.json()).error, /列表边界/);
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

test('missing SUBSCRIPTIONS binding exposes no environment-variable nodes', async () => {
  const { SUBSCRIPTIONS: _ignored, ...unboundEnv } = env;
  const envWithLegacyLinks = { ...unboundEnv, LINK, LINK1: LINK_A };
  const { cookie, homePath } = await loginSession(envWithLegacyLinks);
  const add = await fetchPath('/api/manage/subscriptions', {
    method: 'POST', headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ links: LINK_A }),
  }, envWithLegacyLinks);
  assert.equal(add.status, 503);
  assert.match((await add.json()).error, /尚未绑定 Cloudflare KV.*SUBSCRIPTIONS/);

  const panel = await fetchPath(homePath, { headers: { cookie } }, envWithLegacyLinks);
  const panelBody = await panel.text();
  assert.equal(panel.status, 200);
  assert.match(panelBody, /尚未绑定 SUBSCRIPTIONS KV/);
  assert.match(panelBody, /KV 未绑定/);
  assert.doesNotMatch(panelBody, /TestNode|NodeA/);

  const subscription = await fetchPath('/api/sub?token=subtoken&type=base64', {}, envWithLegacyLinks);
  assert.equal(subscription.status, 503);
  assert.match(await subscription.text(), /SUBSCRIPTIONS KV is not bound/);
  assert.match(subscription.headers.get('cache-control') || '', /no-store/);
});

test('KV is the only subscription source and dashboard does not expose full nodes', async () => {
  const kv = createKv([LINK_B]);
  const testEnv = { ...env, LINK, LINK1: LINK_A, SUBSCRIPTIONS: kv };
  const subscription = await fetchPath('/api/sub?token=subtoken&type=base64', {}, testEnv);
  assert.equal(await subscription.text(), btoa(unescape(encodeURIComponent(LINK_B))));

  const { cookie, homePath } = await loginSession(testEnv);
  const panel = await fetchPath(homePath, { headers: { cookie } }, testEnv);
  const body = await panel.text();
  assert.match(body, /NodeB/);
  assert.doesNotMatch(body, /TestNode/);
  assert.doesNotMatch(body, /example-b\.com:443/);
  assert.match(body, /当前读取：KV/);
});

test('empty KV ignores legacy LINK variables', async () => {
  const kv = createKv();
  const testEnv = { ...env, LINK: LINK_A, LINK1: LINK_B, SUBSCRIPTIONS: kv };
  const subscription = await fetchPath('/api/sub?token=subtoken&type=base64', {}, testEnv);
  assert.equal(await subscription.text(), '');

  const { cookie } = await loginSession(testEnv);
  const list = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  const body = await list.json();
  assert.equal(body.source, 'kv');
  assert.equal(body.items.length, 0);
});
