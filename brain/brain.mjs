import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchCandidates } from './sources.mjs';
import { selectStory } from './select.mjs';
import { research } from './research.mjs';
import { writeStory } from './write.mjs';
import { verify } from './verify.mjs';
import { validateStory } from './validate-story.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

const cats = JSON.parse(await readFile(join(ROOT, 'categories.json'), 'utf8'));
const candidates = await fetchCandidates();
if (!candidates.length) { console.error('no candidates'); process.exit(1); }
const selection = await selectStory(candidates, cats);
console.error(`picked: ${selection.candidate.title} [${selection.category}]`);
const bundle = await research(selection);
console.error(`research: ${bundle.sources.length} sources`);
const story = await writeStory(selection, bundle, cats);
const shapeErrors = validateStory(story, cats);
const report = await verify(story, bundle);
const ok = shapeErrors.length === 0 && report.passed;
console.error(`verify: passed=${report.passed} unsupported=${report.unsupported.length} shapeErrors=${shapeErrors.length}`);

const payload = JSON.stringify(story, null, 2);
if (DRY) { console.log(payload); process.exit(0); }
const rel = ok ? join('content', story.category, `${story.slug}.json`) : join('drafts', `${story.slug}.json`);
const out = join(ROOT, rel);
await mkdir(dirname(out), { recursive: true });
await writeFile(out, payload);
const reportPath = join(ROOT, 'reports', `${story.slug}.verify.json`);
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify({ shapeErrors, ...report }, null, 2));
console.log(ok ? `published candidate -> ${rel}` : `held for review -> ${rel} (${report.unsupported.length} unsupported, ${shapeErrors.length} shape errors)`);
