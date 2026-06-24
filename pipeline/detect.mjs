// Parse the brain's final stdout line into a structured result.
//   pass: "published candidate -> content/coding/the-slug.json"
//   fail: "held for review -> drafts/the-slug.json (3 unsupported, 0 shape errors)"
export function parseBrainResult(stdout) {
  const lines = String(stdout).trim().split('\n').filter(Boolean);
  const line = lines[lines.length - 1] || '';
  let m = line.match(/^published candidate -> (content\/([^/]+)\/(.+)\.json)\s*$/);
  if (m) return { ok: true, relPath: m[1], category: m[2], slug: m[3], unsupported: 0 };
  m = line.match(/^held for review -> (drafts\/(.+)\.json)(?:\s*\((\d+) unsupported)?/);
  if (m) return { ok: false, relPath: m[1], category: null, slug: m[2], unsupported: m[3] ? Number(m[3]) : 0 };
  return { ok: false, relPath: null, category: null, slug: null, unsupported: 0, unparsed: line };
}
