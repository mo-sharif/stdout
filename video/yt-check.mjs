// Verify the YouTube creds resolve to a channel. Prints the channel title + id
// (NEVER the secret values). Run in CI where YT_* are injected, or locally with
// them in env. Exits non-zero if the token is bad.
const id = process.env.YT_CLIENT_ID;
const secret = process.env.YT_CLIENT_SECRET;
const refresh = process.env.YT_REFRESH_TOKEN;
if (!id || !secret || !refresh) {
  console.error('missing one of YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN');
  process.exit(1);
}

const tok = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: 'refresh_token' }),
}).then((r) => r.json());
if (!tok.access_token) {
  console.error('token refresh failed:', tok.error || '', tok.error_description || '');
  process.exit(1);
}

const data = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
  headers: { Authorization: `Bearer ${tok.access_token}` },
}).then((r) => r.json());
const c = data.items?.[0];
if (!c) {
  console.error('authorized, but no channel returned:', JSON.stringify(data).slice(0, 200));
  process.exit(1);
}
console.log(`OK — authorized channel: "${c.snippet.title}"  id=${c.id}  subs=${c.statistics?.subscriberCount ?? '?'}`);
