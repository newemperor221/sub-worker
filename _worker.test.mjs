import { DatabaseSync } from 'node:sqlite';
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
  SUBSCRIPTIONS_DB: createD1([LINK]),
  SUBNAME: '测试订阅',
  ADMIN_USER: 'admin',
  ADMIN_PASS: 'pass123',
  SESSION_SECRET: 'unit-test-secret',
};
const numberedLinkEnv = {
  ...env,
  SUBSCRIPTIONS_DB: createD1([LINK_A, LINK_B]),
  SUBNAME: 'Test Subscription',
};
const relayNameEnv = {
  ...env,
  SUBSCRIPTIONS_DB: createD1([RELAY_LINK]),
  SUBNAME: 'Test Subscription',
};
const formattedRelayNameEnv = {
  ...env,
  SUBSCRIPTIONS_DB: createD1([FORMATTED_RELAY_LINK]),
  SUBNAME: 'Test Subscription',
};
const hkNameEnv = {
  ...env,
  SUBSCRIPTIONS_DB: createD1([HK_LINK]),
  SUBNAME: 'Test Subscription',
};

async function fetchPath(path, init = {}, testEnv = env) {
  return worker.fetch(new Request('https://sub.example.com' + path, init), testEnv);
}

function createD1(links = [], { hasNameColumn = true } = {}) {
  if (!Array.isArray(links)) { ({hasNameColumn = true} = links); links = []; }
  const sqlite = new DatabaseSync(':memory:');
  const state = { execCount: 0, hasNameColumn, alterCount: 0 };
  if (!hasNameColumn) sqlite.exec("CREATE TABLE nodes (id TEXT PRIMARY KEY,url TEXT NOT NULL UNIQUE,position INTEGER NOT NULL,group_name TEXT NOT NULL DEFAULT '',note TEXT NOT NULL DEFAULT '',enabled INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)");
  if (hasNameColumn) sqlite.exec("CREATE TABLE nodes (id TEXT PRIMARY KEY,url TEXT NOT NULL UNIQUE,name TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL,group_name TEXT NOT NULL DEFAULT '',note TEXT NOT NULL DEFAULT '',enabled INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)");
  for (const [position, url] of links.entries()) sqlite.prepare('INSERT INTO nodes (id,url,position,created_at,updated_at) VALUES (?,?,?,?,?)').run(crypto.randomUUID(),url,position,'2026-01-01','2026-01-01');
  Object.defineProperties(state, {
    nodes: { get: () => sqlite.prepare('SELECT * FROM nodes ORDER BY position').all() },
    meta: { get: () => new Map(sqlite.prepare('SELECT key,value FROM app_meta').all().map(row => [row.key,row.value])) },
  });
  function statement(sql, args = []) {
    return {
      bind(...values) { return statement(sql, values); },
      async first() { return sqlite.prepare(sql).get(...args) || null; },
      async all() { return { results: sqlite.prepare(sql).all(...args) }; },
      execute() { const result = sqlite.prepare(sql).run(...args); return { success: true, meta: { changes: Number(result.changes) } }; },
      async run() { return this.execute(); },
    };
  }
  return {
    state, sqlite,
    async exec(sql) { state.execCount++; if (sql.includes('ALTER TABLE')) { state.alterCount++; state.hasNameColumn = true; } sqlite.exec(sql); },
    prepare: statement,
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = []; for (const item of statements) results.push(item.execute()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
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

test('GET /favicon.svg serves the tab icon', async () => {
  const res = await fetchPath('/favicon.svg');
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /image\/svg\+xml/);
  assert.match(res.headers.get('cache-control') || '', /max-age=86400/);
  assert.match(body, /^<svg[\s\S]*<\/svg>$/);
});

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
  assert.match(body, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg">/);
  assert.doesNotMatch(body, /roughjs|rough-outline|drawRough|纸边|手绘|白板/i);
  assert.doesNotMatch(body.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '', /Segoe Print|LXGW WenKai|Kaiti SC|STKaiti|Ma Shan Zheng|cursive/);
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

test('login rejects missing SESSION_SECRET even with ADMIN_PASS configured', async () => {
  const fallbackEnv = { ...env, TOKEN: '', SESSION_SECRET: '' };
  const login = await fetchPath('/login', {
    method: 'POST',
    body: new URLSearchParams({ username: 'admin', password: 'pass123' }),
  }, fallbackEnv);

  assert.equal(login.status, 503);
  assert.equal(login.headers.has('set-cookie'), false);
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
  assert.match(body, /type=auto/);
  assert.match(body, />Auto</);
  assert.match(body, /node-grid/);
  assert.match(body, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg">/);
  assert.doesNotMatch(body, /node-badge|flagIcon|regionIcon/);
  assert.match(body, /color-scheme:dark/);
  assert.doesNotMatch(body, /roughjs|rough-outline|drawRough|纸边|手绘|白板/i);
  assert.match(res.headers.get('cache-control') || '', /no-store/);
  assert.doesNotMatch(body, /sub\.example\.com\/subtoken\?/);
  assert.doesNotMatch(body.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '', /Segoe Print|LXGW WenKai|Kaiti SC|STKaiti|Ma Shan Zheng|cursive/);
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
  assert.doesNotMatch(body.replace(/<script>[\s\S]*?<\/script>/g, ''), /出口（|）/);
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

test('subscription API preserves D1 node order', async () => {
  const res = await fetchPath('/api/sub?token=subtoken&type=base64', {}, numberedLinkEnv);
  const body = await res.text();
  const expected = [LINK_A, LINK_B].join('\n');

  assert.equal(res.status, 200);
  assert.equal(body, btoa(unescape(encodeURIComponent(expected))));
});

test('Clash output includes proxies from D1', async () => {
  const res = await fetchPath('/api/sub?token=subtoken&type=clash', {}, numberedLinkEnv);
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(body, /name: "NodeA"/);
  assert.match(body, /name: "NodeB"/);
});

test('Loon output includes VLESS Reality and Hysteria2 proxy lines', async () => {
  const loonEnv = {
    ...env,
    SUBSCRIPTIONS_DB: createD1([
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

test('auto subscription mode selects output from the client user agent', async () => {
  const clash = await fetchPath('/api/sub?token=subtoken&type=auto', {
    headers: { 'user-agent': 'mihomo/1.19.0' },
  });
  assert.equal(clash.status, 200);
  assert.match(await clash.text(), /proxies:/);
  assert.equal(clash.headers.get('vary'), 'User-Agent');

  const loon = await fetchPath('/api/sub?token=subtoken&type=auto', {
    headers: { 'user-agent': 'Loon/3.2' },
  });
  assert.equal(loon.status, 200);
  assert.match(await loon.text(), /^\[Proxy\]/);

  const generic = await fetchPath('/api/sub?token=subtoken&type=auto', {
    headers: { 'user-agent': 'curl/8.0' },
  });
  assert.equal(generic.status, 200);
  assert.equal(await generic.text(), btoa(unescape(encodeURIComponent(LINK))));
});

test('old subscription aliases and paths are not compatible', async () => {
  assert.equal((await fetchPath('/api/sub?token=subtoken&type=b64')).status, 404);
  assert.equal((await fetchPath('/api/sub?token=subtoken&type=mihomo')).status, 404);
  assert.equal((await fetchPath('/subtoken?base64')).status, 404);
  assert.equal((await fetchPath('/subtoken?loon')).status, 404);
  assert.equal((await fetchPath('/subtoken?clash')).status, 404);
});

test('D1 output keeps only VLESS and Hysteria2 in source order', async () => {
  const mixedLinks = [
    'trojan://secret@trojan.example:443?sni=edge.example#First-Trojan',
    'vless://77777777-7777-4777-8777-777777777777@vless.example:443?security=tls&type=tcp#Second-VLESS',
    'hy2://secret@hy2.example:443?sni=hy.example#Third-HY2',
    'hysteria2://secret@hysteria.example:443?sni=hy.example#Fourth-Hysteria2',
  ];
  const mixedEnv = {
    ...env,
    SUBSCRIPTIONS_DB: createD1(mixedLinks),
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
  const regionEnv = { ...env, SUBSCRIPTIONS_DB: createD1(regionLinks) };

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
    SUBSCRIPTIONS_DB: createD1(['vless://88888888-8888-4888-8888-888888888888@us.example:443?security=tls&type=tcp#美国-固定']),
  };
  const res = await fetchPath('/api/sub?token=subtoken&type=clash', {}, serviceEnv);
  const body = await res.text();

  assert.equal(res.status, 200);
  for (const group of ['🤖 AI', '🔎 Google', '🎵 Spotify', '𝕏 Twitter', '🎬 Netflix', '📹 YouTube', '📖 Reddit', '🎶 TikTok', '💳 PayPal', '♾️ Meta']) {
    assert.match(body, new RegExp(`name: "${group}"`));
  }
  assert.match(body, /name: "🇺🇸 美国固定节点"[\s\S]*?proxies: \["美国-固定"\]/);
  assert.ok(body.indexOf('DOMAIN-SUFFIX,x.ai,🤖 AI') < body.indexOf('GEOSITE,openai,🤖 AI'));
  assert.ok(body.indexOf('GEOSITE,youtube,📹 YouTube') < body.indexOf('GEOSITE,google,🔎 Google'));
});

test('Clash template follows the mt3600be mihomo routing and DNS source', async () => {
  const res = await fetchPath('/api/sub?token=subtoken&type=clash');
  const body = await res.text();

  assert.equal(res.status, 200);
  for (const marker of [
    'mixed-port: 7893',
    'socks-port: 7891',
    'tproxy-port: 7895',
    'bind-address: 127.0.0.1',
    'geodata-loader: memconservative',
    'listen: 127.0.0.1:7874',
    '- 223.5.5.5',
    '- rule-set:oc-cn-domain',
    'geosite:category-ads-all:',
    '- rcode://success',
    'rule-providers:',
    'oc-cn-domain:',
    'behavior: domain',
    'format: mrs',
    '- IP-CIDR,100.64.0.0/10,DIRECT,no-resolve',
    '- GEOSITE,category-ai-!cn,🤖 AI',
    '- GEOSITE,paypal,💳 PayPal',
    '- GEOIP,telegram,📲 Telegram,no-resolve',
    '- GEOSITE,category-games-cn,DIRECT',
  ]) {
    assert.ok(body.includes(marker), `missing template marker: ${marker}`);
  }

  const rulesBlock = body.slice(body.indexOf('\nrules:\n'), body.indexOf('external-ui:'));
  const rules = rulesBlock.split('\n').filter(line => line.startsWith('  - '));
  assert.equal(rules.length, 59);
  assert.equal(rules.at(-1).trim(), '- MATCH,Proxy');
});

test('fixed US group keeps the CN2 line first for GitHub defaults', async () => {
  const cn2Env = {
    ...env,
    SUBSCRIPTIONS_DB: createD1([
      'vless://aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa@us1.example:443?security=tls&type=tcp#美国-洛杉矶',
      'vless://bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb@us2.example:443?security=tls&type=tcp#美国-洛杉矶CN2',
    ]),
  };
  const res = await fetchPath('/api/sub?token=subtoken&type=clash', {}, cn2Env);
  const body = await res.text();

  assert.equal(res.status, 200);
  const fixed = body.match(/name: "🇺🇸 美国固定节点"[\s\S]*?proxies: \[([^\n]+)\]/)?.[1] || '';
  assert.match(fixed, /^"美国-洛杉矶CN2", "美国-洛杉矶"$/);
  const github = body.match(/name: "🐙 GitHub"[\s\S]*?proxies: \[([^\n]+)\]/)?.[1] || '';
  assert.match(github, /^"🇺🇸 美国固定节点"/);
});

test('Clash keeps the MT3600BE service groups and their distinct Los Angeles defaults', async () => {
  const homeEnv = {
    ...env,
    SUBSCRIPTIONS_DB: createD1([
      'hysteria2://fixture@ng.example:443#尼日利亚',
      'hysteria2://fixture@la.example:443#洛杉矶',
      'vless://aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa@sg.example:443?security=tls&type=tcp#新加坡',
      'hysteria2://fixture@jp.example:443#大阪',
      'hysteria2://fixture@cn2.example:443#洛杉矶 CN2',
    ]),
  };
  const res = await fetchPath('/api/sub?token=subtoken&type=clash', {}, homeEnv);
  assert.equal(res.status, 200);
  const body = await res.text();
  const groups = new Map(Array.from(
    body.matchAll(/^  - name: (".*")\n    type: select\n    proxies: (\[.*\])$/gm),
    ([, name, members]) => [JSON.parse(name), JSON.parse(members)],
  ));
  assert.equal(groups.size, 24);
  for (const name of ['Proxy', '🐙 GitHub', '𝕏 Twitter', '📹 YouTube', '🎶 TikTok']) {
    assert.equal(groups.get(name)?.[0], '洛杉矶 CN2', name);
  }
  for (const name of ['🤖 AI', '🔎 Google', '📖 Reddit', '♾️ Meta', '💳 PayPal', '🇺🇸 美国固定节点']) {
    assert.equal(groups.get(name)?.[0], '洛杉矶', name);
  }
  for (const name of ['📲 Telegram', '🎬 Netflix', '🎮 游戏']) {
    assert.equal(groups.get(name)?.[0], '🇸🇬 新加坡节点', name);
  }
  assert.deepEqual(groups.get('🎮 游戏')?.slice(0, 2), ['🇸🇬 新加坡节点', '🇯🇵 日本节点']);
  assert.equal(groups.get('🎵 Spotify')?.[0], '🇳🇬 尼日利亚节点');
  assert.deepEqual(groups.get('🐙 GitHub'), ['洛杉矶 CN2', '🇸🇬 新加坡节点', '🇯🇵 日本节点', 'Proxy', 'DIRECT']);
  assert.deepEqual(groups.get('🌍 其它地区'), ['洛杉矶 CN2', '洛杉矶']);
});

test('Clash endpoint returns 422 when every configured node is invalid', async () => {
  const res = await fetchPath('/api/sub?token=subtoken&type=clash', {}, { ...env, SUBSCRIPTIONS_DB: createD1(['ss://unsupported']) });
  assert.equal(res.status, 422);
  assert.match(await res.text(), /没有可转换/);
});

test('health endpoint exercises session crypto, storage and dashboard rendering', async () => {
  const db = createD1([LINK]);
  const res = await fetchPath('/api/health', {}, { ...env, SUBSCRIPTIONS_DB: db });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    ok: true,
    storage: 'd1',
    subscriptionSource: 'd1',
    formats: ['auto', 'clash', 'loon', 'base64'],
    loonSyntax: 'nsloon',
    subscriptionManagement: ['add', 'reorder', 'delete', 'edit', 'toggle'],
    capabilities: ['names', 'grouping', 'link-edit', 'notes', 'search', 'toggle'],
  });
  assert.match(res.headers.get('cache-control') || '', /no-store/);
});

test('subscription management API rejects unauthenticated requests and disables caching', async () => {
  const res = await fetchPath('/api/manage/subscriptions', {}, { ...env, SUBSCRIPTIONS_DB: createD1() });
  assert.equal(res.status, 401);
  assert.match(res.headers.get('cache-control') || '', /no-store/);
  assert.match((await res.json()).error, /请先登录/);
});

test('logged-in administrator can add, list and delete D1 subscriptions', async () => {
  const db = createD1();
  const testEnv = { ...env, SUBSCRIPTIONS_DB: db };
  const { cookie } = await loginSession(testEnv);
  const addedLink = 'hysteria2://secret@hysteria.example:443?sni=edge.example#ManagedNode';

  const add = await fetchPath('/api/manage/subscriptions', {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ link: addedLink, name: '香港备用', group: '香港' }),
  }, testEnv);
  const addBody = await add.json();
  assert.equal(add.status, 200);
  assert.equal(addBody.added, 1);
  assert.equal(addBody.items.length, 1);
  assert.equal(addBody.items[0].name, '香港备用');
  assert.equal(addBody.items[0].group, '香港');

  const list = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  const listBody = await list.json();
  assert.equal(list.status, 200);
  assert.equal(listBody.source, 'd1');
  assert.equal(listBody.items[0].protocol, 'hysteria2');
  assert.doesNotMatch(JSON.stringify(listBody), /secret@hysteria\.example/);
  const base64Subscription = await fetchPath('/api/sub?token=subtoken&type=base64', {}, testEnv);
  const decodedSubscription = decodeURIComponent(escape(atob(await base64Subscription.text())));
  assert.match(decodedSubscription, /#%E9%A6%99%E6%B8%AF%E5%A4%87%E7%94%A8$/);
  const clashSubscription = await fetchPath('/api/sub?token=subtoken&type=clash', {}, testEnv);
  assert.match(await clashSubscription.text(), /name: "香港备用"/);
  const managedId = listBody.items[0].id;

  const remove = await fetchPath('/api/manage/subscriptions', {
    method: 'DELETE',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ id: managedId }),
  }, testEnv);
  const removeBody = await remove.json();
  assert.equal(remove.status, 200);
  assert.equal(removeBody.items.length, 0);
});

test('logged-in administrator can reorder D1 subscriptions', async () => {
  const db = createD1([LINK_A, LINK_B]);
  const testEnv = { ...env, SUBSCRIPTIONS_DB: db };
  const { cookie } = await loginSession(testEnv);
  const before = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  const beforeItems = (await before.json()).items;
  const nodeBId = beforeItems.find((item) => item.name === 'NodeB').id;

  const move = await fetchPath('/api/manage/subscriptions', {
    method: 'PATCH',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ id: nodeBId, direction: 'up' }),
  }, testEnv);
  const moveBody = await move.json();
  assert.equal(move.status, 200);
  assert.equal(moveBody.moved, 1);
  assert.deepEqual(moveBody.items.map((item) => item.name), ['NodeB', 'NodeA']);
  assert.equal(moveBody.items[0].id, nodeBId);

  const subscription = await fetchPath('/api/sub?token=subtoken&type=base64', {}, testEnv);
  const decoded = decodeURIComponent(escape(atob(await subscription.text())));
  assert.equal(decoded, [LINK_B, LINK_A].join('\n'));

  const boundary = await fetchPath('/api/manage/subscriptions', {
    method: 'PATCH',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ id: nodeBId, direction: 'up' }),
  }, testEnv);
  assert.equal(boundary.status, 400);
  assert.match((await boundary.json()).error, /列表边界/);
});

test('add requires one link plus a name and group, and rejects unsupported protocols', async () => {
  const db = createD1([]);
  const testEnv = { ...env, SUBSCRIPTIONS_DB: db };
  const { cookie } = await loginSession(testEnv);
  const add = await fetchPath('/api/manage/subscriptions', {
    method: 'POST', headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ link: `  ${LINK_A}  `, name: '东京主节点', group: '日本' }),
  }, testEnv);
  assert.equal(add.status, 200);
  const added = await add.json();
  assert.equal(added.added, 1);
  assert.equal(added.items[0].name, '东京主节点');
  assert.equal(added.items[0].group, '日本');

  for (const payload of [
    { link: LINK_B, name: '', group: '日本' },
    { link: LINK_B, name: '备用', group: '' },
    { link: `${LINK_A}\n${LINK_B}`, name: '批量', group: '测试' },
    { link: 'trojan://unsupported', name: '无效', group: '测试' },
  ]) {
    const invalid = await fetchPath('/api/manage/subscriptions', {
      method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(payload),
    }, testEnv);
    assert.equal(invalid.status, 400);
  }
});

test('D1 is the only subscription source and dashboard does not expose full nodes', async () => {
  const db = createD1([LINK_B]);
  const testEnv = { ...env, LINK, LINK1: LINK_A, SUBSCRIPTIONS_DB: db };
  const subscription = await fetchPath('/api/sub?token=subtoken&type=base64', {}, testEnv);
  assert.equal(await subscription.text(), btoa(unescape(encodeURIComponent(LINK_B))));

  const { cookie, homePath } = await loginSession(testEnv);
  const panel = await fetchPath(homePath, { headers: { cookie } }, testEnv);
  const body = await panel.text();
  assert.match(body, /NodeB/);
  assert.doesNotMatch(body, /TestNode/);
  assert.doesNotMatch(body, /example-b\.com:443/);
  assert.match(body, /当前读取：D1/);
});

test('empty D1 ignores legacy LINK variables', async () => {
  const db = createD1();
  const testEnv = { ...env, LINK: LINK_A, LINK1: LINK_B, SUBSCRIPTIONS_DB: db };
  const subscription = await fetchPath('/api/sub?token=subtoken&type=base64', {}, testEnv);
  assert.equal(await subscription.text(), '');

  const { cookie } = await loginSession(testEnv);
  const list = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  const body = await list.json();
  assert.equal(body.source, 'd1');
  assert.equal(body.items.length, 0);
});

test('existing D1 schema gains the required name column once', async () => {
  const db = createD1({ hasNameColumn: false });
  const testEnv = { ...env, SUBSCRIPTIONS_DB: db };
  const { cookie } = await loginSession(testEnv);
  const first = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  assert.equal(first.status, 200);
  assert.equal(db.state.hasNameColumn, true);
  assert.equal(db.state.alterCount, 1);
  const second = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  assert.equal(second.status, 200);
  assert.equal(db.state.alterCount, 1);
});

test('name, group, note and replacement link edits persist to D1', async () => {
  const db = createD1([LINK_A]);
  const testEnv = { ...env, SUBSCRIPTIONS_DB: db };
  const { cookie } = await loginSession(testEnv);
  const listed = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  const id = (await listed.json()).items[0].id;
  const updated = await fetchPath('/api/manage/subscriptions', {
    method: 'PUT', headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ id, name: ' 新加坡落地 ', group: ' Singapore ', note: ' primary ', url: LINK_B, enabled: false }),
  }, testEnv);
  const body = await updated.json();
  assert.equal(updated.status, 200);
  assert.equal(body.items[0].name, '新加坡落地');
  assert.equal(body.items[0].group, 'Singapore');
  assert.equal(body.items[0].note, 'primary');
  assert.equal(body.items[0].enabled, false);
  assert.doesNotMatch(JSON.stringify(body), /example-b\.com/);
  assert.equal(db.state.nodes[0].name, '新加坡落地');
  assert.equal(db.state.nodes[0].group_name, 'Singapore');
  assert.equal(db.state.nodes[0].url, LINK_B);
});

test('edit API rejects invalid state, empty names/groups and malformed replacement links', async () => {
  const db = createD1([LINK_A, LINK_B]);
  const testEnv = { ...env, SUBSCRIPTIONS_DB: db };
  const { cookie } = await loginSession(testEnv);
  const list = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  const items = (await list.json()).items;
  const id = items[0].id;
  const cases = [
    [{ id, enabled: 'false' }, /布尔值/],
    [{ id, name: '' }, /名称不能为空/],
    [{ id, group: '' }, /分组不能为空/],
    [{ id, url: 'trojan://unsupported' }, /协议不受支持/],
  ];
  for (const [payload, pattern] of cases) {
    const response = await fetchPath('/api/manage/subscriptions', {
      method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(payload),
    }, testEnv);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, pattern);
  }
  const duplicate = await fetchPath('/api/manage/subscriptions', {
    method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ id, url: LINK_B }),
  }, testEnv);
  assert.equal(duplicate.status, 409);
});

test('disabled nodes stay manageable but are excluded from auto, Clash, Loon, and Base64 outputs', async () => {
  const db = createD1([LINK_A, LINK_B]);
  const testEnv = { ...env, SUBSCRIPTIONS_DB: db };
  const { cookie } = await loginSession(testEnv);
  const list = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  const items = (await list.json()).items;
  const nodeB = items.find(item => item.name === 'NodeB');
  const disabled = await fetchPath('/api/manage/subscriptions', {
    method: 'PUT', headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ id: nodeB.id, enabled: false }),
  }, testEnv);
  assert.equal(disabled.status, 200);
  assert.equal((await disabled.json()).items.find(item => item.id === nodeB.id).enabled, false);

  const cases = [
    ['base64', 'curl/8', body => decodeURIComponent(escape(atob(body)))],
    ['clash', 'mihomo/1', body => body],
    ['loon', 'Loon/3', body => body],
    ['auto', 'curl/8', body => decodeURIComponent(escape(atob(body)))],
    ['auto', 'mihomo/1', body => body],
    ['auto', 'Loon/3', body => body],
  ];
  for (const [type, userAgent, decode] of cases) {
    const response = await fetchPath(`/api/sub?token=subtoken&type=${type}`, { headers: { 'user-agent': userAgent } }, testEnv);
    const output = decode(await response.text());
    assert.equal(response.status, 200);
    assert.match(output, /NodeA/);
    assert.doesNotMatch(output, /NodeB/);
  }
});

test('dashboard includes required add fields, link editor, filters and enable switch markers without tags', async () => {
  const testEnv = { ...env, SUBSCRIPTIONS_DB: createD1([LINK]) };
  const { cookie, homePath } = await loginSession(testEnv);
  const response = await fetchPath(homePath, { headers: { cookie } }, testEnv);
  const body = await response.text();
  assert.match(body, /id="subscriptionName"/);
  assert.match(body, /id="subscriptionGroup"/);
  assert.match(body, /id="subscriptionInput"/);
  assert.match(body, /id="nodeSearch"/);
  assert.match(body, /id="groupFilter"/);
  assert.match(body, /id="statusFilter"/);
  assert.match(body, /id="editName"/);
  assert.match(body, /id="editGroup"/);
  assert.match(body, /id="editUrl"/);
  assert.doesNotMatch(body, /editTags|tag-list|标签/);
  assert.match(body, /data-toggle-id/);
  assert.match(body, /class="toggle-text"/);
  assert.match(body, /aria-label=/);
  assert.match(body, /overflow-x:hidden/);
});

test('invalid administrator configuration rejects login, management and health without cookies', async () => {
  for (const override of [{ADMIN_USER:''},{ADMIN_PASS:''},{SESSION_SECRET:''},{ADMIN_USER:' '},{SESSION_SECRET:env.TOKEN},{SESSION_SECRET:env.ADMIN_PASS}]) {
    const e = {...env,...override};
    for (const path of ['/login','/api/manage/subscriptions','/api/health']) {
      const r = await fetchPath(path, path === '/login' ? {method:'POST',body:new URLSearchParams({username:'',password:''})} : {}, e);
      assert.equal(r.status,503); assert.equal(r.headers.has('set-cookie'),false);
      assert.match(r.headers.get('cache-control'),/no-store/);
    }
  }
});

test('rotating the independent session secret invalidates existing sessions', async () => {
  const {cookie} = await loginSession();
  assert.equal((await fetchPath('/api/manage/subscriptions',{headers:{cookie}}, {...env,SESSION_SECRET:'different-independent-secret'})).status,401);
  // Changing the subscription token does not change administrator sessions.
  assert.equal((await fetchPath('/api/manage/subscriptions',{headers:{cookie}}, {...env,TOKEN:'different-subscription-token'})).status,200);
});

test('concurrent D1 adds return an explicit conflict; retry preserves both records', async () => {
  const db = createD1(); const e = {...env,SUBSCRIPTIONS_DB:db};
  const {cookie} = await loginSession(e);
  await fetchPath('/api/manage/subscriptions',{headers:{cookie}},e);
  const add = (link,name) => fetchPath('/api/manage/subscriptions',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({link,name,group:'test'})},e);
  // Hold both snapshots until both requests have read the same revision.
  const prepare = db.prepare; let reads = 0, release;
  const gate = new Promise(resolve => { release = resolve; });
  db.prepare = sql => {
    const statement = prepare(sql);
    if (sql.startsWith('SELECT * FROM nodes')) {
      const all = statement.all.bind(statement);
      statement.all = async () => { const result = await all(); if (++reads === 2) release(); await gate; return result; };
    }
    return statement;
  };
  const results = await Promise.all([add(LINK_A,'A'),add(LINK_B,'B')]);
  db.prepare = prepare;
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const failed = results.findIndex(r=>r.status===409);
  assert.equal((await add(failed===0?LINK_A:LINK_B,failed===0?'A':'B')).status,200);
  assert.equal(db.state.nodes.length,2);
  assert.deepEqual(new Set(db.state.nodes.map(n=>n.url)),new Set([LINK_A,LINK_B]));
});

test('D1 transaction rolls back revision and all ordering changes on a statement failure', async () => {
  const db = createD1([LINK_A,LINK_B]); const e = {...env,SUBSCRIPTIONS_DB:db};
  const {cookie} = await loginSession(e);
  const list = await fetchPath('/api/manage/subscriptions',{headers:{cookie}},e);
  const items = (await list.json()).items;
  const before = db.state.nodes; const revision = db.state.meta.get('nodes_revision');
  db.sqlite.exec("CREATE TRIGGER reject_move BEFORE UPDATE OF position ON nodes WHEN NEW.position = 1 BEGIN SELECT RAISE(ABORT,'test failure'); END");
  const r = await fetchPath('/api/manage/subscriptions',{method:'PATCH',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({id:items[1].id,direction:'up'})},e);
  assert.equal(r.status,503); assert.deepEqual(db.state.nodes,before); assert.equal(db.state.meta.get('nodes_revision'),revision);
});

test('invalid node additions and replacements leave D1 unchanged', async () => {
  const db = createD1([LINK_A]); const e = {...env,SUBSCRIPTIONS_DB:db};
  const {cookie} = await loginSession(e);
  const list = await fetchPath('/api/manage/subscriptions',{headers:{cookie}},e);
  const id = (await list.json()).items[0].id;
  const invalid = ['vless://', 'vless://id@example.com:443', LINK_B.replace(':443',':0'),LINK_B.replace(':443',''),LINK_B.replace('security=tls','security=bad'),LINK_B.replace('type=tcp','type=bad'),LINK_B.replace('security=tls','security=reality'),LINK_B+'&insecure=maybe','hysteria2://pass@example.com:443?obfs=salamander'];
  // Append query parameters before fragments.
  invalid[7] = LINK_B.split('#')[0]+'&insecure=maybe';
  const before = db.state.nodes;
  for (const url of invalid) for (const method of ['POST','PUT']) {
    const payload = method === 'POST' ? {link:url,name:'test',group:'test'} : {id,url};
    const r = await fetchPath('/api/manage/subscriptions',{method,headers:{cookie,'content-type':'application/json'},body:JSON.stringify(payload)},e);
    assert.equal(r.status,400,url); assert.doesNotMatch(await r.text(),/22222222|33333333/);
    assert.deepEqual(db.state.nodes,before);
  }
});

test('concurrent edits to different records cannot silently lose an update', async () => {
  const db = createD1([LINK_A,LINK_B]); const e = {...env,SUBSCRIPTIONS_DB:db};
  const {cookie} = await loginSession(e);
  const list = await fetchPath('/api/manage/subscriptions',{headers:{cookie}},e);
  const items = (await list.json()).items;
  const prepare = db.prepare; let reads = 0, release;
  const gate = new Promise(resolve => { release = resolve; });
  db.prepare = sql => {
    const stmt = prepare(sql);
    if (sql.startsWith('SELECT * FROM nodes')) {
      const all = stmt.all.bind(stmt);
      stmt.all = async () => { const result = await all(); if (++reads === 2) release(); await gate; return result; };
    }
    return stmt;
  };
  const edit = i => fetchPath('/api/manage/subscriptions',{method:'PUT',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({id:items[i].id,note:'updated '+i})},e);
  const results = await Promise.all([edit(0),edit(1)]);
  db.prepare = prepare;
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const failed = results.findIndex(r=>r.status===409);
  assert.equal((await edit(failed)).status,200);
  assert.deepEqual(db.state.nodes.map(n=>n.note),['updated 0','updated 1']);
});

test('stale dashboard revision is rejected even when requests arrive sequentially', async () => {
  const e = {...env,SUBSCRIPTIONS_DB:createD1([LINK_A])};
  const {cookie} = await loginSession(e);
  const list = await fetchPath('/api/manage/subscriptions',{headers:{cookie}},e);
  const {items,revision} = await list.json();
  const edit = note => fetchPath('/api/manage/subscriptions',{method:'PUT',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({id:items[0].id,revision,note})},e);
  assert.equal((await edit('first')).status,200);
  assert.equal((await edit('stale')).status,409);
  assert.equal(e.SUBSCRIPTIONS_DB.state.nodes[0].note,'first');
});

test('missing or unavailable D1 returns 503 everywhere and never touches obsolete storage', async () => {
  for (const database of [undefined, {async exec(){throw new Error('offline');}}]) {
    let oldStorageReads = 0;
    const e = {...env,SUBSCRIPTIONS_DB:database,LINK:LINK_A};
    Object.defineProperty(e,'SUBSCRIPTIONS',{get(){ oldStorageReads++; throw new Error('obsolete storage must not be accessed'); }});
    const {cookie,homePath} = await loginSession(e);
    const paths = ['/api/health',homePath,...['auto','clash','loon','base64'].map(type=>'/api/sub?token=subtoken&type='+type)];
    for (const path of paths) {
      const r = await fetchPath(path,{headers:{cookie}},e);
      assert.equal(r.status,503,path); assert.match(r.headers.get('cache-control'),/no-store/);
      assert.doesNotMatch(await r.text(),/11111111|22222222/);
    }
    for (const method of ['GET','POST','PUT','PATCH','DELETE']) {
      const r = await fetchPath('/api/manage/subscriptions',{method,headers:{cookie,'content-type':'application/json'},...(method==='GET'?{}:{body:'{}'})},e);
      assert.equal(r.status,503,method);
    }
    assert.equal(oldStorageReads,0);
  }
});

test('D1 initializes without secondary storage and an empty database remains empty after reinitialization', async () => {
  const db = createD1(); const e = {...env,SUBSCRIPTIONS_DB:db};
  db.sqlite.exec('DROP TABLE nodes'); // Exercise creation from a genuinely empty database.
  let oldStorageReads = 0;
  Object.defineProperty(e,'SUBSCRIPTIONS',{get(){oldStorageReads++;throw new Error('obsolete storage');}});
  const {cookie} = await loginSession(e);
  const request = (method,payload) => fetchPath('/api/manage/subscriptions',{method,headers:{cookie,'content-type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})},e);
  assert.deepEqual((await (await request('GET')).json()).items,[]);
  const add = await request('POST',{link:LINK_A,name:'A',group:'test'});
  const body = await add.json(); assert.equal(add.status,200);
  assert.equal('backupUpdated' in body,false);assert.equal('kvBound' in body,false);
  assert.equal((await request('DELETE',{id:body.items[0].id})).status,200);
  const revision = db.state.meta.get('nodes_revision');
  e.SUBSCRIPTIONS_DB = {...db}; // Simulate a fresh binding/isolate with the same persistent database.
  assert.deepEqual((await (await request('GET')).json()).items,[]);
  assert.equal(db.state.meta.get('nodes_revision'),revision);
  assert.equal(oldStorageReads,0);
});
