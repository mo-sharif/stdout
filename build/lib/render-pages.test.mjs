import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderHub } from './render-hub.mjs';
import { renderCategory } from './render-category.mjs';

const cats = [{ id: 'coding', label: 'Coding', accent: '#37e1ff', blurb: 'b' }];
const story = { slug: 's', title: 'Title', category: 'coding', hook: 'Hook.', readMinutes: 6, date: '2026-06-23', beats: [] };
const manifest = { all: [story], byCategory: new Map([['coding', [story]]]) };

test('hub lists categories and links stories', () => {
  const h = renderHub(manifest, cats);
  assert.match(h, /Coding/);
  assert.match(h, /coding\/s\//);
});
test('category page lists its stories', () => {
  const h = renderCategory(cats[0], [story]);
  assert.match(h, /Title/);
  assert.match(h, /s\//);
});
