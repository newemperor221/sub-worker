import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import jsQR from 'jsqr';
import { GifReader } from 'omggif';
import { renderDashboard } from './dashboard.js';

function boot(token, extraGlobals = {}) {
  const html = renderDashboard({ token, subName: 'test' }, [], 'https://example.test');
  assert.doesNotMatch(html, /qrserver|<script[^>]+src=/);
  const elements = new Map();
  const el = id => {
    if (!elements.has(id)) elements.set(id, { value: '', dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, addEventListener() {} });
    return elements.get(id);
  };
  const buttons = ['auto','clash','loon','base64'].map(key => ({ dataset: { qr: key }, addEventListener(event, fn) { this.click = fn; } }));
  const context = {
    ...extraGlobals,
    document: { getElementById: el, querySelector: el, querySelectorAll: selector => selector === '[data-qr]' ? buttons : [] },
    fetch() { throw new Error('network is forbidden'); }, navigator: {}, setTimeout() {},
  };
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  return { el, buttons };
}

test('actual generated images decode exactly for all formats, without external requests', () => {
  const token = 'test & unicode 中文';
  const {el,buttons} = boot(token);
  for (const button of buttons) {
    button.click();
    const image = el('qrImg').src;
    assert.match(image, /^data:image\/gif;base64,/);
    const gif = new GifReader(Buffer.from(image.split(',')[1], 'base64'));
    const rgba = new Uint8ClampedArray(gif.width * gif.height * 4);
    gif.decodeAndBlitFrameRGBA(0, rgba);
    assert.equal(jsQR(rgba,gif.width,gif.height)?.data, `https://example.test/api/sub?token=${encodeURIComponent(token)}&type=${button.dataset.qr}`);
  }
});

test('QR capacity errors show an error without setting any remote image URL', () => {
  const {el,buttons} = boot('x'.repeat(10000));
  buttons[0].click();
  assert.equal(el('qrImg').src,undefined);
  assert.equal(el('managerMessage').textContent,'二维码生成失败，请复制订阅链接');
});

test('browser named element exports does not trigger CommonJS loading', () => {
  // id="exports" is exposed as window.exports in real browsers.
  const {el,buttons} = boot('test-token', { exports: { id: 'exports' } });
  buttons[0].click();
  assert.match(el('qrImg').src, /^data:image\/gif;base64,/);
});
