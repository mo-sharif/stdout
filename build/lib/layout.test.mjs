import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page } from './layout.mjs';

test('page wraps content with assets and depth-correct paths', () => {
  const h = page({ title: 'T', body: '<main>x</main>', depth: 2 });
  assert.match(h, /<!DOCTYPE html>/);
  assert.match(h, /\.\.\/\.\.\/assets\/css\/site\.css/);
  assert.match(h, /type="module"/);
  assert.match(h, /<title>T<\/title>/);
});
