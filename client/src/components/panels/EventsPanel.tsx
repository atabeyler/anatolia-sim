import { useSimStore } from '../../store/simStore';
import { useEffect, useRef } from 'react';

const IMPORTANCE_COLOR: Record<number, string> = {
  1: '#4a5578',
  2: '#7080b0',
  3: '#4f6ef7',
  4: '#d4a838',
  5: '#e05a5a',
};

const EVENT_ICONS: Record<string, string> = {
  birth: '◈', death: '✦', technology: '⟁', disaster: '⚠', language: '◉',
  belief: '✧', art: '◆', culture: '◇', trade: '⟐', epidemic: '⊗',
  architecture: '⊞', law: '⊜', astronomy: '○', social: '⊕', default: '▸',
};

export default function EventsPanel() {
  const { events, sidebarExpanded } = useSimStore();
  const listRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(0);

  useEffect(() => {
    if (events.length > prevLen.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    prevLen.current = events.length;
  }, [events.length]);

  const leftPad = sidebarExpanded ? 176 : 48;

  return (
    <div
      className="absolute bottom-0 right-0 z-30 flex flex-col"
      style={{
        left: leftPad,
        height: 110,
        background: 'rgba(2,2,12,0.88)',
        borderTop: '1px solid rgba(79,110,247,0.25)',
        backdropFilter: 'blur(12px)',
        transition: 'left 0.22s ease',
      }}>

      {/* Header strip */}
      <div className="flex items-center gap-2 px-3 flex-shrink-0"
        style={{ height: 22, borderBottom: '1px solid rgba(79,110,247,0.15)' }}>
        <div className="w-1 h-3 bg-sim-accent" style={{ boxShadow: '0 0 5px rgba(79,110,247,0.8)' }} />
        <span className="font-orbitron tracking-[0.25em] text-sim-accent" style={{ fontSize: 8 }}>EVENT LOG</span>
        <div className="w-1 h-1 rounded-full bg-sim-green pulse-live ml-1" />
        <span className="font-share-tech text-sim-green tracking-widest" style={{ fontSize: 8 }}>LIVE</span>
        <div className="flex-1" />
        <span className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 8 }}>
          {events.length.toString().padStart(4, '0')} EVENTS
        </span>
      </div>

      {/* Log stream */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-2 py-1" style={{ scrollbarWidth: 'none' }}>
        {events.length === 0 ? (
          <div className="flex items-center h-full">
            <span className="font-share-tech text-sim-muted/40 tracking-widest animate-pulse" style={{ fontSize: 9 }}>
              AWAITING EVENTS...
            </span>
          </div>
        ) : (
          [...events].reverse().map((ev, i) => {
            const color = IMPORTANCE_COLOR[ev.importance] ?? IMPORTANCE_COLOR[1];
            const icon = EVENT_ICONS[ev.event_type] ?? EVENT_ICONS.default;
            return (
              <div key={i} className="flex items-baseline gap-1.5 py-0.5"
                style={{ borderBottom: '1px solid rgba(79,110,247,0.06)', opacity: i === 0 ? 1 : Math.max(0.35, 1 - i * 0.07) }}>
                <span className="font-share-tech flex-shrink-0" style={{ fontSize: 8, color: '#3a4060' }}>
                  Y{ev.sim_year}·{ev.sim_day}
                </span>
                <span style={{ color, fontSize: 10, flexShrink: 0 }}>{icon}</span>
                <span className="font-share-tech truncate" style={{ fontSize: 9, color: i < 2 ? '#b0c0e0' : color }}>
                  {ev.description}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
