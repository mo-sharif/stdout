import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBrainResult } from './detect.mjs';
import { branchName, previewUrl, prTitle, prBody } from './report.mjs';
import * as g from './git.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NO_PUBLISH = process.argv.includes('--no-publish');

// 1. run the brain: writes content/ (pass) or drafts/ (fail) + reports/<slug>.verify.json
const out = execFileSync('node', ['brain/brain.mjs'], { cwd: ROOT, encoding: 'utf8' });
process.stdout.write(out + '\n');
const result = parseBrainResult(out);
if (!result.slug || !result.relPath) { console.error('daily: could not parse brain output; aborting'); process.exit(1); }

// 2. held stories stay in drafts/ (gitignored) for manual review — never auto-published
if (!result.ok) {
  console.log(`held for review (not published): ${result.relPath} — ${result.unsupported} unsupported claim(s). Left in drafts/ on the runner.`);
  process.exit(0);
}

// 3. rebuild the static site so the PR carries the rendered pages
execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });

// 4. assemble the review artifact
const story = JSON.parse(await readFile(join(ROOT, result.relPath), 'utf8'));
let verify = {};
try { verify = JSON.parse(await readFile(join(ROOT, 'reports', `${result.slug}.verify.json`), 'utf8')); } catch {}
const branch = branchName(result);
const title = prTitle(story, result);
const body = prBody(story, verify, previewUrl(result));

if (NO_PUBLISH) {
  console.log(`\n=== dry run (--no-publish) ===\nbranch: ${branch}\ntitle:  ${title}\n\n${body}`);
  process.exit(0);
}

// 5. open a PR for human review (merging it = publishing)
g.checkoutNew(branch);
g.commitAll(`story: ${story.slug}`);
g.push(branch);
console.log('opened PR: ' + await g.openPR({ title, body, head: branch }));
