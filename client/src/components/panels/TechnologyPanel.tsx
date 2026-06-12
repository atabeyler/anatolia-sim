import { useEffect, useState } from 'react';
import axios from 'axios';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { Check, Lock } from 'lucide-react';

const TECH_TIERS = [
  {
    tier: 0,
    label: 'Immediate Survival',
    labelTr: 'Anlık Hayatta Kalma',
    techs: ['fire_making', 'stone_tools', 'foraging'],
  },
  {
    tier: 1,
    label: 'Basic Subsistence',
    labelTr: 'Temel Geçim',
    techs: ['hunting_spear', 'shelter_basic', 'water_container', 'animal_trap', 'clothing_basic'],
  },
  {
    tier: 2,
    label: 'Food Security',
    labelTr: 'Gıda Güvenliği',
    techs: ['fishing', 'plant_cultivation', 'animal_herding', 'food_preservation', 'bow_arrow'],
  },
  {
    tier: 3,
    label: 'Complexity',
    labelTr: 'Karmaşıklık',
    techs: ['pottery', 'weaving', 'metallurgy_copper', 'writing_system', 'calendar', 'mathematics_basic'],
  },
  {
    tier: 4,
    label: 'Civilization',
    labelTr: 'Uygarlık',
    techs: ['architecture_stone', 'wheel', 'irrigation', 'sailing', 'metallurgy_iron'],
  },
];

const TECH_NAMES: Record<string, { en: string; tr: string }> = {
  fire_making:        { en: 'Fire Making',        tr: 'Ateş Yakma' },
  stone_tools:        { en: 'Stone Tools',        tr: 'Taş Aletler' },
  foraging:           { en: 'Foraging',           tr: 'Toplayıcılık' },
  hunting_spear:      { en: 'Hunting Spear',      tr: 'Av Mızrağı' },
  shelter_basic:      { en: 'Basic Shelter',      tr: 'Temel Barınak' },
  water_container:    { en: 'Water Container',    tr: 'Su Kabı' },
  animal_trap:        { en: 'Animal Trap',        tr: 'Hayvan Tuzağı' },
  clothing_basic:     { en: 'Clothing',           tr: 'Giysi' },
  fishing:            { en: 'Fishing',            tr: 'Balıkçılık' },
  plant_cultivation:  { en: 'Plant Cultivation',  tr: 'Tarım' },
  animal_herding:     { en: 'Animal Herding',     tr: 'Hayvancılık' },
  food_preservation:  { en: 'Food Preservation',  tr: 'Gıda Saklama' },
  bow_arrow:          { en: 'Bow & Arrow',        tr: 'Yay ve Ok' },
  pottery:            { en: 'Pottery',            tr: 'Çömlekçilik' },
  weaving:            { en: 'Weaving',            tr: 'Dokumacılık' },
  metallurgy_copper:  { en: 'Copper Metallurgy',  tr: 'Bakır İşleme' },
  writing_system:     { en: 'Writing System',     tr: 'Yazı Sistemi' },
  calendar:           { en: 'Calendar',           tr: 'Takvim' },
  mathematics_basic:  { en: 'Basic Mathematics',  tr: 'Temel Matematik' },
  architecture_stone: { en: 'Stone Architecture', tr: 'Taş Mimari' },
  wheel:              { en: 'The Wheel',          tr: 'Tekerlek' },
  irrigation:         { en: 'Irrigation',         tr: 'Sulama' },
  sailing:            { en: 'Sailing',            tr: 'Denizcilik' },
  metallurgy_iron:    { en: 'Iron Metallurgy',    tr: 'Demir İşleme' },
};

const HOW_STORIES: Record<string, { tr: string; en: string }> = {
  fire_making:        { tr: 'Taşları birbirine sürtünce kıvılcım çıktığını fark etti.', en: 'Noticed sparks when striking stones together.' },
  stone_tools:        { tr: 'Sert taşları kırarak kesici kenarlar oluşturdu.', en: 'Broke hard stones to create sharp cutting edges.' },
  foraging:           { tr: 'Bitki ve meyveleri gözlemleyerek yenilebilirliğini öğrendi.', en: 'Learned edibility by careful observation of plants and fruits.' },
  hunting_spear:      { tr: 'Uzun bir dala keskin bir taş bağlayarak av menzilini artırdı.', en: 'Tied a sharp stone to a long branch to extend hunting reach.' },
  shelter_basic:      { tr: 'Dal ve yapraklarla soğuk ve yağmurdan korundu.', en: 'Used branches and leaves to shelter from cold and rain.' },
  water_container:    { tr: 'Su taşımak için hayvan derisi veya büyük yaprağı kullandı.', en: 'Used animal hide or large leaves to carry water.' },
  animal_trap:        { tr: 'Hayvan izlerini takip ederek geçiş noktalarına tuzak kurdu.', en: 'Tracked animals and set traps along their paths.' },
  clothing_basic:     { tr: 'Avladığı hayvanların derisini vücuduna sararak sıcak kaldı.', en: 'Wrapped animal hides around the body to stay warm.' },
  fishing:            { tr: 'Sığ sularda balıkların hareketini izleyerek yakalamayı keşfetti.', en: 'Observed fish movements in shallow water and caught them.' },
  plant_cultivation:  { tr: 'Düşen tohumların bahar ayında filizlendiğini fark ederek tarımı buldu.', en: 'Noticed fallen seeds sprouting each spring and began cultivating.' },
  animal_herding:     { tr: 'Yavrularını yetiştirerek kontrollü sürü oluşturmayı öğrendi.', en: 'Raised young animals to build a managed herd.' },
  food_preservation:  { tr: 'Kurutma ve tuzlamanın yiyecekleri uzun süre koruduğunu keşfetti.', en: 'Discovered that drying and salting extends food life significantly.' },
  bow_arrow:          { tr: 'Esnek bir dalı iple gererek ok fırlatabildğini keşfetti.', en: 'Found that bending a flexible branch with sinew could launch projectiles.' },
  pottery:            { tr: 'Islatılan kilin ateşte sertleştiğini gözlemleyerek kaplar yaptı.', en: 'Observed that wet clay hardens in fire and formed vessels.' },
  weaving:            { tr: 'Bitki liflerini birbirine geçirerek dayanıklı bez üretti.', en: 'Interlaced plant fibers to produce durable cloth.' },
  metallurgy_copper:  { tr: 'Bakır cevherinin ateşte eriyip kalıba dökülebildğini keşfetti.', en: 'Discovered copper ore melts and can be cast into shapes.' },
  writing_system:     { tr: 'Kil üzerine işaretler çizerek bilgiyi gelecek nesillere aktardı.', en: 'Drew marks on clay to pass knowledge to future generations.' },
  calendar:           { tr: 'Gökyüzündeki yıldız ve Güneş hareketlerini izleyerek mevsimleri öngördü.', en: 'Predicted seasons by studying star and sun movements.' },
  mathematics_basic:  { tr: 'Nesneleri sayarak ve gruplandırarak sayı kavramını geliştirdi.', en: 'Developed number concepts by counting and grouping objects.' },
  architecture_stone: { tr: 'Taşları özenle üst üste dizerek kalıcı yapılar inşa etti.', en: 'Stacked stones carefully to construct permanent structures.' },
  wheel:              { tr: 'Yuvarlak taşların kaymasından ilham alarak tekerleği geliştirdi.', en: 'Inspired by rolling stones, developed the wheel.' },
  irrigation:         { tr: 'Su kanalları açarak uzak tarım arazilerini suladı.', en: 'Dug channels to bring water to distant farmland.' },
  sailing:            { tr: 'Rüzgarın gücünü ahşap bir tekneye aktarmayı öğrendi.', en: 'Learned to harness wind power on a wooden vessel.' },
  metallurgy_iron:    { tr: 'Çok yüksek ısıda demir cevherini işlemenin yolunu buldu.', en: 'Found a way to work iron ore at extreme temperatures.' },
};

const TECH_ICONS: Record<string, string> = {
  fire_making: '🔥', stone_tools: '🪨', foraging: '🌿',
  hunting_spear: '🏹', shelter_basic: '⛺', water_container: '🫙',
  animal_trap: '🕸', clothing_basic: '🧥', fishing: '🐟',
  plant_cultivation: '🌾', animal_herding: '🐂', food_preservation: '🥩',
  bow_arrow: '🏹', pottery: '🏺', weaving: '🧵',
  metallurgy_copper: '⚒', writing_system: '📜', calendar: '📅',
  mathematics_basic: '🔢', architecture_stone: '🏛', wheel: '⚙',
  irrigation: '💧', sailing: '⛵', metallurgy_iron: '⚔',
};

const TIER_COLORS = ['text-sim-muted', 'text-green-400', 'text-yellow-400', 'text-orange-400', 'text-red-400'];

function nameFromIndividual(ind: any): string {
  return ind?.phenotype?.name ?? ind?.name ?? (ind?.id ? `ID:${ind.id.slice(-5)}` : '—');
}

export default function TechnologyPanel() {
  const { stats, events, lang, currentSim, accessToken } = useSimStore();
  const tr = (a: string, b: string) => lang === 'tr' ? a : b;

  const totalTechs = stats?.technologies ?? 0;
  const techProgress = stats?.tech_progress ?? {};
  const discoveredList = events
    .filter(e => e.event_type === 'technology')
    .map(e => e.data?.tech_id ?? e.description?.replace('Technology discovered: ', '') ?? '');
  const discoveredSet = new Set(discoveredList);

  const techEvents = events
    .filter(e => e.event_type === 'technology')
    .sort((a, b) => (a.sim_day ?? 0) - (b.sim_day ?? 0));

  const [discoverers, setDiscoverers] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!currentSim || !accessToken) return;
    const ids = [...new Set(techEvents.map(e => e.data?.discoverer_id).filter(Boolean) as string[])];
    for (const id of ids) {
      if (discoverers[id]) continue;
      axios.get(`/api/simulations/${currentSim.id}/population/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(res => setDiscoverers(prev => ({ ...prev, [id]: res.data }))).catch(() => {});
    }
  }, [techEvents.length, currentSim?.id]);

  return (
    <DetailPanel panelId="technology" title="Technology" titleTr="Teknoloji">

      {/* ── Summary bar ── */}
      <div className="flex justify-between items-center bg-sim-surface rounded-lg p-3 mb-2">
        <span className="text-sim-muted">{tr('Keşfedilen', 'Discovered')}</span>
        <span className="text-sim-gold font-bold text-lg">{totalTechs} / {stats?.total_techs ?? 25}</span>
      </div>

      {/* ── Discovery log ── */}
      {techEvents.length > 0 && (
        <div className="mb-4">
          <div className="font-share-tech tracking-widest mb-2" style={{ fontSize: 11, color: '#6a8878', letterSpacing: '0.12em', borderBottom: '1px solid rgba(0,232,135,0.1)', paddingBottom: 2 }}>
            {tr('KEŞİF GÜNLÜĞÜ', 'DISCOVERY LOG')}
          </div>
          <div className="space-y-2">
            {techEvents.map((ev, i) => {
              const techId = ev.data?.tech_id ?? ev.description?.replace('Technology discovered: ', '') ?? '';
              const discId = ev.data?.discoverer_id;
              const disc = discId ? discoverers[discId] : null;
              const discName = disc ? nameFromIndividual(disc) : null;
              const age = disc ? Math.floor(parseFloat(disc.age_years ?? 0)) : null;
              const iq = disc ? Math.round((disc.phenotype?.fluid_intelligence ?? 0) * 100) : null;
              const curiosity = disc ? Math.round((disc.phenotype?.curiosity ?? 0) * 100) : null;
              const story = HOW_STORIES[techId];
              const techName = TECH_NAMES[techId]?.[lang === 'tr' ? 'tr' : 'en'] ?? techId.replace(/_/g, ' ');
              return (
                <div key={i} style={{
                  background: 'rgba(4,4,18,0.7)',
                  border: '1px solid rgba(78,203,113,0.18)',
                  borderLeft: '3px solid #4ecb71',
                  padding: '8px 10px',
                }}>
                  <div className="flex items-start gap-2">
                    <span style={{ fontSize: 16, lineHeight: 1.1, flexShrink: 0 }}>{TECH_ICONS[techId] ?? '⚙'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-share-tech" style={{ fontSize: 12, color: '#4ecb71', letterSpacing: '0.05em' }}>
                          {techName}
                        </span>
                        <span className="font-share-tech flex-shrink-0" style={{ fontSize: 10, color: '#6a8878' }}>
                          Y{ev.sim_year}·G{ev.sim_day}
                        </span>
                      </div>

                      {/* Discoverer */}
                      {(discName || discId) && (
                        <div className="font-share-tech" style={{ fontSize: 11, color: '#a0b4ff', marginTop: 3, lineHeight: 1.3 }}>
                          {tr('Keşfeden:', 'Discoverer:')} <span style={{ color: disc?.sex === 'female' ? '#ff8ab0' : '#6090ff' }}>{discName ?? `…`}</span>
                          {age !== null && <span style={{ color: '#6a8878' }}> · {age} {tr('yaş', 'yr')}</span>}
                          {iq !== null && <span style={{ color: '#6a8878' }}> · IQ {iq}% · {tr('merak', 'curio')} {curiosity}%</span>}
                        </div>
                      )}

                      {/* How story */}
                      {story && (
                        <div className="font-share-tech" style={{ fontSize: 11, color: '#8898c8', marginTop: 4, lineHeight: 1.4, fontStyle: 'italic' }}>
                          "{lang === 'tr' ? story.tr : story.en}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tier tree ── */}
      {TECH_TIERS.map(tier => (
        <div key={tier.tier} className="mb-3">
          <h4 className={`text-sm font-semibold uppercase tracking-widest mb-2 ${TIER_COLORS[tier.tier]}`}>
            Tier {tier.tier} — {lang === 'en' ? tier.label : tier.labelTr}
          </h4>
          <div className="space-y-1">
            {tier.techs.map(techId => {
              const isDiscovered = discoveredSet.has(techId);
              const progress = techProgress[techId] ?? 0;
              return (
                <div
                  key={techId}
                  className={`p-1.5 rounded ${isDiscovered ? 'bg-sim-accent/10' : 'bg-sim-surface/30'}`}
                >
                  <div className="flex items-center gap-2">
                    {isDiscovered
                      ? <Check size={10} className="text-sim-accent flex-shrink-0" />
                      : <Lock size={10} className="text-sim-muted flex-shrink-0" />
                    }
                    <span className={isDiscovered ? 'text-sim-text' : 'text-sim-muted'}>
                      {TECH_NAMES[techId]?.[lang === 'tr' ? 'tr' : 'en'] ?? techId}
                    </span>
                    {!isDiscovered && progress > 0 && (
                      <span className="ml-auto text-sim-muted" style={{ fontSize: 10 }}>
                        {(progress * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {!isDiscovered && progress > 0 && (
                    <div className="mt-1 h-0.5 bg-sim-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sim-accent/60 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, progress * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </DetailPanel>
  );
}
