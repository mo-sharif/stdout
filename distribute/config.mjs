const env = process.env;

export const CREDS = {
  mastodon: { base: env.MASTODON_BASE, token: env.MASTODON_TOKEN },
  bluesky: { handle: env.BSKY_HANDLE, appPassword: env.BSKY_APP_PASSWORD },
  telegram: { token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID },
  discord: { webhook: env.DISCORD_WEBHOOK },
  devto: { apiKey: env.DEVTO_API_KEY },
  linkedin: { token: env.LINKEDIN_TOKEN, author: env.LINKEDIN_AUTHOR_URN },
};

export const REQUIRED = {
  mastodon: ['base', 'token'],
  bluesky: ['handle', 'appPassword'],
  telegram: ['token', 'chatId'],
  discord: ['webhook'],
  devto: ['apiKey'],
  linkedin: ['token', 'author'],
};

export function isEnabled(name) {
  const c = CREDS[name];
  return !!c && (REQUIRED[name] || []).every((k) => c[k]);
}
