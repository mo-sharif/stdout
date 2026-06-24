import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia, renderStill } from '@remotion/renderer';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildScript } from './script.mjs';
import { buildTiming } from './timing.mjs';
import { buildPackage } from './package.mjs';
import { uploadVideo, uploadEnabled } from './upload.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const storyPath = args.find((a) => a.endsWith('.json'));
const DRY = args.includes('--dry');        // skip the (slow) render — just emit metadata + props
const DO_UPLOAD = args.includes('--upload');
if (!storyPath) {
  console.error('usage: node video/build.mjs content/<cat>/<slug>.json [--dry] [--upload]');
  process.exit(1);
}

// 1. verified story -> render-ready script/timing + YouTube metadata (all deterministic)
const story = JSON.parse(await readFile(join(ROOT, storyPath), 'utf8'));
const script = buildScript(story);
const timing = buildTiming(script);
const pkg = buildPackage(story, script, timing);

const outDir = join(ROOT, 'video/out', story.slug);
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'package.json'), JSON.stringify(pkg, null, 2));
await writeFile(join(outDir, 'render-props.json'), JSON.stringify({ story, script, timing }, null, 2));
console.log(`story: ${story.slug} · ${script.segments.length} segments · ${timing.total}s · ${pkg.chapters.length} chapters`);

// 2. render the terminal-aesthetic video for THIS story (inputProps override the sample defaults)
const mp4 = join(outDir, `${story.slug}-landscape.mp4`);
if (DRY) {
  console.log(`--dry: skipped render. metadata + props written to ${outDir}`);
} else {
  const inputProps = { story, script, timing };
  console.log('rendering…');
  const serveUrl = await bundle({ entryPoint: join(ROOT, 'video/remotion/index.ts'), publicDir: join(ROOT, 'docs/assets') });
  const composition = await selectComposition({ serveUrl, id: 'StoryLandscape', inputProps });
  let last = -1;
  await renderMedia({
    serveUrl, composition, codec: 'h264', outputLocation: mp4, inputProps,
    onProgress: ({ progress }) => { const p = Math.floor(progress * 20) * 5; if (p > last) { last = p; console.log(`${p}%`); } },
  });
  await renderStill({ serveUrl, composition, frame: 70, output: join(outDir, `${story.slug}-thumb.png`), inputProps, overwrite: true });
  console.log('rendered ->', mp4);
}

// 3. upload (private, review-first) — only with --upload AND creds present
if (DO_UPLOAD) {
  const res = await uploadVideo({ filePath: mp4, title: pkg.title, description: pkg.description, tags: pkg.tags, privacy: pkg.privacy });
  console.log('upload:', JSON.stringify(res, null, 2));
} else {
  console.log(uploadEnabled()
    ? 'upload ready — pass --upload to post privately to the channel'
    : 'upload: no creds (set YT_CLIENT_ID/SECRET/REFRESH_TOKEN, then pass --upload)');
}
