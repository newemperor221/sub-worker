import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNodeLink } from './validation.js';
const base = 'vless://11111111-1111-4111-8111-111111111111@example.com:443';
test('supported node fields parse consistently before persistence', () => {
  for (const query of [
    '?security=none&type=tcp',
    '?security=tls&type=ws&path=%2Fws&host=cdn.example&ed=2048&eh=Sec-WebSocket-Protocol',
    '?security=tls&type=grpc&serviceName=test',
    '?security=tls&type=h2&path=%2Fa&host=cdn.example',
    '?security=tls&type=xhttp&mode=stream-up&path=%2Fx',
    '?security=reality&pbk='+ 'A'.repeat(43) +'&sid=abcd&flow=xtls-rprx-vision',
  ]) assert.equal(validateNodeLink(base+query).type,'vless');
  assert.equal(validateNodeLink('hysteria2://user:pass@[::1]:443?obfs=salamander&obfs-password=secret&up=10&insecure=false').type,'hysteria2');
});
test('invalid, ambiguous and incompatible node fields are rejected', () => {
  for (const query of [
    '?type=ws&type=tcp','?type=ws&network=tcp','?unsupported=x','?security=none&sni=example.com',
    '?security=reality&pbk=short','?security=reality&pbk='+ 'A'.repeat(43)+'&sid=abc',
    '?type=ws&ed=-1','?type=grpc&path=%2Ftest','?type=xhttp&mode=invalid',
    '?sni=line%0Abreak','?sni=%FF','?security=tls&alpn=',
    '?security=tls&flow=unsupported',
  ]) assert.throws(()=>validateNodeLink(base+query));
  for (const link of ['hysteria2://secret@example.com:443?up=-1','hysteria2://secret@example.com:443?obfs=unknown','hysteria2://secret@example.com:443?obfs=salamander']) assert.throws(()=>validateNodeLink(link));
});
