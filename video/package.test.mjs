import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScript } from './script.mjs';
import { buildTiming } from './timing.mjs';
import { buildPackage, chapters } from './package.mjs';

const story = {
  slug: 'eleven', title: 'Eleven lines', category: 'coding', hook: 'a hook',
  beats: [{ num: '01 · setup', heading: 'the setup', blocks: [{ type: 'prose', html: '<p>x y z</p>' }] }],
  sources: [{ platform: 'gh', title: 'left-pad', url: 'https://github.com/x' }],
};

test('buildPackage produces a title, private privacy, tags and a web link', () => {
  const sc = buildScript(story);
  const tm = buildTiming(sc);
  const pkg = buildPackage(story, sc, tm);
  assert.equal(pkg.privacy, 'private');
  assert.ok(pkg.title.length <= 100);
  assert.ok(pkg.tags.includes('coding'));
  assert.match(pkg.description, /github\.com\/x/);
  assert.match(pkg.description, /mo-sharif\.github\.io\/stdout\/coding\/eleven\//);
});

test('chapters start at 00:00 and are labeled', () => {
  const sc = buildScript(story);
  const tm = buildTiming(sc);
  const ch = chapters(sc, tm);
  assert.equal(ch[0].time, '00:00');
  assert.equal(ch[0].label, 'Intro');
  assert.ok(ch.length >= 3);
});
