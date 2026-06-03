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
    .replace(/Technology discovered: (.+)/, (_: string, tech: string) => `Teknoloji keşfedildi: ${tech.replace(/_/g, ' ')}`)
    .replace(/Culture event: (.+)/, (_: string, value: string) => `Kültür olayı: ${value.replace(/_/g, ' ')}`)
    .replace(/Art event: (.+)/, (_: string, value: string) => `Sanat olayı: ${value.replace(/_/g, ' ')}`)
    .replace(/Astronomy event: (.+)/, (_: string, value: string) => `Astronomi olayı: ${value.replace(/_/g, ' ')}`)
    .replace(/Architecture event: (.+)/, (_: string, value: string) => `Mimari olay: ${value.replace(/_/g, ' ')}`)
    .replace(/Law event: (.+)/, (_: string, value: string) => `Hukuk olayı: ${value.replace(/_/g, ' ')}`)
    .replace(/Microbiome event: (.+)/, (_: string, value: string) => `Mikrobiyom olayı: ${value.replace(/_/g, ' ')}`)
    .replace(/Epigenetics event: (.+)/, (_: string, value: string) => `Epigenetik olay: ${value.replace(/_/g, ' ')}`)
    .replace(/killed (\d+) individuals/, (_: string, count: string) => `${count} bireyi öldürdü`);
}

export function translateWords(lang: LangCode, value: string, map: TranslationMap): string {
  return text(lang, { en: value, ...map });
}

export function makeDictionaryTranslator<T extends Record<string, TranslationMap>>(lang: LangCode, dict: T) {
  return (key: keyof T) => text(lang, dict[key as string]);
}

