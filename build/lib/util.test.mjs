import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from './slug.mjs';
import { esc, fmtInt } from './util.mjs';

test('slugify lowercases, dashes, trims', () => {
  assert.equal(slugify('  11 Lines Broke the Internet! '), '11-lines-broke-the-internet');
});
test('esc escapes html-significant chars', () => {
  assert.equal(esc('<a> & "x"'), '&lt;a&gt; &amp; &quot;x&quot;');
});
test('fmtInt groups thousands', () => {
  assert.equal(fmtInt(2400000), '2,400,000');
});
