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

const TIER_COLORS = ['text-sim-muted', 'text-green-400', 'text-yellow-400', 'text-orange-400', 'text-red-400'];

export default function TechnologyPanel() {
  const { stats, events, lang } = useSimStore();

  const totalTechs = stats?.technologies ?? 0;
  const techProgress = stats?.tech_progress ?? {};
  const discoveredList = events
    .filter(e => e.event_type === 'technology')
    .map(e => e.description?.replace('Technology discovered: ', '') ?? '');
  const discoveredSet = new Set(discoveredList);

  return (
    <DetailPanel panelId="technology" title="Technology" titleTr="Teknoloji">
      <div className="flex justify-between items-center bg-sim-surface rounded-lg p-3 mb-2">
        <span className="text-sim-muted">{lang === 'en' ? 'Discovered' : 'Keşfedilen'}</span>
        <span className="text-sim-gold font-bold text-lg">{totalTechs} / {stats?.total_techs ?? 25}</span>
      </div>

      {TECH_TIERS.map(tier => (
        <div key={tier.tier} className="mb-3">
          <h4 className={`text-sm font-semibold uppercase tracking-widest mb-2 ${TIER_COLORS[tier.tier]}`}>
            Tier {tier.tier} — {lang === 'en' ? tier.label : tier.labelTr}
          </h4>
          <div className="space-y-1">
            {tier.techs.map(techId => {
              const isDiscovered = discoveredSet.has(techId) || totalTechs > tier.tier * 5;
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
