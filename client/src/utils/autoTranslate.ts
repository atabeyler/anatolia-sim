import { useEffect, useState } from 'react';
import type { LangCode } from './i18n';

const cache = new Map<string, string>();

async function translateText(text: string, target: LangCode, source: LangCode = 'en') {
  const cleanText = String(text ?? '').trim();
  if (!cleanText) return '';
  if (target === source) return cleanText;

  const key = `${source}|${target}|${cleanText}`;
  if (cache.has(key)) return cache.get(key) ?? cleanText;

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, source, target }),
    });
    const body = await response.json().catch(() => ({}));
    const translated = String(body?.translatedText ?? '').trim();
    const finalText = translated || cleanText;
    cache.set(key, finalText);
    return finalText;
  } catch {
    cache.set(key, cleanText);
    return cleanText;
  }
}

export function useAutoTranslation(text: string, target: LangCode, source: LangCode = 'en') {
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    let cancelled = false;
    const cleanText = String(text ?? '');

    if (!cleanText.trim()) {
      setTranslated('');
      return;
    }

    if (target === source) {
      setTranslated(cleanText);
      return;
    }

    const cached = cache.get(`${source}|${target}|${cleanText.trim()}`);
    if (cached) {
      setTranslated(cached);
      return;
    }

    void translateText(cleanText, target, source).then(result => {
      if (!cancelled) setTranslated(result);
    });

    return () => {
      cancelled = true;
    };
  }, [text, target, source]);

  return translated;
}

