import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';

function t(lang: string, en: string, tr: string) {
  return lang === 'en' ? en : tr;
}

export default function PopulationPyramidPanel() {
  const { stats, lang } = useSimStore();
  const pyramid: { group: string; male: number; female: number }[] = (stats as any)?.age_pyramid ?? [];

  // Transform: male = negative for left side
  const data = [...pyramid].reverse().map(r => ({
    group: r.group,
    male: -r.male,
    female: r.female,
    maleRaw: r.male,
  }));

  const maxVal = Math.max(1, ...pyramid.map(r => Math.max(r.male, r.female)));

  const totalMale = pyramid.reduce((s, r) => s + r.male, 0);
  const totalFemale = pyramid.reduce((s, r) => s + r.female, 0);
  const total = totalMale + totalFemale;

  return (
    <DetailPanel panelId="pyramid" title="Population Pyramid" titleTr="Nüfus Piramidi">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { l: t(lang, 'Total', 'Toplam'),  v: total,       c: '#e0e0f0' },
          { l: t(lang, 'Male', 'Erkek'),    v: totalMale,   c: '#7dd3fc' },
          { l: t(lang, 'Female', 'Kadın'),  v: totalFemale, c: '#ff8ab0' },
        ].map(({ l, v, c }) => (
          <div key={l} className="bg-sim-surface rounded p-2 text-center">
            <div className="text-sim-muted text-sm mb-0.5">{l}</div>
            <div className="font-orbitron font-bold text-base" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Sex ratio bar */}
      {total > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-sim-muted mb-1">
            <span>♂ {((totalMale / total) * 100).toFixed(1)}%</span>
            <span>{t(lang, 'Sex Ratio', 'Cinsiyet Oranı')}</span>
            <span>{((totalFemale / total) * 100).toFixed(1)}% ♀</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex">
            <div style={{ width: `${(totalMale / total) * 100}%`, background: '#7dd3fc' }} />
            <div style={{ flex: 1, background: '#ff8ab0' }} />
          </div>
        </div>
      )}

      {/* Pyramid chart */}
      {data.length === 0 || total === 0 ? (
        <div className="flex items-center justify-center py-12 text-sim-muted italic text-sm">
          {t(lang, 'No population data yet.', 'Henüz nüfus verisi yok.')}
        </div>
      ) : (
        <>
          <div className="flex justify-between text-sm mb-1 px-1">
            <span style={{ color: '#7dd3fc' }}>♂ {t(lang, 'Male', 'Erkek')}</span>
            <span className="text-sim-muted text-sm">{t(lang, 'Age', 'Yaş')}</span>
            <span style={{ color: '#ff8ab0' }}>{t(lang, 'Female', 'Kadın')} ♀</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 32, bottom: 0 }}
              barCategoryGap="15%"
            >
              <XAxis
                type="number"
                domain={[-maxVal, maxVal]}
                tickFormatter={v => Math.abs(v).toString()}
                tick={{ fill: '#6a9a78', fontSize: 11, fontFamily: 'Share Tech Mono' }}
              />
              <YAxis
                type="category"
                dataKey="group"
                tick={{ fill: '#a0c8b0', fontSize: 11, fontFamily: 'Share Tech Mono' }}
                width={32}
              />
              <Tooltip
                formatter={(value: any, name: string) => {
                  const v = Math.abs(value);
                  const label = name === 'male'
                    ? t(lang, 'Male', 'Erkek')
                    : t(lang, 'Female', 'Kadın');
                  const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
                  return [`${v} (${pct}%)`, label];
                }}
                contentStyle={{ background: '#07071a', border: '1px solid rgba(160,200,180,0.3)', borderRadius: 2, fontSize: 12, fontFamily: 'Share Tech Mono' }}
                labelStyle={{ color: '#a0c8b0' }}
              />
              <Bar dataKey="male" fill="#7dd3fc" radius={[0, 2, 2, 0]} />
              <Bar dataKey="female" fill="#ff8ab0" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Age group summary */}
          <div className="mt-3 border-t border-sim-border/30 pt-3">
            {[
              { l: t(lang, 'Children (0-14)', 'Çocuk (0-14)'),   groups: ['0-4','5-9','10-14'] },
              { l: t(lang, 'Youth (15-29)', 'Genç (15-29)'),     groups: ['15-19','20-24','25-29'] },
              { l: t(lang, 'Adults (30-59)', 'Yetişkin (30-59)'),groups: ['30-34','35-39','40-44','45-49','50-54','55-59'] },
              { l: t(lang, 'Elders (60+)', 'Yaşlı (60+)'),       groups: ['60-64','65+'] },
            ].map(({ l, groups }) => {
              const count = pyramid.filter(r => groups.includes(r.group)).reduce((s, r) => s + r.male + r.female, 0);
              const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
              return (
                <div key={l} className="flex justify-between items-center py-0.5 border-b border-sim-border/20 text-sm">
                  <span className="text-sim-muted">{l}</span>
                  <span className="text-sim-text font-mono">{count} <span className="text-sim-muted">({pct}%)</span></span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </DetailPanel>
  );
}
