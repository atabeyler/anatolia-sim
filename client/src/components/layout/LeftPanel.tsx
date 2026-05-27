import { Dna, TreePine, Telescope, Brain, MessageSquare, Cpu, Flame, Swords, Coins, Music, Building2, Scale, Microscope, HeartPulse, Zap } from 'lucide-react';
import { useSimStore } from '../../store/simStore';

const MODULES = [
  { id: 'biology',      icon: Dna,           label: 'Biology',      labelTr: 'Biyoloji' },
  { id: 'environment',  icon: TreePine,       label: 'Environment',  labelTr: 'Çevre' },
  { id: 'astronomy',    icon: Telescope,      label: 'Astronomy',    labelTr: 'Astronomi' },
  { id: 'culture',      icon: Brain,          label: 'Culture',      labelTr: 'Kültür' },
  { id: 'language',     icon: MessageSquare,  label: 'Language',     labelTr: 'Dil' },
  { id: 'technology',   icon: Cpu,            label: 'Technology',   labelTr: 'Teknoloji' },
  { id: 'belief',       icon: Flame,          label: 'Belief',       labelTr: 'İnanç' },
  { id: 'social',       icon: Swords,         label: 'Social',       labelTr: 'Sosyal' },
  { id: 'economy',      icon: Coins,          label: 'Economy',      labelTr: 'Ekonomi' },
  { id: 'art',          icon: Music,          label: 'Art',          labelTr: 'Sanat' },
  { id: 'architecture', icon: Building2,      label: 'Architecture', labelTr: 'Mimari' },
  { id: 'law',          icon: Scale,          label: 'Law',          labelTr: 'Hukuk' },
  { id: 'microbiome',   icon: Microscope,     label: 'Microbiome',   labelTr: 'Mikrobiyom' },
  { id: 'psychology',   icon: HeartPulse,     label: 'Psychology',   labelTr: 'Psikoloji' },
  { id: 'epigenetics',  icon: Zap,            label: 'Epigenetics',  labelTr: 'Epigenetik' },
];

export default function LeftPanel() {
  const { activePanel, setActivePanel, lang } = useSimStore();
  return (
    <div className="fixed left-0 top-12 bottom-0 w-14 panel-glass z-40 flex flex-col items-center py-3 gap-1 border-r border-sim-border">
      {MODULES.map(mod => {
        const Icon = mod.icon;
        const isActive = activePanel === mod.id;
        return (
          <button key={mod.id} onClick={() => setActivePanel(mod.id)} data-tooltip={lang === 'en' ? mod.label : mod.labelTr}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 ${isActive ? 'bg-sim-accent text-white shadow-lg shadow-sim-accent/30' : 'text-sim-muted hover:text-sim-text hover:bg-sim-border'}`}>
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
