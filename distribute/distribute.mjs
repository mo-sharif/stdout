import { CREDS, isEnabled } from './config.mjs';
import * as mastodon from './mastodon.mjs';
import * as bluesky from './bluesky.mjs';
import * as telegram from './telegram.mjs';
import * as discord from './discord.mjs';
import * as devto from './devto.mjs';
import * as linkedin from './linkedin.mjs';

export const POSTERS = { mastodon, bluesky, telegram, discord, devto, linkedin };

// Fan a Post out to every platform that has creds. Never throws: each platform
// result is { platform, ok|skipped|error }. devto only runs for written stories
// (it needs a title + body); pass { only } to target specific platforms.
export async function distribute(post, { only } = {}) {
  const names = only || Object.keys(POSTERS);
  const results = [];
  for (const name of names) {
    const poster = POSTERS[name];
    if (!poster) { results.push({ platform: name, error: 'unknown platform' }); continue; }
    if (!isEnabled(name)) { results.push({ platform: name, skipped: 'no creds' }); continue; }
    try {
      const r = await poster.post(post, CREDS[name]);
      results.push({ platform: name, ...r });
    } catch (e) {
      results.push({ platform: name, ok: false, error: String(e.message) });
    }
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : undefined; };
  const post = {
    title: arg('title') || 'stdout test post',
    url: arg('url') || 'https://mo-sharif.github.io/stdout/',
    summary: arg('summary') || 'Testing the distribution fan-out.',
    tags: (arg('tags') || 'dev,tech').split(','),
  };
  const only = arg('only')?.split(',');
  distribute(post, { only }).then((r) => console.log(JSON.stringify(r, null, 2)));
}
