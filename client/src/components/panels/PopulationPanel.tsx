import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useSimStore } from '../../store/simStore';
import DetailPanel from './DetailPanel';
import { Users, MapPin, ChevronRight, X, ChevronDown } from 'lucide-react';
import { text, type LangCode } from '../../utils/i18n';

// Anatolian-inspired procedural name generation
const MALE_NAMES = ['Arak','Katan','Talur','Muran','Dalan','Korun','Baran','Tekum','Yaran','Atuk',
  'Katam','Saran','Turan','Urak','Elam','Furuk','Garan','Hatan','İlun','Kuram',
  'Larun','Matan','Naran','Oran','Parak','Ratan','Satan','Tukan','Uran','Varak'];
const FEMALE_NAMES = ['Ela','Sera','Kaya','Mara','Sina','Tala','Nura','Bera','Arya','Lara',
  'Elara','Serana','Kayira','Mirana','Sinara','Talara','Nurala','Berara','Aryala','Larara',
  'Esma','Ferda','Gülün','Hara','İlara','Kiran','Liran','Miran','Niran','Orana'];

const CAUSE_I18N: Record<string, { tr: string; en: string; de: string; fr: string; ar: string }> = {
  starvation:           { tr: 'Açlık',                  en: 'Starvation',          de: 'Verhungern',         fr: 'Famine',               ar: 'مجاعة'           },
  dehydration:          { tr: 'Susuzluk',               en: 'Dehydration',         de: 'Austrocknung',       fr: 'Déshydratation',       ar: 'جفاف'            },
  old_age:              { tr: 'Yaşlılık',               en: 'Old age',             de: 'Alter',              fr: 'Vieillesse',           ar: 'الشيخوخة'        },
  predator:             { tr: 'Yırtıcı hayvan',         en: 'Predator',            de: 'Raubtier',           fr: 'Prédateur',            ar: 'حيوان مفترس'     },
  genetic_disease:      { tr: 'Genetik hastalık',       en: 'Genetic disease',     de: 'Erbkrankheit',       fr: 'Maladie génétique',    ar: 'مرض وراثي'       },
  infection:            { tr: 'Enfeksiyon',             en: 'Infection',           de: 'Infektion',          fr: 'Infection',            ar: 'عدوى'            },
  trauma:               { tr: 'Travma',                 en: 'Trauma',              de: 'Trauma',             fr: 'Traumatisme',          ar: 'صدمة'            },
  birth_complications:  { tr: 'Doğum komplikasyonu',   en: 'Birth complications', de: 'Geburtskomplikation',fr: 'Complications accouchement', ar: 'مضاعفات الولادة' },
  conflict:             { tr: 'Çatışma',                en: 'Conflict',            de: 'Konflikt',           fr: 'Conflit',              ar: 'صراع'            },
  unknown:              { tr: 'Bilinmeyen',             en: 'Unknown',             de: 'Unbekannt',          fr: 'Inconnu',              ar: 'مجهول'           },
};

function causeLabel(cause: string | null | undefined, lang: string): string {
  if (!cause) return text(lang as LangCode, { tr: 'Bilinmeyen', en: 'Unknown', de: 'Unbekannt', fr: 'Inconnu', ar: 'مجهول' });
  const entry = CAUSE_I18N[cause];
  if (entry) return text(lang as LangCode, entry);
  return cause.replace(/_/g, ' ');
}

function nameFromId(id: string, sex: string, storedName?: string | null): string {
  if (storedName) return storedName;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(31, h) + id.charCodeAt(i) | 0;
  const abs = Math.abs(h);
  return sex === 'male' ? MALE_NAMES[abs % MALE_NAMES.length] : FEMALE_NAMES[abs % FEMALE_NAMES.length];
}

function lifeStage(age: number, lang: string): { label: string; color: string } {
  if (age < 2)  return { label: text(lang as LangCode, { en: 'Infant',  tr: 'Bebek'    }), color: '#00d4ff' };
  if (age < 12) return { label: text(lang as LangCode, { en: 'Child',   tr: 'Çocuk'    }), color: '#4ecb71' };
  if (age < 18) return { label: text(lang as LangCode, { en: 'Youth',   tr: 'Genç'     }), color: '#a0b4ff' };
  if (age < 45) return { label: text(lang as LangCode, { en: 'Adult',   tr: 'Yetişkin' }), color: '#d4a838' };
  return            { label: text(lang as LangCode, { en: 'Elder',   tr: 'Yaşlı'    }), color: '#e05a5a' };
}

function traitBar(value: number, color: string) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(79,110,247,0.1)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function isAlive(obj: any) { return obj && obj.alive !== false && !obj.is_dead; }

function PersonRow({ obj, fallbackId, tag, lang }: { obj?: any; fallbackId?: string; tag?: string; lang: string }) {
  if (!obj && !fallbackId) return null;
  const alive = isAlive(obj);
  const isMale = obj?.sex === 'male';
  const nameColor = alive ? (isMale ? '#8ab0ff' : '#ffaac8') : '#7a4a4a';
  const dotColor  = alive ? (isMale ? '#6090ff' : '#ff8ab0') : '#a05050';
  const displayName = obj
    ? nameFromId(obj.id, obj.sex, obj.phenotype?.name ?? obj.name)
    : `ID:${fallbackId?.slice(-6)}`;
  return (
    <div className="flex items-center gap-1.5 mb-0.5" style={{ paddingLeft: 10 }}>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
      <span className="font-share-tech" style={{ fontSize: 12, color: nameColor }}>{displayName}</span>
      {tag && <span className="font-share-tech" style={{ fontSize: 12, color: '#8abda0', marginLeft: 2 }}>{tag}</span>}
      {obj && (
        alive
          ? <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>{parseFloat(obj.age_years ?? 0).toFixed(0)}{text(lang as LangCode, { en: ' yr', tr: ' yaş' })}</span>
          : <span className="font-share-tech" style={{ fontSize: 12, color: '#a05050' }}>
              † {obj.death_cause ? causeLabel(obj.death_cause, lang) : text(lang as LangCode, { en: 'dec.', tr: 'ölü' })}
            </span>
      )}
      {!obj && <span className="font-share-tech" style={{ fontSize: 12, color: '#a05050' }}>† {text(lang as LangCode, { en: 'dec.', tr: 'ölü' })}</span>}
    </div>
  );
}

function FamilySection({ label, indent, children }: { label: string; indent: number; children: React.ReactNode }) {
  return (
    <div className="mb-2" style={{ marginLeft: indent * 8 }}>
      <div style={{ fontSize: 12, color: '#8abda0', letterSpacing: '0.08em', marginBottom: 3, borderLeft: '1px solid rgba(160,200,176,0.3)', paddingLeft: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const EYE_COLORS: Record<string, { dot: string; labelTr: string; labelEn: string; labelDe: string; labelFr: string; labelAr: string }> = {
  brown:  { dot: '#7a4a1e', labelTr: 'Kahverengi', labelEn: 'Brown', labelDe: 'Braun',      labelFr: 'Marron',   labelAr: 'بني'    },
  blue:   { dot: '#3a8ad4', labelTr: 'Mavi',        labelEn: 'Blue',  labelDe: 'Blau',       labelFr: 'Bleu',     labelAr: 'أزرق'   },
  green:  { dot: '#3a9a4a', labelTr: 'Yeşil',       labelEn: 'Green', labelDe: 'Grün',       labelFr: 'Vert',     labelAr: 'أخضر'   },
  hazel:  { dot: '#8a6a2e', labelTr: 'Ela',         labelEn: 'Hazel', labelDe: 'Haselnuss',  labelFr: 'Noisette', labelAr: 'بندقي'  },
};
const HAIR_COLORS: Record<string, { dot: string; labelTr: string; labelEn: string; labelDe: string; labelFr: string; labelAr: string }> = {
  dark:   { dot: '#2a1a08', labelTr: 'Koyu', labelEn: 'Dark',   labelDe: 'Dunkel', labelFr: 'Foncé', labelAr: 'داكن'   },
  medium: { dot: '#6a3a18', labelTr: 'Orta', labelEn: 'Medium', labelDe: 'Mittel', labelFr: 'Moyen', labelAr: 'متوسط'  },
  light:  { dot: '#c8a060', labelTr: 'Açık', labelEn: 'Light',  labelDe: 'Hell',   labelFr: 'Clair', labelAr: 'فاتح'   },
};
const ROLE_LABELS: Record<string, { tr: string; en: string; de: string; fr: string; ar: string }> = {
  leader:   { tr: 'Lider',          en: 'Leader',   de: 'Anführer',  fr: 'Chef',       ar: 'قائد'   },
  elder:    { tr: 'Yaşlı',          en: 'Elder',    de: 'Ältester',  fr: 'Aîné',       ar: 'كبير'   },
  warrior:  { tr: 'Savaşçı',        en: 'Warrior',  de: 'Krieger',   fr: 'Guerrier',   ar: 'محارب'  },
  gatherer: { tr: 'Toplayıcı',      en: 'Gatherer', de: 'Sammler',   fr: 'Cueilleur',  ar: 'جامع'   },
  healer:   { tr: 'İyileştirici',   en: 'Healer',   de: 'Heiler',    fr: 'Guérisseur', ar: 'معالج'  },
  member:   { tr: 'Üye',            en: 'Member',   de: 'Mitglied',  fr: 'Membre',     ar: 'عضو'    },
};

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="font-share-tech tracking-widest mb-2" style={{ fontSize: 11, color: '#6a8878', letterSpacing: '0.12em', borderBottom: '1px solid rgba(0,232,135,0.1)', paddingBottom: 2 }}>
      {label}
    </div>
  );
}

function TraitRow({ label, value, color, max = 1 }: { label: string; value: number; color: string; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="font-share-tech" style={{ fontSize: 11, color: '#8898c8' }}>{label}</span>
        <span className="font-share-tech" style={{ fontSize: 11, color }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(79,110,247,0.1)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function StatRow({ label, value, color = '#a0b4ff' }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="font-share-tech" style={{ fontSize: 11, color: '#8898c8' }}>{label}</span>
      <span className="font-share-tech" style={{ fontSize: 11, color }}>{value}</span>
    </div>
  );
}

function IndividualDetail({ ind, allIndividuals, onClose }: { ind: any; allIndividuals: any[]; onClose: () => void }) {
  const { lang, events, watchedIndividualId, setWatchedIndividual } = useSimStore();
  const name = nameFromId(ind.id, ind.sex, ind.phenotype?.name ?? ind.name);
  const age = parseFloat(ind.age_years ?? 0);
  const stage = lifeStage(age, lang);
  const ph = ind.phenotype ?? {};
  const soc = ind.social ?? {};
  const health = ind.health ?? {};
  const mind = ind.mind ?? {};
  const lang_ = ind.language ?? {};
  const isDead = ind.alive === false || ind.is_dead;
  const isFounder = ind.is_founder || (!ind.parent_1_id && !ind.parent_2_id);
  const tr = (trStr: string, enStr: string) => text(lang as LangCode, { tr: trStr, en: enStr, de: enStr, fr: enStr, ar: enStr });

  const [archivedJournal, setArchivedJournal] = useState<any[]>([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);

  const TYPE_ICON: Record<string, string> = {
    birth: '✦', death: '†', language: '◆', technology: '⚙',
    communication: '◈', disaster: '⚠', belief: '☽', art: '🎨',
  };

  const liveJournalEvents = events.filter(ev => {
    const d = ev.data ?? {};
    return d.individual_id === ind.id || d.discoverer_id === ind.id
        || d.sender_id === ind.id || d.receiver_id === ind.id;
  }).slice(0, 25);

  // Load archive from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`journal_${ind.id}`);
      if (raw) setArchivedJournal(JSON.parse(raw));
    } catch {}
  }, [ind.id]);

  // Auto-save whenever live events change
  useEffect(() => {
    if (!liveJournalEvents.length) return;
    try {
      const stored = localStorage.getItem(`journal_${ind.id}`);
      const existing: any[] = stored ? JSON.parse(stored) : [];
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const ev of [...existing, ...liveJournalEvents]) {
        const sig = `${ev.sim_day}_${ev.event_type}_${ev.description}`;
        if (!seen.has(sig)) { seen.add(sig); merged.push(ev); }
      }
      merged.sort((a, b) => a.sim_day - b.sim_day);
      localStorage.setItem(`journal_${ind.id}`, JSON.stringify(merged));
      setArchivedJournal(merged);
    } catch {}
  }, [liveJournalEvents.length, ind.id]);

  const parent1 = allIndividuals.find(i => i.id === ind.parent_1_id);
  const parent2 = allIndividuals.find(i => i.id === ind.parent_2_id);
  const gp_p1a = parent1 ? allIndividuals.find(i => i.id === parent1.parent_1_id) : null;
  const gp_p1b = parent1 ? allIndividuals.find(i => i.id === parent1.parent_2_id) : null;
  const gp_p2a = parent2 ? allIndividuals.find(i => i.id === parent2.parent_1_id) : null;
  const gp_p2b = parent2 ? allIndividuals.find(i => i.id === parent2.parent_2_id) : null;
  const grandparents = [
    gp_p1a ? { obj: gp_p1a, side: tr('baba tarafı', 'paternal') } : null,
    gp_p1b ? { obj: gp_p1b, side: tr('baba tarafı', 'paternal') } : null,
    gp_p2a ? { obj: gp_p2a, side: tr('anne tarafı', 'maternal') } : null,
    gp_p2b ? { obj: gp_p2b, side: tr('anne tarafı', 'maternal') } : null,
  ].filter(Boolean) as { obj: any; side: string }[];

  const children = allIndividuals.filter(i => i.parent_1_id === ind.id || i.parent_2_id === ind.id);
  const grandchildren = children.flatMap(c =>
    allIndividuals.filter(i => i.parent_1_id === c.id || i.parent_2_id === c.id)
      .map(gc => ({ obj: gc, parentName: nameFromId(c.id, c.sex, c.phenotype?.name ?? c.name) }))
  );
  const siblings = allIndividuals.filter(i =>
    i.id !== ind.id &&
    ((ind.parent_1_id && i.parent_1_id === ind.parent_1_id) ||
     (ind.parent_2_id && i.parent_2_id === ind.parent_2_id))
  );

  const eyeInfo   = EYE_COLORS[ph.eye_color ?? 'brown']   ?? EYE_COLORS.brown;
  const hairInfo  = HAIR_COLORS[ph.hair_color ?? 'dark']   ?? HAIR_COLORS.dark;
  const skinPct   = Math.round((ph.skin_tone ?? 0.5) * 100);
  const wordCount = Object.keys(lang_.vocabulary ?? {}).length;
  const inbreedingPct = Math.round((ind.inbreeding_coeff ?? 0) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="relative flex flex-col" style={{ width: 420, maxHeight: '88vh', background: 'rgba(4,4,18,0.98)', border: '1px solid rgba(79,110,247,0.4)', backdropFilter: 'blur(20px)', boxShadow: '0 16px 60px rgba(0,0,0,0.8)' }}>

        {/* ── Header ── */}
        <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(79,110,247,0.2)' }}>
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2">
              <span className="font-orbitron font-bold tracking-wider" style={{ color: isDead ? '#a05050' : (ind.sex === 'male' ? '#6090ff' : '#ff8ab0'), fontSize: 14 }}>{name}</span>
              {isFounder && <span className="font-share-tech" style={{ fontSize: 11, color: '#d4a838', border: '1px solid rgba(212,168,56,0.4)', padding: '1px 5px' }}>★ {tr('KURUCU', 'FOUNDER')}</span>}
              {isDead && <span className="font-share-tech" style={{ fontSize: 11, color: '#a05050' }}>† {tr('HAYATINI KAYBETTİ', 'DECEASED')}</span>}
            </div>
            <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
              {!isDead && <><span className="font-share-tech" style={{ fontSize: 11, color: stage.color }}>{tr(stage.label, stage.label)}</span><span className="font-share-tech text-sim-muted" style={{ fontSize: 11 }}>·</span></>}
              <span className="font-share-tech text-sim-muted" style={{ fontSize: 11 }}>{age.toFixed(1)} {tr('yaş', 'yr')}</span>
              <span className="font-share-tech text-sim-muted" style={{ fontSize: 11 }}>·</span>
              <span className="font-share-tech" style={{ fontSize: 11, color: ind.sex === 'male' ? '#6090ff' : '#ff8ab0' }}>{ind.sex === 'male' ? tr('Erkek', 'Male') : tr('Kadın', 'Female')}</span>
              {ind.group_role && <><span className="font-share-tech text-sim-muted" style={{ fontSize: 11 }}>·</span><span className="font-share-tech" style={{ fontSize: 11, color: '#d4a838' }}>{ind.group_role && ROLE_LABELS[ind.group_role] ? text(lang as LangCode, ROLE_LABELS[ind.group_role]) : ind.group_role}</span></>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setTreeOpen(true)}
              title={text(lang as LangCode, { en: 'View family tree', tr: 'Soy ağacını görüntüle' })}
              style={{
                background: 'transparent',
                border: '1px solid rgba(160,200,176,0.3)',
                color: '#a0c8b0', cursor: 'pointer', padding: '2px 6px',
                fontSize: 11, lineHeight: 1, fontFamily: 'Share Tech Mono, monospace', borderRadius: 2,
              }}>
              {text(lang as LangCode, { en: '🌿 TREE', tr: '🌿 SOY' })}
            </button>
            <button
              onClick={() => { setWatchedIndividual(watchedIndividualId === ind.id ? null : ind.id); onClose(); }}
              title={watchedIndividualId === ind.id ? text(lang as LangCode, { en: 'Stop watching', tr: 'Takibi bırak' }) : text(lang as LangCode, { en: 'Watch in witness mode', tr: 'Tanık modunda takip et' })}
              style={{
                background: watchedIndividualId === ind.id ? 'rgba(0,212,255,0.15)' : 'transparent',
                border: `1px solid ${watchedIndividualId === ind.id ? 'rgba(0,212,255,0.6)' : 'rgba(160,200,176,0.3)'}`,
                color: watchedIndividualId === ind.id ? '#00d4ff' : '#a0c8b0',
                cursor: 'pointer', padding: '2px 6px', fontSize: 11, lineHeight: 1,
                fontFamily: 'Share Tech Mono, monospace', borderRadius: 2,
              }}>
              {watchedIndividualId === ind.id ? text(lang as LangCode, { en: '👁 WATCHING', tr: '👁 TAKİPTE' }) : text(lang as LangCode, { en: 'WATCH', tr: 'TAKİP ET' })}
            </button>
            <button onClick={onClose} className="text-sim-muted hover:text-sim-accent transition-colors"><X size={14} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ── Death info ── */}
          {isDead && (
            <div style={{ background: 'rgba(160,80,80,0.1)', border: '1px solid rgba(160,80,80,0.35)', padding: '8px 10px' }}>
              <SectionHeader label={tr('ÖLÜM BİLGİSİ', 'DEATH INFO')} />
              <StatRow label={tr('Neden', 'Cause')} value={causeLabel(ind.death_cause, lang)} color="#e08080" />
              {ind.death_day != null && <StatRow label={tr('Gün', 'Day')} value={ind.death_day} color="#e08080" />}
            </div>
          )}

          {/* ── Location ── */}
          {!isDead && (
            <div>
              <SectionHeader label={tr('KONUM', 'LOCATION')} />
              <div className="flex items-center gap-1 font-share-tech" style={{ fontSize: 11, color: '#a0b4ff' }}>
                <MapPin size={10} />
                {(ind.y ?? 0).toFixed(3)}°{(ind.y ?? 0) >= 0 ? text(lang as LangCode, { en: 'N', tr: 'K' }) : text(lang as LangCode, { en: 'S', tr: 'G' })}
                {'  '}
                {(ind.x ?? 0).toFixed(3)}°{(ind.x ?? 0) >= 0 ? text(lang as LangCode, { en: 'E', tr: 'D' }) : text(lang as LangCode, { en: 'W', tr: 'B' })}
              </div>
            </div>
          )}

          {/* ── Görünüm / Appearance ── */}
          <div>
            <SectionHeader label={tr('GÖRÜNÜM', 'APPEARANCE')} />
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-share-tech" style={{ fontSize: 11, color: '#8898c8' }}>{tr('Göz Rengi', 'Eye Color')}</span>
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: eyeInfo.dot, border: '1px solid rgba(255,255,255,0.2)' }} />
                  <span className="font-share-tech" style={{ fontSize: 11, color: '#c8d8e8' }}>{text(lang as LangCode, { tr: eyeInfo.labelTr, en: eyeInfo.labelEn, de: eyeInfo.labelDe, fr: eyeInfo.labelFr, ar: eyeInfo.labelAr })}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-share-tech" style={{ fontSize: 11, color: '#8898c8' }}>{tr('Saç Rengi', 'Hair Color')}</span>
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: hairInfo.dot, border: '1px solid rgba(255,255,255,0.2)' }} />
                  <span className="font-share-tech" style={{ fontSize: 11, color: '#c8d8e8' }}>{text(lang as LangCode, { tr: hairInfo.labelTr, en: hairInfo.labelEn, de: hairInfo.labelDe, fr: hairInfo.labelFr, ar: hairInfo.labelAr })}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="font-share-tech" style={{ fontSize: 11, color: '#8898c8' }}>{tr('Ten Tonu', 'Skin Tone')}</span>
                  <span className="font-share-tech" style={{ fontSize: 11, color: '#c8a880' }}>{skinPct}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: 'linear-gradient(to right, #f5deb3, #8b4513)' }}>
                  <div style={{ width: `${skinPct}%`, height: '100%', background: 'transparent', borderRight: '2px solid rgba(255,255,255,0.8)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Fiziksel / Physical ── */}
          <div>
            <SectionHeader label={tr('FİZİKSEL', 'PHYSICAL')} />
            <div className="space-y-1.5">
              <StatRow label={tr('Boy', 'Height')} value={`${ind.height_cm ?? '—'} cm`} />
              <StatRow label={tr('Kilo', 'Weight')} value={`${ind.weight_kg ?? '—'} kg`} />
              <TraitRow label={tr('Fiziksel Güç', 'Physical Strength')} value={ph.physical_strength ?? 0} color="#e05a5a" />
              <TraitRow label={tr('Dayanıklılık', 'Endurance')} value={ph.physical_endurance ?? ph.endurance ?? 0} color="#f97316" />
              <TraitRow label={tr('Metabolizma', 'Metabolism')} value={ph.metabolism ?? 0} color="#d4a838" />
              <TraitRow label={tr('Doğurganlık', 'Fertility')} value={ph.fertility ?? 0} color="#ff8ab0" />
              <TraitRow label={tr('Bağışıklık', 'Immunity')} value={ph.immune_strength ?? 0} color="#4f6ef7" />
              <StatRow label={tr('Azami Ömür', 'Max Lifespan')} value={`~${Math.round(ph.max_lifespan ?? 90)} ${tr('yıl','yr')}`} color="#a0b4ff" />
            </div>
          </div>

          {/* ── Bilişsel / Cognitive ── */}
          <div>
            <SectionHeader label={tr('BİLİŞSEL', 'COGNITIVE')} />
            <div className="space-y-1.5">
              <TraitRow label={tr('Zekâ', 'Intelligence')}          value={ph.fluid_intelligence ?? 0}    color="#d4a838" />
              <TraitRow label={tr('Çalışma Belleği', 'Working Mem.')} value={ph.working_memory ?? 0}     color="#e8c840" />
              <TraitRow label={tr('Öğrenme Hızı', 'Learning Rate')} value={ph.learning_rate ?? 0}         color="#4ecb71" />
              <TraitRow label={tr('Dil Kapasitesi', 'Lang. Capacity')} value={ph.language_capacity ?? 0} color="#00d4ff" />
              <TraitRow label={tr('Merak', 'Curiosity')}             value={ph.curiosity ?? 0}             color="#4ecb71" />
              <TraitRow label={tr('İnovasyon', 'Innovation')}        value={ph.innovation ?? 0}            color="#7dd3fc" />
              <TraitRow label={tr('Öz Disiplin', 'Conscientiousness')} value={ph.conscientiousness ?? 0} color="#a0b4ff" />
            </div>
          </div>

          {/* ── Kişilik / Personality ── */}
          <div>
            <SectionHeader label={tr('KİŞİLİK', 'PERSONALITY')} />
            <div className="space-y-1.5">
              <TraitRow label={tr('Empati', 'Empathy')}            value={ph.empathy ?? 0}          color="#00d4ff" />
              <TraitRow label={tr('İşbirliği', 'Cooperation')}     value={ph.cooperation ?? 0}      color="#4ecb71" />
              <TraitRow label={tr('Özgecilik', 'Altruism')}        value={ph.altruism ?? 0}         color="#7dd3fc" />
              <TraitRow label={tr('Ebeveyn Bakımı', 'Parental Care')} value={ph.parental_care ?? 0} color="#ff8ab0" />
              <TraitRow label={tr('Saldırganlık', 'Aggression')}   value={ph.aggression ?? 0}       color="#f97316" />
              <TraitRow label={tr('Baskınlık', 'Dominance')}       value={ph.dominance ?? 0}        color="#e05a5a" />
              <TraitRow label={tr('Risk Toleransı', 'Risk Toler.')} value={ph.risk_tolerance ?? 0} color="#d4a838" />
              <TraitRow label={tr('Bağımsızlık', 'Independence')}  value={ph.independence ?? 0}    color="#a855f7" />
              <TraitRow label={tr('Kaygı', 'Anxiety')}             value={ph.anxiety ?? 0}          color="#e05a5a" />
              <TraitRow label={tr('Sanatsal Duygu', 'Artistic Sense')} value={ph.artistic_sense ?? 0} color="#a855f7" />
            </div>
          </div>

          {/* ── Bilinç & Ruh Hali / Consciousness ── */}
          <div>
            <SectionHeader label={tr('BİLİNÇ & RUH HALİ', 'CONSCIOUSNESS')} />
            <div className="space-y-1.5">
              <TraitRow label={tr('Bilinç', 'Consciousness')}         value={mind.consciousness ?? 0}       color="#c8b4ff" />
              <TraitRow label={tr('Bilinç Pot.', 'Consc. Potential')} value={ph.consciousness_potential ?? 0} color="#a855f7" />
              <TraitRow label={tr('Öz Farkındalık', 'Self Awareness')} value={ph.self_awareness ?? 0}      color="#d4a838" />
              <TraitRow label={tr('İnanç Kapasitesi', 'Belief Cap.')} value={ph.belief_capacity ?? 0}      color="#a0b4ff" />
              <TraitRow label={tr('Dindarlık', 'Religiosity')}        value={ph.religiosity ?? 0}           color="#c8a0e0" />
              <TraitRow label={tr('Stres', 'Stress')}                 value={mind.stress ?? 0}              color="#e05a5a" />
              <TraitRow label={tr('Serotonin', 'Serotonin')}          value={ph.serotonin ?? 0}             color="#4ecb71" />
              <TraitRow label={tr('Stres Direnci', 'Stress Resil.')}  value={ph.stress_resilience ?? 0}    color="#7dd3fc" />
            </div>
          </div>

          {/* ── Dil / Language ── */}
          <div>
            <SectionHeader label={tr('DİL', 'LANGUAGE')} />
            <div className="space-y-1.5">
              <StatRow label={tr('Aşama', 'Stage')} value={lang_.stage_name ?? text(lang as LangCode, { en: 'pre-linguistic', tr: 'dil öncesi' })} color="#00d4ff" />
              <StatRow label={tr('Kelime Sayısı', 'Vocabulary')} value={`${wordCount} ${tr('kelime', 'words')}`} color="#7dd3fc" />
              <TraitRow label="FOXP2" value={lang_.foxp2_expression ?? (ph.language_capacity ?? 0) * 0.1} color="#00e887" />
            </div>
          </div>

          {/* ── Sağlık / Health ── */}
          {!isDead && (
            <div>
              <SectionHeader label={tr('SAĞLIK', 'HEALTH')} />
              <div className="space-y-1.5">
                <TraitRow label={tr('Can', 'HP')}           value={health.hp ?? 0}          color="#4ecb71" />
                <TraitRow label={tr('Kalori', 'Calories')}  value={health.calories ?? 0}    color="#d4a838" />
                <TraitRow label={tr('Su', 'Hydration')}     value={health.hydration ?? 0}   color="#7dd3fc" />
                <TraitRow label={tr('Hastalık Direnci', 'Disease Resist.')} value={health.disease_resistance ?? 0} color="#4f6ef7" />
                {(health.injuries?.length > 0) && (
                  <StatRow label={tr('Yaralanma', 'Injuries')} value={health.injuries.length} color="#e05a5a" />
                )}
                {(health.pregnancy) && (
                  <StatRow label={tr('Hamilelik Günü', 'Pregnancy Day')} value={health.pregnancy_day ?? '—'} color="#ff8ab0" />
                )}
              </div>
            </div>
          )}

          {/* ── Sosyal / Social ── */}
          {!isDead && (
            <div>
              <SectionHeader label={tr('SOSYAL', 'SOCIAL')} />
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {soc.has_mate && <span className="font-share-tech px-1.5 py-0.5" style={{ fontSize: 11, color: '#ff8ab0', border: '1px solid rgba(255,138,176,0.3)', background: 'rgba(255,138,176,0.08)' }}>{tr('Çift', 'Paired')}</span>}
                {(soc.children_ids?.length > 0) && <span className="font-share-tech px-1.5 py-0.5" style={{ fontSize: 11, color: '#4ecb71', border: '1px solid rgba(78,203,113,0.3)', background: 'rgba(78,203,113,0.08)' }}>{soc.children_ids.length} {tr('Çocuk', 'Child.')}</span>}
                {soc.group_id && <span className="font-share-tech px-1.5 py-0.5" style={{ fontSize: 11, color: '#4f6ef7', border: '1px solid rgba(79,110,247,0.3)', background: 'rgba(79,110,247,0.08)' }}>{tr('Grup', 'Group')}</span>}
                {!soc.has_mate && !soc.group_id && <span className="font-share-tech" style={{ fontSize: 11, color: '#6a8878' }}>{tr('Yalnız', 'Alone')}</span>}
              </div>
              {inbreedingPct > 0 && (
                <StatRow label={tr('Akraba Evliliği', 'Inbreeding')} value={`${inbreedingPct}%`} color={inbreedingPct > 25 ? '#e05a5a' : '#d4a838'} />
              )}
            </div>
          )}

          {/* ── Soyağacı / Family Tree ── */}
          <div>
            <SectionHeader label={tr('SOYAĞACI', 'FAMILY TREE')} />

            {isFounder && (
              <div className="font-share-tech px-2 py-1 mb-3" style={{ fontSize: 11, color: '#d4a838', border: '1px solid rgba(212,168,56,0.3)', background: 'rgba(212,168,56,0.06)' }}>
                ★ {tr('Kurucu Birey — Medeniyetin Atası', 'Founding Individual — Ancestor of Civilization')}
              </div>
            )}

            {grandparents.length > 0 && (
              <FamilySection label={tr(`BÜYÜKANNE/BABA (${grandparents.length})`, `GRANDPARENTS (${grandparents.length})`)} indent={0}>
                {grandparents.map(({ obj, side }, idx) => <PersonRow key={idx} obj={obj} tag={side} lang={lang} />)}
              </FamilySection>
            )}

            {(parent1 || parent2 || ind.parent_1_id || ind.parent_2_id) && (
              <FamilySection label={tr('EBEVEYNLER', 'PARENTS')} indent={grandparents.length > 0 ? 1 : 0}>
                {[{ obj: parent1, id: ind.parent_1_id }, { obj: parent2, id: ind.parent_2_id }]
                  .filter(p => p.obj || p.id)
                  .map(({ obj, id }, idx) => {
                    const roleLabel = obj?.sex === 'male' ? tr('Baba','Father') : obj?.sex === 'female' ? tr('Anne','Mother') : tr('Ebeveyn','Parent');
                    return <PersonRow key={idx} obj={obj} fallbackId={id} tag={roleLabel} lang={lang} />;
                  })}
              </FamilySection>
            )}

            {siblings.length > 0 && (
              <FamilySection label={tr(`KARDEŞLER (${siblings.length})`, `SIBLINGS (${siblings.length})`)} indent={2}>
                {siblings.slice(0, 6).map(s => <PersonRow key={s.id} obj={s} lang={lang} />)}
                {siblings.length > 6 && <div className="font-share-tech text-sim-muted" style={{ fontSize: 11, paddingLeft: 10 }}>+{siblings.length - 6} {tr('daha','more')}</div>}
              </FamilySection>
            )}

            <div className="flex items-center gap-2 my-1 px-1" style={{ borderLeft: '2px solid rgba(212,168,56,0.6)', marginLeft: 2 }}>
              <span style={{ fontSize: 12, color: '#d4a838' }}>★</span>
              <span className="font-orbitron font-bold" style={{ fontSize: 12, color: ind.sex === 'male' ? '#8ab0ff' : '#ffaac8' }}>{name}</span>
              <span className="font-share-tech text-sim-muted" style={{ fontSize: 11 }}>
                {isDead ? `† ${tr('ölü','dec.')}` : `${age.toFixed(0)} ${tr('yaş','yr')}`}
              </span>
            </div>

            {children.length > 0 && (
              <FamilySection label={tr(`ÇOCUKLAR (${children.length})`, `CHILDREN (${children.length})`)} indent={1}>
                {children.slice(0, 8).map(c => <PersonRow key={c.id} obj={c} lang={lang} />)}
                {children.length > 8 && <div className="font-share-tech text-sim-muted" style={{ fontSize: 11, paddingLeft: 10 }}>+{children.length - 8} {tr('daha','more')}</div>}
              </FamilySection>
            )}

            {grandchildren.length > 0 && (
              <FamilySection label={tr(`TORUNLAR (${grandchildren.length})`, `GRANDCHILDREN (${grandchildren.length})`)} indent={2}>
                {grandchildren.slice(0, 6).map(({ obj: gc, parentName }, idx) => <PersonRow key={idx} obj={gc} tag={parentName} lang={lang} />)}
                {grandchildren.length > 6 && <div className="font-share-tech text-sim-muted" style={{ fontSize: 11, paddingLeft: 10 }}>+{grandchildren.length - 6} {tr('daha','more')}</div>}
              </FamilySection>
            )}

            {isFounder && children.length === 0 && (
              <div className="font-share-tech text-sim-muted mt-2" style={{ fontSize: 11 }}>
                {tr('Henüz çocuk yok.', 'No children yet.')}
              </div>
            )}
          </div>

          {/* ── Hayat Hikâyesi / Life Journal ── */}
          {(liveJournalEvents.length > 0 || archivedJournal.length > 0) && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="font-share-tech tracking-widest" style={{ fontSize: 11, color: '#6a8878', letterSpacing: '0.12em' }}>
                  {tr('HAYAT HİKÂYESİ', 'LIFE STORY')}
                </span>
                {archivedJournal.length > 0 && (
                  <button
                    onClick={() => setArchiveOpen(true)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(0,212,255,0.3)',
                      color: '#00d4ff',
                      cursor: 'pointer', padding: '1px 7px', fontSize: 10,
                      fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.05em',
                    }}>
                    {tr('ARŞİV', 'ARCHIVE')} ({archivedJournal.length})
                  </button>
                )}
              </div>
              <div style={{ height: 1, background: 'rgba(0,232,135,0.1)', marginBottom: 6 }} />
              <div className="space-y-1">
                {liveJournalEvents.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 11, color: '#6a8878', flexShrink: 0, fontFamily: 'Share Tech Mono, monospace' }}>
                      Y{ev.sim_year}G{ev.sim_day}
                    </span>
                    <span style={{ fontSize: 10, flexShrink: 0 }}>{TYPE_ICON[ev.event_type] ?? '·'}</span>
                    <span style={{ fontSize: 11, color: '#a0b4ff', lineHeight: 1.4, fontFamily: 'Share Tech Mono, monospace' }}>
                      {ev.description?.length > 70 ? ev.description.slice(0, 70) + '…' : ev.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {treeOpen && (
            <FamilyTreeModal
              ind={ind}
              allIndividuals={allIndividuals}
              lang={lang}
              onClose={() => setTreeOpen(false)}
            />
          )}

          {archiveOpen && (
            <JournalArchiveModal
              name={name}
              entries={archivedJournal}
              typeIcon={TYPE_ICON}
              lang={lang}
              onClear={() => {
                try { localStorage.removeItem(`journal_${ind.id}`); } catch {}
                setArchivedJournal([]);
                setArchiveOpen(false);
              }}
              onClose={() => setArchiveOpen(false)}
            />
          )}

        </div>
      </div>
    </div>
  );
}

function FamilyTreeModal({ ind, allIndividuals, lang, onClose }: {
  ind: any; allIndividuals: any[]; lang: string; onClose: () => void;
}) {
  const tr = (trStr: string, enStr: string) => text(lang as LangCode, { tr: trStr, en: enStr, de: enStr, fr: enStr, ar: enStr });

  const parent1 = allIndividuals.find(i => i.id === ind.parent_1_id) ?? null;
  const parent2 = allIndividuals.find(i => i.id === ind.parent_2_id) ?? null;
  const gp = [
    parent1 ? allIndividuals.find(i => i.id === parent1.parent_1_id) : null,
    parent1 ? allIndividuals.find(i => i.id === parent1.parent_2_id) : null,
    parent2 ? allIndividuals.find(i => i.id === parent2.parent_1_id) : null,
    parent2 ? allIndividuals.find(i => i.id === parent2.parent_2_id) : null,
  ].filter(Boolean) as any[];
  const children = allIndividuals.filter(i => i.parent_1_id === ind.id || i.parent_2_id === ind.id);
  const grandchildren = [...new Map(
    children.flatMap(c => allIndividuals.filter(i => i.parent_1_id === c.id || i.parent_2_id === c.id))
      .map(x => [x.id, x])
  ).values()];
  const parents = [parent1, parent2].filter(Boolean) as any[];
  const isFounder = !parent1 && !parent2;

  function Chip({ person, star = false }: { person: any; star?: boolean }) {
    const n = nameFromId(person.id, person.sex, person.phenotype?.name ?? person.name);
    const dead = person.alive === false || person.is_dead;
    const age = Math.floor(parseFloat(person.age_years ?? 0));
    const col = person.sex === 'male' ? '#6090ff' : '#ff8ab0';
    return (
      <div style={{
        padding: '5px 9px', textAlign: 'center', minWidth: 58, maxWidth: 88,
        background: star ? 'rgba(79,110,247,0.13)' : 'rgba(4,4,18,0.9)',
        border: `1px solid ${star ? 'rgba(79,110,247,0.5)' : 'rgba(160,200,176,0.12)'}`,
        boxShadow: star ? '0 0 10px rgba(79,110,247,0.18)' : 'none',
      }}>
        <div style={{ fontSize: 10, fontFamily: 'Orbitron, monospace', color: col, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {star && '★ '}{n}{dead ? ' †' : ''}
        </div>
        <div style={{ fontSize: 9, color: '#4a6858', fontFamily: 'Share Tech Mono, monospace', marginTop: 1 }}>
          {age} {tr('yaş', 'yr')}
        </div>
      </div>
    );
  }

  function RowLabel({ label }: { label: string }) {
    return (
      <div style={{ textAlign: 'center', fontSize: 9, color: '#4a5848', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.12em', marginBottom: 5 }}>
        {label}
      </div>
    );
  }

  function VLine() {
    return <div style={{ width: 1, height: 18, background: '#2a3e30', margin: '3px auto' }} />;
  }

  function ChipRow({ items }: { items: any[] }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
        {items.map((p, i) => <Chip key={i} person={p} />)}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 60, background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex flex-col" style={{
        width: 420, maxHeight: '82vh',
        background: 'rgba(4,4,18,0.98)', border: '1px solid rgba(79,110,247,0.32)',
        boxShadow: '0 16px 60px rgba(0,0,0,0.85)',
      }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(79,110,247,0.15)' }}>
          <span style={{ fontSize: 12, color: '#4f6ef7', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.15em', flex: 1 }}>
            🌿 {tr('SOY AĞACI', 'FAMILY TREE')}
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#6a8878', cursor: 'pointer', lineHeight: 0, padding: 2 }}>
            <X size={13} />
          </button>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '20px 16px' }}>

          {gp.length > 0 && (
            <>
              <RowLabel label={tr('BÜYÜKANNE / BÜYÜKBABA', 'GRANDPARENTS')} />
              <ChipRow items={gp} />
              <VLine />
            </>
          )}

          {parents.length > 0 && (
            <>
              <RowLabel label={tr('EBEVEYNLER', 'PARENTS')} />
              <ChipRow items={parents} />
              <VLine />
            </>
          )}

          <RowLabel label={tr('BİREY', 'INDIVIDUAL')} />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Chip person={ind} star />
          </div>

          {isFounder && (
            <div style={{ textAlign: 'center', marginTop: 6, fontSize: 10, color: '#d4a838', fontFamily: 'Share Tech Mono, monospace' }}>
              ★ {tr('Kurucu — bilinen atası yok', 'Founder — no known ancestors')}
            </div>
          )}

          {children.length > 0 && (
            <>
              <VLine />
              <RowLabel label={`${tr('ÇOCUKLAR', 'CHILDREN')} (${children.length})`} />
              <ChipRow items={children.slice(0, 10)} />
              {children.length > 10 && (
                <div style={{ textAlign: 'center', fontSize: 10, color: '#4a6858', fontFamily: 'Share Tech Mono, monospace', marginTop: 4 }}>
                  +{children.length - 10} {tr('daha', 'more')}
                </div>
              )}
            </>
          )}

          {grandchildren.length > 0 && (
            <>
              <VLine />
              <RowLabel label={`${tr('TORUNLAR', 'GRANDCHILDREN')} (${grandchildren.length})`} />
              <ChipRow items={grandchildren.slice(0, 8)} />
              {grandchildren.length > 8 && (
                <div style={{ textAlign: 'center', fontSize: 10, color: '#4a6858', fontFamily: 'Share Tech Mono, monospace', marginTop: 4 }}>
                  +{grandchildren.length - 8} {tr('daha', 'more')}
                </div>
              )}
            </>
          )}

          {!isFounder && !children.length && !grandchildren.length && (
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#4a6858', fontFamily: 'Share Tech Mono, monospace' }}>
              {tr('Henüz çocuğu yok', 'No children yet')}
            </div>
          )}

          {/* Stats footer */}
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(79,110,247,0.1)', textAlign: 'center', fontSize: 10, color: '#4a5848', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.08em' }}>
            {isFounder ? tr('Kurucu', 'Founder') : `${parents.length} ${tr('ebeveyn', 'parent(s)')}`}
            {children.length > 0 && ` · ${children.length} ${tr('çocuk', 'children')}`}
            {grandchildren.length > 0 && ` · ${grandchildren.length} ${tr('torun', 'grandchildren')}`}
          </div>
        </div>
      </div>
    </div>
  );
}

function JournalArchiveModal({ name, entries, typeIcon, lang, onClear, onClose }: {
  name: string; entries: any[]; typeIcon: Record<string, string>;
  lang: string; onClear: () => void; onClose: () => void;
}) {
  const tr = (trStr: string, enStr: string) => text(lang as LangCode, { tr: trStr, en: enStr, de: enStr, fr: enStr, ar: enStr });
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 60, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex flex-col" style={{
        width: 400, maxHeight: '80vh',
        background: 'rgba(4,4,18,0.98)', border: '1px solid rgba(0,212,255,0.3)',
        backdropFilter: 'blur(20px)', boxShadow: '0 16px 60px rgba(0,0,0,0.85)',
      }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(0,212,255,0.15)' }}>
          <span style={{ fontSize: 12, color: '#00d4ff', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.15em', flex: 1 }}>
            ◈ {tr('HAYAT HİKÂYESİ ARŞİVİ', 'LIFE STORY ARCHIVE')}
          </span>
          <span style={{ fontSize: 11, color: '#4a6858', fontFamily: 'Share Tech Mono, monospace', marginRight: 8 }}>
            {name} · {entries.length} {tr('olay', 'events')}
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#6a8878', cursor: 'pointer', lineHeight: 0, padding: 2 }}>
            <X size={13} />
          </button>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '10px 14px' }}>
          {entries.length === 0 ? (
            <div style={{ fontSize: 11, color: '#4a6858', fontFamily: 'Share Tech Mono, monospace', textAlign: 'center', paddingTop: 24 }}>
              {tr('Henüz arşivlenmiş olay yok', 'No archived events yet')}
            </div>
          ) : (
            <div className="space-y-1">
              {entries.map((ev, i) => (
                <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'baseline', paddingBottom: 4, borderBottom: i < entries.length - 1 ? '1px solid rgba(0,212,255,0.04)' : 'none' }}>
                  <span style={{ fontSize: 10, color: '#4a6858', flexShrink: 0, fontFamily: 'Share Tech Mono, monospace', minWidth: 64 }}>
                    Y{ev.sim_year}G{ev.sim_day}
                  </span>
                  <span style={{ fontSize: 10, flexShrink: 0 }}>{typeIcon[ev.event_type] ?? '·'}</span>
                  <span style={{ fontSize: 11, color: '#8898c8', lineHeight: 1.45, fontFamily: 'Share Tech Mono, monospace' }}>
                    {ev.description ?? ev.event_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-end gap-2 px-4 py-2" style={{ borderTop: '1px solid rgba(0,212,255,0.1)' }}>
          {confirmClear ? (
            <>
              <span style={{ fontSize: 11, color: '#e05a5a', fontFamily: 'Share Tech Mono, monospace', alignSelf: 'center' }}>
                {tr('Emin misin?', 'Are you sure?')}
              </span>
              <button onClick={() => setConfirmClear(false)}
                style={{ fontSize: 10, fontFamily: 'Share Tech Mono, monospace', background: 'transparent', border: '1px solid rgba(160,200,176,0.25)', color: '#6a8878', cursor: 'pointer', padding: '2px 8px' }}>
                {tr('İptal', 'Cancel')}
              </button>
              <button onClick={onClear}
                style={{ fontSize: 10, fontFamily: 'Share Tech Mono, monospace', background: 'rgba(160,80,80,0.15)', border: '1px solid rgba(224,90,90,0.4)', color: '#e05a5a', cursor: 'pointer', padding: '2px 8px' }}>
                {tr('Temizle', 'Clear')}
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmClear(true)}
              style={{ fontSize: 10, fontFamily: 'Share Tech Mono, monospace', background: 'transparent', border: '1px solid rgba(160,200,176,0.2)', color: '#4a6858', cursor: 'pointer', padding: '2px 8px' }}>
              {tr('Arşivi Temizle', 'Clear Archive')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CompareModal({ indA, indB, onClose }: { indA: any; indB: any; onClose: () => void }) {
  const { lang } = useSimStore();
  const tr = (trStr: string, enStr: string) => text(lang as LangCode, { tr: trStr, en: enStr, de: enStr, fr: enStr, ar: enStr });

  function Col({ ind }: { ind: any }) {
    const name = nameFromId(ind.id, ind.sex, ind.phenotype?.name ?? ind.name);
    const age = parseFloat(ind.age_years ?? 0);
    const ph = ind.phenotype ?? {};
    const mind = ind.mind ?? {};
    const lang_ = ind.language ?? {};
    const health = ind.health ?? {};
    const isDead = ind.alive === false || ind.is_dead;
    const isFounder = !ind.parent_1_id && !ind.parent_2_id;
    const wordCount = Object.keys(lang_.vocabulary ?? {}).length;

    return (
      <div style={{ flex: 1, padding: '0 14px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(79,110,247,0.15)' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontWeight: 700, fontSize: 13, color: ind.sex === 'male' ? '#6090ff' : '#ff8ab0' }}>{name}</div>
          <div style={{ fontSize: 11, color: '#a0b4ff', fontFamily: 'Share Tech Mono, monospace', marginTop: 2 }}>
            {age.toFixed(1)} {tr('yaş', 'yr')} · {ind.sex === 'male' ? tr('Erkek', 'Male') : tr('Kadın', 'Female')}
            {isFounder && <span style={{ color: '#d4a838', marginLeft: 6 }}>★ {tr('Kurucu', 'Founder')}</span>}
            {isDead && <span style={{ color: '#e05a5a', marginLeft: 6 }}>†</span>}
          </div>
        </div>

        <SectionHeader label={tr('FİZİKSEL', 'PHYSICAL')} />
        <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <TraitRow label={tr('Güç', 'Strength')}     value={ph.physical_strength ?? 0}                    color="#e05a5a" />
          <TraitRow label={tr('Dayanıklılık', 'End.')} value={ph.physical_endurance ?? ph.endurance ?? 0} color="#f97316" />
          <TraitRow label={tr('Bağışıklık', 'Imm.')}  value={ph.immune_strength ?? 0}                     color="#4f6ef7" />
          <TraitRow label={tr('Doğurganlık', 'Fert.')} value={ph.fertility ?? 0}                          color="#ff8ab0" />
        </div>

        <SectionHeader label={tr('BİLİŞSEL', 'COGNITIVE')} />
        <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <TraitRow label={tr('Zekâ', 'Intelligence')} value={ph.fluid_intelligence ?? 0}  color="#d4a838" />
          <TraitRow label={tr('Öğrenme', 'Learning')}  value={ph.learning_rate ?? 0}        color="#4ecb71" />
          <TraitRow label={tr('Dil Kap.', 'Lang.Cap.')} value={ph.language_capacity ?? 0}  color="#00d4ff" />
          <TraitRow label={tr('İnovasyon', 'Innov.')}  value={ph.innovation ?? 0}           color="#7dd3fc" />
        </div>

        <SectionHeader label={tr('BİLİNÇ', 'CONSCIOUSNESS')} />
        <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <TraitRow label={tr('Bilinç', 'Conscious.')} value={mind.consciousness ?? 0}            color="#c8b4ff" />
          <TraitRow label={tr('Potansiyel', 'Potential')} value={ph.consciousness_potential ?? 0} color="#a855f7" />
        </div>

        <SectionHeader label={tr('DİL', 'LANGUAGE')} />
        <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <StatRow label={tr('Aşama', 'Stage')} value={lang_.stage_name ?? 'pre-linguistic'} color="#00d4ff" />
          <StatRow label={tr('Kelime', 'Words')} value={wordCount} color="#7dd3fc" />
        </div>

        {!isDead && (
          <>
            <SectionHeader label={tr('SAĞLIK', 'HEALTH')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <TraitRow label="HP"                        value={health.hp ?? 0}        color="#4ecb71" />
              <TraitRow label={tr('Kalori', 'Calories')}  value={health.calories ?? 0}  color="#d4a838" />
              <TraitRow label={tr('Su', 'Hydration')}     value={health.hydration ?? 0} color="#7dd3fc" />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: Math.min(640, window.innerWidth - 24), maxHeight: '88vh', background: 'rgba(4,4,18,0.98)', border: '1px solid rgba(79,110,247,0.4)', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 60px rgba(0,0,0,0.8)' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(79,110,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: '#4f6ef7', letterSpacing: '0.15em' }}>
            {tr('BİREY KARŞILAŞTIRMA', 'INDIVIDUAL COMPARISON')}
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#a0c8b0', cursor: 'pointer', lineHeight: 0 }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'hidden', display: 'flex', paddingTop: 12 }}>
          <Col ind={indA} />
          <div style={{ width: 1, background: 'rgba(79,110,247,0.2)', flexShrink: 0 }} />
          <Col ind={indB} />
        </div>
      </div>
    </div>
  );
}

export default function PopulationPanel() {
  const { currentSim, accessToken, lang, stats } = useSimStore();
  const [individuals, setIndividuals] = useState<any[]>([]);
  const [deadIndividuals, setDeadIndividuals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [compareSet, setCompareSet] = useState<any[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [filter, setFilter] = useState<'all' | 'male' | 'female'>('all');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deadExpanded, setDeadExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  function toggleCompare(e: React.MouseEvent, ind: any) {
    e.stopPropagation();
    setCompareSet(prev => {
      const exists = prev.find(i => i.id === ind.id);
      if (exists) return prev.filter(i => i.id !== ind.id);
      if (prev.length >= 2) return [prev[1], ind];
      return [...prev, ind];
    });
  }

  async function load() {
    if (!currentSim || !accessToken) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [aliveRes, deadRes] = await Promise.all([
        axios.get(`/api/simulations/${currentSim.id}/population?alive=true&limit=200`, { headers }),
        axios.get(`/api/simulations/${currentSim.id}/population?alive=false&limit=100`, { headers }),
      ]);
      setIndividuals(aliveRes.data);
      setDeadIndividuals(deadRes.data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
    // List refreshes every 20s; counts come from WebSocket stats (real-time)
    intervalRef.current = setInterval(load, 3000);
    return () => clearInterval(intervalRef.current);
  }, [currentSim?.id]);

  const allForLookup = [...individuals, ...deadIndividuals];
  const filtered = individuals
    .filter(i => filter === 'all' || i.sex === filter)
    .sort((a, b) => {
      const diff = parseFloat(a.age_years ?? 0) - parseFloat(b.age_years ?? 0);
      return sortDir === 'asc' ? diff : -diff;
    });

  return (
    <DetailPanel panelId="population" title="Population" titleTr="Nüfus">
      {selected && <IndividualDetail ind={selected} allIndividuals={allForLookup} onClose={() => setSelected(null)} />}
      {showCompare && compareSet.length === 2 && (
        <CompareModal indA={compareSet[0]} indB={compareSet[1]} onClose={() => setShowCompare(false)} />
      )}

      {/* Compare action bar */}
      {compareSet.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '6px 8px', background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.3)' }}>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#a0b4ff', flex: 1 }}>
            {compareSet.map(i => nameFromId(i.id, i.sex, i.phenotype?.name ?? i.name)).join(' vs ')}
          </span>
          {compareSet.length === 2 && (
            <button onClick={() => setShowCompare(true)}
              style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#4f6ef7', background: 'rgba(79,110,247,0.15)', border: '1px solid rgba(79,110,247,0.5)', padding: '2px 8px', cursor: 'pointer' }}>
              {text(lang as LangCode, { en: 'COMPARE', tr: 'KARŞILAŞTIR' })}
            </button>
          )}
          <button onClick={() => setCompareSet([])}
            style={{ background: 'transparent', border: 'none', color: '#a0c8b0', cursor: 'pointer', lineHeight: 0 }}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* Summary bar — always use WebSocket stats for consistency with TopBar */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 p-2 text-center" style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)' }}>
          <div className="font-orbitron font-bold" style={{ color: '#4f6ef7', fontSize: 14 }}>{stats?.population ?? individuals.length}</div>
          <div className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 12 }}>{text(lang as LangCode, { en: 'TOTAL', tr: 'TOPLAM' })}</div>
        </div>
        <div className="flex-1 p-2 text-center" style={{ background: 'rgba(96,144,255,0.08)', border: '1px solid rgba(96,144,255,0.2)' }}>
          <div className="font-orbitron font-bold" style={{ color: '#6090ff', fontSize: 14 }}>
            {stats != null
              ? Math.round(stats.population * (stats.sex_ratio ?? 0.5))
              : individuals.filter(i => i.sex === 'male').length}
          </div>
          <div className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 12 }}>{text(lang as LangCode, { en: 'MALE', tr: 'ERKEK' })}</div>
        </div>
        <div className="flex-1 p-2 text-center" style={{ background: 'rgba(255,138,176,0.08)', border: '1px solid rgba(255,138,176,0.2)' }}>
          <div className="font-orbitron font-bold" style={{ color: '#ff8ab0', fontSize: 14 }}>
            {stats != null
              ? stats.population - Math.round(stats.population * (stats.sex_ratio ?? 0.5))
              : individuals.filter(i => i.sex === 'female').length}
          </div>
          <div className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 12 }}>{text(lang as LangCode, { en: 'FEMALE', tr: 'KADIN' })}</div>
        </div>
      </div>

      {/* Filter tabs + sort */}
      <div className="flex gap-1 mb-3">
        {(['all', 'male', 'female'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-1 font-share-tech tracking-widest transition-all"
            style={{
              padding: '3px 0', fontSize: 12,
              background: filter === f ? 'rgba(79,110,247,0.2)' : 'transparent',
              border: `1px solid ${filter === f ? 'rgba(79,110,247,0.5)' : 'rgba(79,110,247,0.15)'}`,
              color: filter === f ? '#c0ccff' : '#8898c8',
            }}>
            {f === 'all' ? text(lang as LangCode, { en: 'ALL', tr: 'TÜMÜ' }) : f === 'male' ? text(lang as LangCode, { en: 'MALE', tr: 'ERKEK' }) : text(lang as LangCode, { en: 'FEMALE', tr: 'KADIN' })}
          </button>
        ))}
        <button
          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          title={sortDir === 'asc' ? text(lang as LangCode, { en: 'Youngest first', tr: 'En genç önce' }) : text(lang as LangCode, { en: 'Oldest first', tr: 'En yaşlı önce' })}
          style={{
            padding: '3px 7px', fontSize: 12, flexShrink: 0,
            background: 'transparent',
            border: '1px solid rgba(79,110,247,0.15)',
            color: '#8898c8', cursor: 'pointer',
            fontFamily: 'Share Tech Mono, monospace',
          }}>
          {text(lang as LangCode, { en: 'AGE', tr: 'YAŞ' })} {sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {loading && individuals.length === 0 && (
        <div className="text-center py-4">
          <span className="font-share-tech text-sim-muted/50 animate-pulse tracking-widest" style={{ fontSize: 12 }}>{text(lang as LangCode, { en: 'LOADING DATA...', tr: 'VERİ YÜKLENİYOR...' })}</span>
        </div>
      )}

      {/* Alive individual list */}
      <div className="space-y-0.5">
        {filtered.slice(0, 100).map((ind) => {
          const name = nameFromId(ind.id, ind.sex, ind.name);
          const age = parseFloat(ind.age_years ?? 0);
          const stage = lifeStage(age, lang);
          const isMale = ind.sex === 'male';
          const isFounder = !ind.parent_1_id && !ind.parent_2_id;

          return (
            <button key={ind.id} onClick={() => setSelected(ind)}
              className="w-full flex items-center gap-2 px-2 py-1.5 transition-all text-left hover:bg-sim-border/20"
              style={{ border: '1px solid transparent', borderBottom: '1px solid rgba(79,110,247,0.06)' }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: isMale ? '#6090ff' : '#ff8ab0', boxShadow: `0 0 4px ${isMale ? '#6090ff' : '#ff8ab0'}` }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-share-tech font-bold tracking-wider truncate"
                    style={{ fontSize: 12, color: isMale ? '#8ab0ff' : '#ffaac8' }}>
                    {name}
                  </span>
                  {isFounder && (
                    <span className="font-share-tech px-1 py-0" style={{ fontSize: 12, color: '#d4a838', border: '1px solid rgba(212,168,56,0.4)' }}>{text(lang as LangCode, { en: 'FOUNDER', tr: 'KURUCU' })}</span>
                  )}
                  {!isMale && ind.health?.pregnancy && (
                    <span title={text(lang as LangCode, { en: 'Pregnant', tr: 'Hamile' })} style={{ fontSize: 13, lineHeight: 1 }}>◆</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-share-tech" style={{ fontSize: 12, color: stage.color }}>{stage.label}</span>
                  <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>·</span>
                  <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>{age.toFixed(0)} {text(lang as LangCode, { en: 'yr', tr: 'yaş' })}</span>
                  <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>·</span>
                  <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>
                    {(ind.y ?? 0).toFixed(1)}° {(ind.x ?? 0).toFixed(1)}°
                  </span>
                </div>
              </div>
              <button
                onClick={e => toggleCompare(e, ind)}
                title={text(lang as LangCode, { en: 'Add to comparison', tr: 'Karşılaştırmaya ekle' })}
                style={{
                  background: compareSet.find(i => i.id === ind.id) ? 'rgba(79,110,247,0.25)' : 'transparent',
                  border: `1px solid ${compareSet.find(i => i.id === ind.id) ? 'rgba(79,110,247,0.7)' : 'rgba(79,110,247,0.2)'}`,
                  color: compareSet.find(i => i.id === ind.id) ? '#4f6ef7' : '#6a8878',
                  width: 18, height: 18, borderRadius: 2, cursor: 'pointer',
                  fontSize: 12, lineHeight: '16px', flexShrink: 0, padding: 0,
                  fontFamily: 'Share Tech Mono, monospace',
                }}>
                ⊕
              </button>
              <ChevronRight size={10} className="text-sim-muted flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {filtered.length > 100 && (
        <div className="text-center py-2">
          <span className="font-share-tech text-sim-muted/40 tracking-widest" style={{ fontSize: 12 }}>
            +{filtered.length - 100} {text(lang as LangCode, { en: 'more individuals', tr: 'birey daha' })}
          </span>
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="flex flex-col items-center py-6 gap-2">
          <Users size={24} className="text-sim-muted/20" />
          <span className="font-share-tech text-sim-muted/40 tracking-widest" style={{ fontSize: 12 }}>{text(lang as LangCode, { en: 'NO POPULATION', tr: 'NÜFUS YOK' })}</span>
        </div>
      )}

      {/* Dead individuals section */}
      {deadIndividuals.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setDeadExpanded(v => !v)}
            className="w-full flex items-center gap-2 px-2 py-1.5"
            style={{ background: 'rgba(160,80,80,0.08)', border: '1px solid rgba(160,80,80,0.25)' }}>
            <span className="font-share-tech tracking-widest flex-1 text-left" style={{ fontSize: 12, color: '#a05050' }}>
              † {text(lang as LangCode, { en: 'DECEASED', tr: 'HAYATINI KAYBETTİLER' })} ({stats?.deaths ?? deadIndividuals.length ?? 0})
            </span>
            <ChevronDown size={10} style={{ color: '#a05050', transform: deadExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {deadExpanded && (
            <div className="space-y-0.5 mt-0.5">
              {deadIndividuals.slice(0, 100).map((ind) => {
                const name = nameFromId(ind.id, ind.sex, ind.phenotype?.name ?? ind.name);
                const age = parseFloat(ind.age_years ?? 0);
                const isMale = ind.sex === 'male';
                return (
                  <button key={ind.id} onClick={() => setSelected(ind)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 transition-all text-left"
                    style={{ background: 'rgba(160,80,80,0.04)', border: '1px solid rgba(160,80,80,0.12)', borderTop: 'none' }}>
                    <span style={{ fontSize: 12, color: '#a05050', flexShrink: 0, lineHeight: 1 }}>†</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-share-tech font-bold tracking-wider truncate"
                          style={{ fontSize: 12, color: isMale ? '#a090b8' : '#b090a0' }}>
                          {name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-share-tech" style={{ fontSize: 12, color: '#c07070' }}>
                          {causeLabel(ind.death_cause, lang)}
                        </span>
                        <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>·</span>
                        <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>{age.toFixed(0)} {text(lang as LangCode, { en: 'yr', tr: 'yaş' })}</span>
                      </div>
                    </div>
                    <ChevronRight size={10} style={{ color: '#a05050', flexShrink: 0 }} />
                  </button>
                );
              })}
              {deadIndividuals.length > 100 && (
                <div className="text-center py-1">
                  <span className="font-share-tech" style={{ fontSize: 12, color: '#703030' }}>
                    +{deadIndividuals.length - 100} {text(lang as LangCode, { en: 'more', tr: 'daha' })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </DetailPanel>
  );
}
