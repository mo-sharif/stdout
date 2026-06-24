import { webUrl } from './lib.mjs';

function timecode(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

// YouTube chapters: first must be 00:00, need >= 3 ascending entries.
export function chapters(script, timing) {
  return timing.segments.map((t, i) => {
    const seg = script.segments[i];
    const label = seg.kind === 'hook' ? 'Intro' : seg.kind === 'outro' ? 'Sources' : (seg.heading || seg.id);
    return { time: timecode(t.start), label };
  });
}

// Deterministic YouTube metadata for a story (no LLM).
export function buildPackage(story, script, timing) {
  const url = webUrl(story);
  const ch = chapters(script, timing);
  const sources = (story.sources || []).map((s) => `• ${s.title} — ${s.url}`).join('\n');
  const description = [
    story.hook,
    '',
    `▶ Full interactive version (live code + every source): ${url}`,
    '',
    'Chapters:',
    ...ch.map((c) => `${c.time} ${c.label}`),
    '',
    'Sources:',
    sources,
    '',
    'Researched, written and verified autonomously on local hardware. Part of stdout — dev stories, told like a dev would tell them.',
  ].join('\n');
  const tags = [...new Set([story.category, 'programming', 'software engineering', 'developers', ...(story.tags || [])])];
  const shorts = [
    script.segments[0].id,
    ...script.segments.filter((s) => s.kind === 'beat').slice(0, 1).map((s) => s.id),
  ];
  return {
    title: story.title.length > 100 ? story.title.slice(0, 99) + '…' : story.title,
    description,
    tags,
    chapters: ch,
    privacy: 'private',
    shorts,
  };
}
