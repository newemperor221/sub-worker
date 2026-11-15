import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convertVlessToClashProxy,
  convertHysteria2ToClashProxy,
} from './convert.js';

test('VLESS fragment stays a display name and cannot override query parameters', () => {
  const proxy = convertVlessToClashProxy(
    'vless://11111111-1111-4111-8111-111111111111@1.2.3.4:443?security=reality&sni=example.com&pbk=PUBLIC&sid=abcd&type=tcp#security%3Dnone%26mode%3Dstream-up',
  );

  assert.equal(proxy.name, 'security=none&mode=stream-up');
  assert.equal(proxy.tls, true);
  assert.equal(proxy.servername, 'example.com');
  assert.deepEqual(proxy['reality-opts'], { 'public-key': 'PUBLIC', 'short-id': 'abcd' });
});

test('VLESS does not invent TLS or disable certificate verification', () => {
  const plain = convertVlessToClashProxy(
    'vless://11111111-1111-4111-8111-111111111111@example.com:80?type=tcp#Plain',
  );
  const tls = convertVlessToClashProxy(
    'vless://11111111-1111-4111-8111-111111111111@example.com:443?security=tls&type=tcp#TLS',
  );

  assert.equal(plain.tls, false);
  assert.equal('skip-cert-verify' in plain, false);
  assert.equal('servername' in plain, false);
  assert.equal(tls.tls, true);
  assert.equal(tls['skip-cert-verify'], false);
});

test('VLESS preserves XHTTP mode only when valid and drops incompatible flow', () => {
  const proxy = convertVlessToClashProxy(
    'vless://11111111-1111-4111-8111-111111111111@example.com:443?security=tls&type=xhttp&mode=stream-up&path=%2Fx&host=cdn.example&flow=xtls-rprx-vision#XHTTP',
  );

  assert.deepEqual(proxy['xhttp-opts'], { path: '/x', mode: 'stream-up', host: 'cdn.example' });
  assert.equal('flow' in proxy, false);
});

test('Hysteria2 parser preserves user:password auth and TLS settings', () => {
  const proxy = convertHysteria2ToClashProxy(
    'hysteria2://user:p%40ss@example.com:443?sni=hy.example&insecure=true&obfs=salamander&obfs-password=secret#Hysteria2',
  );

  assert.equal(proxy.password, 'user:p@ss');
  assert.equal(proxy.sni, 'hy.example');
  assert.equal(proxy['skip-cert-verify'], true);
  assert.equal(proxy.obfs, 'salamander');
  assert.equal(proxy['obfs-password'], 'secret');
});

test('malformed and incomplete nodes are rejected', () => {
  assert.equal(convertVlessToClashProxy('vless://example.com'), null);
  assert.equal(convertVlessToClashProxy('vless://id@example.com?security=reality'), null);
  assert.equal(convertHysteria2ToClashProxy('hysteria2://example.com'), null);
  assert.equal(convertHysteria2ToClashProxy('hy2://secret@example.com:443'), null);
});
