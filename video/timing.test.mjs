import test from 'node:test';
import assert from 'node:assert/strict';
import { wordCount, segmentDuration, buildTiming } from './timing.mjs';

test('wordCount counts words', () => {
  assert.equal(wordCount('one two three'), 3);
  assert.equal(wordCount(''), 0);
});

test('segmentDuration respects narration length and a per-scene visual floor', () => {
  const short = segmentDuration({ narration: 'hi', scenes: [{ type: 'title' }] });
  assert.ok(short >= 3.5);
  const code = segmentDuration({ narration: 'hi', scenes: [{ type: 'code' }] });
  assert.ok(code >= 6);
});

test('buildTiming produces ascending, frame-aligned offsets', () => {
  const script = { segments: [
    { id: 'hook', narration: 'a b c', scenes: [{ type: 'title' }] },
    { id: 'beat-01', narration: 'd e f', scenes: [{ type: 'code' }] },
    { id: 'outro', narration: 'g', scenes: [{ type: 'outro' }] },
  ] };
  const t = buildTiming(script, { fps: 30 });
  assert.equal(t.segments.length, 3);
  assert.ok(t.segments[1].start > t.segments[0].start);
  assert.equal(t.segments[0].startFrame, 0);
  assert.equal(t.fps, 30);
  assert.ok(t.total > 0);
});
