export const OLLAMA_BASE = process.env.OLLAMA_BASE || "http://localhost:11434";
export const BRAIN_MODEL = process.env.BRAIN_MODEL || "granite4.1:8b-q5_K_M";   // editorial/writer: fast, grounded, fits the P100's 16GB on-GPU
export const VERIFY_MODEL = process.env.VERIFY_MODEL || "qwen3.6:35b-a3b-q4_K_M"; // accuracy gate: deeper reasoning to catch unsupported claims
export const UA = "stdout-brain/1.0 (+https://github.com/mo-sharif/stdout)";

// keep a warmed model resident across the run so a slow cold reload never lands on
// the critical path (a cold load on the contended GPU box can exceed 5 min).
export const KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || "30m";
// overall per-request cap: a warm model answers in seconds, so this only catches true hangs.
export const REQUEST_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 600000;
// spacing between chatJSON retries so a transient blip gets a moment to recover.
export const RETRY_BACKOFF_MS = Number(process.env.OLLAMA_RETRY_BACKOFF_MS) || 3000;
