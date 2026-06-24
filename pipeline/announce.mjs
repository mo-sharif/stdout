import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { distribute } from '../distribute/distribute.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://mo-sharif.github.io/stdout';

// Pure: a story object -> the canonical Post we syndicate.
export function storyToPost(story, base = BASE) {
  return {
    title: story.title,
    url: `${base}/${story.category}/${story.slug}/`,
    summary: story.hook || '',
    tags: [story.category, ...(story.tags || [])].filter(Boolean),
  };
}

async function newestStoryPath() {
  const dir = join(ROOT, 'content');
  const cats = await readdir(dir, { withFileTypes: true }).catch(() => []);
  let best = null;
  for (const c of cats.filter((d) => d.isDirectory())) {
    for (const f of (await readdir(join(dir, c.name))).filter((f) => f.endsWith('.json'))) {
      const rel = join('content', c.name, f);
      const story = JSON.parse(await readFile(join(ROOT, rel), 'utf8'));
      if (!best || (story.date || '') > best.date) best = { rel, date: story.date || '' };
    }
  }
  return best?.rel || null;
}

// CLI: `node pipeline/announce.mjs [content/cat/slug.json ...]`
// With no args, announces the newest story in content/.
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2).filter((a) => a.endsWith('.json'));
  const targets = args.length ? args : [await newestStoryPath()].filter(Boolean);
  if (!targets.length) { console.error('announce: nothing to announce'); process.exit(0); }
  for (const rel of targets) {
    const story = JSON.parse(await readFile(join(ROOT, rel), 'utf8'));
    const results = await distribute(storyToPost(story));
    console.log(`${rel}: ${JSON.stringify(results)}`);
  }
}
