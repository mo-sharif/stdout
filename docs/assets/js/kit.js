import { animate, scroll, inView } from './motion.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const safe = (fn) => { try { fn(); } catch (e) { console.error('kit:', e); } };

// Mark the document so CSS only hides .reveal blocks once the kit is live.
// If this module fails to load at all, .reveal stays visible (progressive enhancement).
document.documentElement.classList.add('kit-ready');

// reading progress
safe(() => { if ($('#bar')) scroll(animate('#bar', { scaleX: [0, 1] }, { ease: 'linear' })); });

// block reveals: smooth CSS transition via .in (also drives the .hl highlight swipe)
safe(() => { $$('.reveal').forEach((el) => inView(el, () => el.classList.add('in'), { margin: '-12% 0px' })); });

// stat count-ups
safe(() => {
  $$('.stat b[data-to]').forEach((el) => {
    inView(el, () => {
      const to = +el.dataset.to;
      animate(0, to, { duration: 1.4, ease: 'easeOut', onUpdate: (v) => { el.textContent = Math.round(v).toLocaleString(); } });
    }, { margin: '-15% 0px' });
  });
});

// card hover spring (plain listeners; no dependency on motion's hover export)
safe(() => {
  $$('.card').forEach((c) => {
    c.addEventListener('mouseenter', () => animate(c, { scale: 1.04 }, { type: 'spring', stiffness: 320, damping: 18 }));
    c.addEventListener('mouseleave', () => animate(c, { scale: 1 }, { type: 'spring', stiffness: 320, damping: 22 }));
  });
});

// live code playground
safe(() => {
  $$('[data-playground]').forEach((pg) => {
    const out = $('[data-out]', pg);
    const run = () => {
      const src = $('[data-code]', pg).value;
      const args = $$('[data-arg]', pg).map((a) => a.value);
      try {
        const fn = new Function(src + '; return leftpad;')();
        const r = String(fn(args[0], Number(args[1]), args[2]));
        out.textContent = `leftpad(${args.map((a) => JSON.stringify(a)).join(', ')})  →  "${r.replace(/ /g, '·')}"   (${r.length} chars)`;
      } catch (e) { out.textContent = String(e); }
    };
    $$('[data-run]', pg).forEach((b) => b.addEventListener('click', run));
    const copy = $('[data-copy]', pg);
    if (copy) copy.addEventListener('click', () => navigator.clipboard && navigator.clipboard.writeText($('[data-code]', pg).value));
  });
});

// terminal typewriter
safe(() => {
  $$('[data-terminal]').forEach((term) => {
    const lines = JSON.parse($('[data-lines]', term)?.textContent || '[]');
    const body = $('[data-termbody]', term);
    let timer, played = false;
    const play = () => {
      clearTimeout(timer); body.innerHTML = ''; let li = 0;
      const line = () => {
        if (li >= lines.length) { body.insertAdjacentHTML('beforeend', '<span class="cursor"></span>'); return; }
        const L = lines[li]; const row = document.createElement('div'); row.className = L.c || ''; body.appendChild(row);
        let ci = 0;
        const type = () => {
          if (ci <= L.t.length) { row.textContent = L.t.slice(0, ci); ci++; timer = setTimeout(type, 16); }
          else { li++; timer = setTimeout(line, 240); }
        };
        type();
      };
      line();
    };
    inView(term, () => { if (!played) { played = true; play(); } }, { margin: '-20% 0px' });
    const replay = $('[data-replay]', term);
    if (replay) replay.addEventListener('click', play);
  });
});

// dependency blast-radius graph
safe(() => {
  $$('[data-graph]').forEach((g) => {
    const center = g.dataset.center;
    const nodes = JSON.parse(g.dataset.nodes || '[]');
    const svg = $('[data-svg]', g);
    const cx = 350, cy = 150;
    let html = '';
    nodes.forEach((d, i) => { const a = (i / nodes.length) * Math.PI * 2; const x = cx + Math.cos(a) * 250, y = cy + Math.sin(a) * 110; html += `<line class="gline" data-l="${i}" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`; });
    nodes.forEach((d, i) => { const a = (i / nodes.length) * Math.PI * 2; const x = cx + Math.cos(a) * 250, y = cy + Math.sin(a) * 110; html += `<g class="gnode" data-n="${i}"><circle cx="${x}" cy="${y}" r="22" fill="rgba(67,224,160,.14)" stroke="#43e0a0"/><text x="${x}" y="${y + 4}" text-anchor="middle">${d}</text></g>`; });
    html += `<g class="gnode"><circle cx="${cx}" cy="${cy}" r="34" fill="rgba(55,225,255,.18)" stroke="#37e1ff"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" style="fill:#37e1ff">${center}</text></g>`;
    svg.innerHTML = html;
    const status = $('[data-status]', g);
    const pull = $('[data-pull]', g), reset = $('[data-reset]', g);
    if (pull) pull.addEventListener('click', () => {
      if (status) status.textContent = 'cascading failures...';
      nodes.forEach((d, i) => setTimeout(() => {
        g.querySelector(`[data-n="${i}"]`)?.classList.add('failed');
        g.querySelector(`[data-l="${i}"]`)?.classList.add('failed');
      }, 150 + i * 160));
      setTimeout(() => { if (status) { status.textContent = '✖ ' + nodes.length + ' builds failed'; status.style.color = 'var(--red)'; } }, 150 + nodes.length * 160 + 200);
    });
    if (reset) reset.addEventListener('click', () => {
      nodes.forEach((d, i) => { g.querySelector(`[data-n="${i}"]`)?.classList.remove('failed'); g.querySelector(`[data-l="${i}"]`)?.classList.remove('failed'); });
      if (status) { status.textContent = 'all green'; status.style.color = ''; }
    });
  });
});
