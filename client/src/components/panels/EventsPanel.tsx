import { useSimStore } from '../../store/simStore';
import { useEffect, useRef } from 'react';

const IMPORTANCE_CONFIG: Record<number, { color: string; bg: string; label: string; glow: string }> = {
  1: { color: '#6070a0', bg: 'transparent',              label: 'INFO',  glow: 'none' },
  2: { color: '#a0b0d0', bg: 'transparent',              label: 'NOTE',  glow: 'none' },
  3: { color: '#4f6ef7', bg: 'rgba(79,110,247,0.06)',    label: 'DATA',  glow: '0 0 6px rgba(79,110,247,0.3)' },
  4: { color: '#d4a838', bg: 'rgba(212,168,56,0.08)',    label: 'ALERT', glow: '0 0 8px rgba(212,168,56,0.3)' },
  5: { color: '#e05a5a', bg: 'rgba(224,90,90,0.10)',     label: 'CRIT',  glow: '0 0 10px rgba(224,90,90,0.4)' },
};

const EVENT_ICONS: Record<string, string> = {
  birth: '◈', death: '✦', technology: '⟁', disaster: '⚠', language: '◉',
  belief: '✧', art: '◆', culture: '◇', trade: '⟐', epidemic: '⊗',
  architecture: '⊞', law: '⊜', astronomy: '○', social: '⊕', default: '▸',
};

export default function EventsPanel() {
  const { events, lang } = useSimStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(0);

  useEffect(() => {
    if (events.length > prevLen.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    prevLen.current = events.length;
  }, [events.length]);

  return (
    <div className="absolute right-4 top-16 bottom-4 w-72 z-30 flex flex-col hud-panel overflow-hidden" style={{ padding: 0 }}>
      <span className="hud-corner-tr" />
      <span className="hud-corner-bl" />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-sim-border/50 flex-shrink-0"
        style={{ background: 'rgba(4,4,15,0.9)' }}>
        <div className="w-1 h-4 bg-sim-accent" style={{ boxShadow: '0 0 6px rgba(79,110,247,0.8)' }} />
        <span className="font-orbitron text-xs font-semibold tracking-[0.2em] text-sim-accent">EVENT STREAM</span>
        <div className="flex-1" />
        <div className="font-share-tech text-xs text-sim-muted tracking-widest">
          {events.length.toString().padStart(4, '0')}
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-sim-green pulse-live" />
      </div>

      {/* Scan line */}
      <div className="relative overflow-hidden flex-shrink-0 h-px">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sim-accent/20 to-transparent"
          style={{ animation: 'hud-scan 6s ease-in-out infinite' }} />
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(79,110,247,0.3)" strokeWidth="1">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            <p className="font-share-tech text-xs text-sim-muted/40 tracking-widest">
              {lang === 'en' ? 'AWAITING EVENTS' : 'OLAYLAR BEKLENİYOR'}
            </p>
          </div>
        ) : (
          <div>
            {[...events].reverse().map((ev, i) => {
              const cfg = IMPORTANCE_CONFIG[ev.importance] ?? IMPORTANCE_CONFIG[1];
              const icon = EVENT_ICONS[ev.event_type] ?? EVENT_ICONS.default;
              return (
                <div key={i}
                  className="px-3 py-2 border-b border-sim-border/20 hover:bg-sim-border/20 transition-colors data-in"
                  style={{ background: cfg.bg, animationDelay: `${Math.min(i, 5) * 30}ms` }}>
                  <div className="flex items-start gap-2">
                    {/* Importance bar */}
                    <div className="flex flex-col gap-0.5 pt-0.5 flex-shrink-0">
                      <div className="w-0.5 h-3 rounded-full" style={{ background: cfg.color, boxShadow: cfg.glow }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Event type + year */}
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs" style={{ color: cfg.color }}>{icon}</span>
                        <span className="font-share-tech text-xs tracking-widest" style={{ color: cfg.color, fontSize: 9 }}>
                          {cfg.label}
                        </span>
                        <span className="font-share-tech text-xs text-sim-muted/50 tracking-widest ml-auto" style={{ fontSize: 9 }}>
                          Y{ev.sim_year}·{ev.sim_day}
                        </span>
                      </div>
                      {/* Description */}
                      <p className="text-xs leading-snug font-share-tech" style={{ color: i < 3 ? '#c0c8e8' : '#6070a0', fontSize: 11 }}>
                        {ev.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-sim-border/30 flex-shrink-0"
        style={{ background: 'rgba(4,4,15,0.8)' }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-gradient-to-r from-sim-accent/30 to-transparent" />
          <span className="font-share-tech text-xs text-sim-muted/40 tracking-widest" style={{ fontSize: 9 }}>
            {lang === 'en' ? 'REAL-TIME FEED' : 'CANLI AKIŞ'}
          </span>
        </div>
      </div>
    </div>
  );
}
