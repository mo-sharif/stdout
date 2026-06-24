import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderBeat } from './beats.mjs';

test('code beat escapes code and adds playground hooks', () => {
  const h = renderBeat({ type: 'code', file: 'x.js', code: 'a < b && c', playground: true, inputs: [{ name: 'str', value: '1' }] });
  assert.match(h, /data-playground/);
  assert.match(h, /a &lt; b &amp;&amp; c/);
  assert.match(h, /data-arg="str"/);
});
test('graph beat embeds center and nodes as data', () => {
  const h = renderBeat({ type: 'graph', center: 'left-pad', nodes: ['React', 'Babel'] });
  assert.match(h, /data-graph/);
  assert.match(h, /data-center="left-pad"/);
  assert.match(h, /React/);
});
test('unknown beat type throws', () => {
  assert.throws(() => renderBeat({ type: 'nope' }));
});
