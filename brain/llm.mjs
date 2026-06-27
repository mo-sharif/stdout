import { AI_BASE_URL, AI_API_KEY, BRAIN_MODEL, KEEP_ALIVE, REQUEST_TIMEOUT_MS, RETRY_BACKOFF_MS } from './config.mjs';

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

export async function chat(messages, { model = BRAIN_MODEL, json = false, temperature = 0.4, keepAlive = KEEP_ALIVE, timeoutMs = REQUEST_TIMEOUT_MS, baseUrl = AI_BASE_URL, apiKey = AI_API_KEY } = {}) {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (!apiKey && !/^https?:\/\/(127\.0\.0\.1|localhost)(?::|\/|$)/.test(cleanBase)) {
    throw new Error('AI_API_KEY or GEMINI_API_KEY is required for hosted LLM calls');
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${cleanBase}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        ...(cleanBase.includes('localhost') || cleanBase.includes('127.0.0.1') ? { keep_alive: keepAlive } : {}),
      }),
      signal: ctrl.signal,
    });
    const data = await res.text();
    if (!res.ok) throw new Error(`llm ${res.status}: ${data.slice(0, 200)}`);
    try { return JSON.parse(data).choices?.[0]?.message?.content ?? ''; }
    catch (e) { throw new Error(`bad JSON response: ${e.message}`); }
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`llm chat (${model}) at ${cleanBase} timed out after ${timeoutMs}ms`);
    throw new Error(`llm chat (${model}) at ${cleanBase} failed: ${e.code || e.message}`);
  } finally {
    clearTimeout(timer);
  }
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
