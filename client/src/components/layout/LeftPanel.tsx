import { useEffect } from 'react';
import { Dna, TreePine, Telescope, Brain, MessageSquare, Cpu, Flame, Swords, Coins, Music, Building2, Scale, Microscope, HeartPulse, Zap, Clock, Bot, FlaskConical, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSimStore } from '../../store/simStore';

export const MODULES = [
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
  { id: 'god',          icon: Zap,            label: 'God Mode',       labelTr: 'Tanrı Modu',     divider: true, accent: '#f97316' },
  { id: 'timemachine',  icon: Clock,          label: 'Time Machine',   labelTr: 'Zaman Makinesi', accent: '#00d4ff' },
  { id: 'analysis',     icon: Bot,            label: 'AI Analysis',    labelTr: 'AI Analiz',      accent: '#4ecb71' },
  { id: 'hypothesis',   icon: FlaskConical,   label: 'Hypothesis',     labelTr: 'Hipotez',        accent: '#d4a838' },
];

export default function LeftPanel() {
  const { activePanel, setActivePanel, lang, sidebarExpanded, toggleSidebar } = useSimStore();

  // Auto-collapse on mobile
  useEffect(() => {
    if (window.innerWidth < 768 && sidebarExpanded) toggleSidebar();
  }, []);

  const W = sidebarExpanded ? 176 : 48;

  return (
    <div
      className="fixed left-0 top-12 bottom-0 z-40 flex flex-col py-2 overflow-hidden"
      style={{
        width: W,
        transition: 'width 0.22s ease',
        background: 'rgba(3,3,16,0.97)',
        borderRight: '1px solid rgba(79,110,247,0.28)',
        backdropFilter: 'blur(20px)',
        boxShadow: '2px 0 30px rgba(79,110,247,0.06)',
      }}>

      <div className="w-full h-px mb-2 flex-shrink-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(79,110,247,0.5), transparent)' }} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-0.5 px-1.5">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const isActive = activePanel === mod.id;
          const accent = (mod as any).accent ?? '#4f6ef7';

          return (
            <div key={mod.id} className="flex-shrink-0">
              {(mod as any).divider && (
                <div className="mx-1 my-1.5 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(79,110,247,0.35), transparent)' }} />
              )}
              <button
                onClick={() => setActivePanel(isActive ? null : mod.id)}
                className="w-full flex items-center gap-2.5 transition-all duration-150 rounded-sm"
                style={{
                  height: 32,
                  padding: sidebarExpanded ? '0 8px' : '0',
                  justifyContent: sidebarExpanded ? 'flex-start' : 'center',
                  background: isActive ? `${accent}22` : 'transparent',
                  border: isActive ? `1px solid ${accent}55` : '1px solid transparent',
                  boxShadow: isActive ? `0 0 10px ${accent}35` : 'none',
                  color: isActive ? accent : '#9aabcf',
                }}>
                <Icon size={14} style={{ flexShrink: 0, filter: isActive ? `drop-shadow(0 0 4px ${accent})` : 'none' }} />
                {sidebarExpanded && (
                  <span className="font-share-tech tracking-wider whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{ fontSize: 10, color: isActive ? accent : '#9aabcf' }}>
                    {lang === 'en' ? mod.label : mod.labelTr}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0 px-1.5 pb-1 pt-2" style={{ borderTop: '1px solid rgba(79,110,247,0.12)' }}>
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center transition-all duration-150 rounded-sm"
          style={{
            height: 28,
            padding: sidebarExpanded ? '0 8px' : '0',
            justifyContent: sidebarExpanded ? 'flex-start' : 'center',
            color: '#6070a0',
            border: '1px solid transparent',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#a0b4ff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#6070a0')}>
          {sidebarExpanded
            ? <><ChevronLeft size={12} /><span className="font-share-tech text-xs ml-2 tracking-wider">DARALT</span></>
            : <ChevronRight size={12} />}
        </button>
      </div>
    </div>
  );
}
