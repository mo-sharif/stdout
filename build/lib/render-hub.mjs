import { esc } from './util.mjs';
import { page } from './layout.mjs';
import { storyCard } from './render-category.mjs';

export function renderHub(manifest, cats) {
  const nav = cats.map((c) => `<a href="#${esc(c.id)}">${esc(c.label)}</a>`).join('');
  const sections = cats.map((c) => {
    const stories = manifest.byCategory.get(c.id) || [];
    if (!stories.length) return '';
    return `<section class="cat" id="${esc(c.id)}" style="--accent:${esc(c.accent)}">
      <div class="rowhead"><span class="pill c-${esc(c.id)} bd"><span class="d"></span> ${esc(c.label)}</span><span class="why">${esc(c.blurb)}</span></div>
      <div class="grid">${stories.map((s) => storyCard(s, `${esc(c.id)}/`)).join('')}</div>
    </section>`;
  }).join('');
  const body = `<nav><div class="wrap"><span class="brand">stdout<span class="curs"></span></span>
    <span class="links">${nav}</span><span class="right"><span class="pulse"><span class="d"></span> new drop daily</span></span></div></nav>
  <header class="hero"><div class="aurora"></div><div class="wrap">
    <span class="tag">dev stories, not slop</span>
    <h1>The stories behind the code, <span class="grad">told like a dev would tell them</span></h1>
    <p class="sub">Interactive, deeply-researched walk-throughs of the moments that shaped how we build.</p>
  </div></header>
  <div class="wrap">${sections}</div>
  <footer><div class="wrap"><span class="badge"><span class="d"></span> researched, written and published autonomously on local hardware · open source on GitHub</span></div></footer>`;
  return page({ title: 'stdout — dev stories, told like a dev would tell them', body, depth: 0 });
}
