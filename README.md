# stdout

**Autonomous, interactive developer stories. Researched, written, fact-checked, and published from local hardware.**

Live site: **https://mo-sharif.github.io/stdout/**

stdout is an open-source publication of developer stories. Each one is a cinematic, scroll-driven web page (live code you can run, terminal replays, dependency graphs, real source links) written in a plain dev-to-dev voice. The whole thing, from picking the topic to publishing the page, runs on local hardware with no paid or cloud services.

## What you can do here

- **Read.** Open the [live site](https://mo-sharif.github.io/stdout/) and scroll. Stories are organized by category: AI, Coding, Leadership, Tech, Career, Security.
- **Check the receipts.** Every story links out to the primary sources it was built from.
- **Run it yourself.** It is a static site plus a small Node pipeline (see below).

## How a story is made

```
pick a topic   ->  research         ->  write (grounded)   ->  verify           ->  build      ->  publish      ->  distribute
HN + GitHub        fetch + read         dev voice, every       claim-check vs       content        GitHub          Mastodon, Bluesky,
trending           real sources         claim is cited         sources, run the     -> static      Pages           Telegram, Dev.to,
                                                               code, human OK        HTML                           LinkedIn, ...
```

The writer only ever sees gathered source text and must cite it. A separate verifier re-checks every claim against those sources and executes any code, and a human approves it, before anything is published. Nothing unverified ships.

## Principles

- **100% local and free.** Local LLM (Ollama), free public APIs, no paid SaaS.
- **Accuracy first.** Grounded writing, an independent verifier, and a human review gate. No confident nonsense.
- **Zero third-party runtime.** Published pages vendor their animation library (Motion) and fonts and self-host their embeds. No CDNs, no trackers, works offline.
- **Vanilla and static.** Plain HTML, CSS, and JS, built by a small Node script. No framework.

## Repo layout

```
content/<category>/<slug>.json   the stories (structured source)
categories.json                  the category taxonomy
build/                           the static-site builder (content -> docs/)
brain/                           the content engine (source, research, write, verify)
distribute/                      syndication to social platforms
docs/                            the built site, served by GitHub Pages
```

## Run it

Requires Node 18 or newer.

```bash
npm test                              # run the test suite (node:test)
node build/build.mjs                  # build the site into docs/
python3 -m http.server -d docs 8000   # preview at http://localhost:8000
```

The content engine (`brain/`) additionally needs a local [Ollama](https://ollama.com). Once it is running:

```bash
node brain/brain.mjs --dry            # research + write + verify one story, print the JSON
```

Adding a story by hand is just dropping a `content/<category>/<slug>.json` file (matching an existing one) and rebuilding. The hub and category pages regenerate themselves from the manifest.

## Status

The live site and build pipeline are in place. The content engine and syndication are built and being put through their paces, with a human review gate in front of anything that publishes.

## License

MIT. See [LICENSE](LICENSE).

---

Built autonomously on local hardware.
