import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScript } from './script.mjs';
import { stripHtml } from './lib.mjs';

const story = {
  slug: 's', title: 'T', category: 'coding', kicker: 'War story', hook: 'the hook',
  beats: [
    { num: '01 · setup', heading: 'one', blocks: [
      { type: 'prose', html: '<p class="body">Hello <strong>world</strong> &amp; <span class="hl">you</span>.</p>' },
      { type: 'code', file: 'a.js', code: 'x', caption: 'c' },
    ] },
    { num: '02 · break', heading: 'two', blocks: [
      { type: 'terminal', title: 'zsh', lines: [{ t: '$ x', c: 'pr' }] },
      { type: 'stats', items: [{ to: 5, label: 'n' }] },
    ] },
    { num: '03', heading: 'quote beat', blocks: [{ type: 'quote', text: 'q', cite: 'me' }] },
  ],
  sources: [{ platform: 'gh', title: 'src', url: 'https://x' }],
};

test('stripHtml removes tags and decodes entities', () => {
  assert.equal(
    stripHtml('<p class="body">Hello <strong>world</strong> &amp; <span class="hl">you</span>.</p>'),
    'Hello world & you.',
  );
});

test('buildScript brackets the beats with a hook and an outro', () => {
  const sc = buildScript(story);
  assert.equal(sc.segments[0].kind, 'hook');
  assert.equal(sc.segments.at(-1).kind, 'outro');
  assert.equal(sc.segments.length, 2 + story.beats.length);
});

test('beat narration comes from prose; scenes from non-prose blocks', () => {
  const sc = buildScript(story);
  const b1 = sc.segments[1];
  assert.equal(b1.narration, 'Hello world & you.');
  assert.equal(b1.scenes[0].type, 'code');
});

test('visual-only beat keeps its scenes; a quote-only beat reads the quote', () => {
  const sc = buildScript(story);
  assert.deepEqual(sc.segments[2].scenes.map((s) => s.type), ['terminal', 'stats']);
  const b3 = sc.segments[3];
  assert.match(b3.narration, /^q/);
  assert.equal(b3.scenes[0].type, 'quote');
});
