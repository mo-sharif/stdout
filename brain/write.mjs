import { chatJSON } from './llm.mjs';
import { slugify } from '../build/lib/slug.mjs';

const SCHEMA_HINT = `Reply with JSON only, shaped exactly like this:
{"title": "...", "kicker": "Engineering war story | How it works | etc",
 "hook": "one or two punchy sentences",
 "readMinutes": 6,
 "beats": [ {"num":"01 · the setup","heading":"...","blocks":[
     {"type":"prose","html":"<p class=\\"body\\">... <span class=\\"hl\\">key phrase</span> ...</p>"},
     {"type":"quote","text":"...","cite":"..."},
     {"type":"stats","items":[{"to":273,"label":"..."}]},
     {"type":"embeds","heading":"sources","items":[{"platform":"web","meta":"name","title":"...","url":"https://...","note":"..."}]},
     {"type":"code","file":"x.js","code":"...","caption":"..."}
 ]} ],
 "sources": [ {"platform":"web","meta":"name","title":"...","url":"https://..."} ] }`;

export function buildWriteMessages(selection, bundle, cats) {
  const cat = cats.find((c) => c.id === selection.category);
  const sourceText = bundle.sources.map((s, i) => `[S${i + 1}] ${s.title} (${s.url})\n${s.text}`).join('\n\n---\n\n');
  return [
    { role: 'system', content: 'You write punchy, accurate developer stories in a dev-to-dev voice: short sentences, second person, a little attitude, no fluff. You ONLY use facts present in the provided sources. Every story.sources entry must be one of the provided source URLs. Never invent statistics, quotes, dates, or URLs. Never use the em dash character. Reply JSON only.' },
    { role: 'user', content: `Topic: ${selection.candidate.title}\nAngle: ${selection.angle}\nCategory: ${cat.label} (${cat.id})\n\nSOURCES (only use facts found here):\n${sourceText || '(no source text gathered; write only what the title alone clearly supports and keep it short)'}\n\n${SCHEMA_HINT}\n\nWrite 4 to 6 beats. Put the real source links in story.sources. Only use facts from the SOURCES above.` },
  ];
}
export async function writeStory(selection, bundle, cats) {
  const draft = await chatJSON(buildWriteMessages(selection, bundle, cats), { temperature: 0.6 });
  return {
    slug: slugify(draft.title || selection.candidate.title),
    title: draft.title,
    category: selection.category,
    kicker: draft.kicker || cats.find((c) => c.id === selection.category)?.label || '',
    hook: draft.hook || '',
    readMinutes: Number(draft.readMinutes) || 6,
    date: process.env.EDITION_DATE || new Date().toISOString().slice(0, 10),
    beats: draft.beats || [],
    sources: (draft.sources || []).filter((s) => s && s.url),
  };
}
