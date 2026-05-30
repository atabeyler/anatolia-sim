import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useSimStore } from '../../store/simStore';
import DetailPanel from './DetailPanel';
import { Users, MapPin, ChevronRight, X } from 'lucide-react';

// Anatolian-inspired procedural name generation
const MALE_NAMES = ['Arak','Katan','Talur','Muran','Dalan','Korun','Baran','Tekum','Yaran','Atuk',
  'Katam','Saran','Turan','Urak','Elam','Furuk','Garan','Hatan','İlun','Kuram',
  'Larun','Matan','Naran','Oran','Parak','Ratan','Satan','Tukan','Uran','Varak'];
const FEMALE_NAMES = ['Ela','Sera','Kaya','Mara','Sina','Tala','Nura','Bera','Arya','Lara',
  'Elara','Serana','Kayira','Mirana','Sinara','Talara','Nurala','Berara','Aryala','Larara',
  'Esma','Ferda','Gülün','Hara','İlara','Kiran','Liran','Miran','Niran','Orana'];

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

function IndividualDetail({ ind, allIndividuals, onClose }: { ind: any; allIndividuals: any[]; onClose: () => void }) {
  const { lang } = useSimStore();
  const name = nameFromId(ind.id, ind.sex, ind.phenotype?.name ?? ind.name);
  const age = parseFloat(ind.age_years ?? 0);
  const stage = lifeStage(age);
  const ph = ind.phenotype ?? {};
  const soc = ind.social ?? {};
  const health = ind.health ?? {};

  // Resolve family from allIndividuals
  const parent1 = allIndividuals.find(i => i.id === ind.parent_1_id);
  const parent2 = allIndividuals.find(i => i.id === ind.parent_2_id);
  const children = allIndividuals.filter(i =>
    i.parent_1_id === ind.id || i.parent_2_id === ind.id
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
            <span className="font-orbitron font-bold tracking-wider" style={{ color: ind.sex === 'male' ? '#6090ff' : '#ff8ab0', fontSize: 14 }}>{name}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-share-tech" style={{ fontSize: 9, color: stage.color }}>{stage.label}</span>
              <span className="font-share-tech text-sim-muted" style={{ fontSize: 9 }}>·</span>
              <span className="font-share-tech text-sim-muted" style={{ fontSize: 9 }}>{age.toFixed(1)} {lang === 'tr' ? 'yaş' : 'yr'}</span>
              <span className="font-share-tech text-sim-muted" style={{ fontSize: 9 }}>·</span>
              <span className="font-share-tech" style={{ fontSize: 9, color: ind.sex === 'male' ? '#6090ff' : '#ff8ab0' }}>{ind.sex === 'male' ? (lang === 'tr' ? 'Erkek' : 'Male') : (lang === 'tr' ? 'Kadın' : 'Female')}</span>
            </div>
          </div>
          <div className="flex-1" />
          <button onClick={onClose} className="text-sim-muted hover:text-sim-accent transition-colors"><X size={14} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Location */}
          <div>
            <div className="font-share-tech text-sim-muted tracking-widest mb-1" style={{ fontSize: 8 }}>KONUM</div>
            <div className="flex items-center gap-1 font-share-tech" style={{ fontSize: 10, color: '#a0b4ff' }}>
              <MapPin size={10} />
              {(ind.y ?? 0).toFixed(3)}°{(ind.y ?? 0) >= 0 ? 'K' : 'G'}  {(ind.x ?? 0).toFixed(3)}°{(ind.x ?? 0) >= 0 ? 'D' : 'B'}
            </div>
          </div>

          {/* Traits */}
          <div>
            <div className="font-share-tech text-sim-muted tracking-widest mb-2" style={{ fontSize: 8 }}>ÖZELLİKLER</div>
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
                    <span className="font-share-tech" style={{ fontSize: 9, color: '#8898c8' }}>{label}</span>
                    <span className="font-share-tech" style={{ fontSize: 9, color }}>{Math.round((ph[key] ?? 0) * 100)}%</span>
                  </div>
                  {traitBar(ph[key] ?? 0, color)}
                </div>
              ))}
            </div>
          </div>

          {/* Physical measurements */}
          <div>
            <div className="font-share-tech text-sim-muted tracking-widest mb-2" style={{ fontSize: 8 }}>FİZİKSEL</div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="font-share-tech" style={{ fontSize: 9, color: '#8898c8' }}>{lang === 'tr' ? 'Boy' : 'Height'}</span>
                <span className="font-share-tech" style={{ fontSize: 9, color: '#a0b4ff', fontFamily: 'monospace' }}>{ind.height_cm ?? '—'} cm</span>
              </div>
              <div className="flex justify-between">
                <span className="font-share-tech" style={{ fontSize: 9, color: '#8898c8' }}>{lang === 'tr' ? 'Kilo' : 'Weight'}</span>
                <span className="font-share-tech" style={{ fontSize: 9, color: '#a0b4ff', fontFamily: 'monospace' }}>{ind.weight_kg ?? '—'} kg</span>
              </div>
            </div>
          </div>

          {/* Health */}
          <div>
            <div className="font-share-tech text-sim-muted tracking-widest mb-2" style={{ fontSize: 8 }}>SAĞLIK</div>
            <div>
              <div className="flex justify-between mb-0.5">
                <span className="font-share-tech" style={{ fontSize: 9, color: '#8898c8' }}>Can</span>
                <span className="font-share-tech" style={{ fontSize: 9, color: '#4ecb71' }}>{Math.round((health.hp ?? 0) * 100)}%</span>
              </div>
              {traitBar(health.hp ?? 0, '#4ecb71')}
            </div>
          </div>

          {/* Social */}
          <div>
            <div className="font-share-tech text-sim-muted tracking-widest mb-1" style={{ fontSize: 8 }}>SOSYAL</div>
            <div className="flex flex-wrap gap-1.5">
              {soc.has_mate && <span className="font-share-tech px-1.5 py-0.5" style={{ fontSize: 8, color: '#ff8ab0', border: '1px solid rgba(255,138,176,0.3)', background: 'rgba(255,138,176,0.08)' }}>Çift</span>}
              {(soc.children_ids?.length > 0) && <span className="font-share-tech px-1.5 py-0.5" style={{ fontSize: 8, color: '#4ecb71', border: '1px solid rgba(78,203,113,0.3)', background: 'rgba(78,203,113,0.08)' }}>{soc.children_ids.length} Çocuk</span>}
              {soc.group_id && <span className="font-share-tech px-1.5 py-0.5" style={{ fontSize: 8, color: '#4f6ef7', border: '1px solid rgba(79,110,247,0.3)', background: 'rgba(79,110,247,0.08)' }}>Grup</span>}
              {!soc.has_mate && !soc.group_id && <span className="font-share-tech text-sim-muted" style={{ fontSize: 8 }}>Yalnız</span>}
            </div>
          </div>

          {/* Family tree */}
          <div>
            <div className="font-share-tech text-sim-muted tracking-widest mb-2" style={{ fontSize: 8 }}>
              {lang === 'tr' ? 'SOYAĞACI' : 'FAMILY TREE'}
            </div>

            {isFounder && (
              <div className="font-share-tech px-2 py-1 mb-2" style={{ fontSize: 8, color: '#d4a838', border: '1px solid rgba(212,168,56,0.3)', background: 'rgba(212,168,56,0.06)' }}>
                ★ {lang === 'tr' ? 'Kurucu Birey — Medeniyetin Atası' : 'Founding Individual — Ancestor of Civilization'}
              </div>
            )}

            {/* Parents */}
            {(parent1 || parent2 || ind.parent_1_id || ind.parent_2_id) && (
              <div className="mb-2">
                <div style={{ fontSize: 7.5, color: '#7a9a88', letterSpacing: '0.08em', marginBottom: 4 }}>
                  {lang === 'tr' ? 'EBEVEYNLER' : 'PARENTS'}
                </div>
                {(parent1 ?? ind.parent_1_id) && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#6090ff' }} />
                    <div className="font-share-tech" style={{ fontSize: 9 }}>
                      <span style={{ color: '#5070c0' }}>{lang === 'tr' ? 'Baba' : 'Father'}: </span>
                      <span style={{ color: parent1 ? '#8ab0ff' : '#3a5a78' }}>
                        {parent1 ? nameFromId(parent1.id, parent1.sex, parent1.phenotype?.name ?? parent1.name) : `ID:${ind.parent_1_id?.slice(-6)}`}
                      </span>
                      {parent1 && (
                        <span style={{ color: '#7a9a88', marginLeft: 4 }}>
                          {parseFloat(parent1.age_years ?? 0).toFixed(0)}{lang === 'tr' ? ' yaş' : ' yr'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {(parent2 ?? ind.parent_2_id) && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#ff8ab0' }} />
                    <div className="font-share-tech" style={{ fontSize: 9 }}>
                      <span style={{ color: '#c06080' }}>{lang === 'tr' ? 'Anne' : 'Mother'}: </span>
                      <span style={{ color: parent2 ? '#ffaac8' : '#7a3a58' }}>
                        {parent2 ? nameFromId(parent2.id, parent2.sex, parent2.phenotype?.name ?? parent2.name) : `ID:${ind.parent_2_id?.slice(-6)}`}
                      </span>
                      {parent2 && (
                        <span style={{ color: '#7a9a88', marginLeft: 4 }}>
                          {parseFloat(parent2.age_years ?? 0).toFixed(0)}{lang === 'tr' ? ' yaş' : ' yr'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Children */}
            {children.length > 0 && (
              <div className="mb-2">
                <div style={{ fontSize: 7.5, color: '#7a9a88', letterSpacing: '0.08em', marginBottom: 4 }}>
                  {lang === 'tr' ? `ÇOCUKLAR (${children.length})` : `CHILDREN (${children.length})`}
                </div>
                {children.slice(0, 8).map(c => (
                  <div key={c.id} className="flex items-center gap-2 mb-0.5">
                    <div className="w-1 h-1 rounded-full flex-shrink-0"
                      style={{ background: c.sex === 'male' ? '#6090ff' : '#ff8ab0' }} />
                    <span className="font-share-tech" style={{ fontSize: 8.5, color: c.sex === 'male' ? '#8ab0ff' : '#ffaac8' }}>
                      {nameFromId(c.id, c.sex, c.phenotype?.name ?? c.name)}
                    </span>
                    <span className="font-share-tech text-sim-muted" style={{ fontSize: 8 }}>
                      {parseFloat(c.age_years ?? 0).toFixed(0)}{lang === 'tr' ? ' yaş' : ' yr'}
                    </span>
                    <span style={{ fontSize: 7.5, color: lifeStage(parseFloat(c.age_years ?? 0)).color }}>
                      {lifeStage(parseFloat(c.age_years ?? 0)).label}
                    </span>
                  </div>
                ))}
                {children.length > 8 && (
                  <div className="font-share-tech text-sim-muted" style={{ fontSize: 7.5, marginLeft: 12 }}>
                    +{children.length - 8} {lang === 'tr' ? 'çocuk daha' : 'more'}
                  </div>
                )}
              </div>
            )}

            {/* Siblings */}
            {siblings.length > 0 && (
              <div>
                <div style={{ fontSize: 7.5, color: '#7a9a88', letterSpacing: '0.08em', marginBottom: 4 }}>
                  {lang === 'tr' ? `KARDEŞLER (${siblings.length})` : `SIBLINGS (${siblings.length})`}
                </div>
                {siblings.slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center gap-2 mb-0.5">
                    <div className="w-1 h-1 rounded-full flex-shrink-0"
                      style={{ background: s.sex === 'male' ? '#6090ff' : '#ff8ab0' }} />
                    <span className="font-share-tech" style={{ fontSize: 8.5, color: '#6878a8' }}>
                      {nameFromId(s.id, s.sex, s.phenotype?.name ?? s.name)}
                    </span>
                    <span className="font-share-tech text-sim-muted" style={{ fontSize: 8 }}>
                      {parseFloat(s.age_years ?? 0).toFixed(0)}{lang === 'tr' ? ' yaş' : ' yr'}
                    </span>
                  </div>
                ))}
                {siblings.length > 5 && (
                  <div className="font-share-tech text-sim-muted" style={{ fontSize: 7.5, marginLeft: 12 }}>
                    +{siblings.length - 5} {lang === 'tr' ? 'kardeş daha' : 'more'}
                  </div>
                )}
              </div>
            )}

            {isFounder && children.length === 0 && (
              <div className="font-share-tech text-sim-muted" style={{ fontSize: 8 }}>
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
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'male' | 'female'>('all');
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  async function load() {
    if (!currentSim || !accessToken) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/simulations/${currentSim.id}/population?alive=true&limit=200`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setIndividuals(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 10000);
    return () => clearInterval(intervalRef.current);
  }, [currentSim?.id]);

  const filtered = individuals.filter(i => filter === 'all' || i.sex === filter);

  return (
    <DetailPanel panelId="population" title="Population" titleTr="Nüfus">
      {selected && <IndividualDetail ind={selected} allIndividuals={individuals} onClose={() => setSelected(null)} />}

      {/* Summary bar */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 p-2 text-center" style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)' }}>
          <div className="font-orbitron font-bold" style={{ color: '#4f6ef7', fontSize: 14 }}>{stats?.population ?? individuals.length}</div>
          <div className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 7 }}>TOPLAM</div>
        </div>
        <div className="flex-1 p-2 text-center" style={{ background: 'rgba(96,144,255,0.08)', border: '1px solid rgba(96,144,255,0.2)' }}>
          <div className="font-orbitron font-bold" style={{ color: '#6090ff', fontSize: 14 }}>{individuals.filter(i => i.sex === 'male').length}</div>
          <div className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 7 }}>ERKEK</div>
        </div>
        <div className="flex-1 p-2 text-center" style={{ background: 'rgba(255,138,176,0.08)', border: '1px solid rgba(255,138,176,0.2)' }}>
          <div className="font-orbitron font-bold" style={{ color: '#ff8ab0', fontSize: 14 }}>{individuals.filter(i => i.sex === 'female').length}</div>
          <div className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 7 }}>KADIN</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3">
        {(['all', 'male', 'female'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-1 font-share-tech tracking-widest transition-all"
            style={{
              padding: '3px 0', fontSize: 9,
              background: filter === f ? 'rgba(79,110,247,0.2)' : 'transparent',
              border: `1px solid ${filter === f ? 'rgba(79,110,247,0.5)' : 'rgba(79,110,247,0.15)'}`,
              color: filter === f ? '#c0ccff' : '#4a5578',
            }}>
            {f === 'all' ? 'TÜMÜ' : f === 'male' ? 'ERKEK' : 'KADIN'}
          </button>
        ))}
      </div>

      {loading && individuals.length === 0 && (
        <div className="text-center py-4">
          <span className="font-share-tech text-sim-muted/50 animate-pulse tracking-widest" style={{ fontSize: 9 }}>VERİ YÜKLENİYOR...</span>
        </div>
      )}

      {/* Individual list */}
      <div className="space-y-0.5">
        {filtered.slice(0, 100).map((ind, i) => {
          const name = nameFromId(ind.id, ind.sex, ind.name);
          const age = parseFloat(ind.age_years ?? 0);
          const stage = lifeStage(age);
          const isMale = ind.sex === 'male';
          const isFounder = !ind.parent_1_id && !ind.parent_2_id;

          return (
            <button key={ind.id} onClick={() => setSelected(ind)}
              className="w-full flex items-center gap-2 px-2 py-1.5 transition-all text-left hover:bg-sim-border/20"
              style={{ border: '1px solid transparent', borderBottom: '1px solid rgba(79,110,247,0.06)' }}>
              {/* Sex dot */}
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: isMale ? '#6090ff' : '#ff8ab0', boxShadow: `0 0 4px ${isMale ? '#6090ff' : '#ff8ab0'}` }} />

              {/* Name + tags */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-share-tech font-bold tracking-wider truncate"
                    style={{ fontSize: 11, color: isMale ? '#8ab0ff' : '#ffaac8' }}>
                    {name}
                  </span>
                  {isFounder && (
                    <span className="font-share-tech px-1 py-0" style={{ fontSize: 7, color: '#d4a838', border: '1px solid rgba(212,168,56,0.4)' }}>KURUCU</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-share-tech" style={{ fontSize: 8, color: stage.color }}>{stage.label}</span>
                  <span className="font-share-tech text-sim-muted" style={{ fontSize: 8 }}>·</span>
                  <span className="font-share-tech text-sim-muted" style={{ fontSize: 8 }}>{age.toFixed(0)} yaş</span>
                  <span className="font-share-tech text-sim-muted" style={{ fontSize: 8 }}>·</span>
                  <span className="font-share-tech text-sim-muted" style={{ fontSize: 8 }}>
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
          <span className="font-share-tech text-sim-muted/40 tracking-widest" style={{ fontSize: 8 }}>
            +{filtered.length - 100} {lang === 'tr' ? 'birey daha' : 'more individuals'}
          </span>
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="flex flex-col items-center py-6 gap-2">
          <Users size={24} className="text-sim-muted/20" />
          <span className="font-share-tech text-sim-muted/40 tracking-widest" style={{ fontSize: 9 }}>NÜFUS YOK</span>
        </div>
      )}
    </DetailPanel>
  );
}
