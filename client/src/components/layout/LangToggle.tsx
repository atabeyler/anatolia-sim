import { useSimStore } from '../../store/simStore';

export default function LangToggle() {
  const { lang, toggleLang } = useSimStore();
  return (
    <button
      onClick={toggleLang}
      style={{
        display: 'flex', alignItems: 'center', gap: 0,
        border: 'none', background: 'transparent',
        fontFamily: 'Share Tech Mono, monospace', fontSize: 14,
        letterSpacing: '0.08em', cursor: 'pointer', overflow: 'hidden',
      }}
    >
      <span style={{
        padding: '5px 10px',
        color: lang === 'tr' ? '#ff4444' : '#555',
        background: lang === 'tr' ? 'rgba(200,34,34,0.15)' : 'transparent',
        fontWeight: lang === 'tr' ? 700 : 400,
        transition: 'all 0.2s',
      }}>TR</span>
      <span style={{ color: 'rgba(200,34,34,0.4)', padding: '3px 0' }}>|</span>
      <span style={{
        padding: '5px 10px',
        color: lang === 'en' ? '#ff4444' : '#555',
        background: lang === 'en' ? 'rgba(200,34,34,0.15)' : 'transparent',
        fontWeight: lang === 'en' ? 700 : 400,
        transition: 'all 0.2s',
      }}>EN</span>
    </button>
  );
}
