import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hnSearchUrl } from './research.mjs';

test('hnSearchUrl builds an Algolia query for the topic', () => {
  const u = hnSearchUrl('Rust web framework');
  assert.match(u, /hn\.algolia\.com/);
  assert.match(u, /Rust/);
});
