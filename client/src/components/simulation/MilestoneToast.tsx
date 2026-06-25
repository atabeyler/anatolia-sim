import { useEffect, useRef, useState } from 'react';
import { useSimStore } from '../../store/simStore';
import { text, type LangCode } from '../../utils/i18n';

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
  const { stats, events, lang, addMoment, currentSim, milestones } = useSimStore();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fired = useRef<Set<string>>(new Set());
  const prevEventCount = useRef(-1); // -1 = initial load not yet seen
  const simIdRef = useRef<string | null>(null);

  // When simId becomes available, load persisted fired-set and mark current events as historical.
  // This runs after the async DB fetch settles, preventing historical events from triggering toasts.
  useEffect(() => {
    if (!currentSim?.id) return;
    if (simIdRef.current === currentSim.id) return; // already initialized for this sim
    simIdRef.current = currentSim.id;
    try {
      const saved = JSON.parse(sessionStorage.getItem(`milestones_${currentSim.id}`) ?? '[]');
      fired.current = new Set(saved);
    } catch { fired.current = new Set(); }
    // Stamp current event count so historical events are skipped
    prevEventCount.current = events.length;
  }, [currentSim?.id, events.length]);

  function push(t: Omit<Toast, 'id'>, momentTitle?: string) {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), TOAST_DURATION);
    if (simIdRef.current) {
      try { sessionStorage.setItem(`milestones_${simIdRef.current}`, JSON.stringify([...fired.current])); } catch {}
    }
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

  const t = (tr: string, en: string, de = en, fr = en, ar = en) => text(lang as LangCode, { tr, en, de, fr, ar });

  // Backend milestone events (from WebSocket milestone messages)
  const prevMilestoneCount = useRef(0);
  useEffect(() => {
    if (milestones.length <= prevMilestoneCount.current) { prevMilestoneCount.current = milestones.length; return; }
    const newest = milestones[0]; // addMilestone prepends
    prevMilestoneCount.current = milestones.length;
    if (!newest || fired.current.has(`backend_${newest.key}_${newest.day}`)) return;
    fired.current.add(`backend_${newest.key}_${newest.day}`);
    push({ icon: newest.icon, color: '#fbbf24', message: newest.description }, newest.description);
  }, [milestones.length]);

  // Population milestones
  useEffect(() => {
    if (!stats || !simIdRef.current) return;
    for (const n of POP_MILESTONES) {
      const key = `pop_${n}`;
      if (!fired.current.has(key) && stats.population >= n) {
        fired.current.add(key);
        push({ icon: '👥', color: '#4f6ef7', message: t(`Nüfus ${n}'e ulaştı!`, `Population reached ${n}!`, `Bevölkerung erreicht ${n}!`, `Population atteint ${n}!`, `وصل السكان إلى ${n}!`) });
      }
    }
  }, [stats?.population]);

  // First death
  useEffect(() => {
    if (!stats || !simIdRef.current || fired.current.has('first_death')) return;
    if ((stats.deaths ?? 0) > 0) {
      fired.current.add('first_death');
      push({ icon: '†', color: '#e05a5a', message: t('İlk ölüm gerçekleşti', 'First death occurred', 'Erster Todesfall', 'Premier décès', 'أول وفاة') });
    }
  }, [stats?.deaths]);

  // First discovery beyond defaults (foraging + stone_tools = 2)
  useEffect(() => {
    if (!stats || !simIdRef.current || fired.current.has('first_tech')) return;
    if ((stats.technologies ?? 0) > 2) {
      fired.current.add('first_tech');
      push({ icon: '⚙', color: '#4ecb71', message: t('İlk teknoloji keşfedildi!', 'First technology discovered!', 'Erste Technologie entdeckt!', 'Première technologie découverte!', 'اكتُشفت أول تقنية!') });
    }
  }, [stats?.technologies]);

  // New events: disasters, significant language stages, births, deaths
  useEffect(() => {
    // -1 means simId not yet loaded; skip until initialized
    if (prevEventCount.current === -1) return;
    const newCount = events.length;
    if (newCount <= prevEventCount.current) { prevEventCount.current = newCount; return; }
    const newEvents = events.slice(0, newCount - prevEventCount.current);
    prevEventCount.current = newCount;

    for (const ev of newEvents) {
      if (ev.event_type === 'disaster') {
        const key = `disaster_${ev.sim_day}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          push({ icon: '⚠', color: '#f97316', message: t('Doğal afet!', 'Natural disaster!', 'Naturkatastrophe!', 'Catastrophe naturelle!', 'كارثة طبيعية!'), sub: ev.description }, ev.description);
        }
      }
      if (ev.event_type === 'language' && (ev.data?.stage ?? 0) >= 3) {
        const key = `lang_stage_${ev.data?.stage}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          const stageName = ev.data?.stage_name ?? `stage ${ev.data?.stage}`;
          push({ icon: '◆', color: '#00d4ff', message: t(`Dil evrimi: ${stageName}`, `Language: ${stageName}`, `Sprache: ${stageName}`, `Langue: ${stageName}`, `اللغة: ${stageName}`) });
        }
      }
      if (ev.event_type === 'birth' && ev.data?.is_twin) {
        const key = `twin_${ev.sim_day}_${ev.data?.individual_id}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          push({ icon: '✦', color: '#ff8ab0', message: t('İkizler doğdu!', 'Twins born!', 'Zwillinge geboren!', 'Des jumeaux nés!', 'وُلد توأم!'), sub: ev.description });
        }
      }
      if (ev.event_type === 'birth' && !ev.data?.is_twin) {
        const key = `birth_${ev.data?.individual_id}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          const name = ev.data?.name ?? '?';
          push({ icon: '✦', color: '#ff8ab0', message: t(`Doğum: ${name}`, `Born: ${name}`) }, ev.description);
        }
      }
      if (ev.event_type === 'death') {
        const key = `death_${ev.data?.individual_id}_${ev.sim_day}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          const name = ev.data?.name ?? '?';
          const cause = ev.data?.cause ?? '';
          push({ icon: '†', color: '#e05a5a', message: t(`Ölüm: ${name}`, `Died: ${name}`), sub: cause ? t(`Sebep: ${cause}`, `Cause: ${cause}`) : undefined }, ev.description);
        }
      }
      if (ev.event_type === 'technology') {
        const key = `tech_discovery_${ev.data?.tech_id ?? ''}_${ev.sim_day}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          const techName = ev.data?.tech_id ?? ev.data?.name ?? '';
          push({ icon: '⚙', color: '#4ecb71', message: t(`Teknoloji: ${techName}`, `Tech: ${techName}`) }, ev.description);
        }
      }
      if (ev.event_type === 'epidemic') {
        const key = `epidemic_${ev.sim_day}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          push({ icon: '⊗', color: '#c084fc', message: t('Salgın hastalık!', 'Epidemic!'), sub: ev.description }, ev.description);
        }
      }
      if (ev.event_type === 'weather' && (ev.importance ?? 0) >= 4) {
        const key = `weather_${ev.sim_day}_${ev.data?.weather ?? ''}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          push({ icon: '≈', color: '#60a5fa', message: t('Hava olayı', 'Weather event'), sub: ev.description }, ev.description);
        }
      }
      if (ev.event_type === 'belief' && (ev.importance ?? 0) >= 3) {
        const key = `belief_${ev.sim_day}_${ev.data?.id ?? ev.data?.belief_id ?? ''}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          push({ icon: '◆', color: '#a78bfa', message: t('Yeni inanç', 'New belief'), sub: ev.description }, ev.description);
        }
      }
      if (ev.event_type === 'ritual') {
        const key = `ritual_${ev.sim_day}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          push({ icon: '◎', color: '#818cf8', message: t('Ritüel', 'Ritual emerged'), sub: ev.description }, ev.description);
        }
      }
      if (ev.event_type === 'art' && (ev.importance ?? 0) >= 3) {
        const key = `art_${ev.sim_day}_${ev.data?.id ?? ''}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          push({ icon: '◈', color: '#fb923c', message: t('Sanat eseri', 'Art created'), sub: ev.description }, ev.description);
        }
      }
      if (ev.event_type === 'architecture' && (ev.importance ?? 0) >= 3) {
        const key = `arch_${ev.sim_day}_${ev.data?.id ?? ''}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          push({ icon: '▣', color: '#94a3b8', message: t('Yapı inşa edildi', 'Structure built'), sub: ev.description }, ev.description);
        }
      }
      if (ev.event_type === 'law' && (ev.importance ?? 0) >= 3) {
        const key = `law_${ev.sim_day}_${ev.data?.norm_id ?? ''}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          push({ icon: '⊢', color: '#fbbf24', message: t('Yasa oluştu', 'Law established'), sub: ev.description }, ev.description);
        }
      }
      if (ev.event_type === 'astronomy' && (ev.importance ?? 0) >= 3) {
        const key = `astro_${ev.sim_day}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          push({ icon: '★', color: '#93c5fd', message: t('Astronomi keşfi', 'Astronomy discovery'), sub: ev.description }, ev.description);
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
