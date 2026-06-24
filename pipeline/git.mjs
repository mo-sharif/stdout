import { execFileSync } from 'node:child_process';

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();
export const git = (...args) => run('git', args);

export function checkoutNew(branch) { git('checkout', '-B', branch); }
export function commitAll(message) { git('add', '-A'); git('commit', '-m', message); }
export function push(branch) { git('push', '-u', 'origin', branch, '--force-with-lease'); }

// Open a PR via the REST API so no `gh` binary is required on the runner.
// GITHUB_REPOSITORY + GH_TOKEN/GITHUB_TOKEN are provided by GitHub Actions.
export async function openPR({ title, body, head, base = 'main',
  repo = process.env.GITHUB_REPOSITORY, token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN }) {
  const res = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'stdout-bot',
    },
    body: JSON.stringify({ title, body, head, base }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PR create failed ${res.status}: ${json.message || ''}`);
  return json.html_url;
}
