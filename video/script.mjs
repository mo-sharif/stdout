import { stripHtml } from './lib.mjs';

// Block types that become an on-screen scene (everything else is narration/source).
const SCENE_TYPES = new Set(['code', 'terminal', 'graph', 'stats', 'quote']);

function beatNarration(beat) {
  const prose = (beat.blocks || [])
    .filter((b) => b.type === 'prose')
    .map((b) => stripHtml(b.html))
    .filter(Boolean)
    .join(' ');
  if (prose) return prose;
  const quote = (beat.blocks || []).find((b) => b.type === 'quote');
  if (quote) return [quote.text, quote.cite].filter(Boolean).join(' — ');
  return beat.heading || '';
}

function blockToScene(b) {
  switch (b.type) {
    case 'code': return { type: 'code', file: b.file || '', code: b.code || '', caption: b.caption || '' };
    case 'terminal': return { type: 'terminal', title: b.title || '', lines: b.lines || [], caption: b.caption || '' };
    case 'graph': return { type: 'graph', center: b.center || '', nodes: b.nodes || [] };
    case 'stats': return { type: 'stats', items: b.items || [] };
    case 'quote': return { type: 'quote', text: b.text || '', cite: b.cite || '' };
    default: return null;
  }
}

function beatScenes(beat) {
  const scenes = (beat.blocks || [])
    .filter((b) => SCENE_TYPES.has(b.type))
    .map(blockToScene)
    .filter(Boolean);
  return scenes.length ? scenes : [{ type: 'prose', heading: beat.heading || '', text: beatNarration(beat) }];
}

// A verified story -> an ordered, render-ready video script.
// Narration is taken straight from the verified prose (deterministic, no LLM).
export function buildScript(story) {
  const segments = [];
  segments.push({
    id: 'hook', kind: 'hook', heading: story.title,
    narration: story.hook || '',
    scenes: [{ type: 'title', title: story.title, kicker: story.kicker || story.category, category: story.category }],
  });
  (story.beats || []).forEach((beat, i) => {
    const num = String(beat.num || '').split('·')[0].trim() || String(i + 1).padStart(2, '0');
    segments.push({
      id: `beat-${num}`, kind: 'beat', heading: beat.heading || '',
      narration: beatNarration(beat),
      scenes: beatScenes(beat),
    });
  });
  segments.push({
    id: 'outro', kind: 'outro', heading: 'the full story',
    narration: 'That is the story. The full interactive write-up, with every source, is linked below.',
    scenes: [{ type: 'outro', title: story.title, category: story.category, sources: story.sources || [] }],
  });
  return { slug: story.slug, title: story.title, category: story.category, hook: story.hook, segments };
}
