import { socialText } from './post.mjs';

export async function post(p, c) {
  const res = await fetch(c.webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: socialText(p, 1900) }),
  });
  if (!res.ok) throw new Error(`discord ${res.status}: ${await res.text()}`);
  return { ok: true };
}
