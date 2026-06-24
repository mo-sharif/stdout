import { esc } from './util.mjs';

const prose = (b) => `<section class="beat"><div class="wrap">
  ${b.num ? `<div class="num r">${esc(b.num)}</div>` : ''}
  ${b.heading ? `<h2 class="r">${esc(b.heading)}</h2>` : ''}
  ${b.html || ''}
</div></section>`;

const code = (b) => {
  const inputs = (b.inputs || []).map((i) =>
    `<label>${esc(i.name)}</label><input data-arg="${esc(i.name)}" value="${esc(i.value)}"${i.width ? ` style="width:${esc(i.width)}"` : ''}>`).join('');
  const pg = !!b.playground;
  return `<section class="beat"><div class="wrap">
    <div class="panel r"${pg ? ' data-playground' : ''}>
      <div class="top"><i></i><i></i><i></i><span class="fn">${esc(b.file || '')}</span>
        ${pg ? `<span class="act"><button class="mini" data-copy>copy</button><button class="mini run" data-run>&#9654; run</button></span>` : ''}</div>
      <textarea class="code" data-code spellcheck="false">${esc(b.code)}</textarea>
      ${pg ? `<div class="io">${inputs}<button class="mini run" data-run>&#9654; run</button></div><div class="out" data-out>run it</div>` : ''}
    </div>
    ${b.caption ? `<p class="cap">${esc(b.caption)}</p>` : ''}
  </div></section>`;
};

const terminal = (b) => `<section class="beat"><div class="wrap">
  <div class="panel term r" data-terminal>
    <div class="top"><i></i><i></i><i></i><span class="fn">${esc(b.title || '')}</span>
      <span class="act"><button class="mini" data-replay>&#8635; replay</button></span></div>
    <div class="termbody" data-termbody></div>
    <script type="application/json" data-lines>${JSON.stringify(b.lines || [])}</script>
  </div>
  ${b.caption ? `<p class="cap">${esc(b.caption)}</p>` : ''}
</div></section>`;

const graph = (b) => `<section class="beat"><div class="wrap">
  <div class="panel r" data-graph data-center="${esc(b.center)}" data-nodes='${esc(JSON.stringify(b.nodes || []))}'>
    <div class="graphwrap"><svg data-svg viewBox="0 0 700 300" aria-label="dependency graph"></svg></div>
    <div class="io"><button class="mini run" data-pull>&#9888; unpublish ${esc(b.center)}</button><button class="mini" data-reset>reset</button>
      <span class="gstatus" data-status>all green</span></div>
  </div>
  ${b.caption ? `<p class="cap">${esc(b.caption)}</p>` : ''}
</div></section>`;

const stats = (b) => `<section class="beat"><div class="wrap"><div class="stats r">
  ${(b.items || []).map((s) => `<div class="stat"><b data-to="${Number(s.to)}">0</b><span>${esc(s.label)}</span></div>`).join('')}
</div></div></section>`;

const quote = (b) => `<section class="beat"><div class="wrap">
  <blockquote class="r">${esc(b.text)}${b.cite ? `<cite>${esc(b.cite)}</cite>` : ''}</blockquote>
</div></section>`;

const PLATFORM = { x: 'X', hn: 'Y', gh: '&#9679;', npm: 'n', web: '&#9632;' };
const embeds = (b) => `<section class="beat"><div class="wrap">
  ${b.heading ? `<h4 class="lbl r">${esc(b.heading)}</h4>` : ''}
  <div class="embeds r">
    ${(b.items || []).map((e) => `<a class="embed e-${esc(e.platform)}" href="${esc(e.url)}" target="_blank" rel="noopener">
      <div class="eh"><span class="logo">${PLATFORM[e.platform] || '&#9632;'}</span> ${esc(e.meta || e.platform)}</div>
      <div class="txt">${esc(e.title)}</div>
    </a>`).join('')}
  </div>
</div></section>`;

const RENDERERS = { prose, code, terminal, graph, stats, quote, embeds };

export function renderBeat(b) {
  const fn = RENDERERS[b.type];
  if (!fn) throw new Error('unknown beat type: ' + b.type);
  return fn(b);
}
