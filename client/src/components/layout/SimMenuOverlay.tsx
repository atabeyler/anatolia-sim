import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSimStore } from '../../store/simStore';

type Page = 'language' | 'guide' | 'about' | 'mission' | 'contact' | null;

const LANGUAGES = [
  { code: 'en' as const, label: 'English'  },
  { code: 'tr' as const, label: 'Türkçe'   },
  { code: 'de' as const, label: 'Deutsch'  },
  { code: 'fr' as const, label: 'Français' },
  { code: 'ar' as const, label: 'العربية'  },
];

const PAGES_TEXT: Record<string, { tr: string; en: string }> = {
  about: {
    tr: 'ANATOLİA-SİM, Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. bünyesinde Yalçın Atabey tarafından geliştirilen, simülasyon hipotezini deneysel olarak test etmeye yönelik ileri düzey bir medeniyet simülasyon platformudur.\n\nGerçek biyolojik, genetik, çevresel ve sosyal mekanizmaları temel alarak iki bireyden başlayan bir nüfusun binlerce yıl boyunca nasıl evrildiğini, dil, inanç, teknoloji ve devlet yapılarını nasıl geliştirdiğini müdahalesiz biçimde gözlemlemeyi sağlar.\n\nProje Kodu: RST Q-Nation 200120401018',
    en: 'ANATOLİA-SİM is an advanced civilization simulation platform developed by Yalçın Atabey under Bold Askeri Teknoloji ve Savunma Sanayi A.Ş., designed to experimentally test the simulation hypothesis.\n\nIt models real biological, genetic, environmental and social mechanisms — observing a population that starts from two individuals, evolving over thousands of years into language, belief, technology and governance.\n\nProject Code: RST Q-Nation 200120401018',
  },
  mission: {
    tr: 'MİSYON\nSimülasyon hipotezini bilimsel ve deneysel zeminlerde test etmek; insan medeniyetinin evrensel örüntülerini ortaya çıkarmak.\n\nVİZYON\nDünyanın en kapsamlı yapay yaşam ve medeniyet simülasyon platformu olmak; insanlığın kökeni, bilinci ve geleceği hakkında nesnel veriler üretmek.',
    en: "MISSION\nTest the simulation hypothesis on scientific and experimental grounds; reveal the universal patterns of human civilization.\n\nVISION\nBecome the world's most comprehensive artificial life and civilization simulation platform; produce objective data about the origin, consciousness and future of humanity.",
  },
  contact: {
    tr: 'Proje Sahibi: Yalçın Atabey\nKuruluş: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nE-posta: info@boldkimya.com.tr\nTelefon: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 Tüm hakları saklıdır.',
    en: 'Project Owner: Yalçın Atabey\nOrganization: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nE-mail: info@boldkimya.com.tr\nPhone: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 All rights reserved.',
  },
};

function H({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 14, color: '#00e887', letterSpacing: '0.18em', margin: '14px 0 5px', paddingBottom: 3, borderBottom: '1px solid #0d2a18' }}>{children}</div>;
}
function Sub({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 14, color: '#00c870', letterSpacing: '0.08em', margin: '7px 0 3px' }}>{children}</div>;
}
function Row({ label, val }: { label: React.ReactNode; val: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 6, margin: '2px 0' }}>
      <span style={{ fontSize: 14, color: '#4a8a60', minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, color: '#7aaa90', lineHeight: 1.5 }}>{val}</span>
    </div>
  );
}
function Note({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 14, color: '#6a9a78', margin: '3px 0', lineHeight: 1.5, paddingLeft: 8, borderLeft: '2px solid #0d2a18' }}>{children}</div>;
}
function Bullet({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 14, color: '#7aaa90', margin: '2px 0 2px 8px', lineHeight: 1.5 }}>› {children}</div>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Controlled page — set from outside to navigate to a specific sub-page */
  menuPage?: Page;
  onMenuPageChange?: (p: Page) => void;
  /** Extra items shown at the bottom of the main menu list (e.g. mobile EXIT/TERMINATE for SimulationPage) */
  mobileActions?: React.ReactNode;
}

export default function SimMenuOverlay({ isOpen, onClose, mobileActions, menuPage, onMenuPageChange }: Props) {
  const { lang, setLang } = useSimStore();
  const [internalPage, setInternalPage] = useState<Page>(null);

  const page = menuPage !== undefined ? menuPage : internalPage;
  function setPage(p: Page) {
    if (onMenuPageChange) onMenuPageChange(p);
    else setInternalPage(p);
  }

  // Reset internal page when menu closes
  useEffect(() => { if (!isOpen) setInternalPage(null); }, [isOpen]);

  if (!isOpen) return null;

  function close() { setPage(null); onClose(); }

  const pageTitle: Record<NonNullable<Page>, string> = {
    language: lang === 'tr' ? 'DİL SEÇENEKLERİ' : 'LANGUAGE',
    guide:    lang === 'tr' ? 'KULLANIM KILAVUZU' : 'USER GUIDE',
    about:    lang === 'tr' ? 'HAKKIMIZDA'        : 'ABOUT',
    mission:  lang === 'tr' ? 'MİSYON & VİZYON'  : 'MISSION & VISION',
    contact:  lang === 'tr' ? 'İLETİŞİM'          : 'CONTACT',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={close}>
      <div
        style={{ background: 'rgba(0,4,2,0.98)', border: '1px solid #cc2222', minWidth: 340, maxWidth: 480, width: '92vw', fontFamily: 'Share Tech Mono, monospace', boxShadow: '0 8px 40px rgba(0,0,0,0.8)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid #cc2222', background: 'rgba(0,20,10,0.9)' }}>
          <div style={{ width: 3, height: 14, background: '#00e887', boxShadow: '0 0 6px #00e887', flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: '#00e887', letterSpacing: '0.2em', flex: 1 }}>
            {page === null ? 'ANATOLİA-SİM' : pageTitle[page]}
          </span>
          <button
            onClick={() => { if (page) setPage(null); else close(); }}
            style={{ background: 'transparent', border: 'none', color: '#6a9a78', cursor: 'pointer', fontSize: 14, letterSpacing: '0.1em', padding: '2px 6px', display: 'flex', alignItems: 'center' }}>
            {page ? '← GERİ' : <X size={12} />}
          </button>
        </div>

        {/* ── Main menu list ── */}
        {page === null && (
          <div style={{ padding: '6px 0' }}>
            {([
              { id: 'language', labelTr: '🌐 Dil / Language',      labelEn: '🌐 Language' },
              { id: 'guide',    labelTr: '📖 Kullanım Kılavuzu',   labelEn: '📖 User Guide' },
              { id: 'about',    labelTr: 'Hakkımızda',             labelEn: 'About' },
              { id: 'mission',  labelTr: 'Misyon & Vizyon',        labelEn: 'Mission & Vision' },
              { id: 'contact',  labelTr: 'İletişim',               labelEn: 'Contact' },
            ] as { id: NonNullable<Page>; labelTr: string; labelEn: string }[]).map(item => (
              <button key={item.id} onClick={() => setPage(item.id)}
                style={{ display: 'block', width: '100%', padding: '9px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #0a1a10', color: '#a0c8b0', fontSize: 14, textAlign: 'left', cursor: 'pointer', letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace' }}>
                › {lang === 'tr' ? item.labelTr : item.labelEn}
              </button>
            ))}
            {mobileActions}
            <div style={{ padding: '8px 14px', borderTop: '1px solid #0a1a10', marginTop: 4 }}>
              <div style={{ fontSize: 14, color: '#1e3a28', letterSpacing: '0.08em' }}>
                RST Q-Nation 200120401018 · Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. © 2026
              </div>
            </div>
          </div>
        )}

        {/* ── Language selection ── */}
        {page === 'language' && (
          <div style={{ padding: '6px 0' }}>
            {LANGUAGES.map(l => (
              <button key={l.code}
                onClick={() => { setLang(l.code); close(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '10px 14px',
                  background: lang === l.code ? 'rgba(0,232,135,0.08)' : 'transparent',
                  border: 'none', borderBottom: '1px solid #0a1a10',
                  color: lang === l.code ? '#00e887' : '#a0c8b0',
                  fontSize: 14, textAlign: 'left', cursor: 'pointer',
                  letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace',
                }}>
                <span style={{ flex: 1 }}>› {l.label}</span>
                {lang === l.code && <span style={{ fontSize: 14, color: '#00e887' }}>✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* ── About / Mission / Contact ── */}
        {page !== null && page !== 'language' && page !== 'guide' && (() => {
          const text = lang === 'tr' ? PAGES_TEXT[page].tr : PAGES_TEXT[page].en;
          return (
            <div style={{ padding: '12px 14px', maxHeight: 320, overflowY: 'auto' }}>
              {text.split('\n').map((line, i) => (
                <p key={i} style={{ fontSize: 14, color: line === line.toUpperCase() && line.length > 2 ? '#00e887' : '#7aaa90', margin: '0 0 5px 0', letterSpacing: '0.05em', lineHeight: 1.6 }}>
                  {line || <br />}
                </p>
              ))}
            </div>
          );
        })()}

        {/* ── User Guide ── */}
        {page === 'guide' && (
          <div style={{ padding: '10px 14px 14px', maxHeight: 480, overflowY: 'auto', fontSize: 14 }}>
            <H>{lang === 'tr' ? '1 — SİMÜLASYON OLUŞTURMA' : '1 — CREATING A SIMULATION'}</H>
            <Row label={lang === 'tr' ? 'Simülasyon Adı' : 'Name'} val={lang === 'tr' ? 'Medeniyetinize anlamlı bir ad verin. Raporlarda ve kontrol panelinde görünür.' : 'Give your civilization a meaningful name. Appears in reports and the control panel.'} />
            <Row label={lang === 'tr' ? 'Konum Seçimi' : 'Location'} val={lang === 'tr' ? 'Haritadan bir başlangıç noktası seçin. Enlem/boylam, biyom ve iklim koşullarını belirler. Önerilen: Anadolu (36–42°K, 26–45°D), Mezopotamya, Nil Deltası.' : 'Pick a starting point on the map. Latitude/longitude determines biome and climate. Recommended: Anatolia (36–42°N, 26–45°E), Mesopotamia, Nile Delta.'} />
            <Row label={lang === 'tr' ? 'Kurucu Bireyler' : 'Founders'} val={lang === 'tr' ? 'İki kurucunun adını, yaşını ve görünüşünü özelleştirin. Kurucular 60 yaşına kadar hastalık ve kazadan bağışıktır; tüm medeniyetin atasıdır.' : 'Customize name, age and appearance of both founders. Founders are immune to disease and accidents until age 60 — they are the ancestor of your entire civilization.'} />

            <H>{lang === 'tr' ? '2 — ANA EKRAN VE HARİTA' : '2 — MAIN SCREEN & MAP'}</H>
            <Sub>{lang === 'tr' ? '3B Dünya Haritası' : '3D World Map'}</Sub>
            <Row label={lang === 'tr' ? 'Sol tık + sürükle' : 'Left drag'} val={lang === 'tr' ? 'Dünyayı döndür' : 'Rotate the globe'} />
            <Row label={lang === 'tr' ? 'Fare tekerleği' : 'Scroll wheel'} val={lang === 'tr' ? 'Yakınlaştır / uzaklaştır' : 'Zoom in / out'} />
            <Row label={lang === 'tr' ? 'Bir noktaya tıkla' : 'Click a dot'} val={lang === 'tr' ? "O bireyin detay kartını açar (yaş, sağlık, beceri, ilişkiler)" : "Opens that individual's detail card (age, health, skills, relationships)"} />
            <Note>{lang === 'tr' ? 'Haritadaki her ışık noktası bir bireydir. Sarı = kurucu, yeşil = yetişkin, mavi = çocuk.' : 'Every dot on the map is an individual. Yellow = founder, green = adult, blue = child.'}</Note>
            <Sub>{lang === 'tr' ? 'Üst Bar İstatistikleri' : 'Top Bar Stats'}</Sub>
            <Bullet>{lang === 'tr' ? 'Nüfus: O an hayatta olan birey sayısı' : 'Population: living individuals right now'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Yıl: Simülasyon yılı (1 yıl = 365 simülasyon günü)' : 'Year: simulation year (1 year = 365 sim days)'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Gruplar: Aktif sosyal grup sayısı' : 'Groups: active social groups'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Teknoloji: Keşfedilen teknoloji sayısı' : 'Technologies: number of discovered technologies'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Biyom, sıcaklık, besin ve su bolluğu anlık güncellenir' : 'Biome, temperature, food & water abundance update in real time'}</Bullet>

            <H>{lang === 'tr' ? '3 — KONTROL BUTONLARI' : '3 — CONTROL BUTTONS'}</H>
            <Row label='BAŞLAT / START' val={lang === 'tr' ? 'Simülasyonu çalıştırır. Sunucuda çalışır; tarayıcıyı kapatsanız bile simülasyon devam eder.' : 'Starts the simulation on the server. Even if you close the browser, it keeps running.'} />
            <Row label='DURDUR / PAUSE' val={lang === 'tr' ? 'Simülasyonu duraklatır ve mevcut durumu veritabanına kaydeder. Dilediğinizde devam edebilirsiniz.' : 'Pauses the simulation and saves current state to the database. Resume any time.'} />
            <Row label={lang === 'tr' ? 'HIZ ×1 → ×100' : 'SPEED ×1 → ×100'} val={lang === 'tr' ? '×1: Gerçek zamanlı (yavaş gözlem). ×5: Hızlı takip. ×20: Çok hızlı. ×100: Uzun dönem araştırma.' : '×1: real-time (slow). ×5: fast. ×20: very fast. ×100: long-term research.'} />
            <Row label='SONLANDIR / TERMINATE' val={lang === 'tr' ? 'Simülasyonu kalıcı olarak sonlandırır. Bu işlem geri alınamaz.' : 'Permanently terminates the simulation. This action cannot be undone.'} />
            <Row label='ÇIKIŞ / EXIT' val={lang === 'tr' ? 'Ana panele döner. Simülasyon arka planda çalışmaya devam eder.' : 'Returns to the main panel. Simulation keeps running in the background.'} />

            <H>{lang === 'tr' ? '4 — SOL PANEL MODÜLLERİ' : '4 — LEFT PANEL MODULES'}</H>
            <Note>{lang === 'tr' ? 'Her modül butonu sol panelde bulunur. Tıklanınca sağdan kayarak açılan detay penceresi gelir.' : 'Each module button is on the left panel. Clicking opens a slide-in detail window.'}</Note>
            <Sub>👥 {lang === 'tr' ? 'NÜFUS' : 'POPULATION'}</Sub>
            <Bullet>{lang === 'tr' ? 'Yaşayan bireylerin tam listesi, yaş ve cinsiyet dağılımı' : 'Full list of living individuals, age & sex distribution'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Ortalama yaş, doğurganlık oranı, nesil sayısı' : 'Average age, fertility rate, generation count'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Bir bireye tıklayarak genetik profil, sağlık durumu ve sosyal ilişkilerini görün' : "Click an individual to see genome, health state & social relationships"}</Bullet>
            <Sub>📋 {lang === 'tr' ? 'OLAYLAR' : 'EVENTS'}</Sub>
            <Bullet>{lang === 'tr' ? 'Tüm simülasyon olayları kronolojik sırayla: doğum, ölüm, keşif, çatışma, salgın, inanç oluşumu' : 'All simulation events in chronological order: birth, death, discovery, conflict, epidemic, belief formation'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Her olayın yılı, günü ve açıklaması görünür' : 'Each event shows its year, day and description'}</Bullet>
            <Sub>🔤 {lang === 'tr' ? 'DİL' : 'LANGUAGE'}</Sub>
            <Bullet>{lang === 'tr' ? 'Sıfır kelimeden yazıya uzanan 7 aşamalı dil evrimi izlenir' : '7-stage language evolution tracked from zero words to writing'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Dil gelişimi nüfus büyüklüğü ve grup etkileşimine bağlıdır' : 'Language development depends on population size and group interaction'}</Bullet>
            <Sub>⏳ {lang === 'tr' ? 'GEÇMİŞ (Zaman Makinesi)' : 'HISTORY (Time Machine)'}</Sub>
            <Bullet>{lang === 'tr' ? 'Her 365 simülasyon günde bir otomatik kontrol noktası kaydedilir' : 'A checkpoint is saved automatically every 365 simulation days'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Nüfus hareketi, grup yapısı ve teknoloji düzeyi geçmişe dönük karşılaştırılabilir' : 'Population movement, group structure and tech level can be compared retrospectively'}</Bullet>
            <Sub>📊 {lang === 'tr' ? 'ANALİZ' : 'ANALYSIS'}</Sub>
            <Bullet>{lang === 'tr' ? 'Nüfus eğrileri, genetik çeşitlilik ve akraba yetiştirme katsayıları' : 'Population curves, genetic diversity and inbreeding coefficients'}</Bullet>
            <Sub>🧬 {lang === 'tr' ? 'MUTASYON (Biyoloji)' : 'MUTATION (Biology)'}</Sub>
            <Bullet>{lang === 'tr' ? 'Bağışıklık gücü, zeka, fiziksel özellikler ve doğurganlığın nesiller arası evrimi' : 'Evolution of immunity, intelligence, physical traits and fertility across generations'}</Bullet>
            <Sub>✦ {lang === 'tr' ? 'TANRI MODU' : 'GOD MODE'}</Sub>
            <Bullet>{lang === 'tr' ? 'Salgın, kuraklık, deprem, volkan, sel gibi doğal afetler başlatır' : 'Triggers natural disasters: epidemic, drought, earthquake, volcano, flood'}</Bullet>
            <Note>{lang === 'tr' ? 'Tanrı müdahaleleri geri alınamaz. Dikkatli kullanın.' : 'God interventions cannot be undone. Use carefully.'}</Note>
            <Sub>🧠 {lang === 'tr' ? 'AKIL (Psikoloji)' : 'MIND (Psychology)'}</Sub>
            <Bullet>{lang === 'tr' ? 'Bireysel ve toplumsal ruh hali, stres ve ölüm farkındalığı' : 'Individual and collective mood, stress and death awareness'}</Bullet>
            <Sub>🌿 {lang === 'tr' ? 'ÇEVRE' : 'ENVIRONMENT'}</Sub>
            <Bullet>{lang === 'tr' ? 'Mevsim döngüleri, sıcaklık, besin ve su bolluğu' : 'Season cycles, temperature, food & water abundance'}</Bullet>
            <Sub>⚙ {lang === 'tr' ? 'TEKNOLOJİ' : 'TECHNOLOGY'}</Sub>
            <Bullet>{lang === 'tr' ? 'Besin toplayıcılık → Taş aletler → Tarım → Metal işleme zinciri' : 'Foraging → Stone tools → Agriculture → Metallurgy chain'}</Bullet>
            <Sub>☽ {lang === 'tr' ? 'İNANÇ' : 'BELIEF'}</Sub>
            <Bullet>{lang === 'tr' ? 'Ölüm farkındalığı kazanan bireylerde inanç sistemleri kendiliğinden oluşur' : 'Belief systems emerge spontaneously in individuals who develop death awareness'}</Bullet>
            <Sub>🤝 {lang === 'tr' ? 'SOSYAL' : 'SOCIAL'}</Sub>
            <Bullet>{lang === 'tr' ? 'Gruplar, liderler, ittifaklar ve rakip grup dinamikleri' : 'Groups, leaders, alliances and rival-group dynamics'}</Bullet>
            <Sub>💰 {lang === 'tr' ? 'EKONOMİ' : 'ECONOMY'}</Sub>
            <Bullet>{lang === 'tr' ? 'Gini katsayısı ile zenginlik eşitsizliği ölçülür' : 'Wealth inequality measured with Gini coefficient'}</Bullet>
            <Sub>🎭 {lang === 'tr' ? 'KÜLTÜR · 🎨 SANAT · 🌙 ASTRONOMİ' : 'CULTURE · 🎨 ART · 🌙 ASTRONOMY'}</Sub>
            <Bullet>{lang === 'tr' ? 'Kültürel değerler, sanat formları ve gök gözlem sistemleri kendiliğinden gelişir' : 'Cultural values, art forms and astronomical observations emerge organically'}</Bullet>
            <Sub>⚖️ {lang === 'tr' ? 'HUKUK · 🏛️ MİMARİ · 🦠 MİKROBİYOM · 🔬 EPİGENETİK' : 'LAW · 🏛️ ARCH. · 🦠 MICROBIOME · 🔬 EPIGENETICS'}</Sub>
            <Bullet>{lang === 'tr' ? 'Toplumun normları, yapıları, mikrobiyolojik ekosistemi ve genetik ifade örüntüleri izlenir' : "Community norms, structures, microbial ecosystem and gene expression patterns tracked"}</Bullet>

            <H>{lang === 'tr' ? '5 — OLAY KAYDI' : '5 — EVENT LOG'}</H>
            <Bullet>{lang === 'tr' ? 'Harita üzerinde sol altta 3 satırlık özet akış görünür; sürüklenebilir' : 'A 3-line summary feed appears bottom-left on the map; draggable'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Detaylı liste için sol paneldeki OLAYLAR butonuna tıklayın' : 'For the full detailed list click EVENTS in the left panel'}</Bullet>

            <H>{lang === 'tr' ? '6 — ARIA SES ASISTANI' : '6 — ARIA VOICE ASSISTANT'}</H>
            <Row label={lang === 'tr' ? 'Uyandırma' : 'Wake'} val={lang === 'tr' ? 'ASİSTAN butonuna tıklayın veya "Anatolia" deyin' : 'Click the ASSISTANT button or say "Anatolia"'} />
            <Bullet>{lang === 'tr' ? '"Simülasyonu başlat/durdur" · "Hızı artır/düşür" · "Nüfus panelini aç"' : '"Start/pause simulation" · "Increase/decrease speed" · "Open population panel"'}</Bullet>
            <Bullet>{lang === 'tr' ? '"Nüfus kaçtır?" · "Kaçıncı yıldayız?" · "En son ne oldu?"' : '"What is the population?" · "What year is it?" · "What happened last?"'}</Bullet>
            <Note>{lang === 'tr' ? 'ARIA simülasyonun tam durumunu okuyarak akıllıca yanıt verir.' : 'ARIA reads the full simulation state to give intelligent answers.'}</Note>

            <H>{lang === 'tr' ? '7 — İPUÇLARI VE STRATEJİLER' : '7 — TIPS & STRATEGIES'}</H>
            <Bullet>{lang === 'tr' ? 'Her 365 simülasyon günde bir otomatik kayıt yapılır; veri kaybı olmaz' : 'Auto-save runs every 365 simulation days — no data loss'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Yüksek hız (×100) uzun dönem medeniyetleri gözlemlemek için idealdir' : 'High speed (×100) is ideal for observing long-term civilizations'}</Bullet>
            <Bullet>{lang === 'tr' ? 'İlk iki kurucu 60 yaşına kadar ölmez; mümkün olduğunca çok çocuk sahibi olmalarını sağlayın' : 'First two founders cannot die before age 60; maximize their offspring'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Dil gelişimi için nüfusun 5+ kişilik gruplar halinde bir arada yaşaması gerekir' : 'Language development requires groups of 5+ individuals living together'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Tarayıcıyı kapatmak simülasyonu durdurmaz; sunucu arka planda çalışmayı sürdürür' : 'Closing the browser does not stop the simulation; the server keeps running in the background'}</Bullet>

            <div style={{ marginTop: 16, paddingTop: 8, borderTop: '1px solid #0a1a10', fontSize: 14, color: '#1e3a28', letterSpacing: '0.06em' }}>
              ANATOLİA-SİM · RST Q-Nation 200120401018 · © 2026 Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
