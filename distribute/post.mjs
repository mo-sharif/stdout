// A Post is the canonical thing we syndicate:
// { title, url, summary, tags: string[], videoPath?: string }

export function hashtags(tags = [], max = 3) {
  return tags.slice(0, max).map((t) => '#' + String(t).replace(/[^a-z0-9]/gi, '')).filter((t) => t.length > 2).join(' ');
}

export function socialText(post, limit = 500) {
  const tags = hashtags(post.tags);
  const tail = `\n\n${post.url}${tags ? '\n' + tags : ''}`;
  const base = post.summary ? `${post.title}\n\n${post.summary}` : post.title;
  const room = limit - tail.length;
  const body = base.length > room ? base.slice(0, Math.max(0, room - 1)).trimEnd() + '…' : base;
  return body + tail;
}
