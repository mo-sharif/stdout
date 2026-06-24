const BLOCK_TYPES = new Set(['prose', 'code', 'terminal', 'graph', 'stats', 'quote', 'embeds']);

export function validateStory(s, cats) {
  const errs = [];
  for (const k of ['slug', 'title', 'category', 'hook', 'date']) if (!s[k]) errs.push(`missing ${k}`);
  if (s.category && !cats.some((c) => c.id === s.category)) errs.push(`unknown category ${s.category}`);
  if (!Array.isArray(s.beats) || s.beats.length === 0) errs.push('no beats');
  for (const [i, b] of (s.beats || []).entries()) {
    if (!Array.isArray(b.blocks) || b.blocks.length === 0) errs.push(`beat ${i} has no blocks`);
    for (const blk of b.blocks || []) {
      if (!BLOCK_TYPES.has(blk.type)) errs.push(`beat ${i}: bad block type ${blk.type}`);
      if (blk.type === 'prose' && !blk.html) errs.push(`beat ${i}: prose with no html`);
      if (blk.type === 'embeds' && (!Array.isArray(blk.items) || !blk.items.length)) errs.push(`beat ${i}: embeds with no items`);
    }
  }
  if (!Array.isArray(s.sources) || s.sources.length === 0) errs.push('no sources');
  return errs;
}
