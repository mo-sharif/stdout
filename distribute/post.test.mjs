import { test } from 'node:test';
import assert from 'node:assert/strict';
import { socialText, hashtags } from './post.mjs';

test('hashtags strips punctuation and caps count', () => {
  assert.equal(hashtags(['Dev Tools', 'AI', 'x', 'y', 'z'], 3), '#DevTools #AI');
});
test('socialText appends url + tags within the limit', () => {
  const t = socialText({ title: 'Hello', summary: 'world', url: 'https://x.test', tags: ['Dev', 'AI'] }, 100);
  assert.match(t, /https:\/\/x\.test/);
  assert.match(t, /#Dev/);
  assert.ok(t.length <= 100);
});
test('socialText truncates a long body with an ellipsis', () => {
  const t = socialText({ title: 'x'.repeat(400), url: 'https://x.test', tags: [] }, 80);
  assert.ok(t.length <= 80);
  assert.match(t, /…/);
});
