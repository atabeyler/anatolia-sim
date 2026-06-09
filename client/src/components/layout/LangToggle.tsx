import { useSimStore } from '../../store/simStore';

export default function LangToggle() {
  const { lang, setLang } = useSimStore();
  const langs = [
    { code: 'tr', label: 'TR' },
    { code: 'en', label: 'EN' },
    { code: 'de', label: 'DE' },
    { code: 'fr', label: 'FR' },
    { code: 'ar', label: 'AR' },
  ] as const;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 0,
        border: '1px solid rgba(79,110,247,0.4)', background: 'transparent',
        fontFamily: 'Share Tech Mono, monospace', fontSize: 14,
        letterSpacing: '0.08em', cursor: 'pointer', overflow: 'hidden',
        flexWrap: 'wrap',
      }}
    >
      {langs.map((l, index) => (
        <span
          key={l.code}
          onClick={() => setLang(l.code)}
          style={{
            padding: '5px 9px',
            color: lang === l.code ? '#a0b4ff' : '#4a5578',
            background: lang === l.code ? 'rgba(79,110,247,0.25)' : 'transparent',
            fontWeight: lang === l.code ? 700 : 400,
            transition: 'all 0.2s',
            cursor: 'pointer',
            borderRight: index < langs.length - 1 ? '1px solid rgba(79,110,247,0.22)' : 'none',
          }}
        >
          {l.label}
        </span>
      ))}
    </div>
  );
}
