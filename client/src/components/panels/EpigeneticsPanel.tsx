import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { text, type LangCode } from '../../utils/i18n';

const LOCI = [
  { id: 'HPA_AXIS',       gene: 'COMT',      effect: 'Stress Reactivity', effectTr: 'Stres Tepkisi',       desc: 'Blunted under chronic stress',        descTr: 'Kronik stres altında zayıflar' },
  { id: 'BDNF_PROMOTER',  gene: 'BDNF',      effect: 'Neuroplasticity',   effectTr: 'Nöroplastisite',      desc: 'Early adversity reduces learning',    descTr: 'Erken zorluk öğrenmeyi azaltır' },
  { id: 'MAOA_REGULATION',gene: 'MAOA',      effect: 'Aggression',        effectTr: 'Saldırganlık',        desc: 'Early stress → permanent mark',      descTr: 'Erken stres → kalıcı iz' },
  { id: 'LEPTIN_RESIST',  gene: 'Metabolic', effect: 'Fat Storage',       effectTr: 'Yağ Depolama',        desc: 'Famine triggers metabolic shift',     descTr: 'Kıtlık metabolik kaymayı tetikler' },
  { id: 'INSULIN_SENS',   gene: 'Metabolik', effect: 'Insulin Sensitivity', effectTr: 'İnsülin Duyarlılığı', desc: 'Nutrition shapes metabolic threshold', descTr: 'Beslenme metabolik eşiği şekillendirir' },
  { id: 'AVP_REGULATION', gene: 'OXTR',      effect: 'Social Memory',       effectTr: 'Sosyal Bellek',        desc: 'Isolation erodes social recall',      descTr: 'Yalnızlık sosyal belleği aşındırır' },
  { id: 'OXTR_METHYL',    gene: 'OXTR',      effect: 'Social Bonding',    effectTr: 'Sosyal Bağlanma',     desc: 'Isolation demethylates bonding',      descTr: 'Yalıtım bağlanma izlerini değiştirir' },
  { id: 'IMMUNE_PRIMING', gene: 'Immune',    effect: 'Pathogen Memory',   effectTr: 'Patojen Belleği',     desc: 'Infection leaves lasting marks',      descTr: 'Enfeksiyon kalıcı izler bırakır' },
];

function t(lang: string, enStr: string, trStr: string) {
  return lang === 'tr' ? trStr : enStr;
}

export default function EpigeneticsPanel() {
  const { lang, stats } = useSimStore();
  const epi = (stats as any)?.epigenetics ?? {};

  return (
    <DetailPanel panelId="epigenetics" title="Epigenetics" titleTr="Epigenetik">
      <div className="bg-sim-surface rounded-lg p-3 mb-3">
        <p className="text-sim-muted text-sm italic">
          {t(
            lang,
            'Experience modifies gene expression without changing DNA sequence. Some marks are heritable across generations.',
            'Deneyim, DNA dizisini değiştirmeden gen ifadesini değiştirir. Bazı izler nesiller arasında aktarılır.'
          )}
        </p>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t(lang, 'Monitored Loci', 'İzlenen Lokuslar')}
        </h4>
        <div className="space-y-2">
          {LOCI.map(locus => {
            const methylation: number = epi[locus.id] ?? 0.5;
            const pct = Math.round(methylation * 100);
            // High methylation = more silenced; color shifts from blue→purple
            const barColor = methylation > 0.65
              ? `hsl(${270 - (methylation - 0.65) * 200}, 70%, 60%)`
              : `hsl(${220 + methylation * 50}, 70%, 60%)`;
            return (
              <div key={locus.id} className="bg-sim-surface/50 rounded p-2">
                <div className="flex justify-between mb-1">
                  <span className="text-sim-text text-sm font-medium">{locus.gene}</span>
                  <span className="text-sim-accent text-sm">{t(lang, locus.effect, locus.effectTr)}</span>
                </div>
                <div className="text-sim-muted text-sm italic mb-1">
                  {t(lang, locus.desc, locus.descTr)}
                </div>
                <div className="mt-1 h-1.5 bg-sim-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: barColor }}
                  />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-xs text-sim-muted">{t(lang, 'Active', 'Aktif')}</span>
                  <span className="text-xs text-sim-accent font-mono">{pct}%</span>
                  <span className="text-xs text-sim-muted">{t(lang, 'Silenced', 'Sessiz')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t(lang, 'Transgenerational Inheritance', 'Nesiller Arası Aktarım')}
        </h4>
        <div className="space-y-1">
          {[
            { label: t(lang, 'Reversible marks', 'Tersine çevrilebilir izler'), heritability: '20-35%' },
            { label: t(lang, 'Stress marks (MAOA)', 'Stres izleri (MAOA)'), heritability: '40%' },
            { label: t(lang, 'Immune priming', 'Bağışıklık hazırlığı'), heritability: '60%' },
            { label: t(lang, 'Metabolic marks', 'Metabolik izler'), heritability: '50%' },
          ].map(row => (
            <div key={row.label} className="flex justify-between py-0.5 border-b border-sim-border/30 text-sm">
              <span className="text-sim-muted">{row.label}</span>
              <span className="text-sim-accent">{row.heritability}</span>
            </div>
          ))}
        </div>
      </div>
    </DetailPanel>
  );
}
