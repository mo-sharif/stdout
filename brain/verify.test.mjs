import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectClaims, runCodeBlocks } from './verify.mjs';

test('collectClaims pulls sentences from prose blocks', () => {
  const story = { beats: [{ blocks: [{ type: 'prose', html: '<p>Rust reached version 1.0 back in 2015 after a long beta. It is memory safe by design.</p>' }] }] };
  const claims = collectClaims(story);
  assert.ok(claims.some((c) => /version 1\.0/.test(c)));
});
test('runCodeBlocks executes JS and reports ok', () => {
  const story = { beats: [{ blocks: [{ type: 'code', lang: 'js', code: 'const r = 1 + 1;' }] }] };
  const out = runCodeBlocks(story);
  assert.equal(out[0].ok, true);
});
test('runCodeBlocks reports failure on broken JS', () => {
  const story = { beats: [{ blocks: [{ type: 'code', lang: 'js', code: 'this is not valid (' }] }] };
  assert.equal(runCodeBlocks(story)[0].ok, false);
});
