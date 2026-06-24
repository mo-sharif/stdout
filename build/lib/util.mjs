const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => MAP[c]);
export const fmtInt = (n) => Number(n).toLocaleString('en-US');
