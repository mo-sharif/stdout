import { socialText } from './post.mjs';

export async function post(p, c) {
  const base = c.base.replace(/\/$/, '');
  const res = await fetch(`${base}/api/v1/statuses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.token}` },
    body: JSON.stringify({ status: socialText(p, 500), visibility: 'public' }),
  });
  if (!res.ok) throw new Error(`mastodon ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return { ok: true, id: j.id, url: j.url };
}
