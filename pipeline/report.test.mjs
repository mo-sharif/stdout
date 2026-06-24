import test from 'node:test';
import assert from 'node:assert/strict';
import { branchName, previewUrl, prTitle, prBody } from './report.mjs';

const story = {
  title: 'Eleven Lines', slug: 'eleven-lines', category: 'coding',
  hook: 'A tiny package broke the web.', readMinutes: 7,
  beats: [{ num: '01', heading: 'the setup' }],
  sources: [{ title: 'HN thread', url: 'https://news.ycombinator.com/x', platform: 'hn' }],
};
const ok = { ok: true, slug: 'eleven-lines', category: 'coding' };

test('branchName uses story/ for pass and draft/ for fail', () => {
  assert.equal(branchName(ok), 'story/eleven-lines');
  assert.equal(branchName({ ok: false, slug: 'oops' }), 'draft/oops');
});

test('previewUrl only for published', () => {
  assert.equal(previewUrl(ok), 'https://mo-sharif.github.io/stdout/coding/eleven-lines/');
  assert.equal(previewUrl({ ok: false, slug: 'x' }), null);
});

test('prTitle marks held stories', () => {
  assert.equal(prTitle(story, ok), 'story: Eleven Lines');
  assert.match(prTitle(story, { ok: false }), /failed verify/);
});

test('prBody includes hook, beats, sources, accuracy, preview', () => {
  const body = prBody(story, { passed: true, unsupported: [], shapeErrors: [] }, previewUrl(ok));
  assert.match(body, /## Hook/);
  assert.match(body, /A tiny package broke the web\./);
  assert.match(body, /01\. the setup/);
  assert.match(body, /HN thread/);
  assert.match(body, /unsupported claims: \*\*0\*\*/);
  assert.match(body, /eleven-lines\//);
});

test('prBody lists unsupported claims when present', () => {
  const body = prBody(story, { passed: false, unsupported: [{ claim: 'left-pad had 11M downloads' }], shapeErrors: [] });
  assert.match(body, /left-pad had 11M downloads/);
});
