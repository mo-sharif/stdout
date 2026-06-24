import { esc } from './util.mjs';

export function page({ title, body, depth = 0, desc = '' }) {
  const up = depth === 0 ? './' : '../'.repeat(depth);
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${desc ? `<meta name="description" content="${esc(desc)}">` : ''}
<link rel="stylesheet" href="${up}assets/css/site.css">
</head><body>
<div id="bar"></div>
${body}
<script type="module" src="${up}assets/js/kit.js"></script>
</body></html>`;
}
