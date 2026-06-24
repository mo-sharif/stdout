import vm from 'node:vm';
import { chatJSON } from './llm.mjs';
import { VERIFY_MODEL } from './config.mjs';

export function collectClaims(story) {
  const text = (story.beats || [])
    .flatMap((b) => (b.blocks || []).filter((x) => x.type === 'prose').map((x) => x.html))
    .join(' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 25);
}
export function runCodeBlocks(story) {
  const blocks = (story.beats || [])
    .flatMap((b) => b.blocks || [])
    .filter((x) => x.type === 'code' && (x.lang === 'js' || /^(?:function|const|let|var|module)/.test(x.code || '')));
  return blocks.map((b) => {
    try { vm.runInNewContext(b.code, {}, { timeout: 2000 }); return { ok: true, detail: 'ran' }; }
    catch (e) { return { ok: false, detail: String(e.message) }; }
  });
}
export async function verify(story, bundle) {
  const claims = collectClaims(story);
  const sourceText = bundle.sources.map((s) => s.text).join('\n\n').slice(0, 12000);
  const messages = [
    { role: 'system', content: 'You are a strict fact-checker. For each claim, decide if it is SUPPORTED by the provided sources. If the sources do not clearly support it, mark it unsupported. Reply JSON only.' },
    { role: 'user', content: `SOURCES:\n${sourceText || '(none)'}\n\nCLAIMS:\n${claims.map((c, i) => `${i}. ${c}`).join('\n')}\n\nReply JSON: {"results":[{"i":0,"supported":true}]}` },
  ];
  let results = [];
  try { results = (await chatJSON(messages, { model: VERIFY_MODEL })).results || []; } catch { /* treat as unknown */ }
  const supportedIdx = new Set(results.filter((r) => r.supported).map((r) => r.i));
  const claimReport = claims.map((text, i) => ({ text, supported: supportedIdx.has(i), sourceUrl: null }));
  const unsupported = claimReport.filter((c) => !c.supported).map((c) => c.text);
  const code = runCodeBlocks(story);
  const codeOk = code.every((c) => c.ok);
  const ratio = claims.length ? (claims.length - unsupported.length) / claims.length : 1;
  return { passed: ratio >= 0.8 && codeOk, claims: claimReport, unsupported, code };
}
