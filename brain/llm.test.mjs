import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJSON, chat, chatJSON } from './llm.mjs';

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

// chat() must pin the model (keep_alive) so a warmed model is not evicted mid-run,
// and must surface the underlying connection cause instead of an opaque "fetch failed".
test('chat pins the model with keep_alive and returns content', async () => {
  const orig = global.fetch;
  let sent;
  global.fetch = async (_url, init) => { sent = JSON.parse(init.body); return { ok: true, json: async () => ({ message: { content: 'hi' } }) }; };
  try {
    const out = await chat([{ role: 'user', content: 'x' }], { timeoutMs: 500 });
    assert.equal(out, 'hi');
    assert.ok(sent.keep_alive, 'request body includes keep_alive');
    assert.ok(typeof sent.model === 'string' && sent.model.length, 'request body includes a model');
  } finally { global.fetch = orig; }
});

test('chat surfaces the underlying connection cause', async () => {
  const orig = global.fetch;
  global.fetch = async () => { throw Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNREFUSED' } }); };
  try {
    await assert.rejects(() => chat([{ role: 'user', content: 'x' }], { timeoutMs: 500 }), /ECONNREFUSED/);
  } finally { global.fetch = orig; }
});

test('chatJSON retries past a malformed response then succeeds', async () => {
  const orig = global.fetch;
  let n = 0;
  global.fetch = async () => { n++; const content = n === 1 ? 'no json here' : '{"id":"hn:1"}'; return { ok: true, json: async () => ({ message: { content } }) }; };
  try {
    const out = await chatJSON([{ role: 'user', content: 'x' }], { backoffMs: 0, timeoutMs: 500 });
    assert.deepEqual(out, { id: 'hn:1' });
    assert.equal(n, 2);
  } finally { global.fetch = orig; }
});

test('chatJSON throws a clear error after exhausting attempts', async () => {
  const orig = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ message: { content: 'never json' } }) });
  try {
    await assert.rejects(() => chatJSON([{ role: 'user', content: 'x' }], { attempts: 3, backoffMs: 0, timeoutMs: 500 }), /failed after 3/);
  } finally { global.fetch = orig; }
});
