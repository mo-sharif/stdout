import { UA } from './config.mjs';

const SKIP = /(^|\.)(github\.com|news\.ycombinator\.com|reddit\.com|twitter\.com|x\.com|youtube\.com|youtu\.be)$/i;
const JUNK = /^\s*[$#>]|```|pip install|uv (?:venv|pip|run)|git clone|npm (?:i|install)\b|python -m |python \S+\.py|sudo |^\s*\[\d{4}[/-]\d|\s·\s/i;

export function isSkippableHost(url) {
  try { return SKIP.test(new URL(url).hostname); } catch { return true; }
}
export function paragraphsFromHTML(html) {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const seen = new Set();
  return [...clean.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 80 && p.length < 800 && !JUNK.test(p) && !seen.has(p) && seen.add(p));
}
export async function fetchText(url) {
  if (isSkippableHost(url)) return '';
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return '';
    return paragraphsFromHTML(await res.text()).slice(0, 12).join('\n\n');
  } catch { return ''; }
}
