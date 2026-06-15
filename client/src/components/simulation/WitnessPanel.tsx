import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, GripHorizontal } from 'lucide-react';
import axios from 'axios';
import { useSimStore } from '../../store/simStore';
import { text, type LangCode } from '../../utils/i18n';

function useDrag(initial: { x: number; y: number }) {
  const [pos, setPos] = useState(initial);
  const dragging = useRef(false);
  const origin = useRef({ clientX: 0, clientY: 0, posX: 0, posY: 0 });
  const moved = useRef(false);
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      const dx = e.clientX - origin.current.clientX;
      const dy = e.clientY - origin.current.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
      setPos({ x: Math.max(0, origin.current.posX + dx), y: Math.max(0, origin.current.posY + dy) });
    }
    function onUp() { dragging.current = false; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);
  function startDrag(clientX: number, clientY: number) {
    dragging.current = true; moved.current = false;
    origin.current = { clientX, clientY, posX: pos.x, posY: pos.y };
  }
  return { pos, startDrag, wasMoved: () => moved.current };
}

function generateNarration(ind: any, lang: string): string[] {
  const lines: string[] = [];
  const tr = (a: string, b: string) => lang === 'tr' ? a : b;
  const health = ind.health ?? {};
  const mind = ind.mind ?? {};
  const language = ind.language ?? {};
  const fears = ind._fears ?? {};
  const cal = health.calories ?? 0.7;
  const hyd = health.hydration ?? 0.7;
  const hp = health.hp ?? 0.8;
  const stress = ind.psychology?.stress_level ?? 0.3;
  const consciousness = mind.consciousness ?? 0;
  const matingUrge = ind.mating_urge ?? 0;
  const satiation = ind.satiation ?? 0.5;

  // Activity
  if (ind._inWater) {
    lines.push(tr('Suda ilerliyor — tehlike yüksek.', 'Moving through water — high danger.'));
  } else if (cal < 0.15) {
    lines.push(tr('Açlığın eşiğinde, yiyecek peşinde.', 'On the verge of starvation, searching for food.'));
  } else if (hyd < 0.15) {
    lines.push(tr('Susuzluktan zayıf, su arıyor.', 'Weakened by thirst, searching for water.'));
  } else if (hp < 0.25) {
    lines.push(tr('Ağır hasta, zar zor ayakta.', 'Seriously ill, barely standing.'));
  } else if (health.pregnancy) {
    lines.push(tr('Doğuma yakın, yorgun ama güçlü.', 'Near birth, tired but strong.'));
  } else if (matingUrge > 0.8 && cal > 0.4) {
    lines.push(tr('Eş arayışında, etrafı tarıyor.', 'Searching for a mate, scanning the surroundings.'));
  } else if (satiation > 0.75 && hp > 0.7) {
    lines.push(tr('Tok ve sağlıklı, grubuyla yürüyor.', 'Well-fed and healthy, walking with the group.'));
  } else {
    lines.push(tr('Günlük hayatta kalma rutininde.', 'Going through the daily survival routine.'));
  }

  // Fears
  if ((fears.predator ?? 0) > 0.4) {
    lines.push(tr('Yırtıcı kokusu var — sinirli ve tetikte.', 'Senses predators — nervous and alert.'));
  } else if ((fears.scarcity ?? 0) > 0.4) {
    lines.push(tr('Kıtlık korkusuyla yiyecek biriktiriyor.', 'Hoarding food, haunted by scarcity.'));
  } else if ((fears.disaster ?? 0) > 0.3) {
    lines.push(tr('Son afetin gölgesi hâlâ üzerinde.', 'Still shadowed by the recent disaster.'));
  }

  // Language & social
  const stage = language.stage ?? 0;
  const wordCount = Object.keys(language.vocabulary ?? {}).length;
  if (stage >= 3 && wordCount > 0) {
    lines.push(tr(`"${Object.keys(language.vocabulary)[0]}" dahil ${wordCount} kelimeyle iletişim kuruyor.`,
      `Communicates with ${wordCount} words including "${Object.keys(language.vocabulary)[0]}".`));
  } else if (stage === 2) {
    lines.push(tr('Duygusal seslerle çevresine mesaj veriyor.', 'Sending messages to others with emotional sounds.'));
  } else if (stage === 1) {
    lines.push(tr('El işaretleri ve seslerle anlaşıyor.', 'Communicating with gestures and simple sounds.'));
  }

  // Consciousness
  if (consciousness > 0.6) {
    lines.push(tr(`Derin bir iç dünya — bilinç %${Math.round(consciousness * 100)}.`, `Deep inner world — consciousness ${Math.round(consciousness * 100)}%.`));
  } else if (consciousness > 0.3) {
    lines.push(tr('Çevresini giderek daha fazla sorguluyor.', 'Increasingly questioning its surroundings.'));
  }

  // Stress
  if (stress > 0.7) {
    lines.push(tr('Yüksek stres altında — vücut alarma geçmiş.', 'Under heavy stress — body on high alert.'));
  }

  return lines.slice(0, 4);
}

const STAGE_NAMES: Record<number, { tr: string; en: string; de: string; fr: string; ar: string }> = {
  0: { tr: 'Dil Öncesi',    en: 'Pre-linguistic',   de: 'Vorsprachlich',    fr: 'Prélinguistique',  ar: 'ما قبل اللغة'  },
  1: { tr: 'Jest',          en: 'Gestural',          de: 'Gestural',         fr: 'Gestuel',          ar: 'إيمائي'         },
  2: { tr: 'Duygusal Ses',  en: 'Emotional Sound',   de: 'Emotionaler Laut', fr: 'Son émotionnel',   ar: 'صوت عاطفي'     },
  3: { tr: 'Proto Kelime',  en: 'Proto-word',        de: 'Protowort',        fr: 'Proto-mot',        ar: 'كلمة أولى'     },
  4: { tr: 'Sözdizimi',     en: 'Syntax',            de: 'Syntax',           fr: 'Syntaxe',          ar: 'نحو'            },
  5: { tr: 'Soyut',         en: 'Abstract',          de: 'Abstrakt',         fr: 'Abstrait',         ar: 'مجرد'           },
  6: { tr: 'Yazı',          en: 'Writing',           de: 'Schrift',          fr: 'Écriture',         ar: 'كتابة'          },
};

export default function WitnessPanel() {
  const { watchedIndividualId, setWatchedIndividual, currentSim, accessToken, lang, stats } = useSimStore();
  const [ind, setInd] = useState<any>(null);
  const drag = useDrag({ x: 16, y: 120 });
  const tr = (a: string, b: string) => lang === 'tr' ? a : b;

  useEffect(() => {
    if (!watchedIndividualId || !currentSim || !accessToken) { setInd(null); return; }
    let cancelled = false;
    async function fetch_() {
      try {
        const res = await axios.get(
          `/api/simulations/${currentSim!.id}/population/${watchedIndividualId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!cancelled) setInd(res.data);
      } catch {
        // fallback: try the population list
        try {
          const res = await axios.get(
            `/api/simulations/${currentSim!.id}/population?alive=true&limit=200`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const found = (res.data as any[]).find((i: any) => i.id === watchedIndividualId);
          if (!cancelled && found) setInd(found);
        } catch {}
      }
    }
    fetch_();
    const id = setInterval(fetch_, 8000);
    return () => { cancelled = true; clearInterval(id); };
  }, [watchedIndividualId, currentSim?.id, stats?.day]);

  if (!watchedIndividualId) return null;

  const name = ind ? (ind.phenotype?.name ?? ind.name ?? `ID:${watchedIndividualId.slice(-6)}`) : '…';
  const age = ind ? Math.floor(ind.age_years ?? (ind.age ?? 0) / 365) : null;
  const isDead = ind && (ind.is_dead || ind.alive === false);
  const stage = ind?.language?.stage ?? 0;
  const narration = ind && !isDead ? generateNarration(ind, lang) : [];

  return (
    <div
      style={{
        position: 'fixed', left: drag.pos.x, top: drag.pos.y, zIndex: 42, width: 240,
        background: 'rgba(2,6,4,0.96)', border: '1px solid rgba(0,212,255,0.35)',
        backdropFilter: 'blur(14px)', boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 16px rgba(0,212,255,0.08)',
        fontFamily: 'Share Tech Mono, monospace',
      }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={e => drag.startDrag(e.clientX, e.clientY)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderBottom: '1px solid rgba(0,212,255,0.15)', cursor: 'grab', userSelect: 'none' }}
      >
        <GripHorizontal size={10} style={{ color: '#6a9a80', flexShrink: 0 }} />
        <Eye size={10} style={{ color: '#00d4ff', flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: '#00d4ff', letterSpacing: '0.2em', flex: 1 }}>
          {text(lang as LangCode, { tr: 'TANİK MODU', en: 'WITNESS MODE', de: 'ZEUGENMODUS', fr: 'MODE TÉMOIN', ar: 'وضع الشاهد' })}
        </span>
        <button
          onClick={() => setWatchedIndividual(null)}
          style={{ background: 'transparent', border: 'none', color: '#a0c8b0', cursor: 'pointer', lineHeight: 0, padding: 2 }}
          title={text(lang as LangCode, { tr: 'Takibi bırak', en: 'Stop watching', de: 'Beobachtung beenden', fr: 'Arrêter de regarder', ar: 'إيقاف المتابعة' })}
        >
          <EyeOff size={10} />
        </button>
      </div>

      <div style={{ padding: '8px 10px' }}>
        {/* Identity */}
        <div style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
          <div style={{ fontSize: 13, color: ind?.sex === 'male' ? '#6090ff' : '#ff8ab0', fontFamily: 'Orbitron, monospace', fontWeight: 700 }}>
            {name}
            {isDead && <span style={{ color: '#e05a5a', marginLeft: 6, fontSize: 11 }}>†</span>}
          </div>
          {age !== null && (
            <div style={{ fontSize: 11, color: '#a0b4ff', marginTop: 2 }}>
              {age} {text(lang as LangCode, { tr: 'yaş', en: 'yr', de: 'J.', fr: 'ans', ar: 'سنة' })} · {text(lang as LangCode, STAGE_NAMES[stage] ?? { en: '—' })}
              {ind?.group_id && <span style={{ color: '#4f6ef7', marginLeft: 6 }}>· {text(lang as LangCode, { tr: 'grupta', en: 'in group', de: 'in Gruppe', fr: 'dans groupe', ar: 'في المجموعة' })}</span>}
            </div>
          )}
        </div>

        {/* Narration */}
        {!ind && (
          <div style={{ fontSize: 11, color: '#6a8878', letterSpacing: '0.08em' }}>
            {text(lang as LangCode, { tr: 'Birey yükleniyor…', en: 'Loading individual…', de: 'Individuum lädt…', fr: 'Chargement de l\'individu…', ar: 'جارٍ تحميل الفرد…' })}
          </div>
        )}
        {isDead && (
          <div style={{ fontSize: 11, color: '#a05050' }}>
            † {text(lang as LangCode, { tr: 'Bu birey hayatını kaybetti.', en: 'This individual has died.', de: 'Dieses Individuum ist gestorben.', fr: 'Cet individu est décédé.', ar: 'لقي هذا الفرد حتفه.' })}
          </div>
        )}
        {narration.map((line, i) => (
          <div key={i} style={{ fontSize: 11, color: i === 0 ? '#c8d8e8' : '#8898c8', lineHeight: 1.55, marginBottom: 3 }}>
            {i === 0 ? '▸ ' : '  '}{line}
          </div>
        ))}

        {/* Vitals */}
        {ind && !isDead && (
          <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(0,212,255,0.1)', display: 'flex', gap: 8 }}>
            {[
              { l: 'HP', v: ind.health?.hp ?? 0, c: '#4ecb71' },
              { l: text(lang as LangCode, { tr: 'Kal', en: 'Cal', de: 'Kal.', fr: 'Cal', ar: 'سعر' }), v: ind.health?.calories ?? 0, c: '#d4a838' },
              { l: text(lang as LangCode, { tr: 'Su', en: 'H₂O', de: 'H₂O', fr: 'H₂O', ar: 'ماء' }), v: ind.health?.hydration ?? 0, c: '#7dd3fc' },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#6a8878', marginBottom: 2 }}>{l}</div>
                <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round(v * 100)}%`, background: c }} />
                </div>
                <div style={{ fontSize: 10, color: c, marginTop: 1 }}>{Math.round(v * 100)}%</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
