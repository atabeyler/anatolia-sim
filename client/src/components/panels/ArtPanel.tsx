import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { Music } from 'lucide-react';

const ART_CATEGORIES = [
  {
    medium: 'visual',
    label: 'Visual Art',
    labelTr: 'Görsel Sanat',
    emoji: '🎨',
    items: ['Cave Painting', 'Sculpture', 'Pottery Decoration', 'Textile Pattern', 'Architecture Art'],
  },
  {
    medium: 'music',
    label: 'Music',
    labelTr: 'Müzik',
    emoji: '🎵',
    items: ['Rhythmic Percussion', 'Vocal Melody', 'Bone Flute', 'String Instrument'],
  },
  {
    medium: 'narrative',
    label: 'Narrative',
    labelTr: 'Anlatı',
    emoji: '📖',
    items: ['Oral Story', 'Epic Poem', 'Written Story'],
  },
];

export default function ArtPanel() {
  const { events, stats, lang } = useSimStore();

  const artEvents = events.filter(e => e.event_type === 'art');
  const totalForms = (stats as any)?.art_forms ?? artEvents.length;

  return (
    <DetailPanel panelId="art" title="Art & Music" titleTr="Sanat & Müzik">
      <div className="bg-sim-surface rounded-lg p-3 mb-3 flex items-center gap-3">
        <Music size={24} className="text-pink-400" />
        <div>
          <div className="text-pink-400 font-bold text-lg">{totalForms}</div>
          <div className="text-sim-muted text-sm">
            {lang === 'en' ? 'Art Forms Discovered' : 'Keşfedilen Sanat Formları'}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Emergence Requirements' : 'Ortaya Çıkış Gereksinimleri'}
        </h4>
        <p className="text-sim-muted text-sm italic">
          {lang === 'en'
            ? 'Art requires food surplus + artistic_sense gene × intelligence > threshold. Higher forms need cognitive prerequisites.'
            : 'Sanat; gıda fazlası + artistik_duyarlılık geni × zeka > eşiği gerektirir.'}
        </p>
      </div>

      {ART_CATEGORIES.map(cat => {
        const discovered = artEvents.filter(e =>
          cat.items.some(item => e.description?.toLowerCase().includes(item.toLowerCase()))
        );
        return (
          <div key={cat.medium} className="mb-3">
            <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span>{cat.emoji}</span>
              <span>{lang === 'en' ? cat.label : cat.labelTr}</span>
              <span className="text-sim-muted font-normal normal-case tracking-normal">
                ({discovered.length}/{cat.items.length})
              </span>
            </h4>
            <div className="space-y-0.5">
              {cat.items.map(item => {
                const isDiscovered = discovered.some(e => e.description?.toLowerCase().includes(item.toLowerCase()));
                return (
                  <div
                    key={item}
                    className={`text-sm px-2 py-1 rounded ${
                      isDiscovered ? 'text-sim-text bg-pink-500/10' : 'text-sim-muted opacity-40'
                    }`}
                  >
                    {isDiscovered ? '✓' : '○'} {item}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Art Events' : 'Sanat Olayları'}
        </h4>
        {artEvents.length === 0 ? (
          <p className="text-sim-muted italic text-sm">
            {lang === 'en' ? 'No art events yet.' : 'Henüz sanat olayı yok.'}
          </p>
        ) : (
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {artEvents.slice(0, 8).map((ev, i) => (
              <div key={i} className="flex gap-2 py-0.5 border-b border-sim-border/30">
                <span className="text-pink-400 font-mono text-sm">Y{ev.sim_year}</span>
                <span className="text-sim-muted text-sm">{ev.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}
