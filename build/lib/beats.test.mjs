import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderBlock, renderBeat } from './beats.mjs';

test('code block escapes code and adds playground hooks', () => {
  const h = renderBlock({ type: 'code', file: 'x.js', code: 'a < b && c', playground: true, inputs: [{ name: 'str', value: '1' }] });
  assert.match(h, /data-playground/);
  assert.match(h, /a &lt; b &amp;&amp; c/);
  assert.match(h, /data-arg="str"/);
});
test('graph block embeds center and nodes as data', () => {
  const h = renderBlock({ type: 'graph', center: 'left-pad', nodes: ['React', 'Babel'] });
  assert.match(h, /data-graph/);
  assert.match(h, /data-center="left-pad"/);
  assert.match(h, /React/);
});
test('embed block renders the metric note', () => {
  const h = renderBlock({ type: 'embeds', items: [{ platform: 'x', title: 'T', meta: '@a', note: '2,108 reposts', url: 'https://x.test' }] });
  assert.match(h, /class="embed e-x"/);
  assert.match(h, /2,108 reposts/);
});
test('renderBeat wraps blocks in a reveal section with the heading', () => {
  const h = renderBeat({ num: '01', heading: 'H', blocks: [{ type: 'quote', text: 'Q' }] });
  assert.match(h, /class="wrap reveal"/);
  assert.match(h, /<h2>H<\/h2>/);
  assert.match(h, /blockquote/);
});
test('unknown block type throws', () => {
  assert.throws(() => renderBlock({ type: 'nope' }));
});
