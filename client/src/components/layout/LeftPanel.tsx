import { useEffect } from 'react';
import { Dna, TreePine, Telescope, Brain, MessageSquare, Cpu, Flame, Swords, Coins, Music, Building2, Scale, Microscope, HeartPulse, Zap, Clock, Bot, FlaskConical, Users, GitBranch, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSimStore } from '../../store/simStore';
import { text, type LangCode } from '../../utils/i18n';

const MODULES = [
  { id: 'population',  icon: Users,          labels: { en: 'Population',   tr: 'Nüfus'         } },
  { id: 'biology',      icon: Dna,           labels: { en: 'Biology',       tr: 'Biyoloji'      } },
  { id: 'environment',  icon: TreePine,       labels: { en: 'Environment',   tr: 'Çevre'         } },
  { id: 'astronomy',    icon: Telescope,      labels: { en: 'Astronomy',     tr: 'Astronomi'     } },
  { id: 'culture',      icon: Brain,          labels: { en: 'Culture',       tr: 'Kültür'        } },
  { id: 'language',     icon: MessageSquare,  labels: { en: 'Language',      tr: 'Dil'           } },
  { id: 'technology',   icon: Cpu,            labels: { en: 'Technology',    tr: 'Teknoloji'     } },
  { id: 'belief',       icon: Flame,          labels: { en: 'Belief',        tr: 'İnanç'         } },
  { id: 'social',       icon: Swords,         labels: { en: 'Social',        tr: 'Sosyal'        } },
  { id: 'economy',      icon: Coins,          labels: { en: 'Economy',       tr: 'Ekonomi'       } },
  { id: 'art',          icon: Music,          labels: { en: 'Art',           tr: 'Sanat'         } },
  { id: 'architecture', icon: Building2,      labels: { en: 'Architecture',  tr: 'Mimari'        } },
  { id: 'law',          icon: Scale,          labels: { en: 'Law',           tr: 'Hukuk'         } },
  { id: 'microbiome',   icon: Microscope,     labels: { en: 'Microbiome',    tr: 'Mikrobiyom'    } },
  { id: 'psychology',   icon: HeartPulse,     labels: { en: 'Psychology',    tr: 'Psikoloji'     } },
  { id: 'epigenetics',  icon: Zap,            labels: { en: 'Epigenetics',   tr: 'Epigenetik'    } },
  { id: 'genealogy',    icon: GitBranch,      labels: { en: 'Genealogy',     tr: 'Soy Ağacı'     } },
  { id: 'god',          icon: Zap,            labels: { en: 'God Mode',      tr: 'Tanrı Modu'    }, divider: true, accent: '#f97316' },
  { id: 'timemachine',  icon: Clock,          labels: { en: 'Time Machine',  tr: 'Zaman Makinesi'}, accent: '#00d4ff' },
  { id: 'analysis',     icon: Bot,            labels: { en: 'AI Analysis',   tr: 'AI Analiz'     }, accent: '#4ecb71' },
  { id: 'hypothesis',   icon: FlaskConical,   labels: { en: 'Hypothesis',    tr: 'Hipotez'       }, accent: '#d4a838' },
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
                    style={{ fontSize: 12, color: isActive ? accent : '#9aabcf' }}>
                    {text(lang as LangCode, mod.labels)}
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
            ? <><ChevronLeft size={12} /><span className="font-share-tech text-sm ml-2 tracking-wider">DARALT</span></>
            : <ChevronRight size={12} />}
        </button>
      </div>
    </div>
  );
}
