# Phase 4: Video Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn an already-verified dev-story (`content/<cat>/<slug>.json`) into a terminal-aesthetic video (landscape + vertical shorts) and upload it privately to the new YouTube channel `UCWAPvsUtwlnbbHdxk_CX2yg` — the second half of "write once, publish twice".

**Architecture:** A self-contained `video/` module in the stdout repo that reuses ViralVault Studio's *proven patterns* (Remotion render, `googleapis` resumable upload, the staged script→vo→package→render flow) but is dev-story-native. The narration is taken **deterministically from the verified story prose** (no LLM re-write), so the accuracy gate is never re-opened. Remotion is a build-time devDependency (like esbuild) — it never ships to the web runtime.

**Tech Stack:** Node ESM, `node:test`, Remotion (`@remotion/bundler` + `@remotion/renderer` + React), the box's cloned voice (TTS, pending the voice bake-off), `googleapis` (YouTube). Render on the self-hosted GPU runner.

## Gates (why this ships in stages)
- The **voice bake-off** is still running and will pick the production voice — so the **VO stage (Stage 3) is built last** and its provider/voice is wired only after the winner is known.
- The **first auto-written story** must be human-approved before anything is published.
- The **new channel's OAuth creds** (`YT_CLIENT_ID/SECRET/REFRESH_TOKEN`) are not set yet — upload runs in `--dry` until they are.
Stages 1–2 are fully buildable and verifiable now (no GPU, no voice, no creds).

---

## File Structure
- `video/lib.mjs` — pure helpers: `stripHtml`, `webUrl`. (Stage 1)
- `video/script.mjs` — `buildScript(story)` → ordered segments (hook → per-beat → outro); narration from prose, scenes from non-prose blocks. (Stage 1)
- `video/timing.mjs` — `buildTiming(script)` → per-segment start/duration (+frames); pre-VO estimate, overridden by real VO later. (Stage 1)
- `video/package.mjs` — `buildPackage(story, script, timing)` → YouTube title/description/tags/chapters/shorts (deterministic). (Stage 1)
- `video/{script,timing,package}.test.mjs` — unit tests. (Stage 1)
- `video/remotion/` — Remotion project: `Root.tsx` (compositions `StoryLandscape` 1920×1080 + `StoryVertical` 1080×1920 + `Thumb`), scene components `Title/Code/Terminal/Graph/Stats/Quote/Prose/Outro`, terminal design tokens shared with the site. (Stage 2)
- `video/render.mjs` — bundle + render landscape/shorts/thumb from `render-props.json`. (Stage 2)
- `video/vo.mjs` — narration WAVs + measured `timing.json` via the cloned-voice provider; `--estimate` mode (no audio) for pre-voice render tests. (Stage 3, voice-gated)
- `video/upload.mjs` — `googleapis` OAuth2 resumable upload to the new channel, `privacy=private`, `--dry`. (Stage 4)
- `video/build.mjs` — orchestrator: script → (vo|estimate) → package → render (→ upload). (Stage 4)
- `.github/workflows/video.yml` — manual/`workflow_dispatch` render on the self-hosted GPU runner. (Stage 4)

---

## Stage 1 — deterministic adapters (NOW; full TDD)
Build `lib.mjs`, `script.mjs`, `timing.mjs`, `package.mjs` with co-located tests. These convert a verified story into a render-ready script + timing + YouTube metadata with zero models and zero external services. Commit when `node --test` is green.

Key contracts:
- A **segment** = `{ id, kind: 'hook'|'beat'|'outro', heading, narration, scenes: Scene[] }`.
- A **Scene** = one of `{type:'title',...}`, `{type:'code',file,code,caption}`, `{type:'terminal',title,lines,caption}`, `{type:'graph',center,nodes}`, `{type:'stats',items}`, `{type:'quote',text,cite}`, `{type:'prose',heading,text}`, `{type:'outro',title,category,sources}`.
- Narration = stripped prose text (fallback: quote text, then heading). Scenes = the beat's non-prose blocks in order (fallback: a prose scene).
- Timing: `duration = max(MIN, words/2.6, sum(scene floors))`, cumulative with a 0.5s gap, frame-aligned.
- Package: `privacy:'private'`, chapters starting at `00:00`, tags seeded from category, description carries the hook + web URL + chapters + sources.

## Stage 2 — Remotion render (NEXT)
Add Remotion devDeps. Build the compositions in the site's terminal aesthetic (phosphor green, IBM Plex Mono, window chrome, blinking cursor, code typing, terminal stream, animated dependency graph, count-up stats, quote card). `render.mjs` bundles `video/remotion/index.ts` and renders `StoryLandscape` + `SHORTS_COUNT` verticals + a thumbnail from `render-props.json = {story, script, timing}`. Validate by rendering a draft of `content/coding/11-lines-broke-the-internet.json` with **estimated** timing (no voice) and screenshotting frames.

## Stage 3 — VO with the cloned voice (voice-gated)
`vo.mjs` synthesizes per-segment WAVs through a small provider that POSTs to the cloned-voice server (Chatterbox-style `POST / → audio/wav`, ref + cfg/exag from the bake-off winner), measures real durations into `timing.json`, and feeds them back into render. `--estimate` keeps Stage 2 testable until then. Confirm which server `KOKORO_BASE_URL`/voice endpoint should point at (Studio currently defaults to Kokoro `af_heart`, not the cloned voice).

## Stage 4 — upload + orchestrate (creds-gated)
`upload.mjs` (googleapis OAuth2 → new channel, private, `--dry`), `build.mjs` orchestrator, and `video.yml` (`workflow_dispatch`, self-hosted GPU). Wire so an approved/merged story can be turned into a private video for review. No auto-publish.

---

## Self-Review
- "Write once" preserved: narration is the verified prose, never re-generated → no new hallucination surface. ✅
- On-brand: Remotion scenes reuse the site's terminal tokens. ✅
- Gate-safe: Stages 1–2 need no GPU/voice/creds; VO + upload are isolated and dry-runnable. ✅
- Reuse: mirrors Studio's staged flow + uploader pattern without coupling the two repos. ✅
