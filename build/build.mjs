import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCategories } from './lib/categories.mjs';
import { buildManifest } from './lib/manifest.mjs';
import { renderStory } from './lib/render-story.mjs';
import { renderHub } from './lib/render-hub.mjs';
import { renderCategory } from './lib/render-category.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');

async function loadStories(dir) {
  const out = [];
  for (const cat of await readdir(dir)) {
    let files = [];
    try { files = await readdir(join(dir, cat)); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      out.push(JSON.parse(await readFile(join(dir, cat, f), 'utf8')));
    }
  }
  return out;
}

async function emit(rel, html) {
  const file = join(DOCS, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}

const { list: cats, byId } = await loadCategories(join(ROOT, 'categories.json'));
const stories = await loadStories(join(ROOT, 'content'));
const manifest = buildManifest(stories, byId);

await emit('index.html', renderHub(manifest, cats));
for (const c of cats) {
  const cs = manifest.byCategory.get(c.id) || [];
  if (cs.length) await emit(join(c.id, 'index.html'), renderCategory(c, cs));
  for (const s of cs) await emit(join(c.id, s.slug, 'index.html'), renderStory(s, c));
}
await writeFile(join(DOCS, 'stories.json'), JSON.stringify(manifest.all.map(({ beats, ...m }) => m), null, 2));
console.log(`built ${stories.length} stories across ${cats.length} categories`);
