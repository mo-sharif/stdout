import { socialText } from './post.mjs';

export async function post(p, c) {
  const res = await fetch(`https://api.telegram.org/bot${c.token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: c.chatId, text: socialText(p, 3900) }),
  });
  if (!res.ok) throw new Error(`telegram ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return { ok: true, id: j.result?.message_id };
}
