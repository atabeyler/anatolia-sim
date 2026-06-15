import { describe, it, expect } from 'vitest';
import { text, translateSeason, translateEventDescription, translateEventType } from './i18n';

// ── text() ──────────────────────────────────────────────────────────────────

describe('text()', () => {
  it('istenen dil varsa onu döndürür', () => {
    expect(text('tr', { tr: 'Merhaba', en: 'Hello' })).toBe('Merhaba');
  });

  it('istenen dil yoksa "en" döndürür', () => {
    expect(text('de', { en: 'Hello', tr: 'Merhaba' })).toBe('Hello');
  });

  it('ne "en" ne istenen dil yoksa "tr" döndürür', () => {
    expect(text('de', { tr: 'Merhaba' })).toBe('Merhaba');
  });

  it('hiçbir değer yoksa boş string döndürür', () => {
    expect(text('fr', {})).toBe('');
  });
});

// ── translateSeason() ───────────────────────────────────────────────────────

describe('translateSeason()', () => {
  it('"spring" → "İlkbahar" (Türkçe)', () => {
    expect(translateSeason('spring', 'tr')).toBe('İlkbahar');
  });

  it('"summer" → "Yaz" (Türkçe)', () => {
    expect(translateSeason('summer', 'tr')).toBe('Yaz');
  });

  it('"autumn" → "Sonbahar" (Türkçe)', () => {
    expect(translateSeason('autumn', 'tr')).toBe('Sonbahar');
  });

  it('"winter" → "Winter" (İngilizce — çeviri yok)', () => {
    expect(translateSeason('winter', 'en')).toBe('Winter');
  });

  it('boş string → "—" döndürür', () => {
    expect(translateSeason('', 'tr')).toBe('—');
  });

  it('büyük/küçük harf farkı gözetmez', () => {
    expect(translateSeason('SPRING', 'tr')).toBe('İlkbahar');
  });
});

// ── translateEventDescription() ─────────────────────────────────────────────

describe('translateEventDescription() — Türkçe', () => {
  it('ölüm olayı: "X died: starvation" → Türkçe', () => {
    const result = translateEventDescription('Karo died: starvation', 'tr');
    expect(result).toContain('öldü');
    expect(result).toContain('açlık');
  });

  it('doğum olayı: "Born: Name (Anne & Baba)" → Türkçe', () => {
    const result = translateEventDescription('Born: Metu (Karo & Ro)', 'tr');
    expect(result).toContain('Doğdu');
  });

  it('kesin eşleşme: animizm açıklaması → Türkçe', () => {
    const result = translateEventDescription(
      'Spirits inhabit all living things and natural features', 'tr'
    );
    expect(result).toContain('Ruhlar');
  });

  it('teknoloji keşfi: "Technology discovered: pottery" → Türkçe', () => {
    const result = translateEventDescription('Technology discovered: pottery', 'tr');
    expect(result).toContain('Çömlekçilik');
  });

  it('salgın: "A malaria like outbreak begins" → Türkçe', () => {
    const result = translateEventDescription('A malaria like outbreak begins', 'tr');
    expect(result).toContain('salgını');
  });

  it('"en" dilinde açıklama değişmeden döner', () => {
    const desc = 'Spirits inhabit all living things and natural features';
    expect(translateEventDescription(desc, 'en')).toBe(desc);
  });

  it('boş string boş string döndürür', () => {
    expect(translateEventDescription('', 'tr')).toBe('');
  });
});

// ── translateEventType() ────────────────────────────────────────────────────

describe('translateEventType()', () => {
  it('"birth" → "doğum" (Türkçe)', () => {
    expect(translateEventType('birth', 'tr')).toBe('doğum');
  });

  it('"technology" → "teknoloji" (Türkçe)', () => {
    expect(translateEventType('technology', 'tr')).toBe('teknoloji');
  });

  it('"belief" → "belief" (İngilizce — çeviri aynı)', () => {
    expect(translateEventType('belief', 'en')).toBe('belief');
  });

  it('bilinmeyen tip olduğu gibi döner', () => {
    expect(translateEventType('unknown_custom_type', 'tr')).toBe('unknown_custom_type');
  });

  it('boş string boş string döndürür', () => {
    expect(translateEventType('', 'tr')).toBe('');
  });
});
