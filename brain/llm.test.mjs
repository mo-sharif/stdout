import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJSON } from './llm.mjs';

test('extractJSON pulls the first JSON object/array from model chatter', () => {
  assert.deepEqual(extractJSON('sure!\n```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJSON('[{"x":2}] done'), [{ x: 2 }]);
});
test('extractJSON handles braces inside strings', () => {
  assert.deepEqual(extractJSON('{"s":"a } b","n":2}'), { s: 'a } b', n: 2 });
});
test('extractJSON throws on no json', () => {
  assert.throws(() => extractJSON('no json here'));
});
