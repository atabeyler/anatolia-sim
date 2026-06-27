import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { text, type LangCode } from '../../utils/i18n';

interface DiagCheck { ok: boolean; name: string; detail: string; }
interface DiagEntry { day: number; ts: number; msg: string; stack: string; }
interface Diagnostics {
  sim_id: string; current_day: number; running: boolean; consecutive_errors: number;
  startup: { ts: number; day: number; checks: DiagCheck[] } | null;
  error_log: DiagEntry[];
}
interface DbStatus {
  sim_db: {
    size_bytes: number | null;
    individuals: { total: number; alive: number };
    checkpoints: number; events: number; technologies: number;
    beliefs: number; languages: number; groups: number;
    conversations: number; publications: number; current_day: number | null;
  };
  cloud_db: { size_bytes: number | null; cloud_checkpoints: number; live_snapshots: number };
}

export default function PerformancePanel() {
  const { activePanel, currentSim, accessToken, engineMetrics, setEngineMetrics, lang, isWarping, fastForwardTarget } = useSimStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);

  useEffect(() => {
    if (activePanel !== 'performance' || !currentSim || !accessToken) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    const headers = { Authorization: `Bearer ${accessToken}` };
    const fetchAll = () => {
      axios.get(`/api/simulations/${currentSim.id}/metrics`, { headers }).then(r => setEngineMetrics(r.data)).catch(() => {});
      axios.get(`/api/simulations/${currentSim.id}/diagnostics`, { headers }).then(r => setDiag(r.data)).catch(() => {});
      axios.get(`/api/simulations/${currentSim.id}/db-status`, { headers }).then(r => setDbStatus(r.data)).catch(() => {});
    };
    fetchAll();
    pollRef.current = setInterval(fetchAll, 10000);
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

      {/* ── DB Status ── */}
      {dbStatus && (
        <div style={{ marginTop: 14, borderTop: '1px solid rgba(79,110,247,0.2)', paddingTop: 12, marginBottom: 4 }}>
          <div style={{ fontSize: 12, color: '#4f6ef7', letterSpacing: '0.14em', marginBottom: 8 }}>
            {t('VERİTABANI DURUMU', 'DATABASE STATUS', 'DATENBANK STATUS', 'ÉTAT BASE DE DONNÉES', 'حالة قاعدة البيانات')}
          </div>

          {/* Sim DB */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#a0b4ff', letterSpacing: '0.1em', marginBottom: 5 }}>
              {t('SİM DB (yerel)', 'SIM DB (local)', 'SIM DB (lokal)', 'SIM DB (local)', 'قاعدة بيانات المحاكاة')}
              {dbStatus.sim_db.size_bytes !== null && (
                <span style={{ float: 'right', color: '#6090a0' }}>
                  {dbStatus.sim_db.size_bytes > 1048576
                    ? `${(dbStatus.sim_db.size_bytes / 1048576).toFixed(1)} MB`
                    : `${(dbStatus.sim_db.size_bytes / 1024).toFixed(0)} KB`}
                </span>
              )}
            </div>
            {[
              { label: t('Birey (toplam/yaşayan)', 'Individuals (total/alive)', 'Individuen', 'Individus', 'الأفراد'), value: `${dbStatus.sim_db.individuals.total} / ${dbStatus.sim_db.individuals.alive}`, color: '#00e887' },
              { label: t('Checkpoint', 'Checkpoints', 'Checkpoints', 'Sauvegardes', 'نقاط حفظ'), value: dbStatus.sim_db.checkpoints, color: '#7dd3fc' },
              { label: t('Olay', 'Events', 'Ereignisse', 'Événements', 'أحداث'), value: dbStatus.sim_db.events, color: '#7dd3fc' },
              { label: t('Teknoloji', 'Technologies', 'Technologien', 'Technologies', 'تقنيات'), value: dbStatus.sim_db.technologies, color: '#d4a838' },
              { label: t('İnanç', 'Beliefs', 'Glaubenssätze', 'Croyances', 'معتقدات'), value: dbStatus.sim_db.beliefs, color: '#d4a838' },
              { label: t('Dil kaydı', 'Language records', 'Sprachaufzeichnungen', 'Enreg. langue', 'سجلات اللغة'), value: dbStatus.sim_db.languages, color: '#d4a838' },
              { label: t('Grup', 'Groups', 'Gruppen', 'Groupes', 'مجموعات'), value: dbStatus.sim_db.groups, color: '#a0b4ff' },
              { label: t('Konuşma', 'Conversations', 'Gespräche', 'Conversations', 'محادثات'), value: dbStatus.sim_db.conversations, color: '#a0b4ff' },
            ].map(({ label, value, color }) => (
              <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: '#6090a0' }}>{label}</span>
                <span style={{ color, fontFamily: 'Orbitron, monospace', fontWeight: 700, fontSize: 11 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Cloud DB */}
          <div>
            <div style={{ fontSize: 11, color: '#a0b4ff', letterSpacing: '0.1em', marginBottom: 5 }}>
              {t('BULUT DB (Render)', 'CLOUD DB (Render)', 'CLOUD DB (Render)', 'CLOUD DB (Render)', 'قاعدة بيانات السحاب')}
              {dbStatus.cloud_db.size_bytes !== null && (
                <span style={{ float: 'right', color: '#6090a0' }}>
                  {dbStatus.cloud_db.size_bytes > 1048576
                    ? `${(dbStatus.cloud_db.size_bytes / 1048576).toFixed(1)} MB`
                    : `${(dbStatus.cloud_db.size_bytes / 1024).toFixed(0)} KB`}
                </span>
              )}
            </div>
            {[
              { label: t('Bulut checkpoint', 'Cloud checkpoints', 'Cloud-Checkpoints', 'Sauvegardes cloud', 'نقاط حفظ السحاب'), value: dbStatus.cloud_db.cloud_checkpoints, color: '#7dd3fc' },
              { label: t('Canlı anlık görüntü', 'Live snapshots', 'Live-Snapshots', 'Instantanés live', 'لقطات مباشرة'), value: dbStatus.cloud_db.live_snapshots, color: '#7dd3fc' },
            ].map(({ label, value, color }) => (
              <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: '#6090a0' }}>{label}</span>
                <span style={{ color, fontFamily: 'Orbitron, monospace', fontWeight: 700, fontSize: 11 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Diagnostics ── */}
      {diag && (
        <div style={{ marginTop: 14, borderTop: '1px solid rgba(79,110,247,0.2)', paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: '#4f6ef7', letterSpacing: '0.14em', marginBottom: 8 }}>
            {t('BAŞLANGIÇ KONTROLÜ', 'STARTUP CHECKS', 'STARTUP-CHECKS', 'VÉRIF. DÉMARRAGE', 'فحوصات البدء')}
          </div>

          {diag.startup ? (
            <div style={{ marginBottom: 10 }}>
              {diag.startup.checks.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: c.ok ? '#00e887' : '#e05a5a', flexShrink: 0, lineHeight: '1.4' }}>{c.ok ? '✓' : '✗'}</span>
                  <div>
                    <span style={{ color: c.ok ? '#8abda0' : '#e05a5a' }}>{c.name}</span>
                    {c.detail && <span style={{ color: '#6090a0', marginLeft: 5 }}>{c.detail}</span>}
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: '#4a6060', marginTop: 4 }}>
                {t('Gün', 'Day', 'Tag', 'Jour', 'يوم')} {diag.startup.day} — {new Date(diag.startup.ts).toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#6090a0', fontStyle: 'italic', marginBottom: 10 }}>
              {t('Simülasyon henüz başlamadı', 'Simulation not started yet', 'Noch nicht gestartet', 'Pas encore démarré', 'لم يبدأ بعد')}
            </div>
          )}

          <div style={{ fontSize: 12, color: '#4f6ef7', letterSpacing: '0.14em', marginBottom: 8 }}>
            {t('HATA KAYDI', 'ERROR LOG', 'FEHLERPROTOKOLL', 'JOURNAL D\'ERREURS', 'سجل الأخطاء')}
            {diag.consecutive_errors > 0 && (
              <span style={{ marginLeft: 8, color: '#e05a5a', background: 'rgba(224,90,90,0.15)', padding: '1px 6px', borderRadius: 3 }}>
                {diag.consecutive_errors}/5
              </span>
            )}
          </div>

          {diag.error_log.length === 0 ? (
            <div style={{ fontSize: 12, color: '#4ecb71' }}>
              {t('✓ Hata yok', '✓ No errors', '✓ Keine Fehler', '✓ Aucune erreur', '✓ لا أخطاء')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...diag.error_log].reverse().map((e, i) => (
                <div key={i} style={{ background: 'rgba(224,90,90,0.08)', border: '1px solid rgba(224,90,90,0.25)', padding: '5px 8px' }}>
                  <div style={{ fontSize: 12, color: '#e05a5a', marginBottom: 2 }}>
                    {t('Gün', 'Day', 'Tag', 'Jour', 'يوم')} {e.day} — {new Date(e.ts).toLocaleTimeString()}
                  </div>
                  <div style={{ fontSize: 11, color: '#e0b0b0', wordBreak: 'break-word' }}>{e.msg}</div>
                  {e.stack && (
                    <div style={{ fontSize: 10, color: '#8a5050', marginTop: 3, wordBreak: 'break-word', opacity: 0.8 }}>{e.stack}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DetailPanel>
  );
}
