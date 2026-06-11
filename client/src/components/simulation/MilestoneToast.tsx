import { useEffect, useRef, useState } from 'react';
import { useSimStore } from '../../store/simStore';

interface Toast {
  id: string;
  message: string;
  sub?: string;
  icon: string;
  color: string;
}

function ToastItem({ toast }: { toast: Toast }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{
      background: 'rgba(4,4,18,0.96)',
      border: `1px solid ${toast.color}50`,
      borderLeft: `3px solid ${toast.color}`,
      padding: '8px 12px',
      minWidth: 200, maxWidth: 270,
      boxShadow: `0 4px 20px rgba(0,0,0,0.7), 0 0 8px ${toast.color}18`,
      fontFamily: 'Share Tech Mono, monospace',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(24px)',
      transition: 'opacity 0.25s ease, transform 0.25s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{toast.icon}</span>
        <span style={{ fontSize: 11, color: toast.color, letterSpacing: '0.05em', lineHeight: 1.4 }}>{toast.message}</span>
      </div>
      {toast.sub && (
        <div style={{ fontSize: 11, color: '#8898c8', marginTop: 4, paddingLeft: 22, lineHeight: 1.3 }}>
          {toast.sub.length > 60 ? toast.sub.slice(0, 60) + '…' : toast.sub}
        </div>
      )}
    </div>
  );
}

const POP_MILESTONES = [10, 25, 50, 100, 250, 500, 1000];
const TOAST_DURATION = 5000;

export default function MilestoneToast() {
  const { stats, events, lang, addMoment } = useSimStore();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fired = useRef(new Set<string>());
  const prevEventCount = useRef(0);

  function push(t: Omit<Toast, 'id'>, momentTitle?: string) {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), TOAST_DURATION);
    if (stats) {
      addMoment({
        day: stats.day,
        year: stats.year,
        icon: t.icon,
        title: momentTitle ?? t.message,
        description: t.sub,
        color: t.color,
      });
    }
  }

  const tr = (a: string, b: string) => lang === 'tr' ? a : b;

  // Population milestones
  useEffect(() => {
    if (!stats) return;
    for (const n of POP_MILESTONES) {
      const key = `pop_${n}`;
      if (!fired.current.has(key) && stats.population >= n) {
        fired.current.add(key);
        push({ icon: '👥', color: '#4f6ef7', message: tr(`Nüfus ${n}'e ulaştı!`, `Population reached ${n}!`) });
      }
    }
  }, [stats?.population]);

  // First death
  useEffect(() => {
    if (!stats || fired.current.has('first_death')) return;
    if ((stats.deaths ?? 0) > 0) {
      fired.current.add('first_death');
      push({ icon: '†', color: '#e05a5a', message: tr('İlk ölüm gerçekleşti', 'First death occurred') });
    }
  }, [stats?.deaths]);

  // First discovery beyond defaults (foraging + stone_tools = 2)
  useEffect(() => {
    if (!stats || fired.current.has('first_tech')) return;
    if ((stats.technologies ?? 0) > 2) {
      fired.current.add('first_tech');
      push({ icon: '⚙', color: '#4ecb71', message: tr('İlk teknoloji keşfedildi!', 'First technology discovered!') });
    }
  }, [stats?.technologies]);

  // New events: disasters, significant language stages, births, deaths
  useEffect(() => {
    const newCount = events.length;
    if (newCount <= prevEventCount.current) { prevEventCount.current = newCount; return; }
    const newEvents = events.slice(0, newCount - prevEventCount.current);
    prevEventCount.current = newCount;

    for (const ev of newEvents) {
      if (ev.event_type === 'disaster') {
        const key = `disaster_${ev.sim_day}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          push({ icon: '⚠', color: '#f97316', message: tr('Doğal afet!', 'Natural disaster!'), sub: ev.description }, ev.description);
        }
      }
      if (ev.event_type === 'language' && (ev.data?.stage ?? 0) >= 3) {
        const key = `lang_stage_${ev.data?.stage}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          const stageName = ev.data?.stage_name ?? `stage ${ev.data?.stage}`;
          push({ icon: '◆', color: '#00d4ff', message: tr(`Dil evrimi: ${stageName}`, `Language: ${stageName}`) });
        }
      }
      if (ev.event_type === 'birth' && ev.data?.is_twin) {
        const key = `twin_${ev.sim_day}_${ev.data?.individual_id}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          push({ icon: '✦', color: '#ff8ab0', message: tr('İkizler doğdu!', 'Twins born!'), sub: ev.description });
        }
      }
    }
  }, [events.length]);

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', top: 64, right: 16, zIndex: 55,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}
