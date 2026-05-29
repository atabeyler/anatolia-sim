import { useState } from 'react';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';

const FILTERS = [
  { id: 'all',        labelTr: 'Tümü',     labelEn: 'All',       color: '#a0c8b0' },
  { id: 'birth',      labelTr: 'Doğum',    labelEn: 'Birth',     color: '#7aff9a' },
  { id: 'death',      labelTr: 'Ölüm',     labelEn: 'Death',     color: '#e08080' },
  { id: 'technology', labelTr: 'Teknoloji',labelEn: 'Tech',      color: '#7dd3fc' },
  { id: 'language',   labelTr: 'Dil',      labelEn: 'Language',  color: '#a0b4ff' },
  { id: 'discovery',  labelTr: 'Keşif',    labelEn: 'Discovery', color: '#d4a838' },
  { id: 'disaster',   labelTr: 'Afet',     labelEn: 'Disaster',  color: '#f97316' },
  { id: 'belief',     labelTr: 'İnanç',    labelEn: 'Belief',    color: '#a855f7' },
];

function evColor(type: string) {
  if (type?.includes('birth'))      return '#7aff9a';
  if (type?.includes('death'))      return '#e08080';
  if (type?.includes('technology')) return '#7dd3fc';
  if (type?.includes('language') || type?.includes('word')) return '#a0b4ff';
  if (type?.includes('discovery'))  return '#d4a838';
  if (type?.includes('disaster'))   return '#f97316';
  if (type?.includes('belief'))     return '#a855f7';
  return '#4a7060';
}

function evIcon(type: string) {
  if (type?.includes('birth'))      return '+';
  if (type?.includes('death'))      return '†';
  if (type?.includes('technology')) return '⚙';
  if (type?.includes('language') || type?.includes('word')) return '🔤';
  if (type?.includes('discovery'))  return '◆';
  if (type?.includes('disaster'))   return '⚠';
  if (type?.includes('belief'))     return '☽';
  return '·';
}

const CAUSE_TR: Record<string, string> = {
  starvation: 'açlık', dehydration: 'susuzluk', old_age: 'yaşlılık',
  predator: 'yırtıcı hayvan', genetic_disease: 'genetik hastalık',
  infection: 'enfeksiyon', trauma: 'travma', birth_complications: 'doğum komplikasyonu',
  conflict: 'çatışma', unknown: 'bilinmeyen neden',
};

function trTr(desc: string, type: string): string {
  if (!desc) return type;
  return desc
    // New format: "NAME died: cause" → "NAME öldü: türkçe_sebep"
    .replace(/^(.+) died: (.+)$/, (_: string, name: string, cause: string) =>
      `${name} öldü: ${CAUSE_TR[cause] ?? cause.replace(/_/g, ' ')}`)
    // New format: "Born: NAME (father & mother)" → "Doğdu: NAME (baba & anne)"
    .replace(/^Born: (.+) \((.+) & (.+)\)$/, (_: string, name: string, p1: string, p2: string) =>
      `Doğdu: ${name} (${p1} & ${p2})`)
    // Old format fallbacks
    .replace(/^Born: (.+)$/, (_: string, name: string) => `Doğdu: ${name}`)
    .replace('New individual born', 'Yeni birey doğdu')
    .replace('Individual died: starvation', 'Birey açlıktan öldü')
    .replace('Individual died: dehydration', 'Birey susuzluktan öldü')
    .replace('Individual died: old_age', 'Birey yaşlılıktan öldü')
    .replace('Individual died: predator', 'Birey yırtıcı tarafından öldürüldü')
    .replace(/Individual died: (.+)/, (_: string, c: string) => `Birey öldü: ${CAUSE_TR[c] ?? c.replace(/_/g, ' ')}`)
    .replace(/Technology discovered: (.+)/, (_: string, t: string) => `Teknoloji: ${t.replace(/_/g, ' ')}`)
    .replace(/killed (\d+) individuals/, (_: string, n: string) => `${n} bireyi öldürdü`);
}

export default function EventsPanel() {
  const { events, lang } = useSimStore();
  const [filter, setFilter] = useState('all');

  const visible = filter === 'all'
    ? events
    : events.filter(ev => ev.event_type?.toLowerCase().includes(filter));

  const counts: Record<string, number> = {};
  for (const f of FILTERS.slice(1)) {
    counts[f.id] = events.filter(ev => ev.event_type?.toLowerCase().includes(f.id)).length;
  }

  return (
    <DetailPanel panelId="olaylar" title="Event Log" titleTr="Olay Kaydı">

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3, marginBottom: 8 }}>
        {FILTERS.slice(1).map(f => (
          <div key={f.id} style={{ background: 'rgba(0,15,8,0.7)', border: `1px solid ${f.color}22`, padding: '3px 5px' }}>
            <div style={{ fontSize: 6, color: f.color, letterSpacing: '0.08em', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {lang === 'tr' ? f.labelTr.toUpperCase() : f.labelEn.toUpperCase()}
            </div>
            <div style={{ fontSize: 14, color: f.color, fontFamily: 'Orbitron, monospace', fontWeight: 700, lineHeight: 1 }}>
              {counts[f.id] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 8 }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              padding: '2px 6px', fontSize: 7.5,
              border: `1px solid ${filter === f.id ? f.color : '#1a3a2a'}`,
              color: filter === f.id ? f.color : '#3a6040',
              background: filter === f.id ? `${f.color}14` : 'transparent',
              fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer',
            }}>
            {lang === 'tr' ? f.labelTr : f.labelEn}
            {f.id !== 'all' && ` ${counts[f.id] ?? 0}`}
          </button>
        ))}
      </div>

      {/* Total */}
      <div style={{ fontSize: 7.5, color: '#2a5040', marginBottom: 6, letterSpacing: '0.06em' }}>
        {visible.length} / {events.length} {lang === 'tr' ? 'olay' : 'events'}
      </div>

      {/* Event list */}
      {visible.length === 0 ? (
        <div style={{ fontSize: 9, color: '#2a4a3a', textAlign: 'center', padding: '24px 0', fontStyle: 'italic' }}>
          {lang === 'tr' ? 'Olay bulunamadı.' : 'No events found.'}
        </div>
      ) : visible.map((ev, i) => {
        const color = evColor(ev.event_type);
        const icon = evIcon(ev.event_type);
        const desc = lang === 'tr'
          ? trTr(ev.description ?? ev.event_type, ev.event_type)
          : (ev.description ?? ev.event_type);
        return (
          <div key={i} style={{
            display: 'flex', gap: 6, alignItems: 'flex-start',
            padding: '5px 6px', marginBottom: 2,
            background: i === 0 ? `${color}0c` : 'transparent',
            border: `1px solid ${i < 3 ? color + '28' : '#0a1a0f'}`,
            opacity: Math.max(0.35, 1 - i * 0.012),
          }}>
            <span style={{ fontSize: 12, flexShrink: 0, lineHeight: 1.1, color, marginTop: 1 }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 2, alignItems: 'center' }}>
                <span style={{ fontSize: 7, color: '#3a6040', fontFamily: 'Orbitron, monospace', flexShrink: 0 }}>
                  Y{String(ev.sim_year).padStart(4, '0')} G{String(ev.sim_day % 365).padStart(3, '0')}
                </span>
                <span style={{ fontSize: 6.5, color: `${color}88`, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {ev.event_type?.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ fontSize: 8.5, color: i < 5 ? color : '#6a9a7a', lineHeight: 1.45, wordBreak: 'break-word' }}>
                {desc}
              </div>
            </div>
          </div>
        );
      })}
    </DetailPanel>
  );
}
