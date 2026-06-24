// Posts an ARTICLE share to LinkedIn (profile or org page, set by LINKEDIN_AUTHOR_URN,
// e.g. urn:li:person:XXXX or urn:li:organization:XXXX). Needs a token from the
// "Share on LinkedIn" / Community Management OAuth product (one-time setup).
export async function post(p, c) {
  const body = {
    author: c.author,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: `${p.title}\n\n${p.summary || ''}`.slice(0, 2900) },
        shareMediaCategory: 'ARTICLE',
        media: [{ status: 'READY', originalUrl: p.url, title: { text: p.title.slice(0, 200) } }],
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };
  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0', Authorization: `Bearer ${c.token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`linkedin ${res.status}: ${await res.text()}`);
  return { ok: true, id: res.headers.get('x-restli-id') };
}
