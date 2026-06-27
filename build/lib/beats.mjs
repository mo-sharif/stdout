import { esc } from './util.mjs';

const PLATFORM = { x: 'X', hn: 'Y', gh: '&#9679;', npm: 'n', web: '&#9632;' };

// --- blocks: each returns inner HTML (no section wrapper) ---
const prose = (b) => b.html || '';

const code = (b) => {
  const inputs = (b.inputs || []).map((i) =>
    `<label>${esc(i.name)}</label><input data-arg="${esc(i.name)}" value="${esc(i.value)}"${i.width ? ` style="width:${esc(i.width)}"` : ''}>`).join('');
  const pg = !!b.playground;
  const actions = pg ? `
      <span class="act"><button class="mini" data-copy>copy</button><button class="mini run" data-run>&#9654; run</button></span>` : '';
  const controls = pg ? `
    <div class="io">${inputs}<button class="mini run" data-run>&#9654; run</button></div><div class="out" data-out>run it</div>` : '';
  return `<div class="panel"${pg ? ' data-playground' : ''}>
    <div class="top"><i></i><i></i><i></i><span class="fn">${esc(b.file || '')}</span>${actions}</div>
    <textarea class="code" data-code spellcheck="false">${esc(b.code)}</textarea>${controls}
  </div>${b.caption ? `<p class="cap">${esc(b.caption)}</p>` : ''}`;
};

const terminal = (b) => `<div class="panel term" data-terminal>
    <div class="top"><i></i><i></i><i></i><span class="fn">${esc(b.title || '')}</span>
      <span class="act"><button class="mini" data-replay>&#8635; replay</button></span></div>
    <div class="termbody" data-termbody></div>
    <script type="application/json" data-lines>${JSON.stringify(b.lines || [])}</script>
  </div>${b.caption ? `<p class="cap">${esc(b.caption)}</p>` : ''}`;

const graph = (b) => `<div class="panel" data-graph data-center="${esc(b.center)}" data-nodes='${esc(JSON.stringify(b.nodes || []))}'>
    <div class="graphwrap"><svg data-svg viewBox="0 0 700 300" aria-label="dependency graph"></svg></div>
    <div class="io"><button class="mini run" data-pull>&#9888; unpublish ${esc(b.center)}</button><button class="mini" data-reset>reset</button>
      <span class="gstatus" data-status>all green</span></div>
  </div>${b.caption ? `<p class="cap">${esc(b.caption)}</p>` : ''}`;

const stats = (b) => `<div class="stats">${(b.items || []).map((s) =>
  `<div class="stat"><b data-to="${Number(s.to)}">0</b><span>${esc(s.label)}</span></div>`).join('')}</div>`;

const quote = (b) => `<blockquote>${esc(b.text)}${b.cite ? `<cite>${esc(b.cite)}</cite>` : ''}</blockquote>`;

const embeds = (b) => {
  const heading = b.heading ? `<h4 class="lbl">${esc(b.heading)}</h4>` : '';
  const items = (b.items || []).map((e) => `<a class="embed e-${esc(e.platform)}" href="${esc(e.url)}" target="_blank" rel="noopener">
      <div class="eh"><span class="logo">${PLATFORM[e.platform] || '&#9632;'}</span> ${esc(e.meta || e.platform)}</div>
      <div class="txt">${esc(e.title)}</div>${e.note ? `<div class="stat2">${esc(e.note)}</div>` : ''}
    </a>`).join('');
  return `${heading}<div class="embeds">${items}</div>`;
};

const BLOCKS = { prose, code, terminal, graph, stats, quote, embeds };

export function renderBlock(b) {
  const fn = BLOCKS[b.type];
  if (!fn) throw new Error('unknown block type: ' + b.type);
  return fn(b);
}

// a beat is one numbered section that reveals as a block and holds several blocks
export function renderBeat(beat) {
  const head = `${beat.num ? `<div class="num">${esc(beat.num)}</div>` : ''}${beat.heading ? `<h2>${esc(beat.heading)}</h2>` : ''}`;
  const blocks = (beat.blocks || []).map(renderBlock).join('\n');
  return `<section class="beat"><div class="wrap reveal">${head}${blocks}</div></section>`;
}
