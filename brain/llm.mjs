import { OLLAMA_BASE, BRAIN_MODEL } from './config.mjs';

export function extractJSON(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : text;
  const start = body.search(/[[{]/);
  if (start === -1) throw new Error('no JSON found in model output');
  const open = body[start], close = open === '{' ? '}' : ']';
  let depth = 0, end = -1, inStr = false, esc = false;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) { end = i + 1; break; }
  }
  if (end === -1) throw new Error('unbalanced JSON in model output');
  return JSON.parse(body.slice(start, end));
}

export async function chat(messages, { model = BRAIN_MODEL, json = false, temperature = 0.4 } = {}) {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, options: { temperature }, ...(json ? { format: 'json' } : {}) }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message?.content ?? '';
}

export async function chatJSON(messages, opts = {}) {
  const attempts = opts.attempts ?? 3;
  let last;
  for (let i = 0; i < attempts; i++) {
    try { return extractJSON(await chat(messages, { ...opts, json: true })); }
    catch (e) { last = e; }
  }
  throw new Error(`chatJSON failed after ${attempts}: ${last?.message}`);
}
