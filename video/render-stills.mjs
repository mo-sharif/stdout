import { bundle } from '@remotion/bundler';
import { selectComposition, renderStill } from '@remotion/renderer';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(ROOT, 'video/remotion/index.ts');
const outDir = join(ROOT, 'video/out/stills');
await mkdir(outDir, { recursive: true });

console.log('bundling…');
const serveUrl = await bundle({ entryPoint: entry, publicDir: join(ROOT, 'docs/assets') });
const compId = process.argv[3] || 'StoryLandscape';
const composition = await selectComposition({ serveUrl, id: compId, inputProps: {} });
console.log(`composition: ${composition.durationInFrames} frames @ ${composition.fps}fps (${composition.width}x${composition.height})`);

const frames = JSON.parse(process.argv[2] || '[150,600,1100,1380,2100,3250]');
for (const f of frames) {
  const frame = Math.min(f, composition.durationInFrames - 1);
  const output = join(outDir, `${compId}-${String(frame).padStart(4, '0')}.png`);
  await renderStill({ serveUrl, composition, frame, output, inputProps: {}, overwrite: true });
  console.log('wrote', output);
}
console.log('done');
