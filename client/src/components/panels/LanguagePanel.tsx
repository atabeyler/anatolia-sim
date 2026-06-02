import { useState, useEffect } from 'react';
import axios from 'axios';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';

const LANGUAGE_STAGES = [
  { id: 0, name: 'Pre-linguistic',  nameTr: 'Dil Öncesi',       desc: 'No symbolic communication',       color: '#555' },
  { id: 1, name: 'Gestural',        nameTr: 'Jestsel',           desc: 'Pointing, body language',          color: '#8b7355' },
  { id: 2, name: 'Emotional Sound', nameTr: 'Duygusal Ses',      desc: 'Shared emotional vocalizations',   color: '#6b8e23' },
  { id: 3, name: 'Proto-Words',     nameTr: 'Proto-Kelimeler',   desc: 'Consistent sound-meaning pairs',   color: '#4682b4' },
  { id: 4, name: 'Syntax',          nameTr: 'Sözdizimi',         desc: 'Grammar emerges',                  color: '#9370db' },
  { id: 5, name: 'Abstract',        nameTr: 'Soyut',             desc: 'Concepts beyond immediate world',  color: '#cd853f' },
  { id: 6, name: 'Writing',         nameTr: 'Yazı',              desc: 'Symbolic recording of language',   color: '#daa520' },
];

const CONTEXT_META: Record<string, { icon: string; labelTr: string; labelEn: string; color: string }> = {
  food:   { icon: '🍖', labelTr: 'Yemek',      labelEn: 'Food',    color: '#6b8e23' },
  danger: { icon: '⚠️', labelTr: 'Tehlike',    labelEn: 'Danger',  color: '#cc4444' },
  pain:   { icon: '💢', labelTr: 'Acı',        labelEn: 'Pain',    color: '#cc6600' },
  death:  { icon: '💀', labelTr: 'Ölüm',       labelEn: 'Death',   color: '#888' },
  birth:  { icon: '🌱', labelTr: 'Doğum',      labelEn: 'Birth',   color: '#44aa66' },
  water:  { icon: '💧', labelTr: 'Su',         labelEn: 'Water',   color: '#4682b4' },
  fire:   { icon: '🔥', labelTr: 'Ateş',       labelEn: 'Fire',    color: '#dd6622' },
  mate:   { icon: '❤️', labelTr: 'Çiftleşme',  labelEn: 'Mating',  color: '#cc4488' },
  cold:   { icon: '❄️', labelTr: 'Soğuk',      labelEn: 'Cold',    color: '#88bbdd' },
  dark:   { icon: '🌑', labelTr: 'Karanlık',   labelEn: 'Dark',    color: '#444466' },
};

interface LexiconEntry {
  sound: string;
  context: string;
  speakers: number;
}

export default function LanguagePanel() {
  const { stats, events, lang, currentSim, accessToken } = useSimStore();
  const [lexicon, setLexicon] = useState<LexiconEntry[]>([]);
  const [lexiconLoading, setLexiconLoading] = useState(false);

  const currentStage = stats?.max_language_stage ?? 0;
  const wordCount    = stats?.word_count ?? 0;
  const langEvents   = events.filter(e => e.event_type === 'language');

  useEffect(() => {
    if (!currentSim || !accessToken) return;
    let cancelled = false;

    async function fetchLexicon() {
      setLexiconLoading(true);
      try {
        const { data } = await axios.get(
          `/api/simulations/${currentSim!.id}/lexicon`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!cancelled) setLexicon(data.lexicon ?? []);
      } catch { /* server may not be running */ }
      finally { if (!cancelled) setLexiconLoading(false); }
    }

    fetchLexicon();
    const interval = setInterval(fetchLexicon, 15_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentSim?.id, accessToken]);

  return (
    <DetailPanel panelId="language" title="Language" titleTr="Dil">

      {/* Current stage */}
      <div className="bg-sim-surface rounded-lg p-3 mb-3">
        <div className="text-sim-muted text-xs mb-1">
          {lang === 'en' ? 'Current Stage' : 'Mevcut Aşama'}
        </div>
        <div className="text-sim-gold font-bold text-base">
          {lang === 'en'
            ? `Stage ${currentStage}: ${LANGUAGE_STAGES[currentStage]?.name ?? '?'}`
            : `Aşama ${currentStage}: ${LANGUAGE_STAGES[currentStage]?.nameTr ?? '?'}`}
        </div>
        <div className="text-sim-muted text-xs mt-1">
          {LANGUAGE_STAGES[currentStage]?.desc ?? ''}
        </div>
        {wordCount > 0 && (
          <div className="text-sim-accent text-xs mt-2 font-medium">
            {lang === 'en'
              ? `${wordCount} shared word${wordCount !== 1 ? 's' : ''} emerged`
              : `${wordCount} ortak kelime oluştu`}
          </div>
        )}
      </div>

      {/* Stage progression */}
      <div className="mb-4">
        <h4 className="text-sim-gold text-xs font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Stage Progression' : 'Aşama İlerlemesi'}
        </h4>
        <div className="space-y-1.5">
          {LANGUAGE_STAGES.map(stage => {
            const isReached = stage.id <= currentStage;
            const isCurrent = stage.id === currentStage;
            return (
              <div
                key={stage.id}
                className={`flex items-start gap-3 p-2 rounded ${
                  isCurrent ? 'bg-sim-accent/20 border border-sim-accent/40' :
                  isReached ? 'bg-sim-surface/50' : 'opacity-40'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: isReached ? stage.color : '#333' }}
                />
                <div>
                  <div className={`text-xs font-medium ${isReached ? 'text-sim-text' : 'text-sim-muted'}`}>
                    {lang === 'en' ? stage.name : stage.nameTr}
                  </div>
                  <div className="text-sim-muted text-xs">{stage.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Emergent lexicon */}
      <div className="mb-4">
        <h4 className="text-sim-gold text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-2">
          {lang === 'en' ? 'Living Lexicon' : 'Canlı Lügatçe'}
          {lexiconLoading && (
            <span className="w-2 h-2 rounded-full bg-sim-accent animate-pulse" />
          )}
        </h4>

        {lexicon.length === 0 ? (
          <p className="text-sim-muted italic text-xs">
            {lang === 'en'
              ? 'No shared words yet. Language will emerge as agents experience the world.'
              : 'Henüz ortak kelime yok. Bireyler dünyayı deneyimledikçe dil kendiliğinden çıkacak.'}
          </p>
        ) : (
          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            {lexicon.map((entry, i) => {
              const meta = CONTEXT_META[entry.context];
              return (
                <div
                  key={`${entry.sound}-${entry.context}-${i}`}
                  className="flex items-center justify-between rounded px-2 py-1.5 bg-sim-surface/60"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono font-bold text-sm"
                      style={{ color: meta?.color ?? '#aaa' }}
                    >
                      {entry.sound}
                    </span>
                    <span className="text-xs text-sim-muted">
                      {meta?.icon ?? '?'}{' '}
                      {lang === 'en' ? (meta?.labelEn ?? entry.context) : (meta?.labelTr ?? entry.context)}
                    </span>
                  </div>
                  <span className="text-sim-muted text-xs whitespace-nowrap">
                    {entry.speakers} {lang === 'en' ? 'speakers' : 'konuşmacı'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Language events */}
      <div>
        <h4 className="text-sim-gold text-xs font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Language Events' : 'Dil Olayları'}
        </h4>
        {langEvents.length === 0 ? (
          <p className="text-sim-muted italic text-xs">
            {lang === 'en' ? 'No language events yet.' : 'Henüz dil olayı yok.'}
          </p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {langEvents.slice(0, 10).map((ev, i) => (
              <div key={i} className="text-sim-muted text-xs py-0.5 border-b border-sim-border/30">
                {ev.description}
              </div>
            ))}
          </div>
        )}
      </div>

    </DetailPanel>
  );
}
