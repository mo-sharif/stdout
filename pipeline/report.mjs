const BASE = 'https://mo-sharif.github.io/stdout';

export function branchName(result) {
  return (result.ok ? 'story/' : 'draft/') + result.slug;
}

export function previewUrl(result, base = BASE) {
  return result.ok ? `${base}/${result.category}/${result.slug}/` : null;
}

export function prTitle(story, result) {
  return result.ok ? `story: ${story.title}` : `held: ${story.title} (failed verify)`;
}

export function prBody(story, verify = {}, preview = null) {
  const unsupported = verify.unsupported || [];
  const shapeErrors = verify.shapeErrors || [];
  const beats = (story.beats || []).map((b) => `${b.num}. ${b.heading}`).join('\n') || '_none_';
  const sources = (story.sources || []).map((s) => `- [${s.title}](${s.url}) (${s.platform})`).join('\n') || '_none_';
  const lines = [
    `**${story.category}** · ~${story.readMinutes ?? '?'} min read · verify passed: **${verify.passed ? 'yes' : 'no'}**`,
    '', '## Hook', story.hook || '_none_',
    '', '## Beats', beats,
    '', '## Sources', sources,
    '', '## Accuracy check',
    `- unsupported claims: **${unsupported.length}**`,
    `- shape errors: **${shapeErrors.length}**`,
  ];
  for (const u of unsupported) lines.push(`  - ${typeof u === 'string' ? u : (u.claim || u.text || JSON.stringify(u))}`);
  if (preview) lines.push('', '## Preview', `Once merged, live at ${preview}`);
  lines.push('', '---', '_Written and verified autonomously by the stdout story brain on local hardware. Review for accuracy, then merge to publish._');
  return lines.join('\n');
}
