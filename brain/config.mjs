export const OLLAMA_BASE = process.env.OLLAMA_BASE || "http://localhost:11434";
export const BRAIN_MODEL = process.env.BRAIN_MODEL || "granite4.1:8b-q5_K_M";   // editorial/writer: fast, grounded, fits the P100's 16GB on-GPU
export const VERIFY_MODEL = process.env.VERIFY_MODEL || "qwen3.6:35b-a3b-q4_K_M"; // accuracy gate: deeper reasoning to catch unsupported claims
export const UA = "stdout-brain/1.0 (+https://github.com/mo-sharif/stdout)";

// keep a warmed model resident across the run so a slow cold reload never lands on
// the critical path (a cold load on the contended GPU box can exceed 5 min).
export const KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || "30m";
// inactivity timeout for the Ollama request (node:http, not fetch): resets on any
// socket activity, so it tolerates a long cold load + a slow CPU-offloaded generation
// on the contended box and only trips on a genuine stall. 20 min is generous headroom.
export const REQUEST_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 1200000;
// spacing between chatJSON retries so a transient blip gets a moment to recover.
export const RETRY_BACKOFF_MS = Number(process.env.OLLAMA_RETRY_BACKOFF_MS) || 3000;
