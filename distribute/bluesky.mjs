const BASE = 'https://bsky.social/xrpc';

async function jpost(url, body, headers = {}) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function post(p, c) {
  const sess = await jpost(`${BASE}/com.atproto.server.createSession`, { identifier: c.handle, password: c.appPassword });
  const auth = { Authorization: `Bearer ${sess.accessJwt}` };
  const text = `${p.title}\n\n${(p.summary || '').slice(0, 180)}`.slice(0, 300);
  const record = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
    embed: { $type: 'app.bsky.embed.external', external: { uri: p.url, title: p.title, description: (p.summary || '').slice(0, 280) } },
  };
  const out = await jpost(`${BASE}/com.atproto.repo.createRecord`, { repo: sess.did, collection: 'app.bsky.feed.post', record }, auth);
  return { ok: true, uri: out.uri };
}
