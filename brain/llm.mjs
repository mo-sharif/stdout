import { OLLAMA_BASE, BRAIN_MODEL, KEEP_ALIVE, REQUEST_TIMEOUT_MS, RETRY_BACKOFF_MS } from './config.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

export async function chat(messages, { model = BRAIN_MODEL, json = false, temperature = 0.4, keepAlive = KEEP_ALIVE, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  let res;
  try {
    res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false, keep_alive: keepAlive, options: { temperature }, ...(json ? { format: 'json' } : {}) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    // surface the real reason (ECONNREFUSED / TimeoutError / HeadersTimeout) instead of a bare "fetch failed"
    const reason = e?.cause?.code || e?.cause?.message || e?.message || String(e);
    throw new Error(`ollama chat (${model}) at ${OLLAMA_BASE} failed: ${reason}`);
  }
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message?.content ?? '';
}

export async function chatJSON(messages, opts = {}) {
  const attempts = opts.attempts ?? 3;
  const backoffMs = opts.backoffMs ?? RETRY_BACKOFF_MS;
  let last;
  for (let i = 0; i < attempts; i++) {
    try { return extractJSON(await chat(messages, { ...opts, json: true })); }
    catch (e) {
      last = e;
      if (i < attempts - 1 && backoffMs) await sleep(backoffMs * (i + 1));
    }
  }
  throw new Error(`chatJSON failed after ${attempts}: ${last?.message}`);
}
