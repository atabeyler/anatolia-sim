import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { translateEventDescription, type LangCode } from '../../utils/i18n';

const LANGUAGE_STAGES = [
  { id: 0, name: 'Pre-linguistic',  nameTr: 'Dil Öncesi',      desc: 'No symbolic communication',        descTr: 'Sembolik iletişim yok',               color: '#8898c8' },
  { id: 1, name: 'Gestural',        nameTr: 'Jestsel',          desc: 'Pointing, body language',           descTr: 'İşaret, beden dili',                  color: '#8b7355' },
  { id: 2, name: 'Emotional Sound', nameTr: 'Duygusal Ses',     desc: 'Shared emotional vocalizations',    descTr: 'Ortak duygusal sesler',               color: '#6b8e23' },
  { id: 3, name: 'Proto-Words',     nameTr: 'Proto-Kelimeler',  desc: 'Consistent sound-meaning pairs',    descTr: 'Tutarlı ses-anlam eşleşmeleri',       color: '#4682b4' },
  { id: 4, name: 'Syntax',          nameTr: 'Sözdizimi',        desc: 'Grammar emerges',                   descTr: 'Dilbilgisi ortaya çıkıyor',            color: '#9370db' },
  { id: 5, name: 'Abstract',        nameTr: 'Soyut',            desc: 'Concepts beyond immediate world',   descTr: 'Anlık dünyayı aşan kavramlar',        color: '#cd853f' },
  { id: 6, name: 'Writing',         nameTr: 'Yazı',             desc: 'Symbolic recording of language',    descTr: 'Dilin sembolik kaydı',                color: '#daa520' },
];

const C_CLASSES = [
  ['m', 'n', 'ng', 'w'],
  ['p', 't', 'k', 'b'],
  ['d', 'g', 'r', 'l'],
  ['s', 'z', 'sh', 'h'],
  ['f', 'v', 'th', 'y'],
  ['ts', 'nd', 'mb', 'rl'],
];

const V_SYSTEMS = [
  ['a', 'i', 'u'],
  ['a', 'e', 'i', 'o', 'u'],
  ['a', 'o', 'e', 'ai', 'ou'],
  ['a', 'i', 'u', 'an', 'el', 'ar'],
];

const BIOME_C_BIAS: Record<string, number> = {
  mediterranean: 0,
  coastal: 1,
  tropical_rainforest: 2,
  tropical_savanna: 2,
  temperate_forest: 3,
  boreal_forest: 4,
  tundra: 4,
  mountain: 3,
  grassland: 1,
  desert: 0,
};

function buildPhonology(phonologySeed: number, biome = 'mediterranean') {
  const s = Math.abs(phonologySeed | 0);
  const biomeBias = BIOME_C_BIAS[biome] ?? 0;
  const c1 = C_CLASSES[(s + biomeBias) % C_CLASSES.length];
  const c2 = C_CLASSES[(s * 3 + biomeBias + 2) % C_CLASSES.length];
  const c3 = C_CLASSES[(s * 7 + 1) % C_CLASSES.length];
  const vowels = V_SYSTEMS[(s * 5 + biomeBias) % V_SYSTEMS.length];
  const clanSuffix = c3.slice(0, 3).map(c => c + vowels[0]);
  return {
    consonants: [...new Set([...c1, ...c2])],
    vowels,
    clanSuffix,
  };
}

function buildSurfaceForms(phonology: ReturnType<typeof buildPhonology>, stage: number) {
  const consonants = phonology.consonants;
  const vowels = phonology.vowels;
  const forms: string[] = [];

  if (stage >= 2) {
    forms.push(...vowels.slice(0, 3));
  }

  if (stage >= 3) {
    for (const c of consonants.slice(0, 3)) {
      for (const v of vowels.slice(0, 3)) forms.push(`${c}${v}`);
    }
  }

  if (stage >= 4) {
    for (const c of consonants.slice(0, 2)) {
      for (const v of vowels.slice(0, 2)) forms.push(`${c}${v}${c}`);
    }
  }

  if (stage >= 5) {
    for (const c of consonants.slice(0, 2)) {
      forms.push(`${c}${vowels[0]}-${c}${vowels[1] ?? vowels[0]}`);
    }
  }

  if (stage >= 6) {
    forms.push(...phonology.clanSuffix);
  }

  return [...new Set(forms)].slice(0, 9);
}

function channelLabel(stage: number, lang: 'tr' | 'en') {
  const item = LANGUAGE_STAGES[stage];
  return lang === 'tr' ? item.nameTr : item.name;
}

export default function LanguagePanel() {
  const { stats, events, lang, currentSim } = useSimStore();

  const currentStage = Math.max(0, Math.min(6, stats?.max_language_stage ?? 0));
  const langEvents = events.filter(e => e.event_type === 'language' || e.event_type === 'word' || e.event_type?.includes?.('language'));
  const worldState = currentSim?.world_state ?? {};
  const phonologySeed = Number(worldState.phonology_seed ?? 0);
  const biome = String(worldState.biome ?? 'mediterranean');
  const phonology = buildPhonology(phonologySeed, biome);
  const surfaceForms = buildSurfaceForms(phonology, currentStage);
  const nextStage = currentStage < LANGUAGE_STAGES.length - 1 ? LANGUAGE_STAGES[currentStage + 1] : null;

  return (
    <DetailPanel panelId="language" title="Language" titleTr="Dil">
      <div className="bg-sim-surface rounded-lg p-3 mb-2">
        <div className="text-sim-muted text-sm mb-1">{lang === 'en' ? 'Current Stage' : 'Mevcut Aşama'}</div>
        <div className="text-sim-gold font-bold text-base">
          Stage {currentStage}: {lang === 'en' ? LANGUAGE_STAGES[currentStage].name : LANGUAGE_STAGES[currentStage].nameTr}
        </div>
        <div className="text-sim-muted text-sm mt-1">{lang === 'tr' ? LANGUAGE_STAGES[currentStage].descTr : LANGUAGE_STAGES[currentStage].desc}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <div className="bg-sim-surface/70 rounded-lg p-3 border border-sim-border/40">
          <div className="text-sim-muted text-xs uppercase tracking-widest mb-2">{lang === 'en' ? 'Actual Phonology' : 'Gerçek Ses Envanteri'}</div>
          <div className="text-xs text-sim-text mb-1">{lang === 'tr' ? 'Ünsüzler' : 'Consonants'}</div>
          <div className="flex flex-wrap gap-1 mb-2">
            {phonology.consonants.map(item => (
              <span key={item} className="px-2 py-0.5 rounded bg-sim-accent/10 text-sim-text text-xs border border-sim-accent/20">
                {item}
              </span>
            ))}
          </div>
          <div className="text-xs text-sim-text mb-1">{lang === 'tr' ? 'Ünlüler' : 'Vowels'}</div>
          <div className="flex flex-wrap gap-1">
            {phonology.vowels.map(item => (
              <span key={item} className="px-2 py-0.5 rounded bg-sim-gold/10 text-sim-text text-xs border border-sim-gold/20">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-sim-surface/70 rounded-lg p-3 border border-sim-border/40">
          <div className="text-sim-muted text-xs uppercase tracking-widest mb-2">{lang === 'en' ? 'Stage Channel' : 'Aşama Kanalı'}</div>
          <div className="text-sim-text text-sm mb-2">
            {lang === 'tr' ? channelLabel(currentStage, 'tr') : channelLabel(currentStage, 'en')}
          </div>
          <div className="text-sim-muted text-xs leading-relaxed">
            {lang === 'tr' ? LANGUAGE_STAGES[currentStage].descTr : LANGUAGE_STAGES[currentStage].desc}
          </div>
        </div>

        <div className="bg-sim-surface/70 rounded-lg p-3 border border-sim-border/40">
          <div className="text-sim-muted text-xs uppercase tracking-widest mb-2">{lang === 'en' ? 'Surface Forms' : 'Yüzey Biçimleri'}</div>
          <div className="flex flex-wrap gap-1">
            {surfaceForms.length === 0 ? (
              <span className="text-sim-muted text-xs italic">
                {lang === 'tr' ? 'Henüz kalıcı ses biçimi yok.' : 'No stable surface forms yet.'}
              </span>
            ) : surfaceForms.map(item => (
              <span key={item} className="px-2 py-0.5 rounded bg-sim-green/10 text-sim-text text-xs border border-sim-green/20">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-sim-surface/50 rounded-lg p-3 mb-3 border border-sim-border/30">
        <div className="text-sim-muted text-xs uppercase tracking-widest mb-1">
          {lang === 'en' ? 'What This Stage Can Do' : 'Bu Aşamanın Yapabildikleri'}
        </div>
        <div className="text-sim-text text-sm leading-relaxed">
          {lang === 'tr' ? LANGUAGE_STAGES[currentStage].descTr : LANGUAGE_STAGES[currentStage].desc}
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Stage Progression' : 'Aşama İlerlemesi'}
        </h4>
        <div className="space-y-2">
          {LANGUAGE_STAGES.map(stage => {
            const isReached = stage.id <= currentStage;
            const isCurrent = stage.id === currentStage;
            return (
              <div
                key={stage.id}
                className={`flex items-start gap-3 p-2 rounded ${
                  isCurrent ? 'bg-sim-accent/20 border border-sim-accent/40' :
                  isReached ? 'bg-sim-surface/50' : 'opacity-40'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: isReached ? stage.color : '#5a6a7a' }}
                />
                <div>
                  <div className={`text-sm font-medium ${isReached ? 'text-sim-text' : 'text-sim-muted'}`}>
                    {lang === 'en' ? stage.name : stage.nameTr}
                  </div>
                  <div className="text-sim-muted text-sm">{lang === 'tr' ? stage.descTr : stage.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {nextStage && (
        <div className="bg-sim-surface/50 rounded-lg p-3 mb-3 border border-sim-border/30">
          <div className="text-sim-muted text-xs uppercase tracking-widest mb-1">
            {lang === 'en' ? 'Next Unlock' : 'Sonraki Açılım'}
          </div>
          <div className="text-sim-text text-sm">
            {lang === 'tr' ? nextStage.nameTr : nextStage.name}: {lang === 'tr' ? nextStage.descTr : nextStage.desc}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Language Events' : 'Dil Olayları'}
        </h4>
        {langEvents.length === 0 ? (
          <p className="text-sim-muted italic">{lang === 'en' ? 'No language events yet.' : 'Henüz dil olayı yok.'}</p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {langEvents.slice(0, 10).map((ev, i) => (
              <div key={i} className="text-sim-muted text-sm py-0.5 border-b border-sim-border/30">
                {translateEventDescription(ev.description ?? '', lang as LangCode, ev)}
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}
