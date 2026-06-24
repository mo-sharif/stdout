const REQUIRED = ['slug', 'title', 'category', 'date', 'beats'];

export function buildManifest(stories, catsById) {
  for (const s of stories) {
    for (const k of REQUIRED) {
      if (s[k] === undefined) throw new Error(`story "${s.slug ?? '?'}" missing ${k}`);
    }
    if (!catsById.has(s.category)) throw new Error(`story "${s.slug}" has unknown category "${s.category}"`);
  }
  const all = [...stories].sort((a, b) => (a.date < b.date ? 1 : -1));
  const byCategory = new Map();
  for (const c of catsById.keys()) byCategory.set(c, []);
  for (const s of all) byCategory.get(s.category).push(s);
  return { all, byCategory };
}
