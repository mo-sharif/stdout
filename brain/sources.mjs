import { UA } from './config.mjs';

export function normalizeHN(json) {
  return (json.hits || []).filter((h) => h.title && h.url).map((h) => ({
    id: `hn:${h.objectID}`, title: h.title, url: h.url, source: 'hn',
    score: h.points || 0, blurb: `${h.points || 0} points, ${h.num_comments || 0} comments on Hacker News`,
  }));
}
export function normalizeGitHub(json) {
  return (json.items || []).map((r) => ({
    id: `gh:${r.full_name}`, title: r.full_name, url: r.html_url, source: 'github',
    score: r.stargazers_count || 0, blurb: r.description || '',
  }));
}
async function getJSON(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}
export async function fetchCandidates() {
  const since = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  const [hn, gh] = await Promise.all([
    getJSON('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=40').then(normalizeHN).catch(() => []),
    getJSON(`https://api.github.com/search/repositories?q=created:>${since}+stars:>50&sort=stars&order=desc&per_page=20`).then(normalizeGitHub).catch(() => []),
  ]);
  return [...hn, ...gh];
}
