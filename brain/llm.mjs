import http from 'node:http';
import https from 'node:https';
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

/**
 * POST /api/chat over node:http (NOT fetch). A non-streaming Ollama response
 * withholds HTTP headers until the whole generation finishes, and undici's
 * `fetch` aborts after a fixed 300s headersTimeout that cannot be raised without
 * the (uninstalled) undici package — so a slow cold load or a CPU-offloaded
 * generation on the GPU-contended box dies with UND_ERR_HEADERS_TIMEOUT.
 * node:http has no such cap; we bound it with an *inactivity* timeout instead,
 * which only fires on a genuine stall (no bytes for timeoutMs).
 */
export async function chat(messages, { model = BRAIN_MODEL, json = false, temperature = 0.4, keepAlive = KEEP_ALIVE, timeoutMs = REQUEST_TIMEOUT_MS, baseUrl = OLLAMA_BASE } = {}) {
  const payload = JSON.stringify({ model, messages, stream: false, keep_alive: keepAlive, options: { temperature, num_gpu: 99 }, ...(json ? { format: 'json' } : {}) });
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/api/chat`);
  const lib = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const fail = (reason) => reject(new Error(`ollama chat (${model}) at ${baseUrl} failed: ${reason}`));
    const req = lib.request(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) return fail(`ollama ${res.statusCode}: ${data.slice(0, 200)}`);
          try { resolve(JSON.parse(data).message?.content ?? ''); }
          catch (e) { fail(`bad JSON response: ${e.message}`); }
        });
      },
    );
    // Inactivity timeout (not a total cap): resets on socket activity, fires only
    // if the box sends nothing for timeoutMs — covers a long load + slow generation.
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`no response for ${timeoutMs}ms`)));
    req.on('error', (e) => fail(e.code || e.message));
    req.end(payload);
  });
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
