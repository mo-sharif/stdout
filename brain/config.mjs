export const OLLAMA_BASE = process.env.OLLAMA_BASE || "http://localhost:11434";
export const BRAIN_MODEL = process.env.BRAIN_MODEL || "granite4.1:8b-q5_K_M";   // editorial/writer: fast, grounded, fits the P100's 16GB on-GPU
export const VERIFY_MODEL = process.env.VERIFY_MODEL || "qwen3.6:35b-a3b-q4_K_M"; // accuracy gate: deeper reasoning to catch unsupported claims
export const UA = "stdout-brain/1.0 (+https://github.com/mo-sharif/stdout)";
