import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';

const MENTAL_STATES: Record<string, { emoji: string; color: string; tr: string }> = {
  content:   { emoji: '😌', color: 'text-green-400',  tr: 'Memnun' },
  excited:   { emoji: '😃', color: 'text-yellow-400', tr: 'Heyecanlı' },
  anxious:   { emoji: '😰', color: 'text-orange-400', tr: 'Kaygılı' },
  depressed: { emoji: '😞', color: 'text-blue-400',   tr: 'Depresif' },
  calm:      { emoji: '🧘', color: 'text-teal-400',   tr: 'Sakin' },
  angry:     { emoji: '😠', color: 'text-red-400',    tr: 'Öfkeli' },
  grieving:  { emoji: '😢', color: 'text-purple-400', tr: 'Yasında' },
};

const TOM_LABELS: Record<number, { en: string; tr: string; color: string }> = {
  0: { en: 'None',     tr: 'Yok',        color: 'text-sim-muted' },
  1: { en: 'Basic',    tr: 'Temel',      color: 'text-yellow-400' },
  2: { en: 'Advanced', tr: 'Gelişmiş',   color: 'text-blue-400' },
  3: { en: 'Complex',  tr: 'Kompleks',   color: 'text-purple-400' },
};

function Bar({ value, color, max = 1 }: { value: number; color: string; max?: number }) {
  return (
    <div className="h-2 bg-sim-border rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

export default function PsychologyPanel() {
  const { stats, lang } = useSimStore();
  const s = stats as any;

  const happiness   = s?.happiness_index    ?? 0.5;
  const intelligence = s?.avg_intelligence  ?? 0;
  const consciousness = s?.avg_consciousness ?? 0;
  const tomStage    = s?.max_tom_stage      ?? 0;
  const meanStress  = 1 - happiness;
  const TR = lang === 'tr';

  const tom = TOM_LABELS[tomStage] ?? TOM_LABELS[0];

  return (
    <DetailPanel panelId="psychology" title="Psychology" titleTr="Psikoloji">

      {/* ── Mutluluk özeti ── */}
      <div className="bg-sim-surface rounded-lg p-3 mb-3 text-center">
        <div className="text-3xl mb-1">
          {happiness > 0.7 ? '😄' : happiness > 0.4 ? '😐' : '😟'}
        </div>
        <div className={`font-bold text-xl ${happiness > 0.6 ? 'text-green-400' : happiness > 0.3 ? 'text-yellow-400' : 'text-red-400'}`}>
          {(happiness * 100).toFixed(0)}%
        </div>
        <div className="text-sim-muted text-sm">{TR ? 'Nüfus Mutluluğu' : 'Population Happiness'}</div>
      </div>

      {/* ── Bilişsel Göstergeler ── */}
      <div className="mb-3">
        <h4 className="text-sim-gold text-xs font-semibold uppercase tracking-widest mb-2">
          {TR ? 'Bilişsel Göstergeler' : 'Cognitive Metrics'}
        </h4>
        <div className="space-y-2">

          {/* Zeka */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sim-muted text-xs">{TR ? 'Ort. Zekâ' : 'Avg Intelligence'}</span>
              <span className="text-blue-400 text-xs font-mono">{(intelligence * 100).toFixed(1)}%</span>
            </div>
            <Bar value={intelligence} color="bg-blue-500" />
          </div>

          {/* Bilinç */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sim-muted text-xs">{TR ? 'Ort. Bilinç' : 'Avg Consciousness'}</span>
              <span className="text-purple-400 text-xs font-mono">{(consciousness * 100).toFixed(1)}%</span>
            </div>
            <Bar value={consciousness} color="bg-purple-500" />
          </div>

          {/* Wellbeing / Stres */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sim-muted text-xs">{TR ? 'Ort. İyi Oluş' : 'Mean Wellbeing'}</span>
              <span className="text-green-400 text-xs font-mono">{(happiness * 100).toFixed(0)}%</span>
            </div>
            <Bar value={happiness} color="bg-green-500" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sim-muted text-xs">{TR ? 'Ort. Stres' : 'Mean Stress'}</span>
              <span className="text-red-400 text-xs font-mono">{(meanStress * 100).toFixed(0)}%</span>
            </div>
            <Bar value={meanStress} color="bg-red-500" />
          </div>

          {/* Zihin Teorisi (Theory of Mind) */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sim-muted text-xs">{TR ? 'Zihin Teorisi (maks.)' : 'Theory of Mind (max)'}</span>
              <span className={`text-xs font-mono font-semibold ${tom.color}`}>
                {TR ? tom.tr : tom.en} ({tomStage}/3)
              </span>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                    i <= tomStage
                      ? i === 0 ? 'bg-sim-muted/50' : i === 1 ? 'bg-yellow-500' : i === 2 ? 'bg-blue-500' : 'bg-purple-500'
                      : 'bg-sim-border'
                  }`}
                />
              ))}
            </div>
            <div className="text-sim-muted text-xs mt-1 italic">
              {tomStage === 0 && (TR ? 'Başkalarının zihinsel durumuna dair farkındalık yok' : 'No awareness of others\' mental states')}
              {tomStage === 1 && (TR ? 'Başkalarının inançlarını anlayabilir (1. derece)' : 'Can understand others\' beliefs (1st order)')}
              {tomStage === 2 && (TR ? 'Başkalarının birbirini nasıl algıladığını anlar (2. derece)' : 'Understands beliefs about beliefs (2nd order)')}
              {tomStage === 3 && (TR ? 'Karmaşık sosyal akıl yürütme kapasitesi (3. derece)' : 'Complex social reasoning capacity (3rd order)')}
            </div>
          </div>
        </div>
      </div>

      {/* ── Zihinsel Durum Dağılımı ── */}
      <div className="mb-3">
        <h4 className="text-sim-gold text-xs font-semibold uppercase tracking-widest mb-2">
          {TR ? 'Zihinsel Durum Dağılımı' : 'Mental State Distribution'}
        </h4>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(MENTAL_STATES).map(([state, info]) => (
            <div key={state} className="flex items-center gap-1 bg-sim-surface rounded px-2 py-1">
              <span>{info.emoji}</span>
              <span className={`text-xs capitalize ${info.color}`}>{TR ? info.tr : state}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Etkenler ── */}
      <div>
        <h4 className="text-sim-gold text-xs font-semibold uppercase tracking-widest mb-2">
          {TR ? 'Mutluluk Etkenleri' : 'Happiness Drivers'}
        </h4>
        <div className="space-y-1">
          {[
            { factor: 'Food Security',  tr: 'Gıda Güvenliği', impact: '+' },
            { factor: 'Social Bonding', tr: 'Sosyal Bağlar',  impact: '+' },
            { factor: 'Disaster',       tr: 'Afet',           impact: '−' },
            { factor: 'Oxytocin Gene',  tr: 'Oksitosin Geni', impact: '+' },
            { factor: 'Exile',          tr: 'Sürgün',         impact: '−−' },
            { factor: 'Art & Music',    tr: 'Sanat & Müzik',  impact: '+' },
          ].map(f => (
            <div key={f.factor} className="flex justify-between py-0.5 border-b border-sim-border/30">
              <span className="text-sim-muted text-xs">{TR ? f.tr : f.factor}</span>
              <span className={`text-xs font-bold ${f.impact.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{f.impact}</span>
            </div>
          ))}
        </div>
      </div>

    </DetailPanel>
  );
}
