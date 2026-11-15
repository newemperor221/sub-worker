import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLoonConfig } from './loon.js';

test('Loon renderer outputs VLESS Reality and Hysteria2 nodes', () => {
  const output = generateLoonConfig([
    {
      name: 'Reality Node', type: 'vless', server: '1.2.3.4', port: 443,
      uuid: '11111111-1111-4111-8111-111111111111', network: 'tcp', tls: true,
      flow: 'xtls-rprx-vision', servername: 'example.com',
      'client-fingerprint': 'chrome',
      'reality-opts': { 'public-key': 'public-key', 'short-id': 'abcd' },
    },
    {
      name: 'HY2 Node', type: 'hysteria2', server: '5.6.7.8', port: 8443,
      password: 'secret', sni: 'hy.example.com', 'skip-cert-verify': true,
    },
  ]);

  assert.match(output, /^\[Proxy\]\n/);
  assert.match(output, /Reality Node = VLESS, 1\.2\.3\.4, 443, "11111111-1111-4111-8111-111111111111"/);
  assert.match(output, /flow=xtls-rprx-vision/);
  assert.match(output, /transport=tcp/);
  assert.match(output, /over-tls=true/);
  assert.doesNotMatch(output, /reality=true/);
  assert.match(output, /public-key=public-key/);
  assert.match(output, /short-id=abcd/);
  assert.match(output, /sni=example\.com/);
  assert.match(output, /tls-profile=chrome/);
  assert.match(output, /udp=true/);
  assert.match(output, /block-quic=false/);
  assert.match(output, /ip-mode=prefer-v4/);
  assert.match(output, /HY2 Node = Hysteria2, 5\.6\.7\.8, 8443, "secret", sni=hy\.example\.com/);
  assert.match(output, /skip-cert-verify=true/);
});

test('Loon renderer sanitizes and de-duplicates node names', () => {
  const output = generateLoonConfig([
    { name: 'Same,Name', type: 'hysteria2', server: 'a.example', port: 443, password: 'a' },
    { name: 'Same Name', type: 'hysteria2', server: 'b.example', port: 443, password: 'b' },
  ]);

  assert.match(output, /Same Name = Hysteria2/);
  assert.match(output, /Same Name_1 = Hysteria2/);
});
