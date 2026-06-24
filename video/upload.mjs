import { readFile, stat } from 'node:fs/promises';

// Zero-dep YouTube upload (resumable, via fetch). Creds come from env; the new
// dev-story channel is whichever channel the refresh token authorizes.
const CRED = {
  clientId: process.env.YT_CLIENT_ID,
  clientSecret: process.env.YT_CLIENT_SECRET,
  refreshToken: process.env.YT_REFRESH_TOKEN,
};

export function uploadEnabled() {
  return !!(CRED.clientId && CRED.clientSecret && CRED.refreshToken);
}

async function accessToken() {
  const body = new URLSearchParams({
    client_id: CRED.clientId, client_secret: CRED.clientSecret,
    refresh_token: CRED.refreshToken, grant_type: 'refresh_token',
  });
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`token ${r.status}: ${j.error_description || j.error}`);
  return j.access_token;
}

// Upload a video. privacy defaults to 'private' (review-first). No creds -> dry skip.
export async function uploadVideo({ filePath, title, description, tags = [], privacy = 'private', categoryId = '28' }) {
  if (!uploadEnabled()) {
    return { skipped: 'no YT creds (set YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN)', wouldUpload: { title, privacy, file: filePath } };
  }
  const token = await accessToken();
  const meta = { snippet: { title, description, tags, categoryId }, status: { privacyStatus: privacy, selfDeclaredMadeForKids: false } };
  const size = (await stat(filePath)).size;

  const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(size),
      'X-Upload-Content-Type': 'video/*',
    },
    body: JSON.stringify(meta),
  });
  if (!start.ok) throw new Error(`session ${start.status}: ${await start.text()}`);
  const uploadUrl = start.headers.get('location');

  const bytes = await readFile(filePath);
  const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'video/*', 'Content-Length': String(size) }, body: bytes });
  const j = await put.json();
  if (!put.ok) throw new Error(`upload ${put.status}: ${JSON.stringify(j)}`);
  return { id: j.id, url: `https://youtu.be/${j.id}`, privacy };
}

// CLI: node video/upload.mjs <mp4> [--title "..."] [--privacy private]
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : undefined; };
  const res = await uploadVideo({
    filePath: process.argv[2], title: arg('title') || 'stdout video',
    description: arg('desc') || '', privacy: arg('privacy') || 'private',
  });
  console.log(JSON.stringify(res, null, 2));
}
