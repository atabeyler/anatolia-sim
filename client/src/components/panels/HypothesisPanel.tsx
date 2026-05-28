import { useState } from 'react';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { FlaskConical, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

const EXAMPLES_EN = [
  'Technology leads to population growth',
  'Belief systems emerge under environmental stress',
  'High inequality (Gini > 0.5) precedes social conflict',
  'Artistic cultures develop more complex language',
];

const EXAMPLES_TR = [
  'Teknoloji nüfus artışına yol açar',
  'İnanç sistemleri çevre stresi altında ortaya çıkar',
  'Yüksek eşitsizlik (Gini > 0.5) sosyal çatışmayı önceler',
  'Sanatsal kültürler daha karmaşık dil geliştirir',
];

type Result = { verdict: 'supported' | 'refuted' | 'inconclusive'; confidence: number; reasoning: string };

export default function HypothesisPanel() {
  const { currentSim, accessToken, lang, stats, events } = useSimStore();
  const [hypothesis, setHypothesis] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function test() {
    if (!hypothesis.trim() || !currentSim) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await axios.post(`/api/analysis/${currentSim.id}/hypothesis`, { hypothesis, stats, events: events.slice(0, 50) }, { headers: { Authorization: `Bearer ${accessToken}` } });
      setResult(data);
    } catch { setResult({ verdict: 'inconclusive', confidence: 0, reasoning: lang === 'en' ? 'Test failed.' : 'Test başarısız.' }); }
    setLoading(false);
  }

  const examples = lang === 'en' ? EXAMPLES_EN : EXAMPLES_TR;

  const verdictStyle = result ? {
    supported:    { border: 'border-green-500/30',  bg: 'bg-green-500/10',  color: 'text-green-400',  icon: CheckCircle },
    refuted:      { border: 'border-red-500/30',    bg: 'bg-red-500/10',    color: 'text-red-400',    icon: XCircle },
    inconclusive: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', color: 'text-yellow-400', icon: HelpCircle },
  }[result.verdict] : null;

  return (
    <DetailPanel panelId="hypothesis" title="Hypothesis Test" titleTr="Hipotez Testi">
      <div className="bg-sim-surface rounded-lg p-3 mb-3 flex items-start gap-2">
        <FlaskConical size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
        <p className="text-sim-muted text-xs">
          {lang === 'en'
            ? 'State a hypothesis and Claude evaluates it against live simulation data.'
            : 'Bir hipotez belirtin; Claude bunu canlı simülasyon verileriyle değerlendirir.'}
        </p>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-xs font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Examples' : 'Örnekler'}
        </h4>
        <div className="space-y-1">
          {examples.map(ex => (
            <button key={ex} onClick={() => setHypothesis(ex)}
              className="w-full text-left text-xs text-sim-muted hover:text-sim-text bg-sim-surface hover:bg-sim-border rounded px-2 py-1 transition-colors">
              "{ex}"
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={hypothesis}
        onChange={e => setHypothesis(e.target.value)}
        placeholder={lang === 'en' ? 'State your hypothesis…' : 'Hipotezinizi belirtin…'}
        className="w-full bg-sim-bg border border-sim-border rounded-lg px-3 py-2 text-xs text-sim-text resize-none h-16 focus:border-sim-accent focus:outline-none mb-2"
      />
      <button onClick={test} disabled={loading || !hypothesis.trim()}
        className="w-full px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 mb-3">
        {loading ? (lang === 'en' ? 'Testing…' : 'Test ediliyor…') : (lang === 'en' ? 'Test Hypothesis' : 'Hipotezi Test Et')}
      </button>

      {result && verdictStyle && (() => {
        const Icon = verdictStyle.icon;
        return (
          <div className={`rounded-lg p-3 border ${verdictStyle.border} ${verdictStyle.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className={verdictStyle.color} />
              <span className={`text-xs font-semibold uppercase ${verdictStyle.color}`}>
                {result.verdict} ({(result.confidence * 100).toFixed(0)}% {lang === 'en' ? 'confidence' : 'güven'})
              </span>
            </div>
            <p className="text-xs text-sim-muted leading-relaxed">{result.reasoning}</p>
          </div>
        );
      })()}
    </DetailPanel>
  );
}
