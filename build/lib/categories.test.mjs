import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCategories } from './categories.mjs';

test('loads categories and indexes by id', async () => {
  const { list, byId } = await loadCategories(new URL('../../categories.json', import.meta.url));
  assert.ok(list.length >= 6);
  assert.equal(byId.get('coding').label, 'Coding');
});
