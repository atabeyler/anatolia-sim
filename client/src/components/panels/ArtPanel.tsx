import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { Music } from 'lucide-react';
import { text, translateEventDescription, type LangCode } from '../../utils/i18n';

const ART_CATEGORIES = [
  {
    medium: 'visual',
    en: 'Visual Art',
    tr: 'Görsel Sanat',
    emoji: '🎨',
    items: [
      { en: 'Cave Painting',      tr: 'Mağara Resmi' },
      { en: 'Sculpture',          tr: 'Heykelcilik' },
      { en: 'Pottery Decoration', tr: 'Çömlek Süslemesi' },
      { en: 'Textile Pattern',    tr: 'Dokuma Deseni' },
      { en: 'Architecture Art',   tr: 'Mimari Sanatı' },
    ],
  },
  {
    medium: 'music',
    en: 'Music',
    tr: 'Müzik',
    emoji: '🎵',
    items: [
      { en: 'Rhythmic Percussion', tr: 'Ritimli Vurma' },
      { en: 'Vocal Melody',        tr: 'Sesli Melodi' },
      { en: 'Bone Flute',          tr: 'Kemik Flüt' },
      { en: 'String Instrument',   tr: 'Telli Çalgı' },
    ],
  },
  {
    medium: 'narrative',
    en: 'Narrative',
    tr: 'Anlatı',
    emoji: '📖',
    items: [
      { en: 'Oral Story',    tr: 'Sözlü Hikâye' },
      { en: 'Epic Poem',     tr: 'Epik Şiir' },
      { en: 'Written Story', tr: 'Yazılı Hikâye' },
    ],
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
            {text(lang as LangCode, { en: 'Art Forms Discovered', tr: 'Keşfedilen Sanat Formları' })}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {text(lang as LangCode, { en: 'Emergence Requirements', tr: 'Ortaya Çıkış Gereksinimleri' })}
        </h4>
        <p className="text-sim-muted text-sm italic">
          {text(lang as LangCode, {
            en: 'Art requires food surplus + artistic_sense gene × intelligence > threshold. Higher forms need cognitive prerequisites.',
            tr: 'Sanat; gıda fazlası + artistik_duyarlılık geni × zekâ > eşik gerektirir. Yüksek formlar bilişsel önkoşullar ister.',
          })}
        </p>
      </div>

      {ART_CATEGORIES.map(cat => {
        const discovered = artEvents.filter(e =>
          cat.items.some(item => e.description?.toLowerCase().includes(item.en.toLowerCase()))
        );
        return (
          <div key={cat.medium} className="mb-3">
            <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span>{cat.emoji}</span>
              <span>{text(lang as LangCode, { en: cat.en, tr: cat.tr })}</span>
              <span className="text-sim-muted font-normal normal-case tracking-normal">
                ({discovered.length}/{cat.items.length})
              </span>
            </h4>
            <div className="space-y-0.5">
              {cat.items.map(item => {
                const isDiscovered = discovered.some(e => e.description?.toLowerCase().includes(item.en.toLowerCase()));
                return (
                  <div
                    key={item.en}
                    className={`text-sm px-2 py-1 rounded ${isDiscovered ? 'text-sim-text bg-pink-500/10' : 'text-sim-muted opacity-40'}`}
                  >
                    {isDiscovered ? '✓' : '○'} {text(lang as LangCode, { en: item.en, tr: item.tr })}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {text(lang as LangCode, { en: 'Art Events', tr: 'Sanat Olayları' })}
        </h4>
        {artEvents.length === 0 ? (
          <p className="text-sim-muted italic text-sm">
            {text(lang as LangCode, { en: 'No art events yet.', tr: 'Henüz sanat olayı yok.' })}
          </p>
        ) : (
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {artEvents.slice(0, 8).map((ev, i) => (
              <div key={i} className="flex gap-2 py-0.5 border-b border-sim-border/30">
                <span className="text-pink-400 font-mono text-sm">Y{ev.sim_year}</span>
                <span className="text-sim-muted text-sm">{translateEventDescription(ev.description ?? '', lang as LangCode, ev)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}
