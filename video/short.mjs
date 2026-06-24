// Pick a punchy vertical-short cut of a story: the hook, the single most
// striking beat, and the outro CTA — re-timed contiguously.
const BEAT_PRIORITY = { stats: 5, graph: 4, quote: 4, terminal: 3, code: 3, prose: 2 };

function beatScore(seg) {
  const types = (seg.scenes || []).map((s) => BEAT_PRIORITY[s.type] || 1);
  return types.length ? Math.max(...types) : 1;
}

export function pickShortSegments(script) {
  const segs = script.segments || [];
  const hook = segs.find((s) => s.kind === 'hook');
  const outro = segs.find((s) => s.kind === 'outro');
  const beats = segs.filter((s) => s.kind === 'beat');
  const best = beats.slice().sort((a, b) => beatScore(b) - beatScore(a))[0];
  return [hook, best, outro].filter(Boolean);
}

const round = (n) => Math.round(n * 100) / 100;

// Build a short {story, script, timing, audio} from a full story's render data.
export function buildShort(story, script, timing, audio, { fps = 30, gap = 0.4 } = {}) {
  const picks = pickShortSegments(script);
  const ids = new Set(picks.map((s) => s.id));
  const byId = new Map((timing?.segments || []).map((t) => [t.id, t]));
  let t = 0;
  const tsegs = [];
  for (const seg of picks) {
    const dur = byId.get(seg.id)?.duration || 4;
    tsegs.push({ id: seg.id, start: round(t), duration: round(dur), startFrame: Math.round(t * fps), durationFrames: Math.round(dur * fps) });
    t += dur + gap;
  }
  return {
    story,
    script: { ...script, segments: picks },
    timing: { fps, total: round(t), segments: tsegs, hasAudio: !!audio },
    audio: audio ? { slug: audio.slug, segments: (audio.segments || []).filter((a) => ids.has(a.id)) } : null,
  };
}
