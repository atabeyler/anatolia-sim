import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';

const MENTAL_STATES: Record<string, { emoji: string; color: string; tr: string }> = {
  content:   { emoji: '😊', color: 'text-green-400', tr: 'Huzurlu' },
  excited:   { emoji: '😃', color: 'text-yellow-400', tr: 'Heyecanlı' },
  anxious:   { emoji: '😰', color: 'text-orange-400', tr: 'Kaygılı' },
  depressed: { emoji: '😞', color: 'text-blue-400', tr: 'Çökkün' },
  calm:      { emoji: '🧘', color: 'text-teal-400', tr: 'Sakin' },
  angry:     { emoji: '😠', color: 'text-red-400', tr: 'Öfkeli' },
  grieving:  { emoji: '😢', color: 'text-purple-400', tr: 'Yaslı' },
};

export default function PsychologyPanel() {
  const { stats, lang } = useSimStore();

  const happiness = (stats as any)?.happiness_index ?? 0.5;
  const meanWellbeing = happiness;
  const meanStress = 1 - happiness;

  return (
    <DetailPanel panelId="psychology" title="Psychology" titleTr="Psikoloji">
      <div className="bg-sim-surface rounded-lg p-3 mb-3 text-center">
        <div className="text-3xl mb-1">{happiness > 0.7 ? '😄' : happiness > 0.4 ? '😐' : '😟'}</div>
        <div className={`font-bold text-xl ${happiness > 0.6 ? 'text-green-400' : happiness > 0.3 ? 'text-yellow-400' : 'text-red-400'}`}>
          {(happiness * 100).toFixed(0)}%
        </div>
        <div className="text-sim-muted text-sm">{lang === 'en' ? 'Population Happiness' : 'Nüfus Mutluluğu'}</div>
      </div>

      <div className="mb-3 space-y-2">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sim-muted text-sm">{lang === 'en' ? 'Mean Wellbeing' : 'Ortalama İyi Oluş'}</span>
            <span className="text-green-400 text-sm font-mono">{(meanWellbeing * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-sim-border rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${meanWellbeing * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sim-muted text-sm">{lang === 'en' ? 'Mean Stress' : 'Ortalama Stres'}</span>
            <span className="text-red-400 text-sm font-mono">{(meanStress * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-sim-border rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full" style={{ width: `${meanStress * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Mental State Distribution' : 'Zihinsel Durum Dağılımı'}
        </h4>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(MENTAL_STATES).map(([state, { emoji, color, tr: stateTr }]) => (
            <div key={state} className="flex items-center gap-1 bg-sim-surface rounded px-2 py-1">
              <span>{emoji}</span>
              <span className={`text-sm capitalize ${color}`}>{lang === 'en' ? state : stateTr}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Drivers' : 'Etkenler'}
        </h4>
        <div className="space-y-1">
          {[
            { factor: 'Food Security', tr: 'Gıda Güvenliği', impact: '+' },
            { factor: 'Social Bonding', tr: 'Sosyal Bağlar', impact: '+' },
            { factor: 'Disaster', tr: 'Afet', impact: '−' },
            { factor: 'Oxytocin Gene', tr: 'Oksitosin Geni', impact: '+' },
            { factor: 'Exile', tr: 'Sürgün', impact: '−−' },
            { factor: 'Art & Music', tr: 'Sanat & Müzik', impact: '+' },
          ].map(f => (
            <div key={f.factor} className="flex justify-between py-0.5 border-b border-sim-border/30">
              <span className="text-sim-muted text-sm">{lang === 'en' ? f.factor : f.tr}</span>
              <span className={`text-sm font-bold ${f.impact.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{f.impact}</span>
            </div>
          ))}
        </div>
      </div>
    </DetailPanel>
  );
}
