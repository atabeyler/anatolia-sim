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
        <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{toast.icon}</span>
        <span style={{ fontSize: 14, color: toast.color, letterSpacing: '0.05em', lineHeight: 1.4 }}>{toast.message}</span>
      </div>
      {toast.sub && (
        <div style={{ fontSize: 12, color: '#8898c8', marginTop: 4, paddingLeft: 24, lineHeight: 1.3 }}>
          {toast.sub.length > 60 ? toast.sub.slice(0, 60) + '…' : toast.sub}
        </div>
      )}
    </div>
  );
}

const TOAST_DURATION = 5000;

export default function MilestoneToast() {
  const { stats, events, lang, addMoment, currentSim, milestones } = useSimStore();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fired = useRef<Set<string>>(new Set());
  const prevEventCount = useRef(-1);
  const simIdRef = useRef<string | null>(null);

  const L = lang as LangCode;
  const t = (tr: string, en: string, de = en, fr = en, ar = en) => text(L, { tr, en, de, fr, ar });

  useEffect(() => {
    if (!currentSim?.id) return;
    if (simIdRef.current === currentSim.id) return;
    simIdRef.current = currentSim.id;
    try {
      const saved = JSON.parse(sessionStorage.getItem(`milestones_${currentSim.id}`) ?? '[]');
      fired.current = new Set(saved);
    } catch { fired.current = new Set(); }
    prevEventCount.current = events.length;
  }, [currentSim?.id, events.length]);

  function push(toast: Omit<Toast, 'id'>, momentTitle?: string) {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-2), { ...toast, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), TOAST_DURATION);
    if (simIdRef.current) {
      try { sessionStorage.setItem(`milestones_${simIdRef.current}`, JSON.stringify([...fired.current])); } catch {}
    }
    if (stats) {
      addMoment({
        day: stats.day,
        year: stats.year,
        icon: toast.icon,
        title: momentTitle ?? toast.message,
        description: toast.sub,
        color: toast.color,
      });
    }
  }

  function fireOnce(key: string, toast: Omit<Toast, 'id'>, momentTitle?: string) {
    if (fired.current.has(key)) return;
    fired.current.add(key);
    push(toast, momentTitle);
  }

  // Backend milestone events (from WebSocket — server already curates these)
  const prevMilestoneCount = useRef(0);
  useEffect(() => {
    if (milestones.length <= prevMilestoneCount.current) { prevMilestoneCount.current = milestones.length; return; }
    const newest = milestones[0];
    prevMilestoneCount.current = milestones.length;
    if (!newest) return;
    fireOnce(`backend_${newest.key}`, { icon: newest.icon, color: '#fbbf24', message: newest.description }, newest.description);
  }, [milestones.length]);

  // First time population reaches 10
  useEffect(() => {
    if (!stats || !simIdRef.current) return;
    if (stats.population >= 10) {
      fireOnce('first_pop', { icon: '👥', color: '#4f6ef7', message: t('Topluluk büyüyor!', 'Community is growing!', 'Gemeinschaft wächst!', 'La communauté grandit!', 'المجتمع ينمو!') });
    }
  }, [stats?.population]);

  // First technology
  useEffect(() => {
    if (!stats || !simIdRef.current) return;
    if ((stats.technologies ?? 0) > 2) {
      fireOnce('first_tech', { icon: '⚙', color: '#4ecb71', message: t('İlk teknoloji keşfedildi!', 'First technology discovered!', 'Erste Technologie entdeckt!', 'Première technologie découverte!', 'اكتُشفت أول تقنية!') });
    }
  }, [stats?.technologies]);

  // Event-based first-only notifications
  useEffect(() => {
    if (prevEventCount.current === -1) return;
    const newCount = events.length;
    if (newCount <= prevEventCount.current) { prevEventCount.current = newCount; return; }
    const newEvents = events.slice(0, newCount - prevEventCount.current);
    prevEventCount.current = newCount;

    for (const ev of newEvents) {
      if (ev.event_type === 'birth' && !ev.data?.is_twin) {
        const name = ev.data?.name ?? '?';
        fireOnce('first_birth', {
          icon: '✦', color: '#ff8ab0',
          message: t(`İlk doğum: ${name}`, `First birth: ${name}`, `Erste Geburt: ${name}`, `Première naissance: ${name}`, `أول مولود: ${name}`),
        }, ev.description);
      }
      if (ev.event_type === 'birth' && ev.data?.is_twin) {
        fireOnce('first_twin', {
          icon: '✦', color: '#ff8ab0',
          message: t('İlk ikizler doğdu!', 'First twins born!', 'Erste Zwillinge geboren!', 'Premiers jumeaux nés!', 'وُلد أول توأم!'),
          sub: ev.description,
        });
      }
      if (ev.event_type === 'death') {
        const name = ev.data?.name ?? '?';
        const cause = ev.data?.cause ?? '';
        fireOnce('first_death', {
          icon: '†', color: '#e05a5a',
          message: t(`İlk ölüm: ${name}`, `First death: ${name}`, `Erster Todesfall: ${name}`, `Premier décès: ${name}`, `أول وفاة: ${name}`),
          sub: cause ? t(`Sebep: ${cause}`, `Cause: ${cause}`, `Ursache: ${cause}`, `Cause: ${cause}`, `السبب: ${cause}`) : undefined,
        }, ev.description);
      }
      if (ev.event_type === 'disaster') {
        fireOnce('first_disaster', {
          icon: '⚠', color: '#f97316',
          message: t('İlk doğal afet!', 'First natural disaster!', 'Erste Naturkatastrophe!', 'Première catastrophe naturelle!', 'أول كارثة طبيعية!'),
          sub: ev.description,
        }, ev.description);
      }
      if (ev.event_type === 'epidemic') {
        fireOnce('first_epidemic', {
          icon: '⊗', color: '#c084fc',
          message: t('İlk salgın hastalık!', 'First epidemic!', 'Erste Seuche!', 'Première épidémie!', 'أول وباء!'),
          sub: ev.description,
        }, ev.description);
      }
      if (ev.event_type === 'language') {
        const stageName = ev.data?.stage_name ?? `stage ${ev.data?.stage}`;
        fireOnce('first_language', {
          icon: '◆', color: '#00d4ff',
          message: t(`İlk dil evrimi: ${stageName}`, `First language: ${stageName}`, `Erste Sprache: ${stageName}`, `Première langue: ${stageName}`, `أول لغة: ${stageName}`),
        });
      }
      if (ev.event_type === 'belief') {
        fireOnce('first_belief', {
          icon: '◆', color: '#a78bfa',
          message: t('İlk inanç oluştu', 'First belief formed', 'Erster Glaube geformt', 'Première croyance formée', 'تشكّل أول معتقد'),
          sub: ev.description,
        }, ev.description);
      }
      if (ev.event_type === 'art') {
        fireOnce('first_art', {
          icon: '◈', color: '#fb923c',
          message: t('İlk sanat eseri!', 'First art created!', 'Erstes Kunstwerk!', "Première œuvre d'art!", 'أول عمل فني!'),
          sub: ev.description,
        }, ev.description);
      }
      if (ev.event_type === 'architecture') {
        fireOnce('first_architecture', {
          icon: '▣', color: '#94a3b8',
          message: t('İlk yapı inşa edildi!', 'First structure built!', 'Erstes Bauwerk errichtet!', 'Première structure construite!', 'أول مبنى شُيِّد!'),
          sub: ev.description,
        }, ev.description);
      }
      if (ev.event_type === 'law') {
        fireOnce('first_law', {
          icon: '⊢', color: '#fbbf24',
          message: t('İlk yasa oluştu!', 'First law established!', 'Erstes Gesetz gegründet!', 'Première loi établie!', 'أول قانون أُسِّس!'),
          sub: ev.description,
        }, ev.description);
      }
      if (ev.event_type === 'astronomy') {
        fireOnce('first_astronomy', {
          icon: '★', color: '#93c5fd',
          message: t('İlk astronomi keşfi!', 'First astronomy discovery!', 'Erste Astronomieentdeckung!', 'Première découverte astronomique!', 'أول اكتشاف فلكي!'),
          sub: ev.description,
        }, ev.description);
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
