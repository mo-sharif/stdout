import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBrainResult } from './detect.mjs';

test('parses a published result', () => {
  const r = parseBrainResult('picked: x [coding]\nverify: passed=true\npublished candidate -> content/coding/eleven-lines.json');
  assert.equal(r.ok, true);
  assert.equal(r.relPath, 'content/coding/eleven-lines.json');
  assert.equal(r.category, 'coding');
  assert.equal(r.slug, 'eleven-lines');
});

test('parses a held result with an unsupported count', () => {
  const r = parseBrainResult('held for review -> drafts/some-draft.json (3 unsupported, 0 shape errors)');
  assert.equal(r.ok, false);
  assert.equal(r.relPath, 'drafts/some-draft.json');
  assert.equal(r.slug, 'some-draft');
  assert.equal(r.unsupported, 3);
});

test('returns unparsed for unexpected output', () => {
  const r = parseBrainResult('no candidates');
  assert.equal(r.ok, false);
  assert.equal(r.slug, null);
  assert.equal(r.unparsed, 'no candidates');
});
