import test from 'node:test';
import assert from 'node:assert/strict';
import { pickShortSegments, buildShort } from './short.mjs';

const script = { segments: [
  { id: 'hook', kind: 'hook', scenes: [{ type: 'title' }] },
  { id: 'beat-01', kind: 'beat', scenes: [{ type: 'prose' }] },
  { id: 'beat-02', kind: 'beat', scenes: [{ type: 'code' }] },
  { id: 'beat-03', kind: 'beat', scenes: [{ type: 'stats' }] },
  { id: 'outro', kind: 'outro', scenes: [{ type: 'outro' }] },
] };
const timing = { fps: 30, segments: [
  { id: 'hook', duration: 6 }, { id: 'beat-01', duration: 8 }, { id: 'beat-02', duration: 10 },
  { id: 'beat-03', duration: 7 }, { id: 'outro', duration: 5 },
] };

test('pickShortSegments takes hook + highest-impact beat + outro', () => {
  const picks = pickShortSegments(script);
  assert.deepEqual(picks.map((s) => s.id), ['hook', 'beat-03', 'outro']); // stats beat wins
});

test('buildShort re-times the subset contiguously and subsets audio', () => {
  const audio = { slug: 's', segments: [{ id: 'hook', file: 'h.wav' }, { id: 'beat-03', file: 'b.wav' }, { id: 'beat-01', file: 'x.wav' }] };
  const short = buildShort({ slug: 's' }, script, timing, audio);
  assert.equal(short.script.segments.length, 3);
  assert.equal(short.timing.segments[0].start, 0);
  assert.ok(short.timing.segments[1].start > 0);
  assert.deepEqual(short.audio.segments.map((a) => a.id).sort(), ['beat-03', 'hook']);
  assert.equal(short.timing.hasAudio, true);
});
