import { useState, type CSSProperties } from 'react';
import { Play, Zap, Sparkles, Flame, Heart, Users, Shield, Trash2, BookOpen, CircleSlash2 } from 'lucide-react';

type ButtonFamily = {
  key: string;
  labelTr: string;
  labelEn: string;
  tone: string;
  bg: string;
  border: string;
  shadow: string;
  icon: any;
};

type ButtonShape = {
  key: string;
  labelTr: string;
  labelEn: string;
  radius: number;
  clipPath?: string;
  paddingX: number;
  paddingY: number;
};

type ButtonMotion = {
  key: string;
  labelTr: string;
  labelEn: string;
  className: string;
};

type ButtonModel = {
  code: string;
  family: ButtonFamily;
  shape: ButtonShape;
  motion: ButtonMotion;
};

const BUTTON_FAMILIES: ButtonFamily[] = [
  { key: 'neon', labelTr: 'Neon', labelEn: 'Neon', tone: '#00e887', bg: 'linear-gradient(180deg, rgba(0,232,135,0.20), rgba(0,232,135,0.06))', border: 'rgba(0,232,135,0.55)', shadow: '0 0 24px rgba(0,232,135,0.22)', icon: Zap },
  { key: 'glass', labelTr: 'Glass', labelEn: 'Glass', tone: '#a0b4ff', bg: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(160,180,255,0.06))', border: 'rgba(160,180,255,0.42)', shadow: '0 0 22px rgba(160,180,255,0.18)', icon: Sparkles },
  { key: 'ember', labelTr: 'Ember', labelEn: 'Ember', tone: '#f97316', bg: 'linear-gradient(180deg, rgba(249,115,22,0.18), rgba(249,115,22,0.05))', border: 'rgba(249,115,22,0.55)', shadow: '0 0 26px rgba(249,115,22,0.22)', icon: Flame },
  { key: 'rose', labelTr: 'Rose', labelEn: 'Rose', tone: '#ff8ab0', bg: 'linear-gradient(180deg, rgba(255,138,176,0.18), rgba(255,138,176,0.05))', border: 'rgba(255,138,176,0.50)', shadow: '0 0 22px rgba(255,138,176,0.18)', icon: Heart },
  { key: 'forest', labelTr: 'Forest', labelEn: 'Forest', tone: '#4ecb71', bg: 'linear-gradient(180deg, rgba(78,203,113,0.16), rgba(78,203,113,0.05))', border: 'rgba(78,203,113,0.42)', shadow: '0 0 22px rgba(78,203,113,0.18)', icon: Users },
  { key: 'royal', labelTr: 'Royal', labelEn: 'Royal', tone: '#7dd3fc', bg: 'linear-gradient(180deg, rgba(125,211,252,0.18), rgba(79,110,247,0.08))', border: 'rgba(125,211,252,0.45)', shadow: '0 0 26px rgba(125,211,252,0.16)', icon: Shield },
  { key: 'brutal', labelTr: 'Brutal', labelEn: 'Brutal', tone: '#e0e0f0', bg: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))', border: 'rgba(224,224,240,0.25)', shadow: '0 0 18px rgba(255,255,255,0.10)', icon: Trash2 },
  { key: 'solar', labelTr: 'Solar', labelEn: 'Solar', tone: '#d4a838', bg: 'linear-gradient(180deg, rgba(212,168,56,0.22), rgba(212,168,56,0.05))', border: 'rgba(212,168,56,0.50)', shadow: '0 0 24px rgba(212,168,56,0.20)', icon: BookOpen },
  { key: 'mono', labelTr: 'Mono', labelEn: 'Mono', tone: '#8abda0', bg: 'linear-gradient(180deg, rgba(138,189,160,0.12), rgba(138,189,160,0.04))', border: 'rgba(138,189,160,0.42)', shadow: '0 0 20px rgba(138,189,160,0.15)', icon: CircleSlash2 },
  { key: 'void', labelTr: 'Void', labelEn: 'Void', tone: '#c8b4ff', bg: 'linear-gradient(180deg, rgba(200,180,255,0.14), rgba(79,110,247,0.04))', border: 'rgba(200,180,255,0.42)', shadow: '0 0 26px rgba(200,180,255,0.16)', icon: Play },
];

const BUTTON_SHAPES: ButtonShape[] = [
  { key: 'pill', labelTr: 'Pill', labelEn: 'Pill', radius: 999, paddingX: 14, paddingY: 10 },
  { key: 'rounded', labelTr: 'Rounded', labelEn: 'Rounded', radius: 16, paddingX: 12, paddingY: 10 },
  { key: 'soft', labelTr: 'Soft', labelEn: 'Soft', radius: 12, paddingX: 12, paddingY: 10 },
  { key: 'cut', labelTr: 'Cut', labelEn: 'Cut', radius: 10, clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))', paddingX: 12, paddingY: 10 },
];

const BUTTON_MOTIONS: ButtonMotion[] = [
  { key: 'float', labelTr: 'Float', labelEn: 'Float', className: 'button-model--float' },
  { key: 'pulse', labelTr: 'Pulse', labelEn: 'Pulse', className: 'button-model--pulse' },
  { key: 'flicker', labelTr: 'Flicker', labelEn: 'Flicker', className: 'button-model--flicker' },
  { key: 'scan', labelTr: 'Scan', labelEn: 'Scan', className: 'button-model--scan' },
  { key: 'wave', labelTr: 'Wave', labelEn: 'Wave', className: 'button-model--wave' },
];

const BUTTON_MODELS: ButtonModel[] = (() => {
  const models: ButtonModel[] = [];
  let index = 1;
  for (const family of BUTTON_FAMILIES) {
    for (const shape of BUTTON_SHAPES) {
      for (const motion of BUTTON_MOTIONS) {
        models.push({
          code: `BM-${String(index).padStart(3, '0')}`,
          family,
          shape,
          motion,
        });
        index++;
      }
    }
  }
  return models;
})();

const BUTTON_FILTERS = ['all', ...BUTTON_FAMILIES.map(f => f.key)] as const;

export default function ButtonLibrary({ lang, onClose }: { lang: string; onClose: () => void }) {
  const [filter, setFilter] = useState<typeof BUTTON_FILTERS[number]>('all');
  const [query, setQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState(BUTTON_MODELS[0]?.code ?? 'BM-001');
  const [compact, setCompact] = useState(true);

  const visible = BUTTON_MODELS.filter(model => {
    const familyMatch = filter === 'all' || model.family.key === filter;
    const q = query.trim().toLowerCase();
    const queryMatch = !q || model.code.toLowerCase().includes(q) || model.family.key.includes(q) || model.motion.key.includes(q) || model.shape.key.includes(q);
    return familyMatch && queryMatch;
  });

  const selected = BUTTON_MODELS.find(m => m.code === selectedCode) ?? BUTTON_MODELS[0];
  const SwatchIcon = selected?.family.icon ?? Zap;

  return (
    <div
      style={{
        position: 'absolute',
        top: 72,
        right: 8,
        zIndex: 80,
        width: 'min(980px, calc(100vw - 16px))',
        maxHeight: 'calc(100vh - 92px)',
        background: 'rgba(2,6,16,0.97)',
        border: '1px solid rgba(79,110,247,0.35)',
        boxShadow: '0 18px 70px rgba(0,0,0,0.62)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderBottom: '1px solid rgba(79,110,247,0.2)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 11, color: '#a0b4ff', letterSpacing: '0.22em' }}>BUTTON LIBRARY</div>
          <div style={{ fontSize: 15, color: '#e0e0f0', letterSpacing: '0.08em' }}>
            {lang === 'tr' ? 'Model kodlari ile secim yap' : 'Pick with model codes'}
          </div>
          <div style={{ fontSize: 11, color: '#8abda0', letterSpacing: '0.08em' }}>
            {lang === 'tr' ? 'Ornek: BM-017 yerine BM-041' : 'Example: replace BM-017 with BM-041'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: '1px solid rgba(160,180,255,0.18)', background: 'rgba(255,255,255,0.03)', borderRadius: 999 }}>
            <span style={{ fontSize: 10, color: '#8abda0', letterSpacing: '0.18em' }}>{lang === 'tr' ? 'KOD' : 'CODE'}</span>
            <span style={{ fontSize: 13, color: selected?.family.tone, fontFamily: 'Orbitron, monospace', fontWeight: 800 }}>{selected?.code ?? 'BM-001'}</span>
            <SwatchIcon size={14} />
          </div>
          <button onClick={() => setCompact(v => !v)} style={{ padding: '7px 10px', border: '1px solid rgba(160,180,255,0.22)', background: compact ? 'rgba(160,180,255,0.18)' : 'rgba(160,180,255,0.08)', color: '#a0b4ff', cursor: 'pointer', letterSpacing: '0.08em' }}>
            {compact ? (lang === 'tr' ? 'WIDE' : 'WIDE') : (lang === 'tr' ? 'COMPACT' : 'COMPACT')}
          </button>
          <button onClick={onClose} style={{ color: '#a0c8b0', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
      </div>

      <div style={{ padding: 10, borderBottom: '1px solid rgba(79,110,247,0.12)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: 8 }}>
          {BUTTON_FILTERS.map(key => {
            const family = BUTTON_FAMILIES.find(f => f.key === key);
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 999,
                  border: `1px solid ${active ? (family?.border ?? 'rgba(0,232,135,0.55)') : 'rgba(160,180,255,0.14)'}`,
                  background: active ? `${family?.bg ?? 'rgba(0,232,135,0.10)'}` : 'rgba(255,255,255,0.03)',
                  color: active ? (family?.tone ?? '#00e887') : '#8abda0',
                  cursor: 'pointer',
                  letterSpacing: '0.06em',
                  textAlign: 'left',
                }}
              >
                {key === 'all' ? (lang === 'tr' ? 'HEPSI' : 'ALL') : `${String(BUTTON_FAMILIES.findIndex(f => f.key === key) + 1).padStart(2, '0')} · ${lang === 'tr' ? family?.labelTr : family?.labelEn}`}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={lang === 'tr' ? 'Kod ara: BM-0.. / family / motion / shape' : 'Search: BM-0.. / family / motion / shape'}
            style={{
              flex: 1,
              padding: '8px 10px',
              border: '1px solid rgba(160,180,255,0.16)',
              background: 'rgba(255,255,255,0.04)',
              color: '#e0e0f0',
              outline: 'none',
              fontFamily: 'Share Tech Mono, monospace',
              letterSpacing: '0.05em',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', border: '1px solid rgba(160,180,255,0.16)', background: 'rgba(255,255,255,0.03)', color: '#8abda0', letterSpacing: '0.08em' }}>
            {visible.length}/{BUTTON_MODELS.length}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr 330px' : '1fr', minHeight: 0, flex: 1 }}>
        <div style={{ minHeight: 0, overflow: 'auto', padding: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(5, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
            {visible.map(model => {
              const Icon = model.family.icon;
              const active = model.code === selectedCode;
              return (
                <button
                  key={model.code}
                  onClick={() => setSelectedCode(model.code)}
                  className={`button-model ${model.motion.className}`}
                  type="button"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: 6,
                    minHeight: 98,
                    padding: `${model.shape.paddingY}px ${model.shape.paddingX}px`,
                    borderRadius: model.shape.radius,
                    clipPath: model.shape.clipPath,
                    border: `1px solid ${active ? model.family.tone : model.family.border}`,
                    background: model.family.bg,
                    color: model.family.tone,
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: active ? model.family.shadow : model.family.shadow,
                    transform: active ? 'translateY(-1px) scale(1.01)' : 'none',
                    outline: active ? '1px solid rgba(255,255,255,0.10)' : 'none',
                    position: 'relative',
                  } as CSSProperties}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, fontFamily: 'Orbitron, monospace', letterSpacing: '0.11em', fontWeight: 800 }}>
                      {model.code}
                    </span>
                    <span style={{ fontSize: 10, color: '#dbe7ff', letterSpacing: '0.08em', opacity: 0.8 }}>
                      {lang === 'tr' ? model.family.labelTr : model.family.labelEn}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 999, border: `1px solid ${model.family.border}`, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 10px ${model.family.tone}22` }}>
                      <Icon size={13} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontFamily: 'Orbitron, monospace', fontWeight: 800, letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lang === 'tr' ? model.shape.labelTr : model.shape.labelEn}
                      </span>
                      <span style={{ fontSize: 10, color: 'rgba(220,230,255,0.75)', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lang === 'tr' ? model.motion.labelTr : model.motion.labelEn}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'rgba(220,230,255,0.66)', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      BM code {model.code}
                    </span>
                    {active && (
                      <span style={{ fontSize: 10, color: '#e0e0f0', letterSpacing: '0.12em', padding: '2px 6px', borderRadius: 999, border: `1px solid ${model.family.tone}66`, background: `${model.family.tone}18` }}>
                        SELECTED
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ minHeight: 0, overflow: 'auto', borderLeft: '1px solid rgba(160,180,255,0.14)', padding: 10, display: compact ? 'block' : 'none' }}>
          <div style={{ position: 'sticky', top: 0, paddingBottom: 10, background: 'linear-gradient(180deg, rgba(2,6,16,0.98), rgba(2,6,16,0.85))', borderBottom: '1px solid rgba(160,180,255,0.12)', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#a0b4ff', letterSpacing: '0.16em' }}>{lang === 'tr' ? 'SECILI MODEL' : 'SELECTED MODEL'}</div>
            <div style={{ fontSize: 26, color: selected?.family.tone ?? '#00e887', fontFamily: 'Orbitron, monospace', fontWeight: 900, marginTop: 2 }}>
              {selected?.code ?? 'BM-001'}
            </div>
            <div style={{ fontSize: 12, color: '#e0e0f0', marginTop: 4 }}>
              {lang === 'tr'
                ? `${selected ? selected.family.labelTr : 'Model'} / ${selected ? selected.shape.labelTr : 'Shape'} / ${selected ? selected.motion.labelTr : 'Motion'}`
                : `${selected ? selected.family.labelEn : 'Model'} / ${selected ? selected.shape.labelEn : 'Shape'} / ${selected ? selected.motion.labelEn : 'Motion'}`}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <button style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(0,232,135,0.35)', background: 'rgba(0,232,135,0.08)', color: '#00e887', cursor: 'pointer' }}>
              {lang === 'tr' ? 'KOD KOPYA' : 'COPY CODE'}
            </button>
            <button style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(160,180,255,0.35)', background: 'rgba(160,180,255,0.08)', color: '#a0b4ff', cursor: 'pointer' }}>
              {lang === 'tr' ? 'TASARIM SEC' : 'CHOOSE STYLE'}
            </button>
            <button style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(212,168,56,0.35)', background: 'rgba(212,168,56,0.08)', color: '#d4a838', cursor: 'pointer' }}>
              {lang === 'tr' ? 'BU KODU NOT ET' : 'NOTE THIS CODE'}
            </button>
          </div>

          <div style={{ marginTop: 12, fontSize: 11, color: '#8abda0', lineHeight: 1.55 }}>
            {lang === 'tr'
              ? 'Simdeki butonlar icin bana sadece kodu soyleyebilirsin. Ornek: BM-017 -> BM-154'
              : 'For the sim buttons, just tell me the code. Example: BM-017 -> BM-154'}
          </div>
        </div>
      </div>
    </div>
  );
}
