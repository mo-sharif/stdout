# Phase 3: Web Autonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the story brain on a daily cron, gate every story behind a human-reviewed Pull Request (review-first), and fan out to social platforms only after the human merges.

**Architecture:** A new `pipeline/` layer wraps the existing brain (Phase 2) + build (Phase 1) + distribute. `pipeline/daily.mjs` runs the brain, rebuilds the site, and opens a PR carrying the rendered pages plus a review artifact (hook, beats, sources, accuracy report). The human reads the PR and merges to publish; merging to `main` triggers `pipeline/announce.mjs`, which syndicates the newly-added story to every platform that has credentials. Two GitHub Actions workflows drive it: `daily-story.yml` (cron, self-hosted GPU runner with Ollama) and `announce.yml` (on push to `main`, content paths). Pure logic lives in small tested modules (`detect`, `report`, `announce`); the thin git/PR glue is integration-verified.

**Tech Stack:** Node ESM (zero runtime deps, global `fetch`), `node:test`, GitHub Actions (self-hosted `[self-hosted, gpu]` runner = the box, has Ollama), GitHub Pages (serves `/docs` on `main`), GitHub REST API for PR creation (no `gh` binary dependency).

**Activation note:** This phase builds and unit-tests the orchestration Mac-side. The live daily run activates only after (a) the model bake-off picks `BRAIN_MODEL`/`VERIFY_MODEL` and the brain is smoke-tested on the box, and (b) the first auto-written story PR is reviewed/approved by the user. Distribution stays a no-op until platform creds are set as repo secrets.

---

## File Structure

- `pipeline/detect.mjs` — pure: parse the brain's stdout result line → `{ ok, relPath, category, slug, unsupported }`.
- `pipeline/report.mjs` — pure: build the review PR (`branchName`, `previewUrl`, `prTitle`, `prBody`).
- `pipeline/announce.mjs` — pure `storyToPost` + a CLI that loads story JSON paths and calls `distribute`.
- `pipeline/git.mjs` — thin git wrappers (`checkoutNew`, `commitAll`, `push`) + `openPR` via GitHub REST API. Integration only.
- `pipeline/daily.mjs` — orchestrator CLI: brain → build → review artifact → PR (`--no-publish` = dry).
- `pipeline/detect.test.mjs`, `pipeline/report.test.mjs`, `pipeline/announce.test.mjs` — unit tests.
- `pipeline/README.md` — how the daily loop works + how to activate it.
- `brain/brain.mjs` — MODIFY: write the `.verify.json` sidecar to `reports/<slug>.verify.json` (out of `content/`, so the build never sees it).
- `.gitignore` — ADD `reports/`.
- `package.json` — ADD `daily` + `announce` scripts.
- `.github/workflows/daily-story.yml` — cron generator.
- `.github/workflows/announce.yml` — post-merge syndication.

---

### Task 1: `pipeline/detect.mjs` — parse the brain result

**Files:**
- Create: `pipeline/detect.mjs`
- Test: `pipeline/detect.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// pipeline/detect.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBrainResult } from './detect.mjs';

test('parses a published result', () => {
  const r = parseBrainResult('picked: x [coding]\nverify: passed=true\npublished candidate -> content/coding/eleven-lines.json');
  assert.equal(r.ok, true);
  assert.equal(r.relPath, 'content/coding/eleven-lines.json');
  assert.equal(r.category, 'coding');
  assert.equal(r.slug, 'eleven-lines');
});

test('parses a held result with an unsupported count', () => {
  const r = parseBrainResult('held for review -> drafts/some-draft.json (3 unsupported, 0 shape errors)');
  assert.equal(r.ok, false);
  assert.equal(r.relPath, 'drafts/some-draft.json');
  assert.equal(r.slug, 'some-draft');
  assert.equal(r.unsupported, 3);
});

test('returns unparsed for unexpected output', () => {
  const r = parseBrainResult('no candidates');
  assert.equal(r.ok, false);
  assert.equal(r.slug, null);
  assert.equal(r.unparsed, 'no candidates');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Documents/stdout && node --test pipeline/detect.test.mjs`
Expected: FAIL — `Cannot find module './detect.mjs'`.

- [ ] **Step 3: Write minimal implementation**

```js
// pipeline/detect.mjs
// Parse the brain's final stdout line into a structured result.
//   pass: "published candidate -> content/coding/the-slug.json"
//   fail: "held for review -> drafts/the-slug.json (3 unsupported, 0 shape errors)"
export function parseBrainResult(stdout) {
  const lines = String(stdout).trim().split('\n').filter(Boolean);
  const line = lines[lines.length - 1] || '';
  let m = line.match(/^published candidate -> (content\/([^/]+)\/(.+)\.json)\s*$/);
  if (m) return { ok: true, relPath: m[1], category: m[2], slug: m[3], unsupported: 0 };
  m = line.match(/^held for review -> (drafts\/(.+)\.json)(?:\s*\((\d+) unsupported)?/);
  if (m) return { ok: false, relPath: m[1], category: null, slug: m[2], unsupported: m[3] ? Number(m[3]) : 0 };
  return { ok: false, relPath: null, category: null, slug: null, unsupported: 0, unparsed: line };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Documents/stdout && node --test pipeline/detect.test.mjs`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/stdout && git add pipeline/detect.mjs pipeline/detect.test.mjs && git commit -m "feat(pipeline): parse brain result line"
```

---

### Task 2: `pipeline/report.mjs` — the review artifact

**Files:**
- Create: `pipeline/report.mjs`
- Test: `pipeline/report.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// pipeline/report.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { branchName, previewUrl, prTitle, prBody } from './report.mjs';

const story = {
  title: 'Eleven Lines', slug: 'eleven-lines', category: 'coding',
  hook: 'A tiny package broke the web.', readMinutes: 7,
  beats: [{ num: '01', heading: 'the setup' }],
  sources: [{ title: 'HN thread', url: 'https://news.ycombinator.com/x', platform: 'hn' }],
};
const ok = { ok: true, slug: 'eleven-lines', category: 'coding' };

test('branchName uses story/ for pass and draft/ for fail', () => {
  assert.equal(branchName(ok), 'story/eleven-lines');
  assert.equal(branchName({ ok: false, slug: 'oops' }), 'draft/oops');
});

test('previewUrl only for published', () => {
  assert.equal(previewUrl(ok), 'https://mo-sharif.github.io/stdout/coding/eleven-lines/');
  assert.equal(previewUrl({ ok: false, slug: 'x' }), null);
});

test('prTitle marks held stories', () => {
  assert.equal(prTitle(story, ok), 'story: Eleven Lines');
  assert.match(prTitle(story, { ok: false }), /failed verify/);
});

test('prBody includes hook, beats, sources, accuracy, preview', () => {
  const body = prBody(story, { passed: true, unsupported: [], shapeErrors: [] }, previewUrl(ok));
  assert.match(body, /## Hook/);
  assert.match(body, /A tiny package broke the web\./);
  assert.match(body, /01\. the setup/);
  assert.match(body, /HN thread/);
  assert.match(body, /unsupported claims: \*\*0\*\*/);
  assert.match(body, /eleven-lines\//);
});

test('prBody lists unsupported claims when present', () => {
  const body = prBody(story, { passed: false, unsupported: [{ claim: 'left-pad had 11M downloads' }], shapeErrors: [] });
  assert.match(body, /left-pad had 11M downloads/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Documents/stdout && node --test pipeline/report.test.mjs`
Expected: FAIL — `Cannot find module './report.mjs'`.

- [ ] **Step 3: Write minimal implementation**

```js
// pipeline/report.mjs
const BASE = 'https://mo-sharif.github.io/stdout';

export function branchName(result) {
  return (result.ok ? 'story/' : 'draft/') + result.slug;
}

export function previewUrl(result, base = BASE) {
  return result.ok ? `${base}/${result.category}/${result.slug}/` : null;
}

export function prTitle(story, result) {
  return result.ok ? `story: ${story.title}` : `held: ${story.title} (failed verify)`;
}

export function prBody(story, verify = {}, preview = null) {
  const unsupported = verify.unsupported || [];
  const shapeErrors = verify.shapeErrors || [];
  const beats = (story.beats || []).map((b) => `${b.num}. ${b.heading}`).join('\n') || '_none_';
  const sources = (story.sources || []).map((s) => `- [${s.title}](${s.url}) (${s.platform})`).join('\n') || '_none_';
  const lines = [
    `**${story.category}** · ~${story.readMinutes ?? '?'} min read · verify passed: **${verify.passed ? 'yes' : 'no'}**`,
    '', '## Hook', story.hook || '_none_',
    '', '## Beats', beats,
    '', '## Sources', sources,
    '', '## Accuracy check',
    `- unsupported claims: **${unsupported.length}**`,
    `- shape errors: **${shapeErrors.length}**`,
  ];
  for (const u of unsupported) lines.push(`  - ${typeof u === 'string' ? u : (u.claim || u.text || JSON.stringify(u))}`);
  if (preview) lines.push('', '## Preview', `Once merged, live at ${preview}`);
  lines.push('', '---', '_Written and verified autonomously by the stdout story brain on local hardware. Review for accuracy, then merge to publish._');
  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Documents/stdout && node --test pipeline/report.test.mjs`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/stdout && git add pipeline/report.mjs pipeline/report.test.mjs && git commit -m "feat(pipeline): build review PR title and body"
```

---

### Task 3: `pipeline/announce.mjs` — story → social Post + CLI

**Files:**
- Create: `pipeline/announce.mjs`
- Test: `pipeline/announce.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// pipeline/announce.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { storyToPost } from './announce.mjs';

test('storyToPost builds the canonical Post', () => {
  const post = storyToPost({ title: 'T', slug: 's', category: 'coding', hook: 'h', tags: ['npm'] });
  assert.equal(post.title, 'T');
  assert.equal(post.url, 'https://mo-sharif.github.io/stdout/coding/s/');
  assert.equal(post.summary, 'h');
  assert.deepEqual(post.tags, ['coding', 'npm']);
});

test('storyToPost tolerates missing tags', () => {
  const post = storyToPost({ title: 'T', slug: 's', category: 'tech', hook: '' });
  assert.deepEqual(post.tags, ['tech']);
  assert.equal(post.summary, '');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Documents/stdout && node --test pipeline/announce.test.mjs`
Expected: FAIL — `Cannot find module './announce.mjs'`.

- [ ] **Step 3: Write minimal implementation**

```js
// pipeline/announce.mjs
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Documents/stdout && node --test pipeline/announce.test.mjs`
Expected: PASS — 2 tests. (Importing the module does NOT trigger the CLI block — `import.meta.url` ≠ the test runner's `argv[1]`.)

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/stdout && git add pipeline/announce.mjs pipeline/announce.test.mjs && git commit -m "feat(pipeline): story-to-Post + announce CLI"
```

---

### Task 4: `pipeline/git.mjs` — git + PR glue (integration)

**Files:**
- Create: `pipeline/git.mjs`

No unit test — this shells out to `git` and hits the GitHub API. It is exercised by Task 5's `--no-publish` dry run (which skips it) and by the live workflow.

- [ ] **Step 1: Write the implementation**

```js
// pipeline/git.mjs
import { execFileSync } from 'node:child_process';

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();
export const git = (...args) => run('git', args);

export function checkoutNew(branch) { git('checkout', '-B', branch); }
export function commitAll(message) { git('add', '-A'); git('commit', '-m', message); }
export function push(branch) { git('push', '-u', 'origin', branch, '--force-with-lease'); }

// Open a PR via the REST API so no `gh` binary is required on the runner.
// GITHUB_REPOSITORY + GH_TOKEN/GITHUB_TOKEN are provided by GitHub Actions.
export async function openPR({ title, body, head, base = 'main',
  repo = process.env.GITHUB_REPOSITORY, token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN }) {
  const res = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'stdout-bot',
    },
    body: JSON.stringify({ title, body, head, base }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PR create failed ${res.status}: ${json.message || ''}`);
  return json.html_url;
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Documents/stdout && git add pipeline/git.mjs && git commit -m "feat(pipeline): git + REST PR helpers"
```

---

### Task 5: `pipeline/daily.mjs` — orchestrator

**Files:**
- Create: `pipeline/daily.mjs`

- [ ] **Step 1: Write the implementation**

```js
// pipeline/daily.mjs
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

// 2. rebuild the static site so the PR carries the rendered pages
execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });

// 3. assemble the review artifact
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

// 4. open a PR for human review (merging it = publishing)
g.checkoutNew(branch);
g.commitAll(`${result.ok ? 'story' : 'draft'}: ${story.slug}`);
g.push(branch);
console.log('opened PR: ' + await g.openPR({ title, body, head: branch }));
```

- [ ] **Step 2: Commit**

```bash
cd ~/Documents/stdout && git add pipeline/daily.mjs && git commit -m "feat(pipeline): daily orchestrator (brain -> build -> review PR)"
```

---

### Task 6: Keep the verify sidecar out of `content/`

**Files:**
- Modify: `brain/brain.mjs:33`
- Modify: `.gitignore`

The brain currently writes `<slug>.verify.json` next to the story. On a pass that lands inside `content/`, where the static build would try to treat it as a story. Move it to `reports/` and git-ignore it (the PR body already surfaces the verify summary).

- [ ] **Step 1: Replace the sidecar write in `brain/brain.mjs`**

Find:
```js
await writeFile(out.replace(/\.json$/, '.verify.json'), JSON.stringify({ shapeErrors, ...report }, null, 2));
```
Replace with:
```js
const reportPath = join(ROOT, 'reports', `${story.slug}.verify.json`);
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify({ shapeErrors, ...report }, null, 2));
```
(`mkdir`, `dirname`, `join` are already imported at the top of `brain.mjs`.)

- [ ] **Step 2: Add `reports/` to `.gitignore`**

Append a line `reports/` to `.gitignore` (create the file if missing).

- [ ] **Step 3: Verify the build still passes with no stray content**

Run: `cd ~/Documents/stdout && npm run build && node --test`
Expected: `built 2 stories across 6 categories`; all tests pass.

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/stdout && git add brain/brain.mjs .gitignore && git commit -m "fix(brain): write verify sidecar to reports/ (out of content/)"
```

---

### Task 7: package.json scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the scripts**

Change the `"scripts"` block to:
```json
"scripts": {
  "test": "node --test",
  "build": "node build/build.mjs",
  "daily": "node pipeline/daily.mjs",
  "announce": "node pipeline/announce.mjs"
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Documents/stdout && git add package.json && git commit -m "chore: add daily + announce npm scripts"
```

---

### Task 8: `.github/workflows/daily-story.yml` — the cron

**Files:**
- Create: `.github/workflows/daily-story.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: daily story
on:
  schedule:
    - cron: '0 15 * * *'   # 15:00 UTC daily; staggered after ViralVault's edition to avoid GPU contention
  workflow_dispatch: {}
permissions:
  contents: write
  pull-requests: write
concurrency:
  group: daily-story
  cancel-in-progress: false
jobs:
  generate:
    runs-on: [self-hosted, gpu]   # the box: has Ollama on 127.0.0.1:11434
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      OLLAMA_BASE: http://127.0.0.1:11434
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      # zero runtime deps — brain, build and tests run on plain node, no npm install
      - run: node --test
      - name: generate, build, open review PR
        run: node pipeline/daily.mjs
```

- [ ] **Step 2: Commit**

```bash
cd ~/Documents/stdout && git add .github/workflows/daily-story.yml && git commit -m "ci: daily story cron on self-hosted GPU runner"
```

---

### Task 9: `.github/workflows/announce.yml` — post-merge syndication

**Files:**
- Create: `.github/workflows/announce.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: announce
on:
  push:
    branches: [main]
    paths: ['content/**']
permissions:
  contents: read
jobs:
  syndicate:
    runs-on: ubuntu-latest
    env:
      MASTODON_BASE: ${{ secrets.MASTODON_BASE }}
      MASTODON_TOKEN: ${{ secrets.MASTODON_TOKEN }}
      BSKY_HANDLE: ${{ secrets.BSKY_HANDLE }}
      BSKY_APP_PASSWORD: ${{ secrets.BSKY_APP_PASSWORD }}
      TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
      TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
      DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK }}
      DEVTO_API_KEY: ${{ secrets.DEVTO_API_KEY }}
      LINKEDIN_TOKEN: ${{ secrets.LINKEDIN_TOKEN }}
      LINKEDIN_AUTHOR_URN: ${{ secrets.LINKEDIN_AUTHOR_URN }}
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 2 }
      - name: announce newly added stories
        run: |
          ADDED=$(git diff --name-only --diff-filter=A HEAD^ HEAD -- 'content/**/*.json' | tr '\n' ' ')
          echo "added: $ADDED"
          [ -n "$ADDED" ] && node pipeline/announce.mjs $ADDED || echo "no new stories"
```

`distribute` skips any platform without creds, so this is a clean no-op until the secrets are set.

- [ ] **Step 2: Commit**

```bash
cd ~/Documents/stdout && git add .github/workflows/announce.yml && git commit -m "ci: syndicate new stories on merge to main"
```

---

### Task 10: `pipeline/README.md` + full verification

**Files:**
- Create: `pipeline/README.md`

- [ ] **Step 1: Write the README**

````markdown
# pipeline/ — daily web autonomy

Daily loop: **brain → build → review PR → (human merges) → publish + announce.**

```
cron (15:00 UTC, self-hosted GPU runner)
  └─ pipeline/daily.mjs
       ├─ node brain/brain.mjs        # research + write + verify a story
       ├─ npm run build               # render docs/
       └─ open a PR (story/<slug>)    # carries pages + accuracy report
              │
        human reviews & merges to main
              │
   push to main (content/**) ──> .github/workflows/announce.yml
       └─ pipeline/announce.mjs <added paths>  # fan out to platforms with creds
```

## Review-first
Nothing publishes without a human merge. Every PR body shows the hook, beats,
sources, and the accuracy report (unsupported claims + shape errors). Held
stories (failed verify) open as `draft/<slug>` PRs for triage, never as live pages.

## Try it locally (needs Ollama running)
```bash
npm run daily -- --no-publish   # brain + build + print the PR it WOULD open
```

## Activate
1. Pick winning models in `brain/config.mjs` (after the bake-off) and smoke-test the brain on the box.
2. Register the box as a GitHub Actions runner with labels `self-hosted, gpu`.
3. (Optional) add platform secrets to enable `announce`:
   `MASTODON_BASE` `MASTODON_TOKEN` `BSKY_HANDLE` `BSKY_APP_PASSWORD`
   `TELEGRAM_BOT_TOKEN` `TELEGRAM_CHAT_ID` `DISCORD_WEBHOOK` `DEVTO_API_KEY`
   `LINKEDIN_TOKEN` `LINKEDIN_AUTHOR_URN`
4. The cron runs daily; review the PR it opens and merge to publish.
````

- [ ] **Step 2: Run the full suite**

Run: `cd ~/Documents/stdout && node --test 2>&1 | grep -E "^# (tests|pass|fail)"`
Expected: pass count increased by 10 (3 detect + 5 report + 2 announce), 0 fail.

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/stdout && git add pipeline/README.md && git commit -m "docs(pipeline): document the daily loop + activation" && git push
```

---

## Self-Review

**1. Spec coverage:**
- Daily cron → `daily-story.yml` (Task 8). ✅
- Runs the brain → `daily.mjs` step 1 (Task 5). ✅
- Builds → `daily.mjs` step 2. ✅
- Review-first gate → PR per story, human merges (Tasks 2, 5); held stories become `draft/` PRs. ✅
- Wires distribute → `announce.mjs` + `announce.yml`, post-merge, creds-gated (Tasks 3, 9). ✅
- Accuracy surfaced to the human → `prBody` accuracy section (Task 2). ✅
- Local-only / zero-dep → no npm install in CI; PR via REST `fetch`; Ollama on localhost. ✅

**2. Placeholder scan:** No TBD/TODO; every code step is complete and runnable. ✅

**3. Type consistency:** `result` shape `{ ok, relPath, category, slug, unsupported }` from `detect` is consumed identically by `report` (`branchName`/`previewUrl`/`prTitle`) and `daily`. `Post` shape `{ title, url, summary, tags }` from `announce.storyToPost` matches `distribute(post)`'s contract. `verify` fields used (`passed`, `unsupported`, `shapeErrors`) match the brain's sidecar `{ shapeErrors, ...report }`. ✅

## Execution Handoff

Activation of the live cron depends on the bake-off (model pick) + the first-story human checkpoint, but all code + tests are buildable and verifiable now.
