import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// The cloned-voice server (chatterbox-tts, Kokoro-compatible) — localhost on the box,
// or a tunneled localhost for local test renders.
const TTS_BASE = (process.env.TTS_BASE_URL || 'http://127.0.0.1:8880').replace(/\/$/, '');

// Strip anything that sounds bad read aloud. Dev-story narration comes from verified
// prose (rarely a URL), but keep the same guard the ViralVault studio uses.
const URL_RE = "(?:https?:\\/\\/\\S+|www\\.\\S+|[a-z0-9][a-z0-9-]*\\.(?:com|tech|io|dev|ai|org|net|app|co|news|gg|xyz)\\b(?:\\/\\S*)?)";
export function speakable(text) {
  return String(text || '')
    .replace(new RegExp("\\b(?:visit|head to|go to|check out|see|at|on)\\s+" + URL_RE, 'gi'), '')
    .replace(new RegExp(URL_RE, 'gi'), '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function synth(text) {
  const res = await fetch(`${TTS_BASE}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'kokoro', input: text, voice: 'af_heart', response_format: 'wav' }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return Buffer.from(await res.arrayBuffer());
}

// Minimal PCM WAV duration, tolerant of streaming placeholder data sizes.
export function wavDurationSec(buf) {
  if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF') return null;
  const channels = buf.readUInt16LE(22);
  const sampleRate = buf.readUInt32LE(24);
  const bits = buf.readUInt16LE(34);
  const byteRate = sampleRate * channels * (bits / 8);
  if (!byteRate) return null;
  let off = 12;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const declared = buf.readUInt32LE(off + 4);
    if (id === 'data') {
      const avail = buf.length - (off + 8);
      const size = declared === 0 || declared === 0xffffffff || declared > avail ? avail : declared;
      return size / byteRate;
    }
    if (declared <= 0 || off + 8 + declared > buf.length) break;
    off += 8 + declared + (declared % 2);
  }
  return null;
}

// Synthesize narration for every segment -> WAVs in audioDir.
// Returns [{ id, file, duration }] (file is null for segments with no spoken text).
export async function buildVoiceover(script, audioDir) {
  await mkdir(audioDir, { recursive: true });
  const out = [];
  for (const seg of script.segments) {
    const text = speakable(seg.narration || '');
    if (!text) { out.push({ id: seg.id, file: null, duration: 1.2 }); continue; }
    const wav = await synth(text);
    const file = `seg-${seg.id}.wav`;
    await writeFile(join(audioDir, file), wav);
    out.push({ id: seg.id, file, duration: wavDurationSec(wav) || 2 });
  }
  return out;
}
