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

function createD1({ hasNameColumn = true } = {}) {
  const state = { nodes: [], meta: new Map(), execCount: 0, hasNameColumn, alterCount: 0 };
  function statement(sql, args = []) {
    return {
      bind(...values) { return statement(sql, values); },
      async first() {
        if (/SELECT value FROM app_meta/.test(sql)) return state.meta.has(args[0]) ? { value: state.meta.get(args[0]) } : null;
        return null;
      },
      async all() {
        if (/PRAGMA table_info\(nodes\)/.test(sql)) {
          const columns = ['id', 'url', 'position', 'group_name', 'note', 'enabled', 'created_at', 'updated_at'];
          if (state.hasNameColumn) columns.splice(2, 0, 'name');
          return { results: columns.map(name => ({ name })) };
        }
        if (/SELECT \* FROM nodes/.test(sql)) return { results: [...state.nodes].sort((a, b) => a.position - b.position).map(row => ({ ...row })) };
        return { results: [] };
      },
      async run() {
        if (/^DELETE FROM nodes/.test(sql)) state.nodes = [];
        if (/INSERT (?:OR IGNORE )?INTO nodes/.test(sql)) {
          const [id, url, name, position, group_name, note, enabled, created_at, updated_at] = args;
          if (!/OR IGNORE/.test(sql) || !state.nodes.some(row => row.id === id || row.url === url)) state.nodes.push({ id, url, name, position, group_name, note, enabled, created_at, updated_at });
        }
        if (/INSERT OR REPLACE INTO app_meta/.test(sql)) state.meta.set(args[0], args[1]);
        return { success: true };
      },
    };
  }
  return {
    state,
    async exec(sql) {
      state.execCount += 1;
      if (/ALTER TABLE nodes ADD COLUMN name/.test(sql)) {
        state.hasNameColumn = true;
        state.alterCount += 1;
        state.nodes = state.nodes.map(row => ({ ...row, name: row.name || '' }));
      }
      return { count: 0 };
    },
    prepare(sql) { return statement(sql); },
    async batch(statements) { for (const item of statements) await item.run(); return statements.map(() => ({ success: true })); },
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
  assert.match(body, /type=auto/);
  assert.match(body, />Auto</);
  assert.match(body, /node-grid/);
  assert.match(body, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg">/);
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
    SUBSCRIPTIONS: createKv([
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
    SUBSCRIPTIONS: createKv([
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
    formats: ['auto', 'clash', 'loon', 'base64'],
    loonSyntax: 'nsloon',
    subscriptionManagement: ['add', 'reorder', 'delete', 'edit', 'toggle'],
    capabilities: ['names', 'grouping', 'link-edit', 'notes', 'search', 'toggle'],
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
    body: JSON.stringify({ link: addedLink, name: '香港备用', group: '香港' }),
  }, testEnv);
  const addBody = await add.json();
  assert.equal(add.status, 200);
  assert.equal(addBody.added, 1);
  assert.equal(addBody.items.length, 1);
  assert.equal(addBody.items[0].name, '香港备用');
  assert.equal(addBody.items[0].group, '香港');
  assert.equal(JSON.parse(kv.values.get('subscription_links')).length, 1);

  const list = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  const listBody = await list.json();
  assert.equal(list.status, 200);
  assert.equal(listBody.source, 'kv');
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
  assert.deepEqual(JSON.parse(kv.values.get('subscription_links')), []);
});

test('logged-in administrator can reorder KV subscriptions', async () => {
  const kv = createKv([LINK_A, LINK_B]);
  const testEnv = { ...env, SUBSCRIPTIONS: kv };
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
  assert.deepEqual(JSON.parse(kv.values.get('subscription_links')), [LINK_B, LINK_A]);

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
  const kv = createKv([]);
  const testEnv = { ...env, SUBSCRIPTIONS: kv };
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
  assert.equal(JSON.parse(kv.values.get('subscription_nodes_v2')).length, 1);
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

test('D1 initializes schema, migrates KV once, and remains authoritative after all nodes are deleted', async () => {
  const kv = createKv([LINK_A, LINK_B]);
  const db = createD1();
  const testEnv = { ...env, SUBSCRIPTIONS: kv, SUBSCRIPTIONS_DB: db };
  const { cookie } = await loginSession(testEnv);
  const first = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  const firstBody = await first.json();
  assert.equal(firstBody.source, 'd1');
  assert.deepEqual(firstBody.items.map(item => item.name), ['NodeA', 'NodeB']);
  assert.ok(db.state.meta.has('kv_nodes_migrated_v2'));
  assert.ok(firstBody.items.every(item => item.id && !/^\d+$/.test(item.id)));
  const health = await fetchPath('/api/health', {}, testEnv);
  assert.equal((await health.json()).storage, 'd1');

  for (const item of firstBody.items) {
    const removed = await fetchPath('/api/manage/subscriptions', {
      method: 'DELETE', headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    }, testEnv);
    assert.equal(removed.status, 200);
  }
  kv.values.set('subscription_links', JSON.stringify([LINK_A]));
  const after = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  assert.deepEqual((await after.json()).items, []);
  assert.equal(db.state.nodes.length, 0);
});

test('existing D1 schema gains the required name column once', async () => {
  const kv = createKv([LINK_A]);
  const db = createD1({ hasNameColumn: false });
  const testEnv = { ...env, SUBSCRIPTIONS: kv, SUBSCRIPTIONS_DB: db };
  const { cookie } = await loginSession(testEnv);
  const first = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  assert.equal(first.status, 200);
  assert.equal(db.state.hasNameColumn, true);
  assert.equal(db.state.alterCount, 1);
  const second = await fetchPath('/api/manage/subscriptions', { headers: { cookie } }, testEnv);
  assert.equal(second.status, 200);
  assert.equal(db.state.alterCount, 1);
});

test('name, group, note and replacement link edits persist to D1 and KV backup', async () => {
  const kv = createKv([LINK_A]);
  const db = createD1();
  const testEnv = { ...env, SUBSCRIPTIONS: kv, SUBSCRIPTIONS_DB: db };
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
  const backup = JSON.parse(kv.values.get('subscription_nodes_v2'));
  assert.equal(backup[0].id, id);
  assert.equal(backup[0].name, '新加坡落地');
  assert.equal(backup[0].url, LINK_B);
  assert.match(JSON.parse(kv.values.get('subscription_links'))[0], /#%E6%96%B0%E5%8A%A0%E5%9D%A1%E8%90%BD%E5%9C%B0$/);
});

test('edit API rejects invalid state, empty names/groups and malformed replacement links', async () => {
  const kv = createKv([LINK_A, LINK_B]);
  const testEnv = { ...env, SUBSCRIPTIONS: kv };
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
  const kv = createKv([LINK_A, LINK_B]);
  const testEnv = { ...env, SUBSCRIPTIONS: kv };
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
  const testEnv = { ...env, SUBSCRIPTIONS: createKv([LINK]) };
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

test('D1 read failure falls back to KV for subscriptions and rejects management writes', async () => {
  const kv = createKv([LINK]);
  const brokenDb = { async exec() { throw new Error('D1 unavailable'); } };
  const testEnv = { ...env, SUBSCRIPTIONS: kv, SUBSCRIPTIONS_DB: brokenDb };
  const subscription = await fetchPath('/api/sub?token=subtoken&type=base64', {}, testEnv);
  assert.equal(subscription.status, 200);
  assert.equal(decodeURIComponent(escape(atob(await subscription.text()))), LINK);
  const { cookie } = await loginSession(testEnv);
  const write = await fetchPath('/api/manage/subscriptions', {
    method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ links: LINK_A }),
  }, testEnv);
  assert.equal(write.status, 503);
  assert.match((await write.json()).error, /数据分叉/);
});
