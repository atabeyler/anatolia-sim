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
  { id: 'god',          icon: GodIcon,        label: 'God Mode',       labelTr: 'Tanrı Modu',   divider: true, accent: '#f97316' },
  { id: 'timemachine',  icon: Clock,          label: 'Time Machine',   labelTr: 'Zaman Makinesi', accent: '#00d4ff' },
  { id: 'analysis',     icon: Bot,            label: 'AI Analysis',    labelTr: 'AI Analiz',    accent: '#4ecb71' },
  { id: 'hypothesis',   icon: FlaskConical,   label: 'Hypothesis',     labelTr: 'Hipotez',      accent: '#d4a838' },
];

export default function LeftPanel() {
  const { activePanel, setActivePanel, lang } = useSimStore();

  return (
    <div className="fixed left-0 top-12 bottom-0 w-14 z-40 flex flex-col items-center py-2 gap-0.5 overflow-y-auto"
      style={{
        background: 'rgba(3,3,16,0.97)',
        borderRight: '1px solid rgba(79,110,247,0.28)',
        backdropFilter: 'blur(20px)',
        boxShadow: '2px 0 30px rgba(79,110,247,0.06)',
      }}>

      {/* Top accent line */}
      <div className="w-6 h-px mb-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(79,110,247,0.6), transparent)' }} />

      {MODULES.map((mod) => {
        const Icon = mod.icon;
        const isActive = activePanel === mod.id;
        const accent = (mod as any).accent ?? '#4f6ef7';
        const showDivider = (mod as any).divider;

        return (
          <div key={mod.id} className="w-full flex flex-col items-center">
            {showDivider && (
              <div className="w-8 my-1.5 relative flex items-center justify-center">
                <div className="absolute inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(79,110,247,0.4), transparent)' }} />
              </div>
            )}
            <button
              onClick={() => setActivePanel(isActive ? null : mod.id)}
              data-tooltip={lang === 'en' ? mod.label : mod.labelTr}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                background: isActive ? `${accent}22` : 'transparent',
                border: isActive ? `1px solid ${accent}66` : '1px solid transparent',
                boxShadow: isActive ? `0 0 12px ${accent}40, inset 0 0 8px ${accent}15` : 'none',
                color: isActive ? accent : '#4a5578',
                clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = '#a0b4ff';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(79,110,247,0.08)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = '#4a5578';
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }
              }}>
              <Icon size={15} />
            </button>
          </div>
        );
      })}

      {/* Bottom accent line */}
      <div className="flex-1" />
      <div className="w-6 h-px mt-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(79,110,247,0.4), transparent)' }} />
    </div>
  );
}
