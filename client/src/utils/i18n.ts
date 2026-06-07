export type LangCode = 'tr' | 'en' | 'de' | 'fr' | 'ar';

export type TranslationMap = Partial<Record<LangCode, string>> & {
  tr?: string;
  en?: string;
};

export function text(lang: LangCode, values: TranslationMap): string {
  return values[lang] ?? values.en ?? values.tr ?? '';
}

const SEASON_LABELS: Record<string, TranslationMap> = {
  spring: { tr: 'İlkbahar', en: 'Spring', de: 'Frühling', fr: 'Printemps', ar: 'الربيع' },
  summer: { tr: 'Yaz', en: 'Summer', de: 'Sommer', fr: 'Été', ar: 'الصيف' },
  autumn: { tr: 'Sonbahar', en: 'Autumn', de: 'Herbst', fr: 'Automne', ar: 'الخريف' },
  fall:   { tr: 'Sonbahar', en: 'Fall',   de: 'Herbst', fr: 'Automne', ar: 'الخريف' },
  winter: { tr: 'Kış',      en: 'Winter', de: 'Winter', fr: 'Hiver',   ar: 'الشتاء' },
};

export function translateSeason(season: string, lang: LangCode): string {
  const key = (season ?? '').trim().toLowerCase();
  if (!key) return '—';

  const exact = SEASON_LABELS[key];
  if (exact) return text(lang, exact);

  if (lang === 'tr') {
    if (key.includes('spring')) return 'İlkbahar';
    if (key.includes('summer')) return 'Yaz';
    if (key.includes('autumn') || key.includes('fall')) return 'Sonbahar';
    if (key.includes('winter')) return 'Kış';
  }

  return season;
}

const CAUSE_TR: Record<string, string> = {
  starvation:           'açlık',
  dehydration:          'susuzluk',
  old_age:              'yaşlılık',
  predator:             'yırtıcı hayvan',
  genetic_disease:      'genetik hastalık',
  infection:            'enfeksiyon',
  trauma:               'travma',
  birth_complications:  'doğum komplikasyonu',
  conflict:             'çatışma',
  unknown:              'bilinmeyen neden',
};

// ─── Exact-match dictionaries (server-generated English → Turkish) ─────────

const BELIEF_DESC_TR: Record<string, string> = {
  'Spirits inhabit all living things and natural features':
    'Ruhlar tüm canlılarda ve doğal unsurlarda yaşar',
  'The spirits of ancestors guide and protect the living':
    'Ataların ruhları yaşayanları yönlendirir ve korur',
  'Selected individuals commune with the spirit world':
    'Seçilmiş bireyler ruh dünyasıyla iletişim kurar',
  'Multiple deities govern different aspects of existence':
    'Birden fazla tanrı varoluşun farklı yönlerini yönetir',
  'A single all-powerful deity rules the cosmos':
    'Tek bir her şeye kadir tanrı evreni yönetir',
  'Abstract reasoning about existence, ethics, and cosmos':
    'Varoluş, etik ve evren üzerine soyut düşünce',
};

const ART_DESC_TR: Record<string, string> = {
  'Pigments applied to rock surfaces depict animals and figures':
    'Kaya yüzeylerine uygulanan pigmentler hayvanları ve figürleri tasvir eder',
  'Three-dimensional forms carved from stone or bone':
    'Taş veya kemikten oyulan üç boyutlu formlar',
  'Geometric and figurative patterns adorn ceramic surfaces':
    'Geometrik ve figüratif desenler seramik yüzeyleri süsler',
  'Woven cloth bears complex repeating patterns':
    'Dokuma kumaş karmaşık tekrarlayan desenler taşır',
  'Buildings are decorated with carved reliefs and motifs':
    'Binalar oyma kabartmalar ve motiflerle süslenir',
  'Stones and bones struck together in rhythmic patterns':
    'Taşlar ve kemikler ritimli örüntülerle birbirine vurulur',
  'Sustained pitched vocalizations form melodic sequences':
    'Sürdürülen tonlu sesler melodik diziler oluşturur',
  'A hollow bone with finger holes produces musical tones':
    'Parmak delikli oyuk bir kemik müzikal sesler üretir',
  'A taut cord vibrates to produce musical notes':
    'Gergin bir ip titreşerek müzikal notalar üretir',
  'Narrative accounts passed between individuals by spoken word':
    'Bireyler arasında sözlü olarak aktarılan anlatılar',
  'Long rhythmic verse recounts heroic deeds and origins':
    'Uzun ritmik dizeler kahramanca eylemleri ve kökenleri anlatır',
  'Narrative accounts preserved in written symbols':
    'Yazılı sembollerde korunan anlatılar',
};

const CULTURE_DESC_TR: Record<string, string> = {
  'A consistent greeting gesture develops':
    'Tutarlı bir selamlama jesti gelişir',
  'Communal mourning practices emerge for the dead':
    'Ölüler için toplumsal yas uygulamaları ortaya çıkar',
  'Food is shared equally among group members':
    'Yiyecek grup üyeleri arasında eşit paylaşılır',
  'Gifts and favors are expected to be returned':
    'Hediyelerin ve iyiliklerin karşılıklı verilmesi beklenir',
  'Different tasks become associated with different sexes':
    'Farklı görevler farklı cinsiyetlerle ilişkilendirilir',
  'Elders are accorded special respect':
    'Yaşlılara özel saygı gösterilir',
  'Ceremonial gift-giving strengthens social bonds':
    'Törensel hediye verme sosyal bağları güçlendirir',
  'Pigments and natural materials used for body adornment':
    'Beden süslemesi için pigmentler ve doğal malzemeler kullanılır',
  'Oral narratives preserve group memory and values':
    'Sözlü anlatılar grup belleğini ve değerlerini korur',
  'Rhythmic percussion emerges as social bonding activity':
    'Ritmik vurma sosyal bağ kurma etkinliği olarak ortaya çıkar',
  'Coordinated movement used in group ceremonies':
    'Grup törenlerinde koordineli hareket kullanılır',
  'Birth is marked with naming rites':
    'Doğum, isim verme ritüelleriyle kutlanır',
  'Pair-bonding is formalized through ritual':
    'Çift bağı ritüel aracılığıyla resmîleştirilir',
  'Cyclical celebrations mark the seasons':
    'Döngüsel kutlamalar mevsimleri işaretler',
  'Certain behaviors become culturally forbidden':
    'Belirli davranışlar kültürel olarak yasaklanır',
  'Exchange is ritualized to build trust':
    'Güven inşa etmek için alışveriş ritüelleştirilir',
  'Origin stories are recorded in written form':
    'Köken hikayeleri yazılı biçimde kaydedilir',
  'Rules and punishments are written and formalized':
    'Kurallar ve cezalar yazılır ve resmîleştirilir',
};

const LAW_DESC_TR: Record<string, string> = {
  'Members are expected to return favors':
    'Üyelerin iyilikleri karşılıklı olarak iade etmesi beklenir',
  "Taking others' possessions is prohibited":
    "Başkalarının eşyalarını almak yasaktır",
  'Mating between close relatives is forbidden':
    'Yakın akrabalar arasındaki çiftleşme yasaktır',
  'Elders are addressed with deference':
    'Yaşlılara saygıyla davranılır',
  'Strangers must be offered food and shelter':
    'Yabancılara yiyecek ve barınak sunulmalıdır',
  'Violence against a kin member demands revenge':
    'Bir akraba üyeye yönelik şiddet intikam gerektirir',
  'All able members must contribute to group tasks':
    'Tüm yetenekli üyeler grup görevlerine katkıda bulunmalıdır',
  'The leader resolves disputes':
    'Lider anlaşmazlıkları çözer',
  'Individual ownership of goods is recognized':
    'Malların bireysel mülkiyeti tanınır',
  'Persistent violators may be driven out':
    'Sürekli ihlal edenler topluluktan kovulabilir',
  'Rules are codified in written form':
    'Kurallar yazılı biçimde kodlanmıştır',
  'Members contribute a portion of resources to the group':
    'Üyeler kaynaklarının bir bölümünü gruba katkıda bulunur',
  'Agreements between parties are legally binding':
    'Taraflar arasındaki anlaşmalar hukuken bağlayıcıdır',
};

const ASTRO_DESC_TR: Record<string, string> = {
  'The moon completes another cycle of phases':
    'Ay bir evre döngüsünü daha tamamlar',
  'The sun reaches its extreme position':
    'Güneş en uç konumuna ulaşır',
  'Day and night are of equal length':
    'Gündüz ve gece eşit uzunluktadır',
  'A prominent star rises at sunset':
    'Gün batımında belirgin bir yıldız yükselir',
  'The sun is obscured — a solar eclipse':
    'Güneş görünmez olur — güneş tutulması',
  'The moon turns blood red — a lunar eclipse':
    'Ay kan kırmızısına döner — ay tutulması',
  'A wandering star moves against the fixed stars':
    'Gezgin bir yıldız sabit yıldızlara karşı hareket eder',
  'A bright object with a tail crosses the sky':
    'Kuyruklu parlak bir nesne gökyüzünü geçer',
  'The phases of the moon can be predicted':
    'Ay evreleri tahmin edilebilir hale geldi',
  'A calendar based on sun and moon positions is developed':
    'Güneş ve ay konumlarına dayalı bir takvim geliştirildi',
  'Named star constellations guide navigation':
    'Adlandırılmış yıldız takımyıldızları yön bulmaya yardım eder',
  'Solar and lunar eclipses can be predicted':
    'Güneş ve ay tutulmaları tahmin edilebilir',
  'A model explains the motion of wandering stars':
    'Gezgin yıldızların hareketi bir modelle açıklandı',
};

// ─── Lookup maps used in pattern replacements ─────────────────────────────

const TECH_TR: Record<string, string> = {
  fire_making:         'Ateş Yakma',
  'fire making':       'Ateş Yakma',
  stone_tools:         'Taş Aletler',
  'stone tools':       'Taş Aletler',
  foraging:            'Toplayıcılık',
  water_container:     'Su Kabı',
  'water container':   'Su Kabı',
  fishing:             'Balıkçılık',
  hunting_spear:       'Av Mızrağı',
  'hunting spear':     'Av Mızrağı',
  shelter_basic:       'Temel Barınak',
  'shelter basic':     'Temel Barınak',
  animal_trap:         'Hayvan Tuzağı',
  'animal trap':       'Hayvan Tuzağı',
  clothing_basic:      'Giysi',
  'clothing basic':    'Giysi',
  plant_cultivation:   'Tarım',
  'plant cultivation': 'Tarım',
  animal_herding:      'Hayvancılık',
  'animal herding':    'Hayvancılık',
  food_preservation:   'Gıda Saklama',
  'food preservation': 'Gıda Saklama',
  bow_arrow:           'Yay ve Ok',
  'bow arrow':         'Yay ve Ok',
  pottery:             'Çömlekçilik',
  weaving:             'Dokumacılık',
  metallurgy_copper:   'Bakır İşleme',
  'metallurgy copper': 'Bakır İşleme',
  writing_system:      'Yazı Sistemi',
  'writing system':    'Yazı Sistemi',
  calendar:            'Takvim',
  mathematics_basic:   'Temel Matematik',
  'mathematics basic': 'Temel Matematik',
  architecture_stone:  'Taş Mimari',
  'architecture stone':'Taş Mimari',
  wheel:               'Tekerlek',
  irrigation:          'Sulama',
  sailing:             'Denizcilik',
  metallurgy_iron:     'Demir İşleme',
  'metallurgy iron':   'Demir İşleme',
};

const PATHOGEN_TR: Record<string, string> = {
  'intestinal parasite': 'Bağırsak paraziti',
  'cholera like':        'Kolera benzeri hastalık',
  'respiratory common':  'Solunum yolu enfeksiyonu',
  'pneumonia like':      'Zatürre benzeri hastalık',
  'plague like':         'Veba benzeri hastalık',
  'malaria like':        'Sıtma benzeri hastalık',
  'fever tick':          'Kene ateşi',
  'wound infection':     'Yara enfeksiyonu',
  'fungal skin':         'Mantar derisi hastalığı',
};

const STRUCTURE_TR: Record<string, string> = {
  'lean to':        'sığınak',
  'pit house':      'çukur ev',
  'post frame hut': 'direkli kulübe',
  'storage pit':    'depo çukuru',
  'mud brick house':'kerpiç ev',
  granary:          'tahıl ambarı',
  'defensive wall': 'savunma duvarı',
  'stone temple':   'taş tapınak',
  'stone house':    'taş ev',
  marketplace:      'pazar yeri',
  'city wall':      'şehir surları',
  'cave dwelling':  'mağara konutu',
};

const DISASTER_TR: Record<string, string> = {
  earthquake: 'deprem',
  flood:      'sel',
  drought:    'kuraklık',
  fire:       'yangın',
  conflict:   'çatışma',
  volcano:    'yanardağ patlaması',
  storm:      'fırtına',
  tsunami:    'tsunami',
  landslide:  'heyelan',
};

const BELIEF_TYPE_TR: Record<string, string> = {
  animism:      'animizm',
  ancestor_cult:'ata kültü',
  'ancestor cult':'ata kültü',
  shamanism:    'şamanizm',
  polytheism:   'çok tanrıcılık',
  monotheism:   'tek tanrıcılık',
  philosophical:'felsefi düşünce',
};

// ─── Main translation function ───────────────────────────────────────────────

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

  // ── Exact-match lookups (fastest path) ──────────────────────────────────
  const EXACT: Record<string, string> = {
    ...BELIEF_DESC_TR,
    ...ART_DESC_TR,
    ...CULTURE_DESC_TR,
    ...LAW_DESC_TR,
    ...ASTRO_DESC_TR,
  };
  if (EXACT[desc]) return EXACT[desc];

  // ── Pattern-based translations ───────────────────────────────────────────
  return desc
    // Deaths: "Name died: cause"
    .replace(/^(.+) died: (.+)$/, (_: string, person: string, cause: string) =>
      `${person} öldü: ${CAUSE_TR[cause] ?? cause.replace(/_/g, ' ')}`)

    // Births
    .replace(/^Born: (.+) \((.+) & (.+)\)$/, (_: string, bornName: string, p1: string, p2: string) =>
      `Doğdu: ${bornName} (${p1} & ${p2})`)
    .replace(/^Born: (.+)$/, (_: string, bornName: string) => `Doğdu: ${bornName}`)
    .replace('New individual born', 'Yeni birey doğdu')

    // Individual deaths (legacy)
    .replace('Individual died: starvation',  'Birey açlıktan öldü')
    .replace('Individual died: dehydration', 'Birey susuzluktan öldü')
    .replace('Individual died: old_age',     'Birey yaşlılıktan öldü')
    .replace('Individual died: predator',    'Birey yırtıcı tarafından öldürüldü')
    .replace(/Individual died: (.+)/, (_: string, cause: string) =>
      `Birey öldü: ${CAUSE_TR[cause] ?? cause.replace(/_/g, ' ')}`)

    // Technology discoveries
    .replace(/Technology discovered: fire making/i,   'Teknoloji keşfedildi: Ateş Yakma')
    .replace(/Technology discovered: water container/i,'Teknoloji keşfedildi: Su Kabı')
    .replace(/Technology discovered: fishing/i,        'Teknoloji keşfedildi: Balıkçılık')
    .replace(/Technology discovered: foraging/i,       'Teknoloji keşfedildi: Toplayıcılık')
    .replace(/Technology discovered: stone_tools/i,    'Teknoloji keşfedildi: Taş Aletler')
    .replace(/Technology discovered: (.+)/i, (_: string, tech: string) => {
      const key = tech.trim();
      return `Teknoloji keşfedildi: ${TECH_TR[key] ?? TECH_TR[key.replace(/_/g, ' ')] ?? key.replace(/_/g, ' ')}`;
    })

    // Disease outbreaks
    .replace(/^A (.+) outbreak begins$/, (_: string, pathogen: string) => {
      const key = pathogen.replace(/_/g, ' ').trim();
      return `${PATHOGEN_TR[key] ?? key} salgını başladı`;
    })

    // Architecture: settlement completes a structure
    .replace(/^(.+) completes a (.+)$/, (_: string, settlement: string, structure: string) => {
      const sKey = structure.replace(/_/g, ' ').trim();
      const settlementTr = settlement === 'The settlement' ? 'Yerleşim' : settlement;
      return `${settlementTr}, ${STRUCTURE_TR[sKey] ?? sKey} inşaatını tamamladı`;
    })
    // Architecture: overcrowded
    .replace(/^(.+) is overcrowded \((\d+) of (\d+) capacity\)$/, (_: string, settlement: string, cur: string, cap: string) => {
      const settlementTr = settlement === 'The settlement' ? 'Yerleşim' : settlement;
      return `${settlementTr} doldu taştı — ${cur} birey, kapasite: ${cap}`;
    })

    // Disasters
    .replace(/^(.+) killed (\d+) individuals?$/, (_: string, type: string, count: string) => {
      const typeKey = type.toLowerCase().trim();
      return `${DISASTER_TR[typeKey] ?? type}, ${count} bireyi öldürdü`;
    })
    .replace(/killed (\d+) individuals?/, (_: string, count: string) => `${count} bireyi öldürdü`)

    // Ritual emergence
    .replace(/^A (.+) ritual emerges in the group$/, (_: string, belief: string) => {
      const key = belief.replace(/_/g, ' ').trim();
      return `Grupta ${BELIEF_TYPE_TR[key] ?? BELIEF_TYPE_TR[belief] ?? key} ritüeli ortaya çıktı`;
    })

    // Language evolution
    .replace(/(.+) language stage advanced to (.+)/, (_: string, person: string, stage: string) =>
      `${person} dil aşamasını ${stage} seviyesine ilerletti`)

    // Generic prefixed events
    .replace(/^Culture event: (.+)$/,      (_: string, v: string) => `Kültür olayı: ${v.replace(/_/g, ' ')}`)
    .replace(/^Art event: (.+)$/,          (_: string, v: string) => `Sanat olayı: ${v.replace(/_/g, ' ')}`)
    .replace(/^Astronomy event: (.+)$/,    (_: string, v: string) => `Astronomi olayı: ${v.replace(/_/g, ' ')}`)
    .replace(/^Architecture event: (.+)$/, (_: string, v: string) => `Mimari olay: ${v.replace(/_/g, ' ')}`)
    .replace(/^Law event: (.+)$/,          (_: string, v: string) => `Hukuk olayı: ${v.replace(/_/g, ' ')}`)
    .replace(/^Microbiome event: (.+)$/,   (_: string, v: string) => `Mikrobiyom olayı: ${v.replace(/_/g, ' ')}`)
    .replace(/^Epigenetics event: (.+)$/,  (_: string, v: string) => `Epigenetik olay: ${v.replace(/_/g, ' ')}`)
    // Cultural diffusion (already has TR description from server)
    // Communication events
    .replace(/^(.+) jest ile (.+)'a iletişim kurdu$/, (_: string, a: string, b: string) => `${a}, ${b}'a jest yaptı`)
    // Norm events
    .replace(/^Norm emerged: (.+)$/, (_: string, v: string) => `Norm oluştu: ${v.replace(/_/g, ' ')}`)
    .replace(/^Norm violated: (.+)$/, (_: string, v: string) => `Norm ihlal edildi: ${v.replace(/_/g, ' ')}`)
    // Thought / activity
    .replace(/^(.+) is (searching for food|looking for water|resting)$/, (_: string, name: string, action: string) => {
      const map: Record<string, string> = { 'searching for food': 'yiyecek arıyor', 'looking for water': 'su arıyor', 'resting': 'dinleniyor' };
      return `${name} ${map[action] ?? action}`;
    });
}

export function translateEventType(type: string, lang: LangCode): string {
  const key = String(type ?? '').toLowerCase();
  const labels: Record<string, TranslationMap> = {
    birth:        { tr: 'doğum',      en: 'birth' },
    death:        { tr: 'ölüm',       en: 'death' },
    technology:   { tr: 'teknoloji',  en: 'technology' },
    language:     { tr: 'dil',        en: 'language' },
    discovery:    { tr: 'keşif',      en: 'discovery' },
    disaster:     { tr: 'afet',       en: 'disaster' },
    belief:       { tr: 'inanç',      en: 'belief' },
    culture:      { tr: 'kültür',     en: 'culture' },
    art:          { tr: 'sanat',      en: 'art' },
    astronomy:    { tr: 'astronomi',  en: 'astronomy' },
    architecture: { tr: 'mimari',     en: 'architecture' },
    law:          { tr: 'hukuk',      en: 'law' },
    microbiome:   { tr: 'mikrobiyom', en: 'microbiome' },
    epigenetics:  { tr: 'epigenetik', en: 'epigenetics' },
    epidemic:     { tr: 'salgın',     en: 'epidemic' },
    ritual:       { tr: 'ritüel',     en: 'ritual' },
    trade:        { tr: 'ticaret',    en: 'trade' },
    celestial:    { tr: 'göksel',     en: 'celestial' },
    social:       { tr: 'sosyal',     en: 'social' },
    norm:         { tr: 'norm',       en: 'norm' },
    weather:      { tr: 'hava',       en: 'weather' },
    communication:{ tr: 'iletişim',   en: 'communication' },
    thought:      { tr: 'düşünce',    en: 'thought' },
    sleep:        { tr: 'uyku',       en: 'sleep' },
    activity:     { tr: 'etkinlik',   en: 'activity' },
    mating:       { tr: 'çiftleşme',  en: 'mating' },
    conflict:     { tr: 'çatışma',    en: 'conflict' },
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
