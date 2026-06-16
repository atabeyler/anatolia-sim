import { useState } from 'react';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { FlaskConical, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { text, type LangCode } from '../../utils/i18n';

const EXAMPLES: Record<string, string[]> = {
  tr: [
    'Teknoloji nüfus artışına yol açar',
    'İnanç sistemleri çevre stresi altında ortaya çıkar',
    'Yüksek eşitsizlik (Gini > 0.5) sosyal çatışmayı önceler',
    'Sanatsal kültürler daha karmaşık dil geliştirir',
  ],
  en: [
    'Technology leads to population growth',
    'Belief systems emerge under environmental stress',
    'High inequality (Gini > 0.5) precedes social conflict',
    'Artistic cultures develop more complex language',
  ],
  de: [
    'Technologie führt zu Bevölkerungswachstum',
    'Glaubenssysteme entstehen unter Umweltstress',
    'Hohe Ungleichheit (Gini > 0.5) geht sozialen Konflikten voraus',
    'Künstlerische Kulturen entwickeln komplexere Sprache',
  ],
  fr: [
    'La technologie entraîne une croissance démographique',
    'Les systèmes de croyances émergent sous stress environnemental',
    'Une forte inégalité (Gini > 0,5) précède les conflits sociaux',
    'Les cultures artistiques développent un langage plus complexe',
  ],
  ar: [
    'التكنولوجيا تؤدي إلى نمو سكاني',
    'تنشأ أنظمة المعتقدات تحت الضغط البيئي',
    'تسبق عدم المساواة العالية (جيني > 0.5) النزاع الاجتماعي',
    'الثقافات الفنية تطور لغة أكثر تعقيداً',
  ],
};

type Result = { verdict: 'supported' | 'refuted' | 'inconclusive'; confidence: number; ci_lower?: number; ci_upper?: number; n_evidence?: number; reasoning: string };

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
    } catch { setResult({ verdict: 'inconclusive', confidence: 0, reasoning: text(lang as LangCode, { en: 'Test failed.', tr: 'Test başarısız.' }) }); }
    setLoading(false);
  }

  const examples = EXAMPLES[lang] ?? EXAMPLES.en;

  const verdictStyle = result ? {
    supported:    { border: 'border-green-500/30',  bg: 'bg-green-500/10',  color: 'text-green-400',  icon: CheckCircle },
    refuted:      { border: 'border-red-500/30',    bg: 'bg-red-500/10',    color: 'text-red-400',    icon: XCircle },
    inconclusive: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', color: 'text-yellow-400', icon: HelpCircle },
  }[result.verdict] : null;

  return (
    <DetailPanel panelId="hypothesis" title="Hypothesis Test" titleTr="Hipotez Testi">
      {/* Adam & Eve Core Metrics */}
      {stats && (
        <div className="bg-sim-surface rounded-lg p-3 mb-3">
          <div className="text-sim-gold text-xs font-semibold uppercase tracking-widest mb-2">
            {text(lang as LangCode, { en: 'Adam & Eve Hypothesis Metrics', tr: 'Adem & Havva Hipotez Metrikleri' })}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: text(lang as LangCode, { en: 'Avg Consciousness', tr: 'Ort. Bilinç' }), value: ((stats.avg_consciousness ?? 0) * 100).toFixed(1) + '%' },
              { label: text(lang as LangCode, { en: 'Max ToM Stage', tr: 'Max ZihinKur.' }), value: stats.max_tom_stage ?? 0 },
              { label: text(lang as LangCode, { en: 'Word Count', tr: 'Kelime Sayısı' }), value: stats.word_count ?? 0 },
              { label: text(lang as LangCode, { en: 'Lang Stage', tr: 'Dil Aşaması' }), value: stats.max_language_stage ?? 0 },
              { label: text(lang as LangCode, { en: 'Technologies', tr: 'Teknolojiler' }), value: stats.technologies ?? 0 },
              { label: text(lang as LangCode, { en: 'Beliefs', tr: 'İnançlar' }), value: stats.beliefs ?? 0 },
              { label: text(lang as LangCode, { en: 'Art Forms', tr: 'Sanat Biçimleri' }), value: stats.art_forms ?? 0 },
              { label: text(lang as LangCode, { en: 'QoL Index', tr: 'YYK Endeksi' }), value: ((stats.qol_index ?? 0) * 100).toFixed(1) + '%' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-sim-bg rounded p-1.5">
                <div className="text-sim-muted" style={{ fontSize: 10 }}>{label}</div>
                <div className="text-sim-text font-medium text-sm">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-sim-surface rounded-lg p-3 mb-3 flex items-start gap-2">
        <FlaskConical size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
        <p className="text-sim-muted text-sm">
          {text(lang as LangCode, {
            en: 'State a hypothesis and Aria evaluates it against live simulation data.',
            tr: 'Bir hipotez belirtin; Aria bunu canlı simülasyon verileriyle değerlendirir.',
          })}
        </p>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {text(lang as LangCode, { en: 'Examples', tr: 'Örnekler' })}
        </h4>
        <div className="space-y-1">
          {examples.map(ex => (
            <button key={ex} onClick={() => setHypothesis(ex)}
              className="w-full text-left text-sm text-sim-muted hover:text-sim-text bg-sim-surface hover:bg-sim-border rounded px-2 py-1 transition-colors">
              "{ex}"
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={hypothesis}
        onChange={e => setHypothesis(e.target.value)}
        placeholder={text(lang as LangCode, { en: 'State your hypothesis…', tr: 'Hipotezinizi belirtin…' })}
        className="w-full bg-sim-bg border border-sim-border rounded-lg px-3 py-2 text-sm text-sim-text resize-none h-16 focus:border-sim-accent focus:outline-none mb-2"
      />
      <button onClick={test} disabled={loading || !hypothesis.trim()}
        className="w-full px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 mb-3">
        {loading ? text(lang as LangCode, { en: 'Testing…', tr: 'Test ediliyor…' }) : text(lang as LangCode, { en: 'Test Hypothesis', tr: 'Hipotezi Test Et' })}
      </button>

      {result && verdictStyle && (() => {
        const Icon = verdictStyle.icon;
        return (
          <div className={`rounded-lg p-3 border ${verdictStyle.border} ${verdictStyle.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className={verdictStyle.color} />
              <span className={`text-sm font-semibold uppercase ${verdictStyle.color}`}>
                {result.verdict} ({(result.confidence * 100).toFixed(0)}% {text(lang as LangCode, { en: 'confidence', tr: 'güven' })})
              </span>
            </div>
            {result.ci_lower !== undefined && result.ci_upper !== undefined && (
              <p className="text-xs text-sim-muted mb-2">
                95% CI: [{(result.ci_lower * 100).toFixed(1)}%, {(result.ci_upper * 100).toFixed(1)}%]
                {result.n_evidence !== undefined && (
                  <span className="ml-2 opacity-60">n={result.n_evidence} {text(lang as LangCode, { en: 'events', tr: 'olay' })}</span>
                )}
              </p>
            )}
            <p className="text-sm text-sim-muted leading-relaxed">{result.reasoning}</p>
          </div>
        );
      })()}
    </DetailPanel>
  );
}
