import { useSimStore } from '../../store/simStore';

const IC: Record<number,string> = {1:'text-sim-muted',2:'text-sim-text',3:'text-sim-accent',4:'text-sim-gold',5:'text-sim-red'};
const EI: Record<string,string> = {birth:'👶',death:'💀',technology:'⚡',disaster:'🔥',language:'💬',belief:'✨',war:'⚔️',trade:'🤝'};

export default function EventsPanel() {
  const { events } = useSimStore();
  return (
    <div className="absolute right-4 top-16 bottom-16 w-72 panel-glass rounded-lg overflow-hidden flex flex-col z-30">
      <div className="px-4 py-3 border-b border-sim-border flex items-center justify-between">
        <span className="text-sm font-semibold text-sim-text">Events</span>
        <span className="text-xs text-sim-muted">{events.length} total</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 && <div className="p-4 text-center text-sim-muted text-xs">Events will appear here</div>}
        {events.map((ev, i) => (
          <div key={i} className="px-4 py-2.5 border-b border-sim-border/50 hover:bg-sim-border/30 transition-colors">
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">{EI[ev.event_type] ?? '📌'}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs leading-snug ${IC[ev.importance] ?? 'text-sim-text'}`}>{ev.description}</p>
                <p className="text-xs text-sim-muted mt-0.5 font-mono">Year {ev.sim_year} · Day {ev.sim_day}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
