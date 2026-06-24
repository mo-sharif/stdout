import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHN, normalizeGitHub } from './sources.mjs';

test('normalizeHN maps Algolia hits to candidates', () => {
  const c = normalizeHN({ hits: [{ objectID: '1', title: 'Rust 2.0 released', url: 'https://x.test', points: 420, num_comments: 88 }] });
  assert.equal(c[0].source, 'hn');
  assert.equal(c[0].score, 420);
  assert.match(c[0].url, /x\.test/);
});
test('normalizeHN drops hits without a url', () => {
  assert.equal(normalizeHN({ hits: [{ objectID: '2', title: 'Ask HN: ...' }] }).length, 0);
});
test('normalizeGitHub maps repo search items', () => {
  const c = normalizeGitHub({ items: [{ full_name: 'a/b', html_url: 'https://gh.test/a/b', description: 'cool', stargazers_count: 999 }] });
  assert.equal(c[0].source, 'github');
  assert.equal(c[0].title, 'a/b');
});
