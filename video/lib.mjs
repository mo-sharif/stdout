// Shared pure helpers for the video pipeline.

export const WEB_BASE = 'https://mo-sharif.github.io/stdout';
export const webUrl = (story) => `${WEB_BASE}/${story.category}/${story.slug}/`;

// Strip a story's prose HTML down to plain narration text.
export function stripHtml(html = '') {
  return String(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|h[1-6]|li|div)>/gi, ' ') // block ends become spaces
    .replace(/<[^>]+>/g, '')                 // drop remaining tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
