import test from 'node:test';
import assert from 'node:assert/strict';
import { storyToPost } from './announce.mjs';

test('storyToPost builds the canonical Post', () => {
  const post = storyToPost({ title: 'T', slug: 's', category: 'coding', hook: 'h', tags: ['npm'] });
  assert.equal(post.title, 'T');
  assert.equal(post.url, 'https://mo-sharif.github.io/stdout/coding/s/');
  assert.equal(post.summary, 'h');
  assert.deepEqual(post.tags, ['coding', 'npm']);
});

test('storyToPost tolerates missing tags', () => {
  const post = storyToPost({ title: 'T', slug: 's', category: 'tech', hook: '' });
  assert.deepEqual(post.tags, ['tech']);
  assert.equal(post.summary, '');
});
