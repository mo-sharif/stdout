import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWriteMessages } from './write.mjs';

test('buildWriteMessages embeds the gathered source text and the schema', () => {
  const sel = { candidate: { title: 'T', url: 'https://x.test' }, category: 'coding', angle: 'a' };
  const bundle = { topic: 'T', sources: [{ title: 'S', url: 'https://x.test', text: 'fact one. fact two.', kind: 'primary' }] };
  const m = buildWriteMessages(sel, bundle, [{ id: 'coding', label: 'Coding' }]);
  const s = JSON.stringify(m);
  assert.match(s, /fact one/);
  assert.match(s, /blocks/);
  assert.match(s, /only use facts/i);
});
