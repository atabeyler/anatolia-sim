import { X } from 'lucide-react';
import { useSimStore } from '../../store/simStore';

interface Props {
  panelId: string;
  title: string;
  titleTr: string;
  children: React.ReactNode;
}

export default function DetailPanel({ panelId, title, titleTr, children }: Props) {
  const { activePanel, setActivePanel, lang } = useSimStore();
  if (activePanel !== panelId) return null;

  const displayTitle = lang === 'en' ? title : titleTr;

  return (
    <div className="fixed left-14 top-12 bottom-0 w-80 z-30 flex flex-col overflow-hidden"
      style={{
        background: 'rgba(4,4,15,0.97)',
        borderRight: '1px solid rgba(79,110,247,0.28)',
        backdropFilter: 'blur(20px)',
        boxShadow: '4px 0 40px rgba(79,110,247,0.07)',
      }}>

      {/* Corner brackets */}
      <span style={{
        position: 'absolute', top: -1, right: -1, width: 14, height: 14,
        borderTop: '2px solid rgba(79,110,247,0.9)', borderRight: '2px solid rgba(79,110,247,0.9)',
        animation: 'corner-blink 4s ease-in-out infinite 1s', pointerEvents: 'none', zIndex: 2,
      }} />
      <span style={{
        position: 'absolute', bottom: -1, left: -1, width: 14, height: 14,
        borderBottom: '2px solid rgba(79,110,247,0.9)', borderLeft: '2px solid rgba(79,110,247,0.9)',
        animation: 'corner-blink 4s ease-in-out infinite 2s', pointerEvents: 'none', zIndex: 2,
      }} />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
        style={{
          background: 'rgba(4,4,15,0.95)',
          borderBottom: '1px solid rgba(79,110,247,0.25)',
          boxShadow: '0 1px 0 rgba(79,110,247,0.08)',
        }}>
        <div className="w-1 h-4 bg-sim-accent flex-shrink-0" style={{ boxShadow: '0 0 6px rgba(79,110,247,0.8)' }} />
        <span className="font-orbitron text-xs font-semibold tracking-[0.2em] text-sim-accent" style={{ textShadow: '0 0 8px rgba(79,110,247,0.4)' }}>
          {displayTitle.toUpperCase()}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setActivePanel(null)}
          className="text-sim-muted hover:text-sim-accent transition-colors p-0.5"
          style={{ lineHeight: 0 }}>
          <X size={13} />
        </button>
      </div>

      {/* Scan line */}
      <div className="relative overflow-hidden flex-shrink-0 h-px">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sim-accent/20 to-transparent"
          style={{ animation: 'hud-scan 6s ease-in-out infinite' }} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs"
        style={{ color: '#c0c8e8' }}>
        {children}
      </div>

      {/* Footer bar */}
      <div className="px-3 py-1.5 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(79,110,247,0.15)', background: 'rgba(4,4,15,0.9)' }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-gradient-to-r from-sim-accent/20 to-transparent" />
          <span className="font-share-tech text-sim-muted/40 tracking-widest" style={{ fontSize: 8 }}>
            MODULE/{displayTitle.toUpperCase().replace(/ /g, '_')}
          </span>
        </div>
      </div>
    </div>
  );
}
