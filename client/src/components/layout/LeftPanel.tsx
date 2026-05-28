import { Dna, TreePine, Telescope, Brain, MessageSquare, Cpu, Flame, Swords, Coins, Music, Building2, Scale, Microscope, HeartPulse, Zap, Zap as GodIcon, Clock, Bot, FlaskConical } from 'lucide-react';
import { useSimStore } from '../../store/simStore';

const MODULES = [
  { id: 'biology',      icon: Dna,           label: 'Biology',        labelTr: 'Biyoloji' },
  { id: 'environment',  icon: TreePine,       label: 'Environment',    labelTr: 'Çevre' },
  { id: 'astronomy',    icon: Telescope,      label: 'Astronomy',      labelTr: 'Astronomi' },
  { id: 'culture',      icon: Brain,          label: 'Culture',        labelTr: 'Kültür' },
  { id: 'language',     icon: MessageSquare,  label: 'Language',       labelTr: 'Dil' },
  { id: 'technology',   icon: Cpu,            label: 'Technology',     labelTr: 'Teknoloji' },
  { id: 'belief',       icon: Flame,          label: 'Belief',         labelTr: 'İnanç' },
  { id: 'social',       icon: Swords,         label: 'Social',         labelTr: 'Sosyal' },
  { id: 'economy',      icon: Coins,          label: 'Economy',        labelTr: 'Ekonomi' },
  { id: 'art',          icon: Music,          label: 'Art',            labelTr: 'Sanat' },
  { id: 'architecture', icon: Building2,      label: 'Architecture',   labelTr: 'Mimari' },
  { id: 'law',          icon: Scale,          label: 'Law',            labelTr: 'Hukuk' },
  { id: 'microbiome',   icon: Microscope,     label: 'Microbiome',     labelTr: 'Mikrobiyom' },
  { id: 'psychology',   icon: HeartPulse,     label: 'Psychology',     labelTr: 'Psikoloji' },
  { id: 'epigenetics',  icon: Zap,            label: 'Epigenetics',    labelTr: 'Epigenetik' },
  { id: 'god',          icon: GodIcon,        label: 'God Mode',       labelTr: 'Tanrı Modu',   divider: true, color: 'text-orange-400' },
  { id: 'timemachine',  icon: Clock,          label: 'Time Machine',   labelTr: 'Zaman Makinesi' },
  { id: 'analysis',     icon: Bot,            label: 'AI Analysis',    labelTr: 'AI Analiz' },
  { id: 'hypothesis',   icon: FlaskConical,   label: 'Hypothesis',     labelTr: 'Hipotez' },
];

export default function LeftPanel() {
  const { activePanel, setActivePanel, lang } = useSimStore();
  return (
    <div className="fixed left-0 top-12 bottom-0 w-14 panel-glass z-40 flex flex-col items-center py-2 gap-0.5 border-r border-sim-border overflow-y-auto">
      {MODULES.map((mod, idx) => {
        const Icon = mod.icon;
        const isActive = activePanel === mod.id;
        const showDivider = (mod as any).divider;
        return (
          <div key={mod.id} className="w-full flex flex-col items-center">
            {showDivider && <div className="w-8 border-t border-sim-border/60 my-1" />}
            <button
              onClick={() => setActivePanel(mod.id)}
              data-tooltip={lang === 'en' ? mod.label : mod.labelTr}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 ${
                isActive
                  ? 'bg-sim-accent text-white shadow-lg shadow-sim-accent/30'
                  : `${(mod as any).color ?? 'text-sim-muted'} hover:text-sim-text hover:bg-sim-border`
              }`}
            >
              <Icon size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
