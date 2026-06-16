export type LangCode = 'tr' | 'en' | 'de' | 'fr' | 'ar';

export const LANG_CODES = ['tr', 'en', 'de', 'fr', 'ar'] as const;

export function isValidLangCode(code: unknown): code is LangCode {
  return LANG_CODES.includes(code as LangCode);
}

export type TranslationMap = Partial<Record<LangCode, string>> &
  ({ en: string } | { tr: string });

const UI_FALLBACK_LABELS: Record<string, TranslationMap> = {
  total: { tr: 'TOPLAM', en: 'TOTAL', de: 'GESAMT', fr: 'TOTAL', ar: 'المجموع' },
  male: { tr: 'ERKEK', en: 'MALE', de: 'MÄNNLICH', fr: 'HOMME', ar: 'ذكر' },
  female: { tr: 'KADIN', en: 'FEMALE', de: 'WEIBLICH', fr: 'FEMME', ar: 'أنثى' },
  all: { tr: 'TÜMÜ', en: 'ALL', de: 'ALLE', fr: 'TOUS', ar: 'الكل' },
  age: { tr: 'YAŞ', en: 'AGE', de: 'ALTER', fr: 'ÂGE', ar: 'العمر' },
  infant: { tr: 'Bebek', en: 'Infant', de: 'Säugling', fr: 'Nourrisson', ar: 'رضيع' },
  child: { tr: 'Çocuk', en: 'Child', de: 'Kind', fr: 'Enfant', ar: 'طفل' },
  youth: { tr: 'Genç', en: 'Youth', de: 'Jugend', fr: 'Jeune', ar: 'شاب' },
  adult: { tr: 'Yetişkin', en: 'Adult', de: 'Erwachsen', fr: 'Adulte', ar: 'بالغ' },
  elder: { tr: 'Yaşlı', en: 'Elder', de: 'Ältester', fr: 'Aîné', ar: 'مسن' },
  yr: { tr: 'yaş', en: 'yr', de: 'J.', fr: 'an', ar: 'سنة' },
  ' yr': { tr: ' yaş', en: ' yr', de: ' J.', fr: ' an', ar: ' سنة' },
  founder: { tr: 'KURUCU', en: 'FOUNDER', de: 'GRÜNDER', fr: 'FONDATEUR', ar: 'مؤسس' },
  loading_data: { tr: 'VERİ YÜKLENİYOR...', en: 'LOADING DATA...', de: 'DATEN WERDEN GELADEN...', fr: 'CHARGEMENT DES DONNÉES...', ar: 'جارٍ تحميل البيانات...' },
  compare: { tr: 'KARŞILAŞTIR', en: 'COMPARE', de: 'VERGLEICHEN', fr: 'COMPARER', ar: 'قارن' },
  deceased: { tr: 'HAYATINI KAYBETTİLER', en: 'DECEASED', de: 'VERSTORBEN', fr: 'DÉCÉDÉS', ar: 'المتوفون' },
  no_population: { tr: 'NÜFUS YOK', en: 'NO POPULATION', de: 'KEINE BEVÖLKERUNG', fr: 'AUCUNE POPULATION', ar: 'لا يوجد سكان' },
  more_individuals: { tr: 'birey daha', en: 'more individuals', de: 'weitere Individuen', fr: 'individus de plus', ar: 'أفراد آخرون' },
  youngest_first: { tr: 'En genç önce', en: 'Youngest first', de: 'Jüngste zuerst', fr: 'Plus jeunes d’abord', ar: 'الأصغر أولاً' },
  oldest_first: { tr: 'En yaşlı önce', en: 'Oldest first', de: 'Älteste zuerst', fr: 'Plus âgés d’abord', ar: 'الأكبر أولاً' },
  pregnant: { tr: 'Hamile', en: 'Pregnant', de: 'Schwanger', fr: 'Enceinte', ar: 'حامل' },
  population: { tr: 'Nüfus', en: 'Population', de: 'Bevölkerung', fr: 'Population', ar: 'السكان' },
  biology: { tr: 'Biyoloji', en: 'Biology', de: 'Biologie', fr: 'Biologie', ar: 'البيولوجيا' },
  environment: { tr: 'Çevre', en: 'Environment', de: 'Umwelt', fr: 'Environnement', ar: 'البيئة' },
  astronomy: { tr: 'Astronomi', en: 'Astronomy', de: 'Astronomie', fr: 'Astronomie', ar: 'علم الفلك' },
  culture: { tr: 'Kültür', en: 'Culture', de: 'Kultur', fr: 'Culture', ar: 'الثقافة' },
  language: { tr: 'Dil', en: 'Language', de: 'Sprache', fr: 'Langue', ar: 'اللغة' },
  technology: { tr: 'Teknoloji', en: 'Technology', de: 'Technologie', fr: 'Technologie', ar: 'التكنولوجيا' },
  belief: { tr: 'İnanç', en: 'Belief', de: 'Glaube', fr: 'Croyance', ar: 'المعتقد' },
  social: { tr: 'Sosyal', en: 'Social', de: 'Sozial', fr: 'Social', ar: 'اجتماعي' },
  economy: { tr: 'Ekonomi', en: 'Economy', de: 'Wirtschaft', fr: 'Économie', ar: 'الاقتصاد' },
  art: { tr: 'Sanat', en: 'Art', de: 'Kunst', fr: 'Art', ar: 'الفن' },
  architecture: { tr: 'Mimari', en: 'Architecture', de: 'Architektur', fr: 'Architecture', ar: 'العمارة' },
  law: { tr: 'Hukuk', en: 'Law', de: 'Recht', fr: 'Droit', ar: 'القانون' },
  microbiome: { tr: 'Mikrobiyom', en: 'Microbiome', de: 'Mikrobiom', fr: 'Microbiome', ar: 'الميكروبيوم' },
  psychology: { tr: 'Psikoloji', en: 'Psychology', de: 'Psychologie', fr: 'Psychologie', ar: 'علم النفس' },
  epigenetics: { tr: 'Epigenetik', en: 'Epigenetics', de: 'Epigenetik', fr: 'Épigénétique', ar: 'علم التخلق' },
  genealogy: { tr: 'Soy Ağacı', en: 'Genealogy', de: 'Genealogie', fr: 'Généalogie', ar: 'النسب' },
  god_mode: { tr: 'Tanrı Modu', en: 'God Mode', de: 'Gottmodus', fr: 'Mode Dieu', ar: 'وضع الإله' },
  time_machine: { tr: 'Zaman Makinesi', en: 'Time Machine', de: 'Zeitmaschine', fr: 'Machine temporelle', ar: 'آلة الزمن' },
  report: { tr: 'Rapor', en: 'Report', de: 'Bericht', fr: 'Rapport', ar: 'تقرير' },
  terminate: { tr: 'Sonlandır', en: 'Terminate', de: 'Beenden', fr: 'Terminer', ar: 'إنهاء' },
  exit: { tr: 'Çıkış', en: 'Exit', de: 'Ausgang', fr: 'Sortie', ar: 'خروج' },
  speed: { tr: 'Hız', en: 'Speed', de: 'Geschwindigkeit', fr: 'Vitesse', ar: 'السرعة' },
  set: { tr: 'Ayarla', en: 'Set', de: 'Setzen', fr: 'Définir', ar: 'تعيين' },
  menu: { tr: 'Menü', en: 'Menu', de: 'Menü', fr: 'Menu', ar: 'القائمة' },
  user: { tr: 'Kullanıcı', en: 'User', de: 'Benutzer', fr: 'Utilisateur', ar: 'المستخدم' },
  pause: { tr: 'Duraklat', en: 'Pause', de: 'Pause', fr: 'Pause', ar: 'إيقاف مؤقت' },
  season: { tr: 'Mevsim', en: 'Season', de: 'Jahreszeit', fr: 'Saison', ar: 'الموسم' },
  year: { tr: 'Yıl', en: 'Year', de: 'Jahr', fr: 'Année', ar: 'السنة' },
  birth: { tr: 'Doğum', en: 'Birth', de: 'Geburt', fr: 'Naissance', ar: 'ولادة' },
  death: { tr: 'Ölüm', en: 'Death', de: 'Tod', fr: 'Mort', ar: 'وفاة' },
  tech: { tr: 'Tek.', en: 'Tech', de: 'Tech.', fr: 'Tech.', ar: 'تقنية' },
};

function normalizeUiKey(value?: string): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '')
    .toLowerCase();
}

export function text(lang: LangCode, values: TranslationMap): string {
  if (values[lang]) return values[lang] as string;
  const fromEn = UI_FALLBACK_LABELS[normalizeUiKey(values.en)];
  if (fromEn?.[lang]) return fromEn[lang] as string;
  const fromTr = UI_FALLBACK_LABELS[normalizeUiKey(values.tr)];
  if (fromTr?.[lang]) return fromTr[lang] as string;
  return values.en ?? values.tr ?? '';
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

  if (key.includes('spring')) return text(lang, SEASON_LABELS.spring);
  if (key.includes('summer')) return text(lang, SEASON_LABELS.summer);
  if (key.includes('autumn') || key.includes('fall')) return text(lang, SEASON_LABELS.autumn);
  if (key.includes('winter')) return text(lang, SEASON_LABELS.winter);

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

export const CAUSE_LABELS: Record<string, TranslationMap> = {
  starvation:          { tr: 'açlık',                 en: 'starvation',          de: 'Verhungern',           fr: 'famine',              ar: 'جوع' },
  dehydration:         { tr: 'susuzluk',              en: 'dehydration',         de: 'Dehydrierung',         fr: 'déshydratation',      ar: 'جفاف' },
  old_age:             { tr: 'yaşlılık',              en: 'old age',             de: 'Alter',                fr: 'vieillesse',          ar: 'الشيخوخة' },
  predator:            { tr: 'yırtıcı hayvan',        en: 'predator',            de: 'Raubtier',             fr: 'prédateur',           ar: 'مفترس' },
  genetic_disease:     { tr: 'genetik hastalık',      en: 'genetic disease',     de: 'Erbkrankheit',         fr: 'maladie génétique',   ar: 'مرض وراثي' },
  infection:           { tr: 'enfeksiyon',             en: 'infection',           de: 'Infektion',            fr: 'infection',           ar: 'عدوى' },
  trauma:              { tr: 'travma',                 en: 'trauma',              de: 'Trauma',               fr: 'traumatisme',         ar: 'صدمة' },
  birth_complications: { tr: 'doğum komplikasyonu',   en: 'birth complications', de: 'Geburtskomplikationen',fr: 'complications à la naissance', ar: 'مضاعفات الولادة' },
  conflict:            { tr: 'çatışma',               en: 'conflict',            de: 'Konflikt',             fr: 'conflit',             ar: 'نزاع' },
  unknown:             { tr: 'bilinmeyen neden',       en: 'unknown cause',       de: 'unbekannte Ursache',   fr: 'cause inconnue',      ar: 'سبب مجهول' },
};

const BELIEF_DESC_TR: Record<string, string> = {
  'Spirits inhabit all living things and natural features': 'Ruhlar tüm canlılarda ve doğal unsurlarda yaşar',
  'The spirits of ancestors guide and protect the living': 'Ataların ruhları yaşayanları yönlendirir ve korur',
  'Selected individuals commune with the spirit world': 'Seçilmiş bireyler ruh dünyasıyla iletişim kurar',
  'Multiple deities govern different aspects of existence': 'Birden fazla tanrı varoluşun farklı yönlerini yönetir',
  'A single all-powerful deity rules the cosmos': 'Tek bir her şeye kadir tanrı evreni yönetir',
  'Abstract reasoning about existence, ethics, and cosmos': 'Varoluş, etik ve evren üzerine soyut düşünce',
};

const ART_DESC_TR: Record<string, string> = {
  'Pigments applied to rock surfaces depict animals and figures': 'Kaya yüzeylerine uygulanan pigmentler hayvanları ve figürleri tasvir eder',
  'Three-dimensional forms carved from stone or bone': 'Taş veya kemikten oyulan üç boyutlu formlar',
  'Geometric and figurative patterns adorn ceramic surfaces': 'Geometrik ve figüratif desenler seramik yüzeyleri süsler',
  'Woven cloth bears complex repeating patterns': 'Dokuma kumaş karmaşık tekrarlayan desenler taşır',
  'Buildings are decorated with carved reliefs and motifs': 'Binalar oyma kabartmalar ve motiflerle süslenir',
  'Stones and bones struck together in rhythmic patterns': 'Taşlar ve kemikler ritimli örüntülerle birbirine vurulur',
  'Sustained pitched vocalizations form melodic sequences': 'Sürdürülen tonlu sesler melodik diziler oluşturur',
  'A hollow bone with finger holes produces musical tones': 'Parmak delikli oyuk bir kemik müzikal sesler üretir',
  'A taut cord vibrates to produce musical notes': 'Gergin bir ip titreşerek müzikal notalar üretir',
  'Narrative accounts passed between individuals by spoken word': 'Bireyler arasında sözlü olarak aktarılan anlatılar',
  'Long rhythmic verse recounts heroic deeds and origins': 'Uzun ritmik dizeler kahramanca eylemleri ve kökenleri anlatır',
  'Narrative accounts preserved in written symbols': 'Yazılı sembollerde korunan anlatılar',
};

const CULTURE_DESC_TR: Record<string, string> = {
  'A consistent greeting gesture develops': 'Tutarlı bir selamlama jesti gelişir',
  'Communal mourning practices emerge for the dead': 'Ölüler için toplumsal yas uygulamaları ortaya çıkar',
  'Food is shared equally among group members': 'Yiyecek grup üyeleri arasında eşit paylaşılır',
  'Gifts and favors are expected to be returned': 'Hediyelerin ve iyiliklerin karşılıklı verilmesi beklenir',
  'Different tasks become associated with different sexes': 'Farklı görevler farklı cinsiyetlerle ilişkilendirilir',
  'Elders are accorded special respect': 'Yaşlılara özel saygı gösterilir',
  'Ceremonial gift-giving strengthens social bonds': 'Törensel hediye verme sosyal bağları güçlendirir',
  'Pigments and natural materials used for body adornment': 'Beden süslemesi için pigmentler ve doğal malzemeler kullanılır',
  'Oral narratives preserve group memory and values': 'Sözlü anlatılar grup belleğini ve değerlerini korur',
  'Rhythmic percussion emerges as social bonding activity': 'Ritmik vurma sosyal bağ kurma etkinliği olarak ortaya çıkar',
  'Coordinated movement used in group ceremonies': 'Grup törenlerinde koordineli hareket kullanılır',
  'Birth is marked with naming rites': 'Doğum, isim verme ritüelleriyle kutlanır',
  'Pair-bonding is formalized through ritual': 'Çift bağı ritüel aracılığıyla resmîleştirilir',
  'Cyclical celebrations mark the seasons': 'Döngüsel kutlamalar mevsimleri işaretler',
  'Certain behaviors become culturally forbidden': 'Belirli davranışlar kültürel olarak yasaklanır',
  'Exchange is ritualized to build trust': 'Güven inşa etmek için alışveriş ritüelleştirilir',
  'Origin stories are recorded in written form': 'Köken hikayeleri yazılı biçimde kaydedilir',
  'Rules and punishments are written and formalized': 'Kurallar ve cezalar yazılır ve resmîleştirilir',
};

const LAW_DESC_TR: Record<string, string> = {
  'Members are expected to return favors': 'Üyelerin iyilikleri karşılıklı olarak iade etmesi beklenir',
  "Taking others' possessions is prohibited": "Başkalarının eşyalarını almak yasaktır",
  'Mating between close relatives is forbidden': 'Yakın akrabalar arasındaki çiftleşme yasaktır',
  'Elders are addressed with deference': 'Yaşlılara saygıyla davranılır',
  'Strangers must be offered food and shelter': 'Yabancılara yiyecek ve barınak sunulmalıdır',
  'Violence against a kin member demands revenge': 'Bir akraba üyeye yönelik şiddet intikam gerektirir',
  'All able members must contribute to group tasks': 'Tüm yetenekli üyeler grup görevlerine katkıda bulunmalıdır',
  'The leader resolves disputes': 'Lider anlaşmazlıkları çözer',
  'Individual ownership of goods is recognized': 'Malların bireysel mülkiyeti tanınır',
  'Persistent violators may be driven out': 'Sürekli ihlal edenler topluluktan kovulabilir',
  'Rules are codified in written form': 'Kurallar yazılı biçimde kodlanmıştır',
  'Members contribute a portion of resources to the group': 'Üyeler kaynaklarının bir bölümünü gruba katkıda bulunur',
  'Agreements between parties are legally binding': 'Taraflar arasındaki anlaşmalar hukuken bağlayıcıdır',
};

const ASTRO_DESC_TR: Record<string, string> = {
  'The moon completes another cycle of phases': 'Ay bir evre döngüsünü daha tamamlar',
  'The sun reaches its extreme position': 'Güneş en uç konumuna ulaşır',
  'Day and night are of equal length': 'Gündüz ve gece eşit uzunluktadır',
  'A prominent star rises at sunset': 'Gün batımında belirgin bir yıldız yükselir',
  'The sun is obscured — a solar eclipse': 'Güneş görünmez olur — güneş tutulması',
  'The moon turns blood red — a lunar eclipse': 'Ay kan kırmızısına döner — ay tutulması',
  'A wandering star moves against the fixed stars': 'Gezgin bir yıldız sabit yıldızlara karşı hareket eder',
  'A bright object with a tail crosses the sky': 'Kuyruklu parlak bir nesne gökyüzünü geçer',
  'The phases of the moon can be predicted': 'Ay evreleri tahmin edilebilir hale geldi',
  'A calendar based on sun and moon positions is developed': 'Güneş ve ay konumlarına dayalı bir takvim geliştirildi',
  'Named star constellations guide navigation': 'Adlandırılmış yıldız takımyıldızları yön bulmaya yardım eder',
  'Solar and lunar eclipses can be predicted': 'Güneş ve ay tutulmaları tahmin edilebilir',
  'A model explains the motion of wandering stars': 'Gezgin yıldızların hareketi bir modelle açıklandı',
};

const TECH_TR: Record<string, string> = {
  fire_making: 'Ateş Yakma', 'fire making': 'Ateş Yakma', stone_tools: 'Taş Aletler', 'stone tools': 'Taş Aletler',
  foraging: 'Toplayıcılık', water_container: 'Su Kabı', 'water container': 'Su Kabı', fishing: 'Balıkçılık',
  hunting_spear: 'Av Mızrağı', 'hunting spear': 'Av Mızrağı', shelter_basic: 'Temel Barınak', 'shelter basic': 'Temel Barınak',
  animal_trap: 'Hayvan Tuzağı', 'animal trap': 'Hayvan Tuzağı', clothing_basic: 'Giysi', 'clothing basic': 'Giysi',
  plant_cultivation: 'Tarım', 'plant cultivation': 'Tarım', animal_herding: 'Hayvancılık', 'animal herding': 'Hayvancılık',
  food_preservation: 'Gıda Saklama', 'food preservation': 'Gıda Saklama', bow_arrow: 'Yay ve Ok', 'bow arrow': 'Yay ve Ok',
  pottery: 'Çömlekçilik', weaving: 'Dokumacılık', metallurgy_copper: 'Bakır İşleme', 'metallurgy copper': 'Bakır İşleme',
  writing_system: 'Yazı Sistemi', 'writing system': 'Yazı Sistemi', calendar: 'Takvim', mathematics_basic: 'Temel Matematik',
  'mathematics basic': 'Temel Matematik', architecture_stone: 'Taş Mimari', 'architecture stone': 'Taş Mimari', wheel: 'Tekerlek',
  irrigation: 'Sulama', sailing: 'Denizcilik', metallurgy_iron: 'Demir İşleme', 'metallurgy iron': 'Demir İşleme',
};

const PATHOGEN_TR: Record<string, string> = {
  'intestinal parasite': 'Bağırsak paraziti', 'cholera like': 'Kolera benzeri hastalık', 'respiratory common': 'Solunum yolu enfeksiyonu',
  'pneumonia like': 'Zatürre benzeri hastalık', 'plague like': 'Veba benzeri hastalık', 'malaria like': 'Sıtma benzeri hastalık',
  'fever tick': 'Kene ateşi', 'wound infection': 'Yara enfeksiyonu', 'fungal skin': 'Mantar derisi hastalığı',
};

const STRUCTURE_TR: Record<string, string> = {
  'lean to': 'sığınak', 'pit house': 'çukur ev', 'post frame hut': 'direkli kulübe', 'storage pit': 'depo çukuru',
  'mud brick house': 'kerpiç ev', granary: 'tahıl ambarı', 'defensive wall': 'savunma duvarı', 'stone temple': 'taş tapınak',
  'stone house': 'taş ev', marketplace: 'pazar yeri', 'city wall': 'şehir surları', 'cave dwelling': 'mağara konutu',
};

const DISASTER_TR: Record<string, string> = {
  earthquake: 'deprem', flood: 'sel', drought: 'kuraklık', fire: 'yangın', conflict: 'çatışma', volcano: 'yanardağ patlaması',
  storm: 'fırtına', tsunami: 'tsunami', landslide: 'heyelan',
};

const CAUSE_DE: Record<string, string> = {
  starvation: 'Verhungern', dehydration: 'Austrocknung', old_age: 'Alter',
  predator: 'Raubtier', genetic_disease: 'Erbkrankheit', infection: 'Infektion',
  trauma: 'Trauma', birth_complications: 'Geburtskomplikationen', conflict: 'Konflikt',
  unknown: 'Unbekannte Ursache'
};
const CAUSE_FR: Record<string, string> = {
  starvation: 'Famine', dehydration: 'Déshydratation', old_age: 'Vieillesse',
  predator: 'Prédateur', genetic_disease: 'Maladie génétique', infection: 'Infection',
  trauma: 'Traumatisme', birth_complications: 'Complications à la naissance',
  conflict: 'Conflit', unknown: 'Cause inconnue'
};
const CAUSE_AR: Record<string, string> = {
  starvation: 'مجاعة', dehydration: 'جفاف', old_age: 'الشيخوخة',
  predator: 'مفترس', genetic_disease: 'مرض وراثي', infection: 'عدوى',
  trauma: 'صدمة', birth_complications: 'مضاعفات الولادة', conflict: 'نزاع',
  unknown: 'سبب مجهول'
};
const DISASTER_DE: Record<string, string> = {
  earthquake: 'Erdbeben', flood: 'Flut', drought: 'Dürre', fire: 'Feuer',
  conflict: 'Konflikt', volcano: 'Vulkanausbruch', storm: 'Sturm',
  tsunami: 'Tsunami', landslide: 'Erdrutsch'
};
const DISASTER_FR: Record<string, string> = {
  earthquake: 'Séisme', flood: 'Inondation', drought: 'Sécheresse', fire: 'Incendie',
  conflict: 'Conflit', volcano: 'Éruption volcanique', storm: 'Tempête',
  tsunami: 'Tsunami', landslide: 'Glissement de terrain'
};
const DISASTER_AR: Record<string, string> = {
  earthquake: 'زلزال', flood: 'فيضان', drought: 'جفاف', fire: 'حريق',
  conflict: 'نزاع', volcano: 'ثوران بركاني', storm: 'عاصفة',
  tsunami: 'تسونامي', landslide: 'انهيار أرضي'
};

const BELIEF_TYPE_TR: Record<string, string> = {
  animism: 'animizm', ancestor_cult: 'ata kültü', 'ancestor cult': 'ata kültü', shamanism: 'şamanizm',
  polytheism: 'çok tanrıcılık', monotheism: 'tek tanrıcılık', philosophical: 'felsefi düşünce',
};

const BELIEF_TYPE_DE: Record<string, string> = {
  animism: 'Animismus', ancestor_cult: 'Ahnenkult', 'ancestor cult': 'Ahnenkult', shamanism: 'Schamanismus',
  polytheism: 'Polytheismus', monotheism: 'Monotheismus', philosophical: 'Philosophie',
};
const BELIEF_TYPE_FR: Record<string, string> = {
  animism: 'animisme', ancestor_cult: 'culte des ancêtres', 'ancestor cult': 'culte des ancêtres', shamanism: 'chamanisme',
  polytheism: 'polythéisme', monotheism: 'monothéisme', philosophical: 'philosophie',
};
const BELIEF_TYPE_AR: Record<string, string> = {
  animism: 'الروحانية', ancestor_cult: 'عبادة الأجداد', 'ancestor cult': 'عبادة الأجداد', shamanism: 'الشامانية',
  polytheism: 'تعدد الآلهة', monotheism: 'التوحيد', philosophical: 'الفلسفة',
};

const EXACT_DESC_DE: Record<string, string> = {
  'Spirits inhabit all living things and natural features': 'Geister bewohnen alle Lebewesen und natürliche Elemente',
  'The spirits of ancestors guide and protect the living': 'Die Geister der Vorfahren führen und schützen die Lebenden',
  'Selected individuals commune with the spirit world': 'Ausgewählte Individuen kommunizieren mit der Geisterwelt',
  'Multiple deities govern different aspects of existence': 'Mehrere Gottheiten regieren verschiedene Aspekte der Existenz',
  'A single all-powerful deity rules the cosmos': 'Eine einzige allmächtige Gottheit regiert den Kosmos',
  'Abstract reasoning about existence, ethics, and cosmos': 'Abstraktes Denken über Existenz, Ethik und Kosmos',
  'Pigments applied to rock surfaces depict animals and figures': 'Auf Felsoberflächen aufgetragene Pigmente zeigen Tiere und Figuren',
  'Three-dimensional forms carved from stone or bone': 'Dreidimensionale Formen aus Stein oder Knochen geschnitzt',
  'Geometric and figurative patterns adorn ceramic surfaces': 'Geometrische und figurative Muster schmücken Keramikoberflächen',
  'Woven cloth bears complex repeating patterns': 'Gewebter Stoff trägt komplexe Wiederholungsmuster',
  'Buildings are decorated with carved reliefs and motifs': 'Gebäude sind mit geschnitzten Reliefs und Motiven verziert',
  'Stones and bones struck together in rhythmic patterns': 'Steine und Knochen werden rhythmisch zusammengeschlagen',
  'Sustained pitched vocalizations form melodic sequences': 'Anhaltende Tonvokalisierungen bilden melodische Sequenzen',
  'A hollow bone with finger holes produces musical tones': 'Ein hohler Knochen mit Fingerlöchern erzeugt musikalische Töne',
  'A taut cord vibrates to produce musical notes': 'Eine gespannte Saite schwingt und erzeugt Töne',
  'Narrative accounts passed between individuals by spoken word': 'Erzählungen werden mündlich weitergegeben',
  'Long rhythmic verse recounts heroic deeds and origins': 'Lange rhythmische Verse erzählen von heroischen Taten',
  'Narrative accounts preserved in written symbols': 'Erzählungen in Schriftsymbolen erhalten',
  'A consistent greeting gesture develops': 'Eine einheitliche Begrüßungsgeste entwickelt sich',
  'Communal mourning practices emerge for the dead': 'Gemeinschaftliche Trauerrituale entstehen',
  'Food is shared equally among group members': 'Nahrung wird gleichmäßig geteilt',
  'Gifts and favors are expected to be returned': 'Geschenke und Gefälligkeiten werden erwidert',
  'Different tasks become associated with different sexes': 'Verschiedene Aufgaben werden verschiedenen Geschlechtern zugeordnet',
  'Elders are accorded special respect': 'Älteste genießen besonderen Respekt',
  'Ceremonial gift-giving strengthens social bonds': 'Zeremonielles Schenken stärkt soziale Bindungen',
  'Pigments and natural materials used for body adornment': 'Pigmente für Körperverzierung verwendet',
  'Oral narratives preserve group memory and values': 'Mündliche Erzählungen bewahren das Gedächtnis der Gruppe',
  'Rhythmic percussion emerges as social bonding activity': 'Rhythmisches Schlagzeug als soziale Bindungsaktivität',
  'Coordinated movement used in group ceremonies': 'Koordinierte Bewegung bei Gruppenzeremonien',
  'Birth is marked with naming rites': 'Geburt wird mit Benennungsriten markiert',
  'Pair-bonding is formalized through ritual': 'Paarbindung wird durch Ritual formalisiert',
  'Cyclical celebrations mark the seasons': 'Zyklische Feiern markieren die Jahreszeiten',
  'Certain behaviors become culturally forbidden': 'Bestimmte Verhaltensweisen werden kulturell verboten',
  'Exchange is ritualized to build trust': 'Austausch wird ritualisiert',
  'Origin stories are recorded in written form': 'Ursprungsgeschichten werden schriftlich festgehalten',
  'Rules and punishments are written and formalized': 'Regeln und Strafen werden formalisiert',
  'Members are expected to return favors': 'Von Mitgliedern wird erwartet Gefälligkeiten zu erwidern',
  "Taking others' possessions is prohibited": 'Das Entnehmen fremder Besitztümer ist verboten',
  'Mating between close relatives is forbidden': 'Paarung zwischen engen Verwandten ist verboten',
  'Elders are addressed with deference': 'Älteste werden mit Ehrerbietung behandelt',
  'Strangers must be offered food and shelter': 'Fremden muss Nahrung und Unterkunft angeboten werden',
  'Violence against a kin member demands revenge': 'Gewalt gegen Verwandte fordert Rache',
  'All able members must contribute to group tasks': 'Alle fähigen Mitglieder müssen beitragen',
  'The leader resolves disputes': 'Der Anführer löst Streitigkeiten',
  'Individual ownership of goods is recognized': 'Individuelles Eigentum wird anerkannt',
  'Persistent violators may be driven out': 'Hartnäckige Verstöße können zur Vertreibung führen',
  'Rules are codified in written form': 'Regeln sind schriftlich kodifiziert',
  'Members contribute a portion of resources to the group': 'Mitglieder tragen Ressourcen zur Gruppe bei',
  'Agreements between parties are legally binding': 'Vereinbarungen sind rechtlich bindend',
  'The moon completes another cycle of phases': 'Der Mond schließt einen weiteren Phasenzyklus ab',
  'The sun reaches its extreme position': 'Die Sonne erreicht ihre Extremposition',
  'Day and night are of equal length': 'Tag und Nacht sind gleich lang',
  'A prominent star rises at sunset': 'Ein markanter Stern geht bei Sonnenuntergang auf',
  'The sun is obscured — a solar eclipse': 'Die Sonne wird verdeckt — Sonnenfinsternis',
  'The moon turns blood red — a lunar eclipse': 'Der Mond wird blutrot — Mondfinsternis',
  'A wandering star moves against the fixed stars': 'Ein Wanderstern bewegt sich gegen die Fixsterne',
  'A bright object with a tail crosses the sky': 'Ein helles Objekt mit Schweif überquert den Himmel',
  'The phases of the moon can be predicted': 'Die Mondphasen können vorhergesagt werden',
  'A calendar based on sun and moon positions is developed': 'Ein Kalender wird entwickelt',
  'Named star constellations guide navigation': 'Benannte Sternkonstellationen leiten die Navigation',
  'Solar and lunar eclipses can be predicted': 'Finsternisse können vorhergesagt werden',
  'A model explains the motion of wandering stars': 'Ein Modell erklärt die Bewegung der Wandersterne',
};

const EXACT_DESC_FR: Record<string, string> = {
  'Spirits inhabit all living things and natural features': 'Les esprits habitent tous les êtres vivants et les éléments naturels',
  'The spirits of ancestors guide and protect the living': 'Les esprits des ancêtres guident et protègent les vivants',
  'Selected individuals commune with the spirit world': 'Des individus communiquent avec le monde des esprits',
  'Multiple deities govern different aspects of existence': 'Plusieurs divinités gouvernent différents aspects de l\'existence',
  'A single all-powerful deity rules the cosmos': 'Une seule divinité toute-puissante gouverne le cosmos',
  'Abstract reasoning about existence, ethics, and cosmos': 'Raisonnement abstrait sur l\'existence et le cosmos',
  'Pigments applied to rock surfaces depict animals and figures': 'Des pigments sur des surfaces rocheuses représentent des animaux',
  'Three-dimensional forms carved from stone or bone': 'Des formes tridimensionnelles sculptées dans la pierre ou l\'os',
  'Geometric and figurative patterns adorn ceramic surfaces': 'Des motifs ornent les surfaces céramiques',
  'Woven cloth bears complex repeating patterns': 'Le tissu tissé porte des motifs répétitifs',
  'Buildings are decorated with carved reliefs and motifs': 'Les bâtiments sont décorés de reliefs sculptés',
  'Stones and bones struck together in rhythmic patterns': 'Des pierres et des os sont frappés en rythme',
  'Sustained pitched vocalizations form melodic sequences': 'Des vocalisations forment des séquences mélodiques',
  'A hollow bone with finger holes produces musical tones': 'Un os creux avec des trous produit des sons musicaux',
  'A taut cord vibrates to produce musical notes': 'Une corde tendue vibre pour produire des notes musicales',
  'Narrative accounts passed between individuals by spoken word': 'Des récits transmis oralement entre individus',
  'Long rhythmic verse recounts heroic deeds and origins': 'De longs vers relatent des exploits héroïques',
  'Narrative accounts preserved in written symbols': 'Des récits préservés dans des symboles écrits',
  'A consistent greeting gesture develops': 'Un geste de salutation cohérent se développe',
  'Communal mourning practices emerge for the dead': 'Des pratiques de deuil communautaires émergent',
  'Food is shared equally among group members': 'La nourriture est partagée équitablement',
  'Gifts and favors are expected to be returned': 'Les cadeaux et les faveurs sont rendus',
  'Different tasks become associated with different sexes': 'Différentes tâches sont associées à différents sexes',
  'Elders are accorded special respect': 'Les anciens bénéficient d\'un respect particulier',
  'Ceremonial gift-giving strengthens social bonds': 'Les dons cérémoniaux renforcent les liens sociaux',
  'Pigments and natural materials used for body adornment': 'Des pigments utilisés pour la parure corporelle',
  'Oral narratives preserve group memory and values': 'Les récits oraux préservent la mémoire du groupe',
  'Rhythmic percussion emerges as social bonding activity': 'La percussion rythmique comme activité de lien social',
  'Coordinated movement used in group ceremonies': 'Des mouvements coordonnés dans les cérémonies de groupe',
  'Birth is marked with naming rites': 'La naissance est marquée par des rites de dénomination',
  'Pair-bonding is formalized through ritual': 'Le lien de couple est formalisé par un rituel',
  'Cyclical celebrations mark the seasons': 'Des célébrations cycliques marquent les saisons',
  'Certain behaviors become culturally forbidden': 'Certains comportements deviennent interdits',
  'Exchange is ritualized to build trust': 'L\'échange est ritualisé pour établir la confiance',
  'Origin stories are recorded in written form': 'Les récits d\'origine sont consignés par écrit',
  'Rules and punishments are written and formalized': 'Les règles et punitions sont formalisées',
  'Members are expected to return favors': 'Les membres sont censés rendre les faveurs',
  "Taking others' possessions is prohibited": 'S\'emparer des biens d\'autrui est interdit',
  'Mating between close relatives is forbidden': 'L\'accouplement entre proches parents est interdit',
  'Elders are addressed with deference': 'Les anciens sont traités avec déférence',
  'Strangers must be offered food and shelter': 'Les étrangers doivent se voir offrir nourriture et abri',
  'Violence against a kin member demands revenge': 'La violence contre un membre de la famille exige vengeance',
  'All able members must contribute to group tasks': 'Tous les membres capables doivent contribuer',
  'The leader resolves disputes': 'Le chef résout les différends',
  'Individual ownership of goods is recognized': 'La propriété individuelle des biens est reconnue',
  'Persistent violators may be driven out': 'Les contrevenants persistants peuvent être chassés',
  'Rules are codified in written form': 'Les règles sont codifiées par écrit',
  'Members contribute a portion of resources to the group': 'Les membres contribuent des ressources au groupe',
  'Agreements between parties are legally binding': 'Les accords entre parties sont contraignants',
  'The moon completes another cycle of phases': 'La lune complète un autre cycle de phases',
  'The sun reaches its extreme position': 'Le soleil atteint sa position extrême',
  'Day and night are of equal length': 'Le jour et la nuit sont de longueur égale',
  'A prominent star rises at sunset': 'Une étoile proéminente se lève au coucher du soleil',
  'The sun is obscured — a solar eclipse': 'Le soleil est obscurci — éclipse solaire',
  'The moon turns blood red — a lunar eclipse': 'La lune devient rouge sang — éclipse lunaire',
  'A wandering star moves against the fixed stars': 'Une étoile errante se déplace à contre-courant',
  'A bright object with a tail crosses the sky': 'Un objet brillant avec une queue traverse le ciel',
  'The phases of the moon can be predicted': 'Les phases de la lune peuvent être prédites',
  'A calendar based on sun and moon positions is developed': 'Un calendrier basé sur les positions du soleil est développé',
  'Named star constellations guide navigation': 'Des constellations d\'étoiles guident la navigation',
  'Solar and lunar eclipses can be predicted': 'Les éclipses peuvent être prédites',
  'A model explains the motion of wandering stars': 'Un modèle explique le mouvement des étoiles errantes',
};

const EXACT_DESC_AR: Record<string, string> = {
  'Spirits inhabit all living things and natural features': 'الأرواح تسكن جميع الكائنات الحية والعناصر الطبيعية',
  'The spirits of ancestors guide and protect the living': 'أرواح الأجداد ترشد وتحمي الأحياء',
  'Selected individuals commune with the spirit world': 'أفراد مختارون يتواصلون مع عالم الأرواح',
  'Multiple deities govern different aspects of existence': 'آلهة متعددة تحكم جوانب مختلفة من الوجود',
  'A single all-powerful deity rules the cosmos': 'إله واحد كلي القدرة يحكم الكون',
  'Abstract reasoning about existence, ethics, and cosmos': 'التفكير المجرد في الوجود والأخلاق والكون',
  'Pigments applied to rock surfaces depict animals and figures': 'الأصباغ على أسطح الصخور تصور الحيوانات والأشكال',
  'Three-dimensional forms carved from stone or bone': 'أشكال ثلاثية الأبعاد منحوتة من الحجر أو العظم',
  'Geometric and figurative patterns adorn ceramic surfaces': 'الأنماط الهندسية تزين الأسطح الخزفية',
  'Woven cloth bears complex repeating patterns': 'القماش المنسوج يحمل أنماطاً متكررة معقدة',
  'Buildings are decorated with carved reliefs and motifs': 'المباني مزينة بالنقوش البارزة والزخارف',
  'Stones and bones struck together in rhythmic patterns': 'الحجارة والعظام تُضرب معاً بأنماط إيقاعية',
  'Sustained pitched vocalizations form melodic sequences': 'الأصوات الصوتية المستدامة تشكل تسلسلات لحنية',
  'A hollow bone with finger holes produces musical tones': 'عظمة مجوفة بثقوب تنتج نغمات موسيقية',
  'A taut cord vibrates to produce musical notes': 'وتر مشدود يتذبذب لإنتاج نغمات',
  'Narrative accounts passed between individuals by spoken word': 'روايات تتناقل بين الأفراد شفهياً',
  'Long rhythmic verse recounts heroic deeds and origins': 'أشعار إيقاعية طويلة تروي الأعمال البطولية',
  'Narrative accounts preserved in written symbols': 'روايات محفوظة في رموز مكتوبة',
  'A consistent greeting gesture develops': 'تطورت إيماءة تحية متسقة',
  'Communal mourning practices emerge for the dead': 'ظهرت ممارسات الحداد الجماعي على الموتى',
  'Food is shared equally among group members': 'يتم توزيع الطعام بالتساوي',
  'Gifts and favors are expected to be returned': 'يُتوقع رد الهدايا والمعروف بالمثل',
  'Different tasks become associated with different sexes': 'تصبح المهام مرتبطة بالجنسين المختلفين',
  'Elders are accorded special respect': 'يُحظى المسنون باحترام خاص',
  'Ceremonial gift-giving strengthens social bonds': 'تبادل الهدايا يعزز الروابط الاجتماعية',
  'Pigments and natural materials used for body adornment': 'الأصباغ والمواد الطبيعية لزينة الجسد',
  'Oral narratives preserve group memory and values': 'الروايات الشفهية تحفظ ذاكرة المجموعة وقيمها',
  'Rhythmic percussion emerges as social bonding activity': 'الإيقاع يظهر كنشاط للترابط الاجتماعي',
  'Coordinated movement used in group ceremonies': 'الحركة المنسقة في الاحتفالات الجماعية',
  'Birth is marked with naming rites': 'تُحيَّا الولادة بطقوس التسمية',
  'Pair-bonding is formalized through ritual': 'يتم تنظيم الارتباط رسمياً من خلال الطقوس',
  'Cyclical celebrations mark the seasons': 'الاحتفالات الدورية تعلم الفصول',
  'Certain behaviors become culturally forbidden': 'تصبح سلوكيات معينة محظورة ثقافياً',
  'Exchange is ritualized to build trust': 'يتم تحويل التبادل إلى طقوس لبناء الثقة',
  'Origin stories are recorded in written form': 'قصص الأصل يتم تسجيلها كتابياً',
  'Rules and punishments are written and formalized': 'القواعد والعقوبات تُكتب وتُرسَّم رسمياً',
  'Members are expected to return favors': 'يُتوقع من الأعضاء رد المعروف بالمثل',
  "Taking others' possessions is prohibited": 'أخذ ممتلكات الآخرين محظور',
  'Mating between close relatives is forbidden': 'التزاوج بين الأقارب المقربين محظور',
  'Elders are addressed with deference': 'يُخاطب المسنون بتبجيل',
  'Strangers must be offered food and shelter': 'يجب تقديم الطعام والمأوى للغرباء',
  'Violence against a kin member demands revenge': 'العنف ضد أحد أفراد العائلة يستوجب الانتقام',
  'All able members must contribute to group tasks': 'جميع الأعضاء القادرين يجب أن يساهموا',
  'The leader resolves disputes': 'القائد يحل النزاعات',
  'Individual ownership of goods is recognized': 'تُعترف بالملكية الفردية للبضائع',
  'Persistent violators may be driven out': 'قد يُطرد المخالفون المستمرون',
  'Rules are codified in written form': 'القواعد مُقنَّنة كتابياً',
  'Members contribute a portion of resources to the group': 'الأعضاء يساهمون بجزء من الموارد',
  'Agreements between parties are legally binding': 'الاتفاقيات بين الأطراف ملزمة قانونياً',
  'The moon completes another cycle of phases': 'القمر يكمل دورة أخرى من مراحله',
  'The sun reaches its extreme position': 'تصل الشمس إلى موضعها الأقصى',
  'Day and night are of equal length': 'النهار والليل متساويان في الطول',
  'A prominent star rises at sunset': 'نجم بارز يشرق عند غروب الشمس',
  'The sun is obscured — a solar eclipse': 'الشمس تُحجب — كسوف الشمس',
  'The moon turns blood red — a lunar eclipse': 'القمر يتحول إلى الأحمر — خسوف القمر',
  'A wandering star moves against the fixed stars': 'نجم سيار يتحرك عكس النجوم الثابتة',
  'A bright object with a tail crosses the sky': 'جسم مضيء بذيل يعبر السماء',
  'The phases of the moon can be predicted': 'يمكن التنبؤ بمراحل القمر',
  'A calendar based on sun and moon positions is developed': 'تم تطوير تقويم يستند إلى مواضع الشمس والقمر',
  'Named star constellations guide navigation': 'كوكبات النجوم المسماة تُرشد الملاحة',
  'Solar and lunar eclipses can be predicted': 'يمكن التنبؤ بكسوف الشمس وخسوف القمر',
  'A model explains the motion of wandering stars': 'نموذج يفسر حركة النجوم السيارة',
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
  if (lang === 'en') return desc;

  if (lang === 'tr') {
  const EXACT: Record<string, string> = {
    ...BELIEF_DESC_TR,
    ...ART_DESC_TR,
    ...CULTURE_DESC_TR,
    ...LAW_DESC_TR,
    ...ASTRO_DESC_TR,
  };
  if (EXACT[desc]) return EXACT[desc];

  return desc
    .replace(/^(.+) died: (.+)$/, (_: string, person: string, cause: string) =>
      `${person} öldü: ${CAUSE_TR[cause] ?? cause.replace(/_/g, ' ')}`)
    .replace(/^Born: (.+) \((.+) & (.+)\)$/, (_: string, bornName: string, p1: string, p2: string) =>
      `Doğdu: ${bornName} (${p1} & ${p2})`)
    .replace(/^Born: (.+)$/, (_: string, bornName: string) => `Doğdu: ${bornName}`)
    .replace('New individual born', 'Yeni birey doğdu')
    .replace('Individual died: starvation',  'Birey açlıktan öldü')
    .replace('Individual died: dehydration', 'Birey susuzluktan öldü')
    .replace('Individual died: old_age',     'Birey yaşlılıktan öldü')
    .replace('Individual died: predator',    'Birey yırtıcı tarafından öldürüldü')
    .replace(/Individual died: (.+)/, (_: string, cause: string) =>
      `Birey öldü: ${CAUSE_TR[cause] ?? cause.replace(/_/g, ' ')}`)
    .replace(/Technology discovered: fire making/i,   'Teknoloji keşfedildi: Ateş Yakma')
    .replace(/Technology discovered: water container/i,'Teknoloji keşfedildi: Su Kabı')
    .replace(/Technology discovered: fishing/i,        'Teknoloji keşfedildi: Balıkçılık')
    .replace(/Technology discovered: foraging/i,       'Teknoloji keşfedildi: Toplayıcılık')
    .replace(/Technology discovered: stone_tools/i,    'Teknoloji keşfedildi: Taş Aletler')
    .replace(/Technology discovered: (.+)/i, (_: string, tech: string) => {
      const key = tech.trim();
      return `Teknoloji keşfedildi: ${TECH_TR[key] ?? TECH_TR[key.replace(/_/g, ' ')] ?? key.replace(/_/g, ' ')}`;
    })
    .replace(/^A (.+) outbreak begins$/, (_: string, pathogen: string) => {
      const key = pathogen.replace(/_/g, ' ').trim();
      return `${PATHOGEN_TR[key] ?? key} salgını başladı`;
    })
    .replace(/^(.+) completes a (.+)$/, (_: string, settlement: string, structure: string) => {
      const sKey = structure.replace(/_/g, ' ').trim();
      const settlementTr = settlement === 'The settlement' ? 'Yerleşim' : settlement;
      return `${settlementTr}, ${STRUCTURE_TR[sKey] ?? sKey} inşaatını tamamladı`;
    })
    .replace(/^(.+) is overcrowded \((\d+) of (\d+) capacity\)$/, (_: string, settlement: string, cur: string, cap: string) => {
      const settlementTr = settlement === 'The settlement' ? 'Yerleşim' : settlement;
      return `${settlementTr} doldu taştı — ${cur} birey, kapasite: ${cap}`;
    })
    .replace(/^(.+) killed (\d+) individuals?$/, (_: string, type: string, count: string) => {
      const typeKey = type.toLowerCase().trim();
      return `${DISASTER_TR[typeKey] ?? type}, ${count} bireyi öldürdü`;
    })
    .replace(/killed (\d+) individuals?/, (_: string, count: string) => `${count} bireyi öldürdü`)
    .replace(/^A (.+) ritual emerges in the group$/, (_: string, belief: string) => {
      const key = belief.replace(/_/g, ' ').trim();
      return `Grupta ${BELIEF_TYPE_TR[key] ?? BELIEF_TYPE_TR[belief] ?? key} ritüeli ortaya çıktı`;
    })
    .replace(/(.+) language stage advanced to (.+)/, (_: string, person: string, stage: string) =>
      `${person} dil aşamasını ${stage} seviyesine ilerletti`)
    .replace(/^Culture event: (.+)$/,      (_: string, v: string) => `Kültür olayı: ${v.replace(/_/g, ' ')}`)
    .replace(/^Art event: (.+)$/,          (_: string, v: string) => `Sanat olayı: ${v.replace(/_/g, ' ')}`)
    .replace(/^Astronomy event: (.+)$/,    (_: string, v: string) => `Astronomi olayı: ${v.replace(/_/g, ' ')}`)
    .replace(/^Architecture event: (.+)$/, (_: string, v: string) => `Mimari olay: ${v.replace(/_/g, ' ')}`)
    .replace(/^Law event: (.+)$/,          (_: string, v: string) => `Hukuk olayı: ${v.replace(/_/g, ' ')}`)
    .replace(/^Microbiome event: (.+)$/,   (_: string, v: string) => `Mikrobiyom olayı: ${v.replace(/_/g, ' ')}`)
    .replace(/^Epigenetics event: (.+)$/,  (_: string, v: string) => `Epigenetik olay: ${v.replace(/_/g, ' ')}`)
    .replace(/^(.+) jest ile (.+)'a iletişim kurdu$/, (_: string, a: string, b: string) => `${a}, ${b}'a jest yaptı`)
    .replace(/^Norm emerged: (.+)$/, (_: string, v: string) => `Norm oluştu: ${v.replace(/_/g, ' ')}`)
    .replace(/^Norm violated: (.+)$/, (_: string, v: string) => `Norm ihlal edildi: ${v.replace(/_/g, ' ')}`)
    .replace(/^(.+) is (searching for food|looking for water|resting)$/, (_: string, name: string, action: string) => {
      const map: Record<string, string> = { 'searching for food': 'yiyecek arıyor', 'looking for water': 'su arıyor', 'resting': 'dinleniyor' };
      return `${name} ${map[action] ?? action}`;
    });
  }

  if (lang === 'de') {
    if (EXACT_DESC_DE[desc]) return EXACT_DESC_DE[desc];
    const deathMatch = desc.match(/^(.+) died: (.+)$/);
    const birthMatch = desc.match(/^Born: (.+) \((.+) & (.+)\)$/);
    const techMatch = desc.match(/^Technology discovered: (.+)$/i);
    const diseaseMatch = desc.match(/^A (.+) outbreak begins$/);
    const disasterMatch = desc.match(/^(.+) killed (\d+) individuals?$/);
    const settlementMatch = desc.match(/^(.+) completes a (.+)$/);
    const ritualMatch = desc.match(/^A (.+) ritual emerges in the group$/);
    const langStageMatch = desc.match(/^(.+) language stage advanced to (.+)$/);
    if (deathMatch) {
      const [, person, cause] = deathMatch;
      return `${person} starb: ${CAUSE_DE[cause] ?? cause.replace(/_/g, ' ')}`;
    }
    if (birthMatch) {
      const [, bornName, p1, p2] = birthMatch;
      return `Geboren: ${bornName} (${p1} & ${p2})`;
    }
    if (techMatch) return `Technologie entdeckt: ${techMatch[1]}`;
    if (diseaseMatch) return `Ein ${diseaseMatch[1]}-Ausbruch beginnt`;
    if (disasterMatch) {
      const [, name, count] = disasterMatch;
      return `${DISASTER_DE[name.toLowerCase().trim()] ?? name} tötete ${count} Personen`;
    }
    if (settlementMatch) {
      const [, settlement, structure] = settlementMatch;
      return `${settlement} baute ein ${structure}`;
    }
    if (ritualMatch) return `Ein ${ritualMatch[1]}-Ritual entstand in der Gruppe`;
    if (langStageMatch) {
      const [, person, stage] = langStageMatch;
      return `${person} hat die Sprachstufe auf ${stage} vorgerückt`;
    }
    return desc
      .replace('Culture event:', 'Kulturereignis:')
      .replace('Art event:', 'Kunstereignis:')
      .replace('Astronomy event:', 'Astronomieereignis:')
      .replace('Architecture event:', 'Architekturerreignis:')
      .replace('Law event:', 'Rechtsereignis:')
      .replace('Microbiome event:', 'Mikrobiomereignis:')
      .replace('Epigenetics event:', 'Epigenetikereignis:');
  }

  if (lang === 'fr') {
    if (EXACT_DESC_FR[desc]) return EXACT_DESC_FR[desc];
    const deathMatch = desc.match(/^(.+) died: (.+)$/);
    const birthMatch = desc.match(/^Born: (.+) \((.+) & (.+)\)$/);
    const techMatch = desc.match(/^Technology discovered: (.+)$/i);
    const diseaseMatch = desc.match(/^A (.+) outbreak begins$/);
    const disasterMatch = desc.match(/^(.+) killed (\d+) individuals?$/);
    const settlementMatch = desc.match(/^(.+) completes a (.+)$/);
    const ritualMatch = desc.match(/^A (.+) ritual emerges in the group$/);
    const langStageMatch = desc.match(/^(.+) language stage advanced to (.+)$/);
    if (deathMatch) {
      const [, person, cause] = deathMatch;
      return `${person} est décédé: ${CAUSE_FR[cause] ?? cause.replace(/_/g, ' ')}`;
    }
    if (birthMatch) {
      const [, bornName, p1, p2] = birthMatch;
      return `Né: ${bornName} (${p1} & ${p2})`;
    }
    if (techMatch) return `Technologie découverte: ${techMatch[1]}`;
    if (diseaseMatch) return `Une épidémie de ${diseaseMatch[1]} commence`;
    if (disasterMatch) {
      const [, name, count] = disasterMatch;
      return `${DISASTER_FR[name.toLowerCase().trim()] ?? name} a tué ${count} personnes`;
    }
    if (settlementMatch) {
      const [, settlement, structure] = settlementMatch;
      return `${settlement} a construit un ${structure}`;
    }
    if (ritualMatch) return `Un rituel ${ritualMatch[1]} est apparu dans le groupe`;
    if (langStageMatch) {
      const [, person, stage] = langStageMatch;
      return `${person} a avancé l'étape linguistique à ${stage}`;
    }
    return desc
      .replace('Culture event:', 'Événement culturel:')
      .replace('Art event:', 'Événement artistique:')
      .replace('Astronomy event:', 'Événement astronomique:')
      .replace('Architecture event:', 'Événement architectural:')
      .replace('Law event:', 'Événement juridique:')
      .replace('Microbiome event:', 'Événement microbiotique:')
      .replace('Epigenetics event:', 'Événement épigénétique:');
  }

  if (lang === 'ar') {
    if (EXACT_DESC_AR[desc]) return EXACT_DESC_AR[desc];
    const deathMatch = desc.match(/^(.+) died: (.+)$/);
    const birthMatch = desc.match(/^Born: (.+) \((.+) & (.+)\)$/);
    const techMatch = desc.match(/^Technology discovered: (.+)$/i);
    const diseaseMatch = desc.match(/^A (.+) outbreak begins$/);
    const disasterMatch = desc.match(/^(.+) killed (\d+) individuals?$/);
    const settlementMatch = desc.match(/^(.+) completes a (.+)$/);
    const ritualMatch = desc.match(/^A (.+) ritual emerges in the group$/);
    const langStageMatch = desc.match(/^(.+) language stage advanced to (.+)$/);
    if (deathMatch) {
      const [, person, cause] = deathMatch;
      return `مات ${person}: ${CAUSE_AR[cause] ?? cause.replace(/_/g, ' ')}`;
    }
    if (birthMatch) {
      const [, bornName, p1, p2] = birthMatch;
      return `وُلد: ${bornName} (${p1} & ${p2})`;
    }
    if (techMatch) return `اكتُشفت تقنية: ${techMatch[1]}`;
    if (diseaseMatch) return `بدأ تفشي ${diseaseMatch[1]}`;
    if (disasterMatch) {
      const [, name, count] = disasterMatch;
      return `قتلت ${DISASTER_AR[name.toLowerCase().trim()] ?? name} ${count} أفراداً`;
    }
    if (settlementMatch) {
      const [, settlement, structure] = settlementMatch;
      return `أكمل ${settlement} بناء ${structure}`;
    }
    if (ritualMatch) return `ظهرت طقوس ${ritualMatch[1]} في المجموعة`;
    if (langStageMatch) {
      const [, person, stage] = langStageMatch;
      return `تقدم ${person} في مرحلة اللغة إلى ${stage}`;
    }
    return desc
      .replace('Culture event:', 'حدث ثقافي:')
      .replace('Art event:', 'حدث فني:')
      .replace('Astronomy event:', 'حدث فلكي:')
      .replace('Architecture event:', 'حدث معماري:')
      .replace('Law event:', 'حدث قانوني:')
      .replace('Microbiome event:', 'حدث ميكروبيومي:')
      .replace('Epigenetics event:', 'حدث جيني:');
  }

  return desc;
}

export function translateEventType(type: string, lang: LangCode): string {
  const key = String(type ?? '').toLowerCase();
  const labels: Record<string, TranslationMap> = {
    birth:        { tr: 'doğum',      en: 'birth',         de: 'Geburt',        fr: 'naissance',       ar: 'ولادة' },
    death:        { tr: 'ölüm',       en: 'death',         de: 'Tod',           fr: 'mort',            ar: 'وفاة' },
    technology:   { tr: 'teknoloji',  en: 'technology',    de: 'Technologie',   fr: 'technologie',     ar: 'تكنولوجيا' },
    language:     { tr: 'dil',        en: 'language',      de: 'Sprache',       fr: 'langue',          ar: 'لغة' },
    discovery:    { tr: 'keşif',      en: 'discovery',     de: 'Entdeckung',    fr: 'découverte',      ar: 'اكتشاف' },
    disaster:     { tr: 'afet',       en: 'disaster',      de: 'Katastrophe',   fr: 'catastrophe',     ar: 'كارثة' },
    belief:       { tr: 'inanç',      en: 'belief',        de: 'Glaube',        fr: 'croyance',        ar: 'معتقد' },
    culture:      { tr: 'kültür',     en: 'culture',       de: 'Kultur',        fr: 'culture',         ar: 'ثقافة' },
    art:          { tr: 'sanat',      en: 'art',           de: 'Kunst',         fr: 'art',             ar: 'فن' },
    astronomy:    { tr: 'astronomi',  en: 'astronomy',     de: 'Astronomie',    fr: 'astronomie',      ar: 'علم الفلك' },
    architecture: { tr: 'mimari',     en: 'architecture',  de: 'Architektur',   fr: 'architecture',    ar: 'عمارة' },
    law:          { tr: 'hukuk',      en: 'law',           de: 'Recht',         fr: 'droit',           ar: 'قانون' },
    microbiome:   { tr: 'mikrobiyom', en: 'microbiome',    de: 'Mikrobiom',     fr: 'microbiome',      ar: 'ميكروبيوم' },
    epigenetics:  { tr: 'epigenetik', en: 'epigenetics',   de: 'Epigenetik',    fr: 'épigénétique',    ar: 'علم التخلق' },
    epidemic:     { tr: 'salgın',     en: 'epidemic',      de: 'Epidemie',      fr: 'épidémie',        ar: 'وباء' },
    ritual:       { tr: 'ritüel',     en: 'ritual',        de: 'Ritual',        fr: 'rituel',          ar: 'طقوس' },
    trade:        { tr: 'ticaret',    en: 'trade',         de: 'Handel',        fr: 'commerce',        ar: 'تجارة' },
    celestial:    { tr: 'göksel',     en: 'celestial',     de: 'Himmlisch',     fr: 'céleste',         ar: 'سماوي' },
    social:       { tr: 'sosyal',     en: 'social',        de: 'Sozial',        fr: 'social',          ar: 'اجتماعي' },
    norm:         { tr: 'norm',       en: 'norm',          de: 'Norm',          fr: 'norme',           ar: 'معيار' },
    weather:      { tr: 'hava',       en: 'weather',       de: 'Wetter',        fr: 'météo',           ar: 'طقس' },
    communication:{ tr: 'iletişim',   en: 'communication', de: 'Kommunikation', fr: 'communication',   ar: 'تواصل' },
    thought:      { tr: 'düşünce',    en: 'thought',       de: 'Gedanke',       fr: 'pensée',          ar: 'فكر' },
    sleep:        { tr: 'uyku',       en: 'sleep',         de: 'Schlaf',        fr: 'sommeil',         ar: 'نوم' },
    activity:     { tr: 'etkinlik',   en: 'activity',      de: 'Aktivität',     fr: 'activité',        ar: 'نشاط' },
    mating:       { tr: 'çiftleşme',  en: 'mating',        de: 'Paarung',       fr: 'accouplement',    ar: 'تزاوج' },
    conflict:     { tr: 'çatışma',    en: 'conflict',      de: 'Konflikt',      fr: 'conflit',         ar: 'نزاع' },
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
