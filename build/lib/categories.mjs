import { readFile } from 'node:fs/promises';

export async function loadCategories(path) {
  const list = JSON.parse(await readFile(path, 'utf8'));
  const byId = new Map();
  for (const c of list) {
    if (!c.id || !c.label || !c.accent) {
      throw new Error('category missing id/label/accent: ' + JSON.stringify(c));
    }
    if (byId.has(c.id)) throw new Error('duplicate category id: ' + c.id);
    byId.set(c.id, c);
  }
  return { list, byId };
}
