import { staticFile } from 'remotion';

// Terminal palette — matches the site's design tokens.
export const C = {
  bg: '#0a0e0c', panel: '#0e1512', panel2: '#0b110e',
  line: '#1d2a23', lineBright: '#2d4034',
  text: '#c9d6cd', dim: '#7c8d83', faint: '#46564d',
  green: '#46d17e', greenBright: '#62f0a0',
  amber: '#e3a93a', cyan: '#3cc7d4', red: '#e85d5d', magenta: '#c977e0', blue: '#5b94e6',
};

export const CAT_ACCENT: Record<string, string> = {
  ai: '#c977e0', coding: '#46d17e', leadership: '#e3a93a',
  tech: '#3cc7d4', career: '#5b94e6', security: '#e85d5d',
};

export const MONO = "'IBM Plex Mono', ui-monospace, Menlo, monospace";

export const fontCss = `
@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:400;src:url('${staticFile('fonts/ibm-plex-mono-latin-400-normal.woff2')}') format('woff2');font-display:block;}
@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:600;src:url('${staticFile('fonts/ibm-plex-mono-latin-600-normal.woff2')}') format('woff2');font-display:block;}
@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:700;src:url('${staticFile('fonts/ibm-plex-mono-latin-700-normal.woff2')}') format('woff2');font-display:block;}
`;
