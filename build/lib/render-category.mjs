import { esc } from './util.mjs';
import { page } from './layout.mjs';

export function storyCard(s, hrefPrefix = '') {
  return `<a class="card" href="${hrefPrefix}${esc(s.slug)}/">
    <span class="pill c-${esc(s.category)}"><span class="d"></span> ${esc(s.category)}</span>
    <h4>${esc(s.title)}</h4>
    <p>${esc(s.hook)}</p>
    <div class="foot"><span>${esc(s.readMinutes)} min</span></div>
  </a>`;
}

export function renderCategory(cat, stories) {
  const body = `<header class="cathead" style="--accent:${esc(cat.accent)}"><div class="wrap">
    <a class="back" href="../">&larr; all stories</a>
    <h1>${esc(cat.label)}</h1><p class="sub">${esc(cat.blurb)}</p>
  </div></header>
  <div class="wrap"><div class="grid">${stories.map((s) => storyCard(s)).join('')}</div></div>`;
  return page({ title: `${cat.label} — stdout`, body, depth: 1, desc: cat.blurb });
}
