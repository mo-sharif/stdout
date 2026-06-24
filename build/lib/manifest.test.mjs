import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildManifest } from './manifest.mjs';

const cats = new Map([['coding', { id: 'coding', label: 'Coding' }]]);
const stories = [
  { slug: 'a', title: 'A', category: 'coding', date: '2026-06-20', beats: [], sources: [] },
  { slug: 'b', title: 'B', category: 'coding', date: '2026-06-22', beats: [], sources: [] },
];

test('groups by category and sorts newest first', () => {
  const m = buildManifest(stories, cats);
  assert.equal(m.byCategory.get('coding')[0].slug, 'b');
  assert.equal(m.all.length, 2);
});
test('rejects unknown category', () => {
  assert.throws(() => buildManifest([{ slug: 'x', title: 'X', category: 'nope', date: '2026-01-01', beats: [], sources: [] }], cats));
});
