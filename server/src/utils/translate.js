const TRANSLATE_ENDPOINTS = [
  'https://translate.fedilab.app/translate',
  'https://translate.cutie.dating/translate',
];

const translationCache = new Map();

async function fetchWithTimeout(url, options, timeoutMs = 6500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function translateText({ text, source = 'auto', target }) {
  const cleanText = String(text ?? '').trim();
  const cleanTarget = String(target ?? '').trim();
  if (!cleanText) return '';
  if (!cleanTarget) return cleanText;
  if (source === cleanTarget) return cleanText;

  const cacheKey = `${source}|${cleanTarget}|${cleanText}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

  let lastError = null;

  for (const endpoint of TRANSLATE_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: cleanText,
          source,
          target: cleanTarget,
          format: 'text',
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        lastError = new Error(body?.error || `Translate error (${response.status})`);
        continue;
      }

      const translatedText = Array.isArray(body?.translatedText)
        ? body.translatedText.join('\n')
        : String(body?.translatedText ?? '').trim();

      if (translatedText) {
        translationCache.set(cacheKey, translatedText);
        return translatedText;
      }
      lastError = new Error('Empty translation response');
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) console.warn('translateText fallback:', lastError.message);
  translationCache.set(cacheKey, cleanText);
  return cleanText;
}

