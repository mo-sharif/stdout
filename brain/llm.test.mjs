import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
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

// A throwaway Ollama-like server; handler(requestBody) -> { status?, body }.
async function stubServer(handler) {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const out = handler(JSON.parse(body || '{}'));
      res.writeHead(out.status ?? 200, { 'Content-Type': 'application/json' });
      res.end(typeof out.body === 'string' ? out.body : JSON.stringify(out.body));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { baseUrl: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}

test('chat posts keep_alive + non-stream + model and returns content (node:http)', async () => {
  let sent;
  const s = await stubServer((reqBody) => { sent = reqBody; return { body: { message: { content: 'hi' } } }; });
  try {
    const out = await chat([{ role: 'user', content: 'x' }], { baseUrl: s.baseUrl, timeoutMs: 5000 });
    assert.equal(out, 'hi');
    assert.ok(sent.keep_alive, 'request body includes keep_alive');
    assert.equal(sent.stream, false, 'non-streaming request');
    assert.ok(typeof sent.model === 'string' && sent.model.length, 'request body includes a model');
  } finally { await s.close(); }
});

test('chat surfaces a connection failure with its code', async () => {
  const s = await stubServer(() => ({ body: {} }));
  const dead = s.baseUrl;
  await s.close(); // nothing listening on that port now
  await assert.rejects(() => chat([{ role: 'user', content: 'x' }], { baseUrl: dead, timeoutMs: 2000 }), /ECONNREFUSED/);
});

test('chat throws on a non-2xx ollama status', async () => {
  const s = await stubServer(() => ({ status: 500, body: 'boom' }));
  try {
    await assert.rejects(() => chat([{ role: 'user', content: 'x' }], { baseUrl: s.baseUrl, timeoutMs: 5000 }), /ollama 500/);
  } finally { await s.close(); }
});

test('chatJSON retries past a malformed response then succeeds', async () => {
  let n = 0;
  const s = await stubServer(() => { n++; return { body: { message: { content: n === 1 ? 'no json here' : '{"id":"hn:1"}' } } }; });
  try {
    const out = await chatJSON([{ role: 'user', content: 'x' }], { baseUrl: s.baseUrl, backoffMs: 0, timeoutMs: 5000 });
    assert.deepEqual(out, { id: 'hn:1' });
    assert.equal(n, 2);
  } finally { await s.close(); }
});

test('chatJSON throws a clear error after exhausting attempts', async () => {
  const s = await stubServer(() => ({ body: { message: { content: 'never json' } } }));
  try {
    await assert.rejects(
      () => chatJSON([{ role: 'user', content: 'x' }], { baseUrl: s.baseUrl, attempts: 3, backoffMs: 0, timeoutMs: 5000 }),
      /failed after 3/,
    );
  } finally { await s.close(); }
});
