import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderStory } from './render-story.mjs';

const cat = { id: 'coding', label: 'Coding', accent: '#37e1ff' };
const story = {
  slug: 's', title: 'Title', category: 'coding', kicker: 'War story', hook: 'Hook.', readMinutes: 6, date: '2026-06-23',
  beats: [{ num: '01', heading: 'H', blocks: [{ type: 'quote', text: 'Q' }] }],
  sources: [{ platform: 'web', title: 'Src', url: 'https://x.test' }],
};

test('renders hero, beats, and sources', () => {
  const h = renderStory(story, cat);
  assert.match(h, /Title/);
  assert.match(h, /class="hero"/);
  assert.match(h, /blockquote/);
  assert.match(h, /https:\/\/x\.test/);
});
