import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSelectMessages, coerceSelection } from './select.mjs';

const cats = [{ id: 'ai', label: 'AI' }, { id: 'coding', label: 'Coding' }];
const cands = [{ id: 'hn:1', title: 'A new Rust web framework', url: 'https://x.test', source: 'hn', score: 300, blurb: '' }];

test('buildSelectMessages lists candidates and categories', () => {
  const m = buildSelectMessages(cands, cats);
  assert.match(JSON.stringify(m), /A new Rust web framework/);
  assert.match(JSON.stringify(m), /coding/);
});
test('coerceSelection resolves the picked id to a candidate', () => {
  const sel = coerceSelection({ id: 'hn:1', category: 'coding', angle: 'why it matters' }, cands, cats);
  assert.equal(sel.candidate.title, 'A new Rust web framework');
  assert.equal(sel.category, 'coding');
});
test('coerceSelection rejects an invalid category', () => {
  assert.throws(() => coerceSelection({ id: 'hn:1', category: 'nope', angle: 'x' }, cands, cats));
});
