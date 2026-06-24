# Story Brain Implementation Plan (Phase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An autonomous content engine that picks the most compelling dev story of the moment, researches it from real sources, writes it in dev-voice as the exact story JSON Phase 1 renders, and gates it through an accuracy verifier before it can be published.

**Architecture:** A set of small Node ESM modules under `brain/` in the `stdout` repo. The pipeline is `sources -> select -> research -> write -> verify -> gate`. The LLM is local Ollama (OpenAI-incompatible native API). Writing is grounded: the model only sees gathered source text and must cite it; a separate verifier pass re-checks every claim against those sources and executes any code, and nothing reaches the published `content/` tree until it passes. Pure logic is unit-tested with `node:test`; LLM steps are smoke-tested against the box's Ollama.

**Tech Stack:** Node 22 (ESM, built-in `node:test`, `node:vm`), local Ollama (`/api/chat`), free public APIs (Hacker News Algolia, GitHub search). No runtime deps beyond stdlib.

**Execution context:** The brain runs on the box (it needs local Ollama). Clone the repo there once: `ssh mo@192.168.12.220 'git clone git@github.com:mo-sharif/stdout.git ~/stdout'`. Develop the code in the Mac repo (`~/Documents/stdout`), commit + push, then `ssh mo@192.168.12.220 'cd ~/stdout && git pull'` to run smoke tests against Ollama. Pure unit tests run anywhere with `node --test brain/`. Ollama base URL is `OLLAMA_BASE` (default `http://localhost:11434`). Editorial/select/write model = `BRAIN_MODEL` (default `qwen2.5:7b-instruct`); verifier model = `VERIFY_MODEL` (default `qwen2.5:32b-instruct`). These defaults will be updated to the bake-off winner.

**Out of scope for v1 (deferred):** full vector RAG (we pass gathered text directly), hard multi-source >=2 cut (v1 cites + flags single-source claims for the human gate), and auto-generating the bespoke interactives (playground/graph) - v1 writes prose / quote / embeds / stats / static-code blocks; richer interactives are added later.

---

## File structure

```
stdout/
  brain/
    llm.mjs            Ollama client: chat(), chatJSON() with retry
    sources.mjs        fetchCandidates(): HN Algolia + GitHub search -> Candidate[]
    extract.mjs        fetchText(url): clean article text (host deny-list + junk filter)
    select.mjs         selectStory(candidates, cats): LLM picks 1 + category + angle
    research.mjs       research(selection): primary + corroborating sources -> ResearchBundle
    write.mjs          writeStory(selection, research, cats): grounded StoryJSON
    verify.mjs         verify(story, research): claim-check + code-exec -> VerifyReport
    validate-story.mjs validateStory(story, cats): schema/shape gate (build-safe)
    brain.mjs          orchestrator: source->select->research->write->verify->gate->emit
    *.test.mjs         unit tests (node --test brain/)
  drafts/              stories that fail the gate land here for inspection (gitignored)
```

## Data contracts

- `Candidate` = `{ id, title, url, source: "hn"|"github", score, blurb }`
- `Selection` = `{ candidate: Candidate, category: <id from categories.json>, angle: string }`
- `ResearchBundle` = `{ topic: string, sources: [{ title, url, text, kind: "primary"|"corroborating" }] }`
- `StoryJSON` = the Phase 1 schema, exactly: `{ slug, title, category, kicker, hook, readMinutes, date, beats: [{ num, heading, blocks: [...] }], sources: [{ platform, meta, title, url, note? }] }`. Block types v1 emits: `prose` (html), `quote`, `embeds`, `stats`, `code` (static).
- `VerifyReport` = `{ passed: bool, claims: [{ text, supported: bool, sourceUrl: string|null }], unsupported: string[], code: [{ ok, detail }] }`

---

## Task 0: Clone on the box + brain scaffold

**Files:** Create `brain/` dir, `brain/config.mjs`; modify `.gitignore`.

- [ ] **Step 1: Clone the repo on the box (one time)**
```bash
ssh -o BatchMode=yes mo@192.168.12.220 'test -d ~/stdout || git clone git@github.com:mo-sharif/stdout.git ~/stdout; cd ~/stdout && git pull -q && node --version'
```
Expected: a node version (v22.x) and a clean clone/pull.

- [ ] **Step 2: Scaffold dir + gitignore** (in the Mac repo `~/Documents/stdout`)
```bash
mkdir -p ~/Documents/stdout/brain && printf "drafts/\n" >> ~/Documents/stdout/.gitignore
```

- [ ] **Step 3: `brain/config.mjs`**
```js
export const OLLAMA_BASE = process.env.OLLAMA_BASE || "http://localhost:11434";
export const BRAIN_MODEL = process.env.BRAIN_MODEL || "qwen2.5:7b-instruct";
export const VERIFY_MODEL = process.env.VERIFY_MODEL || "qwen2.5:32b-instruct";
export const UA = "stdout-brain/1.0 (+https://github.com/mo-sharif/stdout)";
```

- [ ] **Step 4: Commit**
```bash
cd ~/Documents/stdout && git add brain/config.mjs .gitignore && git commit -q -m "chore(brain): scaffold + config"
```

---

## Task 1: Ollama client (TDD + smoke)

**Files:** Create `brain/llm.mjs`, `brain/llm.test.mjs`.

- [ ] **Step 1: Write the failing test** - `brain/llm.test.mjs`
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJSON } from './llm.mjs';

test('extractJSON pulls the first JSON object/array from model chatter', () => {
  assert.deepEqual(extractJSON('sure!\n```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJSON('[{"x":2}] done'), [{ x: 2 }]);
});
test('extractJSON throws on no json', () => {
  assert.throws(() => extractJSON('no json here'));
});
```

- [ ] **Step 2: Run it, expect failure**
```bash
cd ~/Documents/stdout && node --test brain/llm.test.mjs
```
Expected: FAIL (cannot find `./llm.mjs`).

- [ ] **Step 3: Implement `brain/llm.mjs`**
```js
import { OLLAMA_BASE, BRAIN_MODEL } from './config.mjs';

export function extractJSON(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : text;
  const start = body.search(/[[{]/);
  if (start === -1) throw new Error('no JSON found in model output');
  // walk to the matching close bracket
  const open = body[start], close = open === '{' ? '}' : ']';
  let depth = 0, end = -1, inStr = false, esc = false;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) { end = i + 1; break; }
  }
  if (end === -1) throw new Error('unbalanced JSON in model output');
  return JSON.parse(body.slice(start, end));
}

export async function chat(messages, { model = BRAIN_MODEL, json = false, temperature = 0.4 } = {}) {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, options: { temperature }, ...(json ? { format: 'json' } : {}) }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message?.content ?? '';
}

export async function chatJSON(messages, opts = {}) {
  const attempts = opts.attempts ?? 3;
  let last;
  for (let i = 0; i < attempts; i++) {
    try { return extractJSON(await chat(messages, { ...opts, json: true })); }
    catch (e) { last = e; }
  }
  throw new Error(`chatJSON failed after ${attempts}: ${last?.message}`);
}
```

- [ ] **Step 4: Run unit test (pass), then smoke on the box**
```bash
cd ~/Documents/stdout && node --test brain/llm.test.mjs
git add brain/llm.mjs brain/llm.test.mjs && git commit -q -m "feat(brain): ollama client + json extraction" && git push -q
ssh -o BatchMode=yes mo@192.168.12.220 'cd ~/stdout && git pull -q && node -e "import(\"./brain/llm.mjs\").then(async m=>{console.log(await m.chat([{role:\"user\",content:\"say hi in 3 words\"}]))})"'
```
Expected: unit tests pass; the box prints a short greeting from the local model (confirms Ollama reachable).

- [ ] **Step 5: Commit** (already committed in step 4)

---

## Task 2: Sources (TDD)

**Files:** Create `brain/sources.mjs`, `brain/sources.test.mjs`.

- [ ] **Step 1: Write the failing test** - `brain/sources.test.mjs`
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHN, normalizeGitHub } from './sources.mjs';

test('normalizeHN maps Algolia hits to candidates', () => {
  const c = normalizeHN({ hits: [{ objectID: '1', title: 'Rust 2.0 released', url: 'https://x.test', points: 420, num_comments: 88 }] });
  assert.equal(c[0].source, 'hn');
  assert.equal(c[0].score, 420);
  assert.match(c[0].url, /x\.test/);
});
test('normalizeGitHub maps repo search items', () => {
  const c = normalizeGitHub({ items: [{ full_name: 'a/b', html_url: 'https://gh.test/a/b', description: 'cool', stargazers_count: 999 }] });
  assert.equal(c[0].source, 'github');
  assert.equal(c[0].title, 'a/b');
});
```

- [ ] **Step 2: Run it, expect failure**
```bash
cd ~/Documents/stdout && node --test brain/sources.test.mjs
```
Expected: FAIL (cannot find `./sources.mjs`).

- [ ] **Step 3: Implement `brain/sources.mjs`**
```js
import { UA } from './config.mjs';

export function normalizeHN(json) {
  return (json.hits || []).filter((h) => h.title && h.url).map((h) => ({
    id: `hn:${h.objectID}`, title: h.title, url: h.url, source: 'hn',
    score: h.points || 0, blurb: `${h.points || 0} points, ${h.num_comments || 0} comments on Hacker News`,
  }));
}
export function normalizeGitHub(json) {
  return (json.items || []).map((r) => ({
    id: `gh:${r.full_name}`, title: r.full_name, url: r.html_url, source: 'github',
    score: r.stargazers_count || 0, blurb: r.description || '',
  }));
}
async function getJSON(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}
export async function fetchCandidates() {
  const since = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  const [hn, gh] = await Promise.all([
    getJSON('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=40').then(normalizeHN).catch(() => []),
    getJSON(`https://api.github.com/search/repositories?q=created:>${since}+stars:>50&sort=stars&order=desc&per_page=20`).then(normalizeGitHub).catch(() => []),
  ]);
  return [...hn, ...gh];
}
```

- [ ] **Step 4: Unit test (pass), commit, smoke on box**
```bash
cd ~/Documents/stdout && node --test brain/sources.test.mjs && git add brain/sources.mjs brain/sources.test.mjs && git commit -q -m "feat(brain): HN + GitHub candidate sourcing" && git push -q
ssh -o BatchMode=yes mo@192.168.12.220 'cd ~/stdout && git pull -q && node -e "import(\"./brain/sources.mjs\").then(async m=>{const c=await m.fetchCandidates(); console.log(c.length, \"candidates; sample:\", c.slice(0,3).map(x=>x.title))})"'
```
Expected: tests pass; the box prints a candidate count > 0 and a few real titles.

---

## Task 3: Clean text extraction (TDD)

**Files:** Create `brain/extract.mjs`, `brain/extract.test.mjs`.

- [ ] **Step 1: Write the failing test** - `brain/extract.test.mjs`
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paragraphsFromHTML, isSkippableHost } from './extract.mjs';

test('isSkippableHost flags README/thread hosts', () => {
  assert.equal(isSkippableHost('https://github.com/a/b'), true);
  assert.equal(isSkippableHost('https://example.com/post'), false);
});
test('paragraphsFromHTML keeps prose, drops code/junk', () => {
  const html = '<p>This is a real sentence of article prose that is comfortably long enough to keep.</p><p>$ npm install left-pad</p>';
  const ps = paragraphsFromHTML(html);
  assert.equal(ps.length, 1);
  assert.match(ps[0], /real sentence/);
});
```

- [ ] **Step 2: Run it, expect failure**
```bash
cd ~/Documents/stdout && node --test brain/extract.test.mjs
```
Expected: FAIL.

- [ ] **Step 3: Implement `brain/extract.mjs`** (mirrors the hardened hero-app `extractArticle`)
```js
import { UA } from './config.mjs';

const SKIP = /(^|\.)(github\.com|news\.ycombinator\.com|reddit\.com|twitter\.com|x\.com|youtube\.com|youtu\.be)$/i;
const JUNK = /^\s*[$#>]|```|pip install|uv (?:venv|pip|run)|git clone|npm (?:i|install)\b|python -m |python \S+\.py|sudo |^\s*\[\d{4}[/-]\d|\s·\s/i;

export function isSkippableHost(url) {
  try { return SKIP.test(new URL(url).hostname); } catch { return true; }
}
export function paragraphsFromHTML(html) {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const seen = new Set();
  return [...clean.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 80 && p.length < 800 && !JUNK.test(p) && !seen.has(p) && seen.add(p));
}
export async function fetchText(url) {
  if (isSkippableHost(url)) return '';
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return '';
    return paragraphsFromHTML(await res.text()).slice(0, 12).join('\n\n');
  } catch { return ''; }
}
```

- [ ] **Step 4: Unit test (pass) + commit**
```bash
cd ~/Documents/stdout && node --test brain/extract.test.mjs && git add brain/extract.mjs brain/extract.test.mjs && git commit -q -m "feat(brain): clean text extraction (host deny-list + junk filter)"
```

---

## Task 4: Select the story (smoke-led)

**Files:** Create `brain/select.mjs`, `brain/select.test.mjs`.

- [ ] **Step 1: Write the failing test** - `brain/select.test.mjs`
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSelectMessages, coerceSelection } from './select.mjs';

const cats = [{ id: 'ai', label: 'AI' }, { id: 'coding', label: 'Coding' }];
const cands = [{ id: 'hn:1', title: 'A new Rust web framework', url: 'https://x.test', source: 'hn', score: 300, blurb: '' }];

test('buildSelectMessages lists candidates and categories', () => {
  const m = buildSelectMessages(cands, cats);
  assert.match(JSON.stringify(m), /A new Rust web framework/);
  assert.match(JSON.stringify(m), /coding/);
});
test('coerceSelection resolves the picked id to a candidate', () => {
  const sel = coerceSelection({ id: 'hn:1', category: 'coding', angle: 'why it matters' }, cands, cats);
  assert.equal(sel.candidate.title, 'A new Rust web framework');
  assert.equal(sel.category, 'coding');
});
test('coerceSelection rejects an invalid category', () => {
  assert.throws(() => coerceSelection({ id: 'hn:1', category: 'nope', angle: 'x' }, cands, cats));
});
```

- [ ] **Step 2: Run it, expect failure**
```bash
cd ~/Documents/stdout && node --test brain/select.test.mjs
```
Expected: FAIL.

- [ ] **Step 3: Implement `brain/select.mjs`**
```js
import { chatJSON } from './llm.mjs';

export function buildSelectMessages(candidates, cats) {
  const list = candidates.map((c, i) => `${i}. [${c.source}, score ${c.score}] ${c.title} (${c.url})`).join('\n');
  const catIds = cats.map((c) => c.id).join(', ');
  return [
    { role: 'system', content: 'You are a sharp developer-news editor. You pick the single most compelling, genuinely interesting story for a developer audience. Avoid press releases and thin content. Reply with JSON only.' },
    { role: 'user', content: `Candidates:\n${list}\n\nCategories: ${catIds}\n\nPick the ONE best story. Reply JSON: {"id": "<the candidate id like hn:1 or gh:org/repo>", "category": "<one category id>", "angle": "<one sentence on the angle to take>"}` },
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
```

- [ ] **Step 4: Unit test (pass), commit, smoke on box**
```bash
cd ~/Documents/stdout && node --test brain/select.test.mjs && git add brain/select.mjs brain/select.test.mjs && git commit -q -m "feat(brain): LLM story selection" && git push -q
ssh -o BatchMode=yes mo@192.168.12.220 'cd ~/stdout && git pull -q && node -e "Promise.all([import(\"./brain/sources.mjs\"),import(\"./brain/select.mjs\"),import(\"fs\")]).then(async ([s,sel,fs])=>{const cats=JSON.parse(fs.readFileSync(\"categories.json\")); const c=await s.fetchCandidates(); console.log(await sel.selectStory(c,cats))})"'
```
Expected: tests pass; the box prints a chosen `{candidate, category, angle}` from real candidates.

---

## Task 5: Research (smoke-led)

**Files:** Create `brain/research.mjs`, `brain/research.test.mjs`.

- [ ] **Step 1: Write the failing test** - `brain/research.test.mjs`
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hnSearchUrl } from './research.mjs';

test('hnSearchUrl builds an Algolia query for the topic', () => {
  const u = hnSearchUrl('Rust web framework');
  assert.match(u, /hn\.algolia\.com/);
  assert.match(u, /Rust/);
});
```

- [ ] **Step 2: Run it, expect failure; Step 3: implement `brain/research.mjs`**
```js
import { UA } from './config.mjs';
import { fetchText } from './extract.mjs';

export function hnSearchUrl(topic) {
  return `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(topic)}&tags=story&hitsPerPage=5`;
}
export async function research(selection) {
  const topic = selection.candidate.title;
  const sources = [];
  const primaryText = await fetchText(selection.candidate.url);
  if (primaryText) sources.push({ title: selection.candidate.title, url: selection.candidate.url, text: primaryText, kind: 'primary' });
  try {
    const res = await fetch(hnSearchUrl(topic), { headers: { 'User-Agent': UA } });
    const hits = (await res.json()).hits || [];
    for (const h of hits) {
      if (sources.length >= 4) break;
      if (!h.url || h.url === selection.candidate.url) continue;
      const text = await fetchText(h.url);
      if (text) sources.push({ title: h.title || h.url, url: h.url, text, kind: 'corroborating' });
    }
  } catch { /* corroboration is best-effort */ }
  return { topic, sources };
}
```

- [ ] **Step 4: Unit test (pass), commit, smoke on box**
```bash
cd ~/Documents/stdout && node --test brain/research.test.mjs && git add brain/research.mjs brain/research.test.mjs && git commit -q -m "feat(brain): research gathering (primary + corroborating)" && git push -q
ssh -o BatchMode=yes mo@192.168.12.220 'cd ~/stdout && git pull -q && node -e "Promise.all([import(\"./brain/sources.mjs\"),import(\"./brain/select.mjs\"),import(\"./brain/research.mjs\"),import(\"fs\")]).then(async ([s,sel,r,fs])=>{const cats=JSON.parse(fs.readFileSync(\"categories.json\")); const c=await s.fetchCandidates(); const pick=await sel.selectStory(c,cats); const bundle=await r.research(pick); console.log(\"sources:\", bundle.sources.map(x=>x.kind+\" \"+x.url))})"'
```
Expected: tests pass; the box prints 1+ gathered sources for the chosen topic (a thin topic may yield only the primary, which is acceptable, the verifier handles thin sourcing).

---

## Task 6: Grounded write (smoke-led)

**Files:** Create `brain/write.mjs`, `brain/write.test.mjs`.

- [ ] **Step 1: Write the failing test** - `brain/write.test.mjs`
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWriteMessages } from './write.mjs';

test('buildWriteMessages embeds the gathered source text and the schema', () => {
  const sel = { candidate: { title: 'T', url: 'https://x.test' }, category: 'coding', angle: 'a' };
  const bundle = { topic: 'T', sources: [{ title: 'S', url: 'https://x.test', text: 'fact one. fact two.', kind: 'primary' }] };
  const m = buildWriteMessages(sel, bundle, [{ id: 'coding', label: 'Coding' }]);
  const s = JSON.stringify(m);
  assert.match(s, /fact one/);
  assert.match(s, /"blocks"/);
  assert.match(s, /only use facts/i);
});
```

- [ ] **Step 2: Run (fail); Step 3: implement `brain/write.mjs`**
```js
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
    { role: 'system', content: 'You write punchy, accurate developer stories in a dev-to-dev voice: short sentences, second person, a little attitude, no fluff. You ONLY use facts present in the provided sources. Every story.sources entry must be one of the provided source URLs. Never invent statistics, quotes, dates, or URLs. Reply JSON only.' },
    { role: 'user', content: `Topic: ${selection.candidate.title}\nAngle: ${selection.angle}\nCategory: ${cat.label} (${cat.id})\n\nSOURCES (only use facts found here):\n${sourceText || '(no source text gathered, write only what the title alone supports and keep it short)'}\n\n${SCHEMA_HINT}\n\nWrite 4 to 6 beats. Put the real source links in story.sources. only use facts from the SOURCES above.` },
  ];
}
export async function writeStory(selection, bundle, cats) {
  const draft = await chatJSON(buildWriteMessages(selection, bundle, cats), { temperature: 0.6 });
  return {
    slug: slugify(draft.title || selection.candidate.title),
    title: draft.title, category: selection.category,
    kicker: draft.kicker || cats.find((c) => c.id === selection.category)?.label || '',
    hook: draft.hook || '', readMinutes: Number(draft.readMinutes) || 6,
    date: process.env.EDITION_DATE || new Date().toISOString().slice(0, 10),
    beats: draft.beats || [],
    sources: (draft.sources || []).filter((s) => s.url),
  };
}
```
Note: `EDITION_DATE` lets the orchestrator pass a deterministic date; default is today (UTC).

- [ ] **Step 4: Unit test (pass), commit, smoke on box** (chain sources->select->research->write, print the story JSON)
```bash
cd ~/Documents/stdout && node --test brain/write.test.mjs && git add brain/write.mjs brain/write.test.mjs && git commit -q -m "feat(brain): grounded story writer" && git push -q
ssh -o BatchMode=yes mo@192.168.12.220 'cd ~/stdout && git pull -q && node -e "Promise.all([import(\"./brain/sources.mjs\"),import(\"./brain/select.mjs\"),import(\"./brain/research.mjs\"),import(\"./brain/write.mjs\"),import(\"fs\")]).then(async ([s,se,r,w,fs])=>{const cats=JSON.parse(fs.readFileSync(\"categories.json\")); const c=await s.fetchCandidates(); const p=await se.selectStory(c,cats); const b=await r.research(p); const story=await w.writeStory(p,b,cats); console.log(JSON.stringify(story,null,2).slice(0,1500))})"'
```
Expected: a story JSON with title/hook/beats/sources, sources matching gathered URLs.

---

## Task 7: Validate story shape (TDD, build-safe)

**Files:** Create `brain/validate-story.mjs`, `brain/validate-story.test.mjs`.

- [ ] **Step 1: Write the failing test** - `brain/validate-story.test.mjs`
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStory } from './validate-story.mjs';

const cats = [{ id: 'coding', label: 'Coding' }];
const good = { slug: 's', title: 'T', category: 'coding', kicker: 'k', hook: 'h', readMinutes: 6, date: '2026-06-24',
  beats: [{ num: '01', heading: 'H', blocks: [{ type: 'prose', html: '<p>x</p>' }] }], sources: [{ platform: 'web', title: 'S', url: 'https://x.test' }] };

test('accepts a well-formed story', () => { assert.equal(validateStory(good, cats).length, 0); });
test('flags bad category, empty beats, unknown block type', () => {
  assert.ok(validateStory({ ...good, category: 'nope' }, cats).length > 0);
  assert.ok(validateStory({ ...good, beats: [] }, cats).length > 0);
  assert.ok(validateStory({ ...good, beats: [{ blocks: [{ type: 'zzz' }] }] }, cats).length > 0);
});
```

- [ ] **Step 2: Run (fail); Step 3: implement `brain/validate-story.mjs`**
```js
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
```

- [ ] **Step 4: Unit test (pass) + commit**
```bash
cd ~/Documents/stdout && node --test brain/validate-story.test.mjs && git add brain/validate-story.mjs brain/validate-story.test.mjs && git commit -q -m "feat(brain): story shape validation"
```

---

## Task 8: Verify / accuracy gate (smoke-led)

**Files:** Create `brain/verify.mjs`, `brain/verify.test.mjs`.

- [ ] **Step 1: Write the failing test** - `brain/verify.test.mjs`
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectClaims, runCodeBlocks } from './verify.mjs';

test('collectClaims pulls sentences from prose blocks', () => {
  const story = { beats: [{ blocks: [{ type: 'prose', html: '<p>Rust reached version 1.0 back in 2015 after a long beta. It is memory safe by design.</p>' }] }] };
  const claims = collectClaims(story);
  assert.ok(claims.some((c) => /version 1\.0/.test(c)));
});
test('runCodeBlocks executes JS and reports', () => {
  const story = { beats: [{ blocks: [{ type: 'code', lang: 'js', code: 'globalThis.__r = 1 + 1' }] }] };
  const out = runCodeBlocks(story);
  assert.equal(out[0].ok, true);
});
```

- [ ] **Step 2: Run (fail); Step 3: implement `brain/verify.mjs`**
```js
import vm from 'node:vm';
import { chatJSON } from './llm.mjs';
import { VERIFY_MODEL } from './config.mjs';

export function collectClaims(story) {
  const text = (story.beats || []).flatMap((b) => (b.blocks || []).filter((x) => x.type === 'prose').map((x) => x.html))
    .join(' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 25);
}
export function runCodeBlocks(story) {
  const blocks = (story.beats || [])
    .flatMap((b) => b.blocks || [])
    .filter((x) => x.type === 'code' && (x.lang === 'js' || /^(?:function|const|let|var|module)/.test(x.code || '')));
  return blocks.map((b) => {
    try { vm.runInNewContext(b.code, {}, { timeout: 2000 }); return { ok: true, detail: 'ran' }; }
    catch (e) { return { ok: false, detail: String(e.message) }; }
  });
}
export async function verify(story, bundle) {
  const claims = collectClaims(story);
  const sourceText = bundle.sources.map((s) => s.text).join('\n\n').slice(0, 12000);
  const messages = [
    { role: 'system', content: 'You are a fact-checker. For each claim, decide if it is SUPPORTED by the provided sources. Be strict: if the sources do not clearly support it, mark it unsupported. Reply JSON only.' },
    { role: 'user', content: `SOURCES:\n${sourceText || '(none)'}\n\nCLAIMS:\n${claims.map((c, i) => `${i}. ${c}`).join('\n')}\n\nReply JSON: {"results":[{"i":0,"supported":true|false}]}` },
  ];
  let results = [];
  try { results = (await chatJSON(messages, { model: VERIFY_MODEL })).results || []; } catch { /* treat as all-unknown below */ }
  const supportedIdx = new Set(results.filter((r) => r.supported).map((r) => r.i));
  const claimReport = claims.map((text, i) => ({ text, supported: supportedIdx.has(i), sourceUrl: null }));
  const unsupported = claimReport.filter((c) => !c.supported).map((c) => c.text);
  const code = runCodeBlocks(story);
  const codeOk = code.every((c) => c.ok);
  // v1 gate: pass if a strong majority of claims are supported and all code runs.
  const ratio = claims.length ? (claims.length - unsupported.length) / claims.length : 1;
  return { passed: ratio >= 0.8 && codeOk, claims: claimReport, unsupported, code };
}
```
Note: v1 gate is "at least 80% of claims supported and all code runs", with the human review-first as the backstop. Tighten toward 100% + multi-source once trusted (Phase 3 decision).

- [ ] **Step 4: Unit test (pass), commit, smoke on box** (end of Task 6's chain + verify)
```bash
cd ~/Documents/stdout && node --test brain/verify.test.mjs && git add brain/verify.mjs brain/verify.test.mjs && git commit -q -m "feat(brain): accuracy verifier (claim-check + code-exec gate)" && git push -q
```

---

## Task 9: Orchestrator + end-to-end (smoke + CHECKPOINT)

**Files:** Create `brain/brain.mjs`.

- [ ] **Step 1: Implement `brain/brain.mjs`**
```js
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

const rel = join('content', story.category, `${story.slug}.json`);
const draftRel = join('drafts', `${story.slug}.json`);
const payload = JSON.stringify(story, null, 2);
if (DRY) { console.log(payload); process.exit(0); }
const out = ok ? join(ROOT, rel) : join(ROOT, draftRel);
await mkdir(dirname(out), { recursive: true });
await writeFile(out, payload);
await writeFile(out.replace(/\.json$/, '.verify.json'), JSON.stringify({ shapeErrors, ...report }, null, 2));
console.log(ok ? `published candidate -> ${rel}` : `held for review -> ${draftRel} (${report.unsupported.length} unsupported claims, ${shapeErrors.length} shape errors)`);
```

- [ ] **Step 2: Dry run on the box**
```bash
ssh -o BatchMode=yes mo@192.168.12.220 'cd ~/stdout && git pull -q && node brain/brain.mjs --dry 2>/tmp/brain.err | head -60; echo "--- log ---"; cat /tmp/brain.err'
```
Expected: a full story JSON on stdout and a log line showing the pick, research source count, and verify result.

- [ ] **Step 3: Real run -> build -> review**
```bash
ssh -o BatchMode=yes mo@192.168.12.220 'cd ~/stdout && node brain/brain.mjs && npm run build 2>&1 | tail -1 && ls content/*/*.json'
```
Then pull the generated story to the Mac and open the built page for inspection:
```bash
scp -q "mo@192.168.12.220:~/stdout/content/*/*.json" /tmp/ 2>/dev/null; rsync -aq mo@192.168.12.220:~/stdout/docs/ ~/Documents/stdout/docs-box-preview/ && open ~/Documents/stdout/docs-box-preview/index.html
```
Expected: the brain emits a real story (or a draft if it failed the gate), the build includes it, and the hub shows it.

- [ ] **Step 4: CHECKPOINT (human accuracy + quality gate)**
STOP. Present the auto-generated story to the user. They read it for accuracy (claims match sources, no hallucinations), voice, and "not slop." Iterate on prompts (`select.mjs` / `write.mjs` / `verify.mjs`) until the output is trustworthy. Do not move to Phase 3 (autonomy / publishing) until the user approves the brain's output quality.

- [ ] **Step 5: Commit**
```bash
cd ~/Documents/stdout && git add brain/brain.mjs && git commit -q -m "feat(brain): orchestrator + accuracy gate (review-first output)" && git push -q
```

---

## Definition of Done (Phase 2)

- `node --test brain/` is green (pure-logic units).
- On the box, `node brain/brain.mjs --dry` produces a schema-valid, grounded story JSON from live sources.
- A real run either publishes to `content/<category>/<slug>.json` (gate passed) or holds it in `drafts/` with a verify report (gate failed). Nothing unverified reaches `content/`.
- The Phase 1 build renders the brain's output with no changes (same schema).
- The user has reviewed a generated story and approved its accuracy + quality.

## Notes / guardrails

- Grounding is the whole game: the writer only sees gathered source text and is told to use only those facts; the verifier independently re-checks. The human review-first gate (Phase 3) is the final backstop.
- Keep prompts in `select.mjs` / `write.mjs` / `verify.mjs` - they are the tuning surface during the checkpoint.
- v1 verifier threshold is 80% supported + all code runs; raise it (and add hard multi-source corroboration) before enabling full auto in Phase 3.
- No em dash character in any generated prose or code comments (project-wide rule). Add it to the writer system prompt if the model overuses it.
