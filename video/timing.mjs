const WORDS_PER_SEC = 2.6;   // ~155 wpm narration
const MIN_SEG = 3.5;         // floor so every scene has room to breathe
const GAP = 0.5;             // pause between segments
const SCENE_FLOOR = { code: 6, terminal: 5, graph: 5, stats: 4, quote: 4, title: 3, prose: 3, outro: 4 };

const round = (n) => Math.round(n * 100) / 100;

export function wordCount(s = '') {
  return String(s).trim().split(/\s+/).filter(Boolean).length;
}

export function segmentDuration(seg) {
  const speak = wordCount(seg.narration) / WORDS_PER_SEC;
  const visual = (seg.scenes || []).reduce((sum, sc) => sum + (SCENE_FLOOR[sc.type] || 3), 0);
  return Math.max(MIN_SEG, speak, visual);
}

// Cumulative, frame-aligned timing. Pre-VO estimate; real VO overrides durations later.
export function buildTiming(script, { fps = 30 } = {}) {
  let t = 0;
  const segments = [];
  for (const seg of script.segments) {
    const dur = segmentDuration(seg);
    segments.push({
      id: seg.id,
      start: round(t),
      duration: round(dur),
      startFrame: Math.round(t * fps),
      durationFrames: Math.round(dur * fps),
    });
    t += dur + GAP;
  }
  return { fps, total: round(t), segments };
}

// Build timing from REAL measured audio durations (overrides the word-count estimate).
// audioSegs: [{ id, duration }]; a segment with no audio falls back to its estimate.
export function timingFromAudio(script, audioSegs, { fps = 30 } = {}) {
  const byId = new Map(audioSegs.map((a) => [a.id, a.duration]));
  let t = 0;
  const segments = [];
  for (const seg of script.segments) {
    const audio = byId.get(seg.id);
    const dur = Math.max(MIN_SEG, (audio || segmentDuration(seg)) + (audio ? 0.3 : 0));
    segments.push({
      id: seg.id, start: round(t), duration: round(dur),
      startFrame: Math.round(t * fps), durationFrames: Math.round(dur * fps),
    });
    t += dur + GAP;
  }
  return { fps, total: round(t), segments, hasAudio: true };
}
