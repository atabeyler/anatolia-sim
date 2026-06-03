export type LangCode = 'tr' | 'en' | 'de' | 'fr' | 'ar';

export type TranslationMap = Partial<Record<LangCode, string>> & {
  tr?: string;
  en?: string;
};

export function text(lang: LangCode, values: TranslationMap): string {
  return values[lang] ?? values.en ?? values.tr ?? '';
}

const CAUSE_TR: Record<string, string> = {
  starvation: 'açlık',
  dehydration: 'susuzluk',
  old_age: 'yaşlılık',
  predator: 'yırtıcı hayvan',
  genetic_disease: 'genetik hastalık',
  infection: 'enfeksiyon',
  trauma: 'travma',
  birth_complications: 'doğum komplikasyonu',
  conflict: 'çatışma',
  unknown: 'bilinmeyen neden',
};

function replaceByMap(source: string, map: Record<string, string>) {
  let out = source;
  for (const [needle, replacement] of Object.entries(map)) {
    out = out.split(needle).join(replacement);
  }
  return out;
}

export function translateEventDescription(desc: string, lang: LangCode, event?: any): string {
  if (!desc) return '';
  if (lang !== 'tr') return desc;

  const name = event?.data?.name ?? event?.data?.individual_name ?? event?.data?.individual?.name ?? null;
  return desc
    .replace(/^(.+) died: (.+)$/, (_: string, person: string, cause: string) =>
      `${person} öldü: ${CAUSE_TR[cause] ?? cause.replace(/_/g, ' ')}`)
    .replace(/^Born: (.+) \((.+) & (.+)\)$/, (_: string, bornName: string, p1: string, p2: string) =>
      `Doğdu: ${bornName} (${p1} & ${p2})`)
    .replace(/^Born: (.+)$/, (_: string, bornName: string) => `Doğdu: ${bornName}`)
    .replace('New individual born', 'Yeni birey doğdu')
    .replace('Individual died: starvation', 'Birey açlıktan öldü')
    .replace('Individual died: dehydration', 'Birey susuzluktan öldü')
    .replace('Individual died: old_age', 'Birey yaşlılıktan öldü')
    .replace('Individual died: predator', 'Birey yırtıcı tarafından öldürüldü')
    .replace(/Individual died: (.+)/, (_: string, cause: string) => `Birey öldü: ${CAUSE_TR[cause] ?? cause.replace(/_/g, ' ')}`)
    .replace(/(.+) language stage advanced to (.+)/, (_: string, person: string, stage: string) =>
      `${person} dil aşamasını ${stage} seviyesine yükseltti`)
    .replace(/Technology discovered: fire making/i, 'Teknoloji keşfedildi: Ateş Yakma')
    .replace(/Technology discovered: water container/i, 'Teknoloji keşfedildi: Su Kabı')
    .replace(/Technology discovered: fishing/i, 'Teknoloji keşfedildi: Balıkçılık')
    .replace(/Technology discovered: foraging/i, 'Teknoloji keşfedildi: Toplayıcılık')
    .replace(/Technology discovered: stone_tools/i, 'Teknoloji keşfedildi: Taş Aletler')
    .replace(/Technology discovered: (.+)/, (_: string, tech: string) => `Teknoloji keşfedildi: ${tech.replace(/_/g, ' ')}`)
    .replace(/Culture event: (.+)/, (_: string, value: string) => `Kültür olayı: ${value.replace(/_/g, ' ')}`)
    .replace(/Art event: (.+)/, (_: string, value: string) => `Sanat olayı: ${value.replace(/_/g, ' ')}`)
    .replace(/Astronomy event: (.+)/, (_: string, value: string) => `Astronomi olayı: ${value.replace(/_/g, ' ')}`)
    .replace(/Architecture event: (.+)/, (_: string, value: string) => `Mimari olay: ${value.replace(/_/g, ' ')}`)
    .replace(/Law event: (.+)/, (_: string, value: string) => `Hukuk olayı: ${value.replace(/_/g, ' ')}`)
    .replace(/Microbiome event: (.+)/, (_: string, value: string) => `Mikrobiyom olayı: ${value.replace(/_/g, ' ')}`)
    .replace(/Epigenetics event: (.+)/, (_: string, value: string) => `Epigenetik olay: ${value.replace(/_/g, ' ')}`)
    .replace('A hollow bone with finger holes produces musical tones', 'Parmak delikli oyuk bir kemik, müzikal sesler üretir')
    .replace('Named star constellations guide navigation', 'Adlandırılmış yıldız takımyıldızları yön bulmaya yardım eder')
    .replace('The moon turns blood red — a lunar eclipse', 'Ay kan kırmızısına döner — ay tutulması')
    .replace('The sun is obscured — a solar eclipse', 'Güneş görünmez olur — güneş tutulması')
    .replace(/killed (\d+) individuals/, (_: string, count: string) => `${count} bireyi öldürdü`);
}

export function translateEventType(type: string, lang: LangCode): string {
  const key = String(type ?? '').toLowerCase();
  const labels: Record<string, TranslationMap> = {
    birth: { tr: 'doğum', en: 'birth' },
    death: { tr: 'ölüm', en: 'death' },
    technology: { tr: 'teknoloji', en: 'technology' },
    language: { tr: 'dil', en: 'language' },
    discovery: { tr: 'keşif', en: 'discovery' },
    disaster: { tr: 'afet', en: 'disaster' },
    belief: { tr: 'inanç', en: 'belief' },
    culture: { tr: 'kültür', en: 'culture' },
    art: { tr: 'sanat', en: 'art' },
    astronomy: { tr: 'astronomi', en: 'astronomy' },
    architecture: { tr: 'mimari', en: 'architecture' },
    law: { tr: 'hukuk', en: 'law' },
    microbiome: { tr: 'mikrobiyom', en: 'microbiome' },
    epigenetics: { tr: 'epigenetik', en: 'epigenetics' },
    epidemic: { tr: 'salgın', en: 'epidemic' },
    ritual: { tr: 'ritüel', en: 'ritual' },
    trade: { tr: 'ticaret', en: 'trade' },
  };

  for (const [needle, values] of Object.entries(labels)) {
    if (key.includes(needle)) return text(lang, values);
  }
  return type || '';
}

export function translateWords(lang: LangCode, value: string, map: TranslationMap): string {
  return text(lang, { en: value, ...map });
}

export function makeDictionaryTranslator<T extends Record<string, TranslationMap>>(lang: LangCode, dict: T) {
  return (key: keyof T) => text(lang, dict[key as string]);
}
