# pipeline/ — daily web autonomy

Daily loop: **brain -> build -> review PR -> (human merges) -> publish + announce.**

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
sources, and the accuracy report (unsupported claims + shape errors). Stories
that fail verify stay in `drafts/` (gitignored) on the runner for manual review,
they never open a PR and never reach a live page.

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
