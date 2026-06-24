import { chatJSON } from './llm.mjs';

export function buildSelectMessages(candidates, cats) {
  const list = candidates.map((c) => `${c.id} [${c.source}, score ${c.score}] ${c.title} (${c.url})`).join('\n');
  const catIds = cats.map((c) => c.id).join(', ');
  return [
    { role: 'system', content: 'You are a sharp developer-news editor. You pick the single most compelling, genuinely interesting story for a developer audience. Avoid press releases and thin content. Reply with JSON only.' },
    { role: 'user', content: `Candidates:\n${list}\n\nCategories: ${catIds}\n\nPick the ONE best story. Reply JSON: {"id": "<the candidate id, e.g. hn:123 or gh:org/repo>", "category": "<one category id>", "angle": "<one sentence on the angle to take>"}` },
  ];
}
export function coerceSelection(pick, candidates, cats) {
  const candidate = candidates.find((c) => c.id === pick.id) || candidates[Number(pick.index)];
  if (!candidate) throw new Error('selection id not found: ' + pick.id);
  if (!cats.some((c) => c.id === pick.category)) throw new Error('invalid category: ' + pick.category);
  return { candidate, category: pick.category, angle: String(pick.angle || '').trim() };
}
export async function selectStory(candidates, cats) {
  const pick = await chatJSON(buildSelectMessages(candidates, cats));
  return coerceSelection(pick, candidates, cats);
}
