import { UA } from './config.mjs';
import { fetchText } from './extract.mjs';

export function hnSearchUrl(topic) {
  return `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(topic)}&tags=story&hitsPerPage=5`;
}
export async function research(selection) {
  const topic = selection.candidate.title;
  const sources = [];
  const primaryText = await fetchText(selection.candidate.url);
  if (primaryText) sources.push({ title: selection.candidate.title, url: selection.candidate.url, text: primaryText, kind: 'primary' });
  try {
    const res = await fetch(hnSearchUrl(topic), { headers: { 'User-Agent': UA } });
    const hits = (await res.json()).hits || [];
    for (const h of hits) {
      if (sources.length >= 4) break;
      if (!h.url || h.url === selection.candidate.url) continue;
      const text = await fetchText(h.url);
      if (text) sources.push({ title: h.title || h.url, url: h.url, text, kind: 'corroborating' });
    }
  } catch { /* corroboration is best-effort */ }
  return { topic, sources };
}
