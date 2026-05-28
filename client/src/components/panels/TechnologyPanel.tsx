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

const TECH_NAMES: Record<string, string> = {
  fire_making: 'Fire Making',
  stone_tools: 'Stone Tools',
  foraging: 'Foraging',
  hunting_spear: 'Hunting Spear',
  shelter_basic: 'Basic Shelter',
  water_container: 'Water Container',
  animal_trap: 'Animal Trap',
  clothing_basic: 'Clothing',
  fishing: 'Fishing',
  plant_cultivation: 'Plant Cultivation',
  animal_herding: 'Animal Herding',
  food_preservation: 'Food Preservation',
  bow_arrow: 'Bow & Arrow',
  pottery: 'Pottery',
  weaving: 'Weaving',
  metallurgy_copper: 'Copper Metallurgy',
  writing_system: 'Writing System',
  calendar: 'Calendar',
  mathematics_basic: 'Basic Mathematics',
  architecture_stone: 'Stone Architecture',
  wheel: 'The Wheel',
  irrigation: 'Irrigation',
  sailing: 'Sailing',
  metallurgy_iron: 'Iron Metallurgy',
};

const TIER_COLORS = ['text-sim-muted', 'text-green-400', 'text-yellow-400', 'text-orange-400', 'text-red-400'];

export default function TechnologyPanel() {
  const { stats, events, lang } = useSimStore();

  const totalTechs = stats?.technologies ?? 0;
  const discoveredList = events
    .filter(e => e.event_type === 'technology')
    .map(e => e.description?.replace('Technology discovered: ', '') ?? '');
  const discoveredSet = new Set(discoveredList);

  return (
    <DetailPanel panelId="technology" title="Technology" titleTr="Teknoloji">
      <div className="flex justify-between items-center bg-sim-surface rounded-lg p-3 mb-2">
        <span className="text-sim-muted">{lang === 'en' ? 'Discovered' : 'Keşfedilen'}</span>
        <span className="text-sim-gold font-bold text-lg">{totalTechs} / 38</span>
      </div>

      {TECH_TIERS.map(tier => (
        <div key={tier.tier} className="mb-3">
          <h4 className={`text-xs font-semibold uppercase tracking-widest mb-2 ${TIER_COLORS[tier.tier]}`}>
            Tier {tier.tier} — {lang === 'en' ? tier.label : tier.labelTr}
          </h4>
          <div className="space-y-1">
            {tier.techs.map(techId => {
              const isDiscovered = discoveredSet.has(techId) || totalTechs > tier.tier * 5;
              return (
                <div
                  key={techId}
                  className={`flex items-center gap-2 p-1.5 rounded ${isDiscovered ? 'bg-sim-accent/10' : 'bg-sim-surface/30'}`}
                >
                  {isDiscovered
                    ? <Check size={10} className="text-sim-accent flex-shrink-0" />
                    : <Lock size={10} className="text-sim-muted flex-shrink-0" />
                  }
                  <span className={isDiscovered ? 'text-sim-text' : 'text-sim-muted'}>
                    {TECH_NAMES[techId] ?? techId}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </DetailPanel>
  );
}
