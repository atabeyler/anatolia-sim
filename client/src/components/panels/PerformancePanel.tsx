import { useEffect, useRef } from 'react';
import axios from 'axios';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { text, type LangCode } from '../../utils/i18n';

export default function PerformancePanel() {
  const { activePanel, currentSim, accessToken, engineMetrics, setEngineMetrics, lang, isWarping, fastForwardTarget } = useSimStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activePanel !== 'performance' || !currentSim || !accessToken) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    const fetch = () => axios.get(`/api/simulations/${currentSim.id}/metrics`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(r => setEngineMetrics(r.data)).catch(() => {});
    fetch();
    pollRef.current = setInterval(fetch, 3000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [activePanel, currentSim?.id, accessToken]);

  const t = (tr: string, en: string, de = en, fr = en, ar = en) => text(lang as LangCode, { tr, en, de, fr, ar });

  function bar(value: number, max: number, color: string) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginTop: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.4s ease' }} />
      </div>
    );
  }

  const m = engineMetrics;
  const warpYear = fastForwardTarget ? Math.floor(fastForwardTarget / 365) : null;
  const currentYear = m ? Math.floor(m.current_day / 365) : null;
  const warpPct = (warpYear && currentYear && warpYear > currentYear)
    ? Math.min(99, ((currentYear / warpYear) * 100))
    : null;

  return (
    <DetailPanel
      panelId="performance"
      title="Performance"
      titleTr="Performans"
      titleDe="Leistung"
      titleFr="Performance"
      titleAr="الأداء"
    >
      {/* Warp status */}
      {isWarping && (
        <div style={{ background: 'rgba(212,168,56,0.1)', border: '1px solid rgba(212,168,56,0.4)', padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: '#d4a838', letterSpacing: '0.12em', marginBottom: 6 }}>
            ⚡ {t('WARP MOD AKTİF', 'WARP MODE ACTIVE', 'WARP-MODUS AKTIV', 'MODE WARP ACTIF', 'وضع الوارب نشط')}
          </div>
          {warpYear && <div style={{ fontSize: 13, color: '#e0c870', marginBottom: 2 }}>{t('Hedef Yıl', 'Target Year', 'Ziel-Jahr', 'Année Cible', 'السنة المستهدفة')}: {warpYear}</div>}
          {currentYear && <div style={{ fontSize: 13, color: '#e0c870', marginBottom: 4 }}>{t('Mevcut Yıl', 'Current Year', 'Aktuelles Jahr', 'Année Actuelle', 'السنة الحالية')}: {currentYear}</div>}
          {warpPct !== null && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 12, color: '#a0c8b0', marginBottom: 3 }}>{warpPct.toFixed(1)}%</div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${warpPct}%`, background: 'linear-gradient(90deg,#d4a838,#fbbf24)', transition: 'width 0.4s ease', boxShadow: '0 0 6px #d4a83860' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tick timing */}
      {m ? (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#4f6ef7', letterSpacing: '0.14em', marginBottom: 8 }}>{t('TİCK ZAMANLAMA', 'TICK TIMING', 'TICK-TIMING', 'TIMING TICK', 'توقيت التيك')}</div>
            {[
              { label: t('Ort. ms', 'Avg ms', 'Ø ms', 'Moy. ms', 'متوسط ms'), value: m.tick_avg_ms?.toFixed(1) ?? '—', color: '#00e887' },
              { label: t('Maks ms', 'Max ms', 'Max ms', 'Max ms', 'أقصى ms'), value: m.tick_max_ms?.toFixed(1) ?? '—', color: '#e05a5a' },
              { label: t('Min ms', 'Min ms', 'Min ms', 'Min ms', 'أدنى ms'), value: m.tick_min_ms?.toFixed(1) ?? '—', color: '#4ecb71' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                <span style={{ color: '#8abda0' }}>{label}</span>
                <span style={{ color, fontFamily: 'Orbitron, monospace', fontWeight: 700 }}>{value}</span>
              </div>
            ))}
            {m.tick_avg_ms !== undefined && bar(m.tick_avg_ms, 200, '#4f6ef7')}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#4f6ef7', letterSpacing: '0.14em', marginBottom: 8 }}>{t('MOTOR', 'ENGINE', 'MOTOR', 'MOTEUR', 'المحرك')}</div>
            {[
              { label: t('Tik/sn', 'Ticks/s', 'Ticks/s', 'Ticks/s', 'تيك/ث'), value: m.ticks_per_second?.toFixed(1) ?? '—', color: '#d4a838' },
              { label: t('Hız', 'Speed', 'Tempo', 'Vitesse', 'السرعة'), value: `${m.speed_multiplier ?? 1}×`, color: '#a0b4ff' },
              { label: t('Gün', 'Day', 'Tag', 'Jour', 'اليوم'), value: m.current_day ?? '—', color: '#7dd3fc' },
              { label: t('Yaşayan', 'Alive', 'Lebend', 'Vivants', 'أحياء'), value: m.population ?? '—', color: '#00e887' },
              { label: t('Toplam', 'Total Ever', 'Gesamt', 'Total', 'المجموع'), value: m.total_ever ?? '—', color: '#4ecb71' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                <span style={{ color: '#8abda0' }}>{label}</span>
                <span style={{ color, fontFamily: 'Orbitron, monospace', fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Milestones reached */}
          {m.milestones_reached?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#4f6ef7', letterSpacing: '0.14em', marginBottom: 8 }}>
                {t('ERİŞİLEN MİLESTONE\'LAR', 'MILESTONES REACHED', 'ERREICHTE MEILENSTEINE', 'JALONS ATTEINTS', 'المعالم المحققة')} ({m.milestones_reached.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {m.milestones_reached.map(key => (
                  <span key={key} style={{ fontSize: 12, color: '#d4a838', border: '1px solid rgba(212,168,56,0.3)', padding: '2px 7px', letterSpacing: '0.06em' }}>
                    {key.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Centroid trail */}
          {m.centroid_trail?.length > 1 && (
            <div>
              <div style={{ fontSize: 12, color: '#4f6ef7', letterSpacing: '0.14em', marginBottom: 8 }}>
                {t('GÖÇ ROTALARI', 'MIGRATION PATH', 'MIGRATIONSPFAD', 'CHEMIN MIGRATION', 'مسار الهجرة')} ({m.centroid_trail.length} {t('nokta', 'points', 'Punkte', 'points', 'نقاط')})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {(() => {
                  const first = m.centroid_trail[0];
                  const last = m.centroid_trail[m.centroid_trail.length - 1];
                  return [
                    { label: t('Başlangıç X', 'Start X', 'Start X', 'Départ X', 'بداية X'), value: first.x.toFixed(2) },
                    { label: t('Başlangıç Y', 'Start Y', 'Start Y', 'Départ Y', 'بداية Y'), value: first.y.toFixed(2) },
                    { label: t('Mevcut X', 'Current X', 'Aktuell X', 'Actuel X', 'حالي X'), value: last.x.toFixed(2) },
                    { label: t('Mevcut Y', 'Current Y', 'Aktuell Y', 'Actuel Y', 'حالي Y'), value: last.y.toFixed(2) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ fontSize: 12 }}>
                      <div style={{ color: '#6090a0', marginBottom: 2 }}>{label}</div>
                      <div style={{ color: '#7dd3fc', fontFamily: 'Orbitron, monospace', fontSize: 13 }}>{value}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 13, color: '#6090a0', fontStyle: 'italic' }}>
          {t('Metrikler yükleniyor...', 'Loading metrics...', 'Metriken laden...', 'Chargement...', 'جارٍ التحميل...')}
        </div>
      )}
    </DetailPanel>
  );
}
