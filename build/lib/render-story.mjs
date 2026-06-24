import { esc } from './util.mjs';
import { renderBeat } from './beats.mjs';
import { page } from './layout.mjs';

const SRC_LOGO = { x: 'X', hn: 'Y', gh: '&#9679;', npm: 'n', web: '&#9632;' };

export function renderStory(story, cat) {
  const beats = story.beats.map(renderBeat).join('\n');
  const sources = (story.sources || []).map((s) =>
    `<a class="embed e-${esc(s.platform)}" href="${esc(s.url)}" target="_blank" rel="noopener">
       <div class="eh"><span class="logo">${SRC_LOGO[s.platform] || '&#9632;'}</span> ${esc(s.meta || s.platform)}</div>
       <div class="txt">${esc(s.title)}</div></a>`).join('');
  const body = `
<header class="hero" style="--accent:${esc(cat.accent)}"><div class="aurora"></div><div class="wrap">
  <span class="kicker"><span class="dot"></span> ${esc(story.kicker || cat.label)}</span>
  <h1>${esc(story.title)}</h1>
  <p class="dek">${esc(story.hook)}</p>
  <div class="meta"><span>~${esc(story.readMinutes)} min</span><span>&bull;</span><span>${esc(cat.label)}</span></div>
</div><div class="scrollcue">scroll<span>&darr;</span></div></header>
<main>${beats}</main>
<footer><div class="wrap">
  <h4 class="lbl">every source, in one place</h4>
  <div class="embeds">${sources}</div>
  <div class="badge"><span class="d"></span> researched, written and published autonomously on local hardware</div>
</div></footer>`;
  return page({ title: story.title, body, depth: 2, desc: story.hook });
}
