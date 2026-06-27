import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStory } from './validate-story.mjs';

const cats = [{ id: 'coding', label: 'Coding' }];
const good = { slug: 's', title: 'T', category: 'coding', kicker: 'k', hook: 'h', readMinutes: 6, date: '2026-06-24',
  beats: [{ num: '01', heading: 'H', blocks: [{ type: 'prose', html: '<p>x</p>' }] }], sources: [{ platform: 'web', title: 'S', url: 'https://x.test' }] };

test('accepts a well-formed story', () => { assert.equal(validateStory(good, cats).length, 0); });
test('flags bad category, empty beats, unknown block type', () => {
  assert.ok(validateStory({ ...good, category: 'nope' }, cats).length > 0);
  assert.ok(validateStory({ ...good, beats: [] }, cats).length > 0);
  assert.ok(validateStory({ ...good, beats: [{ blocks: [{ type: 'zzz' }] }] }, cats).length > 0);
});
test('flags lab blocks without toggles', () => {
  assert.ok(validateStory({ ...good, beats: [{ blocks: [{ type: 'lab', title: 'Lab' }] }] }, cats).length > 0);
  assert.equal(validateStory({ ...good, beats: [{ blocks: [{ type: 'lab', toggles: [{ label: 'x' }] }] }] }, cats).length, 0);
});
