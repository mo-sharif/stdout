import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia, renderStill } from '@remotion/renderer';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(ROOT, 'video/out');
await mkdir(outDir, { recursive: true });
const slug = process.argv[2] || 'sample';

console.log('bundling…');
const serveUrl = await bundle({ entryPoint: join(ROOT, 'video/remotion/index.ts'), publicDir: join(ROOT, 'docs/assets') });
const composition = await selectComposition({ serveUrl, id: 'StoryLandscape', inputProps: {} });
console.log(`rendering ${composition.durationInFrames} frames @ ${composition.fps}fps -> ${slug}-landscape.mp4`);

const output = join(outDir, `${slug}-landscape.mp4`);
let last = -1;
await renderMedia({
  serveUrl, composition, codec: 'h264', output, inputProps: {},
  onProgress: ({ progress }) => { const p = Math.floor(progress * 20) * 5; if (p > last) { last = p; console.log(`${p}%`); } },
});
console.log('wrote', output);

await renderStill({ serveUrl, composition, frame: 70, output: join(outDir, `${slug}-thumb.png`), inputProps: {}, overwrite: true });
console.log('wrote thumbnail');
