// Cross-posts the written story to dev.to with a canonical_url back to stdout,
// so the canonical SEO credit stays on the site.
export async function post(p, c) {
  const res = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': c.apiKey },
    body: JSON.stringify({
      article: {
        title: p.title,
        published: true,
        canonical_url: p.url,
        tags: (p.tags || []).slice(0, 4).map((t) => String(t).replace(/[^a-z0-9]/gi, '')).filter(Boolean),
        body_markdown: `${p.summary || ''}\n\n[Read the full interactive version on stdout](${p.url}).`,
      },
    }),
  });
  if (!res.ok) throw new Error(`devto ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return { ok: true, url: j.url };
}
