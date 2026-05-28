// Generic detail panel container
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

  return (
    <div className="fixed left-14 top-12 bottom-0 w-80 panel-glass z-30 flex flex-col border-r border-sim-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-sim-border flex-shrink-0">
        <span className="text-sim-text font-semibold text-sm tracking-wide">
          {lang === 'en' ? title : titleTr}
        </span>
        <button
          onClick={() => setActivePanel(null)}
          className="text-sim-muted hover:text-sim-text transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sim-text text-xs">
        {children}
      </div>
    </div>
  );
}
