import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paragraphsFromHTML, isSkippableHost } from './extract.mjs';

test('isSkippableHost flags README/thread hosts', () => {
  assert.equal(isSkippableHost('https://github.com/a/b'), true);
  assert.equal(isSkippableHost('https://news.ycombinator.com/item?id=1'), true);
  assert.equal(isSkippableHost('https://example.com/post'), false);
});
test('paragraphsFromHTML keeps prose, drops code/junk', () => {
  const html = '<p>This is a genuinely real sentence of article prose that is comfortably more than eighty characters long, so it is kept.</p><p>$ npm install left-pad</p>';
  const ps = paragraphsFromHTML(html);
  assert.equal(ps.length, 1);
  assert.match(ps[0], /real sentence/);
});
