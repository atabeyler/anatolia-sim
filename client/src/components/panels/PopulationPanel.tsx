import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useSimStore } from '../../store/simStore';
import DetailPanel from './DetailPanel';
import { Users, MapPin, ChevronRight, X, ChevronDown } from 'lucide-react';

// Anatolian-inspired procedural name generation
const MALE_NAMES = ['Arak','Katan','Talur','Muran','Dalan','Korun','Baran','Tekum','Yaran','Atuk',
  'Katam','Saran','Turan','Urak','Elam','Furuk','Garan','Hatan','İlun','Kuram',
  'Larun','Matan','Naran','Oran','Parak','Ratan','Satan','Tukan','Uran','Varak'];
const FEMALE_NAMES = ['Ela','Sera','Kaya','Mara','Sina','Tala','Nura','Bera','Arya','Lara',
  'Elara','Serana','Kayira','Mirana','Sinara','Talara','Nurala','Berara','Aryala','Larara',
  'Esma','Ferda','Gülün','Hara','İlara','Kiran','Liran','Miran','Niran','Orana'];

const CAUSE_TR: Record<string, string> = {
  starvation: 'Açlık', dehydration: 'Susuzluk', old_age: 'Yaşlılık',
  predator: 'Yırtıcı hayvan', genetic_disease: 'Genetik hastalık',
  infection: 'Enfeksiyon', trauma: 'Travma', birth_complications: 'Doğum komplikasyonu',
  conflict: 'Çatışma', unknown: 'Bilinmeyen',
};

function causeLabel(cause: string | null | undefined, lang: string): string {
  if (!cause) return lang === 'tr' ? 'Bilinmeyen' : 'Unknown';
  if (lang === 'tr') return CAUSE_TR[cause] ?? cause.replace(/_/g, ' ');
  return cause.replace(/_/g, ' ');
}

function nameFromId(id: string, sex: string, storedName?: string | null): string {
  if (storedName) return storedName;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(31, h) + id.charCodeAt(i) | 0;
  const abs = Math.abs(h);
  return sex === 'male' ? MALE_NAMES[abs % MALE_NAMES.length] : FEMALE_NAMES[abs % FEMALE_NAMES.length];
}

function lifeStage(age: number): { label: string; color: string } {
  if (age < 2)  return { label: 'Bebek',    color: '#00d4ff' };
  if (age < 12) return { label: 'Çocuk',    color: '#4ecb71' };
  if (age < 18) return { label: 'Genç',     color: '#a0b4ff' };
  if (age < 45) return { label: 'Yetişkin', color: '#d4a838' };
  return            { label: 'Yaşlı',     color: '#e05a5a' };
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
          ? <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>{parseFloat(obj.age_years ?? 0).toFixed(0)}{lang === 'tr' ? ' yaş' : ' yr'}</span>
          : <span className="font-share-tech" style={{ fontSize: 12, color: '#a05050' }}>
              † {obj.death_cause ? causeLabel(obj.death_cause, lang) : (lang === 'tr' ? 'ölü' : 'dec.')}
            </span>
      )}
      {!obj && <span className="font-share-tech" style={{ fontSize: 12, color: '#a05050' }}>† {lang === 'tr' ? 'ölü' : 'dec.'}</span>}
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

function IndividualDetail({ ind, allIndividuals, onClose }: { ind: any; allIndividuals: any[]; onClose: () => void }) {
  const { lang } = useSimStore();
  const name = nameFromId(ind.id, ind.sex, ind.phenotype?.name ?? ind.name);
  const age = parseFloat(ind.age_years ?? 0);
  const stage = lifeStage(age);
  const ph = ind.phenotype ?? {};
  const soc = ind.social ?? {};
  const health = ind.health ?? {};
  const isDead = ind.alive === false || ind.is_dead;

  // Resolve family from allIndividuals (alive + dead combined)
  const parent1 = allIndividuals.find(i => i.id === ind.parent_1_id);
  const parent2 = allIndividuals.find(i => i.id === ind.parent_2_id);

  // Grandparents
  const gp_p1a = parent1 ? allIndividuals.find(i => i.id === parent1.parent_1_id) : null;
  const gp_p1b = parent1 ? allIndividuals.find(i => i.id === parent1.parent_2_id) : null;
  const gp_p2a = parent2 ? allIndividuals.find(i => i.id === parent2.parent_1_id) : null;
  const gp_p2b = parent2 ? allIndividuals.find(i => i.id === parent2.parent_2_id) : null;
  const grandparents = [
    gp_p1a ? { obj: gp_p1a, side: lang === 'tr' ? 'baba tarafı' : 'paternal' } : null,
    gp_p1b ? { obj: gp_p1b, side: lang === 'tr' ? 'baba tarafı' : 'paternal' } : null,
    gp_p2a ? { obj: gp_p2a, side: lang === 'tr' ? 'anne tarafı' : 'maternal' } : null,
    gp_p2b ? { obj: gp_p2b, side: lang === 'tr' ? 'anne tarafı' : 'maternal' } : null,
  ].filter(Boolean) as { obj: any; side: string }[];

  const children = allIndividuals.filter(i =>
    i.parent_1_id === ind.id || i.parent_2_id === ind.id
  );

  // Grandchildren
  const grandchildren = children.flatMap(c =>
    allIndividuals.filter(i => i.parent_1_id === c.id || i.parent_2_id === c.id)
      .map(gc => ({ obj: gc, parentName: nameFromId(c.id, c.sex, c.phenotype?.name ?? c.name) }))
  );

  const siblings = allIndividuals.filter(i =>
    i.id !== ind.id &&
    ((ind.parent_1_id && i.parent_1_id === ind.parent_1_id) ||
     (ind.parent_2_id && i.parent_2_id === ind.parent_2_id))
  );
  const isFounder = !ind.parent_1_id && !ind.parent_2_id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="relative flex flex-col" style={{ width: 340, maxHeight: '80vh', background: 'rgba(4,4,18,0.98)', border: '1px solid rgba(79,110,247,0.4)', backdropFilter: 'blur(20px)', boxShadow: '0 16px 60px rgba(0,0,0,0.8)' }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(79,110,247,0.2)' }}>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-orbitron font-bold tracking-wider" style={{ color: isDead ? '#a05050' : (ind.sex === 'male' ? '#6090ff' : '#ff8ab0'), fontSize: 14 }}>{name}</span>
              {isDead && <span className="font-share-tech" style={{ fontSize: 12, color: '#a05050' }}>† {lang === 'tr' ? 'HAYATINI KAYBETTİ' : 'DECEASED'}</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {!isDead && <span className="font-share-tech" style={{ fontSize: 12, color: stage.color }}>{stage.label}</span>}
              {!isDead && <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>·</span>}
              <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>{age.toFixed(1)} {lang === 'tr' ? 'yaş' : 'yr'}</span>
              <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>·</span>
              <span className="font-share-tech" style={{ fontSize: 12, color: ind.sex === 'male' ? '#6090ff' : '#ff8ab0' }}>{ind.sex === 'male' ? (lang === 'tr' ? 'Erkek' : 'Male') : (lang === 'tr' ? 'Kadın' : 'Female')}</span>
            </div>
          </div>
          <div className="flex-1" />
          <button onClick={onClose} className="text-sim-muted hover:text-sim-accent transition-colors"><X size={14} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Death info — shown only for dead individuals */}
          {isDead && (
            <div style={{ background: 'rgba(160,80,80,0.1)', border: '1px solid rgba(160,80,80,0.35)', padding: '8px 10px' }}>
              <div className="font-share-tech tracking-widest mb-1" style={{ fontSize: 12, color: '#a05050' }}>
                {lang === 'tr' ? 'ÖLÜM BİLGİSİ' : 'DEATH INFO'}
              </div>
              <div className="flex justify-between">
                <span className="font-share-tech" style={{ fontSize: 12, color: '#8898c8' }}>{lang === 'tr' ? 'Neden' : 'Cause'}</span>
                <span className="font-share-tech" style={{ fontSize: 12, color: '#e08080' }}>{causeLabel(ind.death_cause, lang)}</span>
              </div>
              {ind.death_day != null && (
                <div className="flex justify-between mt-0.5">
                  <span className="font-share-tech" style={{ fontSize: 12, color: '#8898c8' }}>{lang === 'tr' ? 'Gün' : 'Day'}</span>
                  <span className="font-share-tech" style={{ fontSize: 12, color: '#e08080' }}>{ind.death_day}</span>
                </div>
              )}
            </div>
          )}

          {/* Location */}
          {!isDead && (
            <div>
              <div className="font-share-tech text-sim-muted tracking-widest mb-1" style={{ fontSize: 12 }}>KONUM</div>
              <div className="flex items-center gap-1 font-share-tech" style={{ fontSize: 12, color: '#a0b4ff' }}>
                <MapPin size={10} />
                {(ind.y ?? 0).toFixed(3)}°{(ind.y ?? 0) >= 0 ? 'K' : 'G'}  {(ind.x ?? 0).toFixed(3)}°{(ind.x ?? 0) >= 0 ? 'D' : 'B'}
              </div>
            </div>
          )}

          {/* Traits */}
          <div>
            <div className="font-share-tech text-sim-muted tracking-widest mb-2" style={{ fontSize: 12 }}>ÖZELLİKLER</div>
            <div className="space-y-1.5">
              {[
                { key: 'fluid_intelligence', label: 'Zekâ', color: '#d4a838' },
                { key: 'physical_strength',  label: 'Güç',  color: '#e05a5a' },
                { key: 'empathy',            label: 'Empati', color: '#00d4ff' },
                { key: 'curiosity',          label: 'Merak', color: '#4ecb71' },
                { key: 'aggression',         label: 'Saldırganlık', color: '#f97316' },
                { key: 'immune_strength',    label: 'Bağışıklık', color: '#4f6ef7' },
                { key: 'artistic_sense',     label: 'Sanat', color: '#a855f7' },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <div className="flex justify-between mb-0.5">
                    <span className="font-share-tech" style={{ fontSize: 12, color: '#8898c8' }}>{label}</span>
                    <span className="font-share-tech" style={{ fontSize: 12, color }}>{Math.round((ph[key] ?? 0) * 100)}%</span>
                  </div>
                  {traitBar(ph[key] ?? 0, color)}
                </div>
              ))}
            </div>
          </div>

          {/* Physical measurements */}
          <div>
            <div className="font-share-tech text-sim-muted tracking-widest mb-2" style={{ fontSize: 12 }}>FİZİKSEL</div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="font-share-tech" style={{ fontSize: 12, color: '#8898c8' }}>{lang === 'tr' ? 'Boy' : 'Height'}</span>
                <span className="font-share-tech" style={{ fontSize: 12, color: '#a0b4ff', fontFamily: 'monospace' }}>{ind.height_cm ?? '—'} cm</span>
              </div>
              <div className="flex justify-between">
                <span className="font-share-tech" style={{ fontSize: 12, color: '#8898c8' }}>{lang === 'tr' ? 'Kilo' : 'Weight'}</span>
                <span className="font-share-tech" style={{ fontSize: 12, color: '#a0b4ff', fontFamily: 'monospace' }}>{ind.weight_kg ?? '—'} kg</span>
              </div>
            </div>
          </div>

          {/* Health — only for alive */}
          {!isDead && (
            <div>
              <div className="font-share-tech text-sim-muted tracking-widest mb-2" style={{ fontSize: 12 }}>SAĞLIK</div>
              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="font-share-tech" style={{ fontSize: 12, color: '#8898c8' }}>Can</span>
                  <span className="font-share-tech" style={{ fontSize: 12, color: '#4ecb71' }}>{Math.round((health.hp ?? 0) * 100)}%</span>
                </div>
                {traitBar(health.hp ?? 0, '#4ecb71')}
              </div>
            </div>
          )}

          {/* Social — only for alive */}
          {!isDead && (
            <div>
              <div className="font-share-tech text-sim-muted tracking-widest mb-1" style={{ fontSize: 12 }}>SOSYAL</div>
              <div className="flex flex-wrap gap-1.5">
                {soc.has_mate && <span className="font-share-tech px-1.5 py-0.5" style={{ fontSize: 12, color: '#ff8ab0', border: '1px solid rgba(255,138,176,0.3)', background: 'rgba(255,138,176,0.08)' }}>Çift</span>}
                {(soc.children_ids?.length > 0) && <span className="font-share-tech px-1.5 py-0.5" style={{ fontSize: 12, color: '#4ecb71', border: '1px solid rgba(78,203,113,0.3)', background: 'rgba(78,203,113,0.08)' }}>{soc.children_ids.length} Çocuk</span>}
                {soc.group_id && <span className="font-share-tech px-1.5 py-0.5" style={{ fontSize: 12, color: '#4f6ef7', border: '1px solid rgba(79,110,247,0.3)', background: 'rgba(79,110,247,0.08)' }}>Grup</span>}
                {!soc.has_mate && !soc.group_id && <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>Yalnız</span>}
              </div>
            </div>
          )}

          {/* Family tree */}
          <div>
            <div className="font-share-tech text-sim-muted tracking-widest mb-2" style={{ fontSize: 12 }}>
              {lang === 'tr' ? 'SOYAĞACI' : 'FAMILY TREE'}
            </div>

            {isFounder && (
              <div className="font-share-tech px-2 py-1 mb-3" style={{ fontSize: 12, color: '#d4a838', border: '1px solid rgba(212,168,56,0.3)', background: 'rgba(212,168,56,0.06)' }}>
                ★ {lang === 'tr' ? 'Kurucu Birey — Medeniyetin Atası' : 'Founding Individual — Ancestor of Civilization'}
              </div>
            )}

            {/* ── Grandparents ── */}
            {grandparents.length > 0 && (
              <FamilySection label={lang === 'tr' ? `BÜYÜKANNE/BABA (${grandparents.length})` : `GRANDPARENTS (${grandparents.length})`} indent={0}>
                {grandparents.map(({ obj, side }, idx) => (
                  <PersonRow key={idx} obj={obj} tag={side} lang={lang} />
                ))}
              </FamilySection>
            )}

            {/* ── Parents ── */}
            {(parent1 || parent2 || ind.parent_1_id || ind.parent_2_id) && (
              <FamilySection label={lang === 'tr' ? 'EBEVEYNLER' : 'PARENTS'} indent={grandparents.length > 0 ? 1 : 0}>
                {[
                  { obj: parent1, id: ind.parent_1_id },
                  { obj: parent2, id: ind.parent_2_id },
                ].filter(p => p.obj || p.id).map(({ obj, id }, idx) => {
                  const roleLabel = obj?.sex === 'male'
                    ? (lang === 'tr' ? 'Baba' : 'Father')
                    : obj?.sex === 'female'
                      ? (lang === 'tr' ? 'Anne' : 'Mother')
                      : (lang === 'tr' ? 'Ebeveyn' : 'Parent');
                  return <PersonRow key={idx} obj={obj} fallbackId={id} tag={roleLabel} lang={lang} />;
                })}
              </FamilySection>
            )}

            {/* ── Siblings ── */}
            {siblings.length > 0 && (
              <FamilySection label={lang === 'tr' ? `KARDEŞLER (${siblings.length})` : `SIBLINGS (${siblings.length})`} indent={2}>
                {siblings.slice(0, 6).map(s => (
                  <PersonRow key={s.id} obj={s} lang={lang} />
                ))}
                {siblings.length > 6 && (
                  <div className="font-share-tech text-sim-muted" style={{ fontSize: 12, paddingLeft: 10 }}>
                    +{siblings.length - 6} {lang === 'tr' ? 'daha' : 'more'}
                  </div>
                )}
              </FamilySection>
            )}

            {/* ── Self marker ── */}
            <div className="flex items-center gap-2 my-1 px-1" style={{ borderLeft: '2px solid rgba(212,168,56,0.6)', marginLeft: 2 }}>
              <span style={{ fontSize: 12, color: '#d4a838' }}>★</span>
              <span className="font-orbitron font-bold" style={{ fontSize: 12, color: ind.sex === 'male' ? '#8ab0ff' : '#ffaac8' }}>{name}</span>
              <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>
                {isDead ? `† ${lang === 'tr' ? 'ölü' : 'dec.'}` : `${age.toFixed(0)} ${lang === 'tr' ? 'yaş' : 'yr'}`}
              </span>
            </div>

            {/* ── Children ── */}
            {children.length > 0 && (
              <FamilySection label={lang === 'tr' ? `ÇOCUKLAR (${children.length})` : `CHILDREN (${children.length})`} indent={1}>
                {children.slice(0, 8).map(c => (
                  <PersonRow key={c.id} obj={c} lang={lang} />
                ))}
                {children.length > 8 && (
                  <div className="font-share-tech text-sim-muted" style={{ fontSize: 12, paddingLeft: 10 }}>
                    +{children.length - 8} {lang === 'tr' ? 'daha' : 'more'}
                  </div>
                )}
              </FamilySection>
            )}

            {/* ── Grandchildren ── */}
            {grandchildren.length > 0 && (
              <FamilySection label={lang === 'tr' ? `TORUNLAR (${grandchildren.length})` : `GRANDCHILDREN (${grandchildren.length})`} indent={2}>
                {grandchildren.slice(0, 6).map(({ obj: gc, parentName }, idx) => (
                  <PersonRow key={idx} obj={gc} tag={parentName} lang={lang} />
                ))}
                {grandchildren.length > 6 && (
                  <div className="font-share-tech text-sim-muted" style={{ fontSize: 12, paddingLeft: 10 }}>
                    +{grandchildren.length - 6} {lang === 'tr' ? 'daha' : 'more'}
                  </div>
                )}
              </FamilySection>
            )}

            {isFounder && children.length === 0 && (
              <div className="font-share-tech text-sim-muted mt-2" style={{ fontSize: 12 }}>
                {lang === 'tr' ? 'Henüz çocuk yok.' : 'No children yet.'}
              </div>
            )}
          </div>
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
  const [filter, setFilter] = useState<'all' | 'male' | 'female'>('all');
  const [deadExpanded, setDeadExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

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
    intervalRef.current = setInterval(load, 10000);
    return () => clearInterval(intervalRef.current);
  }, [currentSim?.id]);

  const allForLookup = [...individuals, ...deadIndividuals];
  const filtered = individuals.filter(i => filter === 'all' || i.sex === filter);

  return (
    <DetailPanel panelId="population" title="Population" titleTr="Nüfus">
      {selected && <IndividualDetail ind={selected} allIndividuals={allForLookup} onClose={() => setSelected(null)} />}

      {/* Summary bar */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 p-2 text-center" style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)' }}>
          <div className="font-orbitron font-bold" style={{ color: '#4f6ef7', fontSize: 14 }}>{stats?.population ?? individuals.length}</div>
          <div className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 12 }}>TOPLAM</div>
        </div>
        <div className="flex-1 p-2 text-center" style={{ background: 'rgba(96,144,255,0.08)', border: '1px solid rgba(96,144,255,0.2)' }}>
          <div className="font-orbitron font-bold" style={{ color: '#6090ff', fontSize: 14 }}>{individuals.filter(i => i.sex === 'male').length}</div>
          <div className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 12 }}>ERKEK</div>
        </div>
        <div className="flex-1 p-2 text-center" style={{ background: 'rgba(255,138,176,0.08)', border: '1px solid rgba(255,138,176,0.2)' }}>
          <div className="font-orbitron font-bold" style={{ color: '#ff8ab0', fontSize: 14 }}>{individuals.filter(i => i.sex === 'female').length}</div>
          <div className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 12 }}>KADIN</div>
        </div>
      </div>

      {/* Filter tabs */}
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
            {f === 'all' ? 'TÜMÜ' : f === 'male' ? 'ERKEK' : 'KADIN'}
          </button>
        ))}
      </div>

      {loading && individuals.length === 0 && (
        <div className="text-center py-4">
          <span className="font-share-tech text-sim-muted/50 animate-pulse tracking-widest" style={{ fontSize: 12 }}>VERİ YÜKLENİYOR...</span>
        </div>
      )}

      {/* Alive individual list */}
      <div className="space-y-0.5">
        {filtered.slice(0, 100).map((ind) => {
          const name = nameFromId(ind.id, ind.sex, ind.name);
          const age = parseFloat(ind.age_years ?? 0);
          const stage = lifeStage(age);
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
                    <span className="font-share-tech px-1 py-0" style={{ fontSize: 12, color: '#d4a838', border: '1px solid rgba(212,168,56,0.4)' }}>KURUCU</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-share-tech" style={{ fontSize: 12, color: stage.color }}>{stage.label}</span>
                  <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>·</span>
                  <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>{age.toFixed(0)} yaş</span>
                  <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>·</span>
                  <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>
                    {(ind.y ?? 0).toFixed(1)}° {(ind.x ?? 0).toFixed(1)}°
                  </span>
                </div>
              </div>
              <ChevronRight size={10} className="text-sim-muted flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {filtered.length > 100 && (
        <div className="text-center py-2">
          <span className="font-share-tech text-sim-muted/40 tracking-widest" style={{ fontSize: 12 }}>
            +{filtered.length - 100} {lang === 'tr' ? 'birey daha' : 'more individuals'}
          </span>
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="flex flex-col items-center py-6 gap-2">
          <Users size={24} className="text-sim-muted/20" />
          <span className="font-share-tech text-sim-muted/40 tracking-widest" style={{ fontSize: 12 }}>NÜFUS YOK</span>
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
              † {lang === 'tr' ? 'HAYATINI KAYBETTİLER' : 'DECEASED'} ({deadIndividuals.length})
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
                        <span className="font-share-tech text-sim-muted" style={{ fontSize: 12 }}>{age.toFixed(0)} yaş</span>
                      </div>
                    </div>
                    <ChevronRight size={10} style={{ color: '#a05050', flexShrink: 0 }} />
                  </button>
                );
              })}
              {deadIndividuals.length > 100 && (
                <div className="text-center py-1">
                  <span className="font-share-tech" style={{ fontSize: 12, color: '#703030' }}>
                    +{deadIndividuals.length - 100} {lang === 'tr' ? 'daha' : 'more'}
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
