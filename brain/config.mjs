export const AI_BASE_URL = (
  process.env.AI_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  process.env.OLLAMA_BASE ||
  "https://generativelanguage.googleapis.com/v1beta/openai"
).replace(/\/$/, "");
export const AI_API_KEY = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "";
export const BRAIN_MODEL = process.env.BRAIN_MODEL || process.env.AI_MODEL || "gemini-3.5-flash";
export const VERIFY_MODEL = process.env.VERIFY_MODEL || process.env.AI_VERIFY_MODEL || process.env.AI_MODEL || "gemini-3.5-flash";
export const UA = "stdout-brain/1.0 (+https://github.com/mo-sharif/stdout)";

// Kept for older local Ollama runs; hosted providers ignore it.
export const KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || "30m";
export const REQUEST_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || process.env.OLLAMA_TIMEOUT_MS) || 300000;
// spacing between chatJSON retries so a transient blip gets a moment to recover.
export const RETRY_BACKOFF_MS = Number(process.env.AI_RETRY_BACKOFF_MS || process.env.OLLAMA_RETRY_BACKOFF_MS) || 3000;
