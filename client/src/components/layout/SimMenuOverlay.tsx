import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSimStore } from '../../store/simStore';
import { text, type LangCode } from '../../utils/i18n';

type Page = 'language' | 'guide' | 'about' | 'mission' | 'contact' | null;

const LANGUAGES = [
  { code: 'en' as const, label: 'English'  },
  { code: 'tr' as const, label: 'Türkçe'   },
  { code: 'de' as const, label: 'Deutsch'  },
  { code: 'fr' as const, label: 'Français' },
  { code: 'ar' as const, label: 'العربية'  },
];

const PAGES_TEXT: Record<string, { tr: string; en: string; de: string; fr: string; ar: string }> = {
  about: {
    tr: 'ANATOLİA-SİM, Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. bünyesinde Yalçın Atabey tarafından geliştirilen, simülasyon hipotezini deneysel olarak test etmeye yönelik ileri düzey bir medeniyet simülasyon platformudur.\n\nGerçek biyolojik, genetik, çevresel ve sosyal mekanizmaları temel alarak iki bireyden başlayan bir nüfusun binlerce yıl boyunca nasıl evrildiğini, dil, inanç, teknoloji ve devlet yapılarını nasıl geliştirdiğini müdahalesiz biçimde gözlemlemeyi sağlar.\n\nProje Kodu: RST Q-Nation 200120401018',
    en: 'ANATOLİA-SİM is an advanced civilization simulation platform developed by Yalçın Atabey under Bold Askeri Teknoloji ve Savunma Sanayi A.Ş., designed to experimentally test the simulation hypothesis.\n\nIt models real biological, genetic, environmental and social mechanisms — observing a population that starts from two individuals, evolving over thousands of years into language, belief, technology and governance.\n\nProject Code: RST Q-Nation 200120401018',
    de: 'ANATOLİA-SİM ist eine fortschrittliche Zivilisationssimulationsplattform, entwickelt von Yalçın Atabey unter Bold Askeri Teknoloji ve Savunma Sanayi A.Ş., um die Simulationshypothese experimentell zu testen.\n\nSie modelliert reale biologische, genetische, umweltbezogene und soziale Mechanismen — und beobachtet eine Bevölkerung, die mit zwei Individuen beginnt und sich über Jahrtausende in Sprache, Glaube, Technologie und Regierung entwickelt.\n\nProjektcode: RST Q-Nation 200120401018',
    fr: "ANATOLİA-SİM est une plateforme de simulation de civilisation avancée développée par Yalçın Atabey au sein de Bold Askeri Teknoloji ve Savunma Sanayi A.Ş., conçue pour tester expérimentalement l'hypothèse de simulation.\n\nElle modélise de vrais mécanismes biologiques, génétiques, environnementaux et sociaux — en observant une population qui part de deux individus et évolue sur des millénaires vers le langage, la croyance, la technologie et la gouvernance.\n\nCode du projet: RST Q-Nation 200120401018",
    ar: 'ANATOLİA-SİM هي منصة محاكاة حضارية متقدمة طوّرها يالتشين أتابي تحت مظلة شركة Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.، مصممة لاختبار فرضية المحاكاة تجريبياً.\n\nتُنمذج آليات بيولوجية وجينية وبيئية واجتماعية حقيقية — مراقبةً مجتمعاً يبدأ من فردين ويتطور على مدى آلاف السنين نحو اللغة والمعتقد والتكنولوجيا والحوكمة.\n\nرمز المشروع: RST Q-Nation 200120401018',
  },
  mission: {
    tr: 'MİSYON\nSimülasyon hipotezini bilimsel ve deneysel zeminlerde test etmek; insan medeniyetinin evrensel örüntülerini ortaya çıkarmak.\n\nVİZYON\nDünyanın en kapsamlı yapay yaşam ve medeniyet simülasyon platformu olmak; insanlığın kökeni, bilinci ve geleceği hakkında nesnel veriler üretmek.',
    en: "MISSION\nTest the simulation hypothesis on scientific and experimental grounds; reveal the universal patterns of human civilization.\n\nVISION\nBecome the world's most comprehensive artificial life and civilization simulation platform; produce objective data about the origin, consciousness and future of humanity.",
    de: "MISSION\nDie Simulationshypothese auf wissenschaftlicher und experimenteller Grundlage testen; die universellen Muster der menschlichen Zivilisation aufdecken.\n\nVISION\nDie umfassendste Plattform für künstliches Leben und Zivilisationssimulation der Welt werden; objektive Daten über Ursprung, Bewusstsein und Zukunft der Menschheit erzeugen.",
    fr: "MISSION\nTester l'hypothèse de simulation sur des bases scientifiques et expérimentales; révéler les schémas universels de la civilisation humaine.\n\nVISION\nDevenir la plateforme de simulation de vie artificielle et de civilisation la plus complète au monde; produire des données objectives sur l'origine, la conscience et l'avenir de l'humanité.",
    ar: 'المهمة\nاختبار فرضية المحاكاة على أسس علمية وتجريبية؛ الكشف عن الأنماط الكونية للحضارة الإنسانية.\n\nالرؤية\nأن نصبح أشمل منصة لمحاكاة الحياة الاصطناعية والحضارة في العالم؛ إنتاج بيانات موضوعية حول أصل الإنسانية ووعيها ومستقبلها.',
  },
  contact: {
    tr: 'Proje Sahibi: Yalçın Atabey\nKuruluş: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nE-posta: info@boldkimya.com.tr\nTelefon: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 Tüm hakları saklıdır.',
    en: 'Project Owner: Yalçın Atabey\nOrganization: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nE-mail: info@boldkimya.com.tr\nPhone: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 All rights reserved.',
    de: 'Projektinhaber: Yalçın Atabey\nOrganisation: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nE-Mail: info@boldkimya.com.tr\nTelefon: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 Alle Rechte vorbehalten.',
    fr: 'Propriétaire du projet: Yalçın Atabey\nOrganisation: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nE-mail: info@boldkimya.com.tr\nTéléphone: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 Tous droits réservés.',
    ar: 'مالك المشروع: يالتشين أتابي\nالمنظمة: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nالبريد الإلكتروني: info@boldkimya.com.tr\nالهاتف: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 جميع الحقوق محفوظة.',
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
    language: text(lang as LangCode, { tr: 'DİL SEÇENEKLERİ', en: 'LANGUAGE',       de: 'SPRACHE',            fr: 'LANGUE',              ar: 'اللغة' }),
    guide:    text(lang as LangCode, { tr: 'KULLANIM KILAVUZU', en: 'USER GUIDE',    de: 'BENUTZERHANDBUCH',   fr: "GUIDE D'UTILISATION", ar: 'دليل المستخدم' }),
    about:    text(lang as LangCode, { tr: 'HAKKIMIZDA',        en: 'ABOUT',         de: 'ÜBER UNS',           fr: 'À PROPOS',            ar: 'حول' }),
    mission:  text(lang as LangCode, { tr: 'MİSYON & VİZYON',  en: 'MISSION & VISION', de: 'MISSION & VISION', fr: 'MISSION & VISION',  ar: 'المهمة والرؤية' }),
    contact:  text(lang as LangCode, { tr: 'İLETİŞİM',          en: 'CONTACT',       de: 'KONTAKT',            fr: 'CONTACT',             ar: 'تواصل' }),
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={close}>
      <div
        style={{ background: 'rgba(0,4,2,0.98)', border: '1px solid #cc2222', width: 'clamp(300px, 90vw, 560px)', fontFamily: 'Share Tech Mono, monospace', boxShadow: '0 8px 40px rgba(0,0,0,0.8)', overflow: 'hidden' }}
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
              { id: 'language', labels: { tr: '🌐 Dil / Language',    en: '🌐 Language',      de: '🌐 Sprache',   fr: '🌐 Langue',   ar: '🌐 اللغة'  } },
              { id: 'guide',    labels: { tr: '📖 Kullanım Kılavuzu', en: '📖 User Guide',    de: '📖 Anleitung', fr: '📖 Guide',    ar: '📖 دليل'   } },
              { id: 'about',    labels: { tr: 'Hakkımızda',           en: 'About',            de: 'Über uns',     fr: 'À propos',    ar: 'حول'       } },
              { id: 'mission',  labels: { tr: 'Misyon & Vizyon',      en: 'Mission & Vision', de: 'Mission',      fr: 'Mission',     ar: 'المهمة'    } },
              { id: 'contact',  labels: { tr: 'İletişim',             en: 'Contact',          de: 'Kontakt',      fr: 'Contact',     ar: 'تواصل'     } },
            ] as { id: NonNullable<Page>; labels: { tr: string; en: string; de: string; fr: string; ar: string } }[]).map(item => (
              <button key={item.id} onClick={() => setPage(item.id)}
                style={{ display: 'block', width: '100%', padding: '9px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #0a1a10', color: '#a0c8b0', fontSize: 14, textAlign: 'left', cursor: 'pointer', letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace' }}>
                › {text(lang as LangCode, item.labels)}
              </button>
            ))}
            {mobileActions}
            <div style={{ padding: '8px clamp(10px, 2vw, 14px)', borderTop: '1px solid #0a1a10', marginTop: 4, display: 'flex', justifyContent: 'center' }}>
              <div style={{ fontSize: 'clamp(11px, 1.35vw, 13px)', color: '#00e887', letterSpacing: '0.06em', lineHeight: 1.55, textShadow: '0 0 8px rgba(0,232,135,0.35)', textAlign: 'center', maxWidth: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                <div>RST Q-Nation 200120401018 © 2026</div>
                <div style={{ whiteSpace: 'normal', lineHeight: 1.5 }}>Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.</div>
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
          const pageContent = text(lang as LangCode, PAGES_TEXT[page]);
          return (
            <div style={{ padding: '12px 14px', maxHeight: 320, overflowY: 'auto' }}>
              {pageContent.split('\n').map((line, i) => (
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
            <Row label={lang === 'tr' ? 'Konum Seçimi' : 'Location'} val={lang === 'tr' ? 'Haritadan bir başlangıç noktası seçin. Enlem/boylam biyom ve iklimi belirler. Önerilen: Anadolu (36–42°K, 26–45°D), Mezopotamya, Nil Deltası.' : 'Pick a starting point on the map. Latitude/longitude sets biome & climate. Recommended: Anatolia (36–42°N, 26–45°E), Mesopotamia, Nile Delta.'} />
            <Row label={lang === 'tr' ? 'Kurucu Bireyler' : 'Founders'} val={lang === 'tr' ? 'İki kurucunun adını, yaşını ve görünüşünü özelleştirin. 60 yaşına kadar hastalık ve kazadan bağışıktırlar; tüm medeniyetin genetik atasıdırlar.' : 'Customize name, age and appearance of both founders. Immune to disease & accidents until 60 — they are the genetic ancestor of your entire civilization.'} />

            <H>{lang === 'tr' ? '2 — ANA EKRAN VE HARİTA' : '2 — MAIN SCREEN & MAP'}</H>
            <Sub>{lang === 'tr' ? '3B Dünya Haritası' : '3D World Map'}</Sub>
            <Row label={lang === 'tr' ? 'Sol tık + sürükle' : 'Left drag'} val={lang === 'tr' ? 'Dünyayı döndür' : 'Rotate the globe'} />
            <Row label={lang === 'tr' ? 'Fare tekerleği' : 'Scroll wheel'} val={lang === 'tr' ? 'Yakınlaştır / uzaklaştır' : 'Zoom in / out'} />
            <Row label={lang === 'tr' ? 'Bir noktaya tıkla' : 'Click a dot'} val={lang === 'tr' ? 'O bireyin detay kartını açar (yaş, sağlık, beceri, ilişkiler)' : "Opens that individual's detail card (age, health, skills, relationships)"} />
            <Note>{lang === 'tr' ? 'Haritadaki her ışık noktası bir bireydir. Sarı = kurucu  |  Mavi = erkek  |  Pembe = kadın' : 'Every dot on the map is an individual. Yellow = founder  |  Blue = male  |  Pink = female'}</Note>
            <Sub>{lang === 'tr' ? 'Üst Bar İstatistikleri' : 'Top Bar Stats'}</Sub>
            <Bullet>{lang === 'tr' ? 'Nüfus · Simülasyon yılı · Aktif grup sayısı · Keşfedilen teknoloji' : 'Population · Simulation year · Active groups · Discovered technologies'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Biyom, sıcaklık, besin ve su bolluğu anlık güncellenir' : 'Biome, temperature, food & water abundance update in real time'}</Bullet>

            <H>{lang === 'tr' ? '3 — SAĞ PANEL — KONTROL' : '3 — RIGHT PANEL — CONTROLS'}</H>
            <Note>{lang === 'tr' ? 'Ekranın sağ kenarındaki dikey panel. Başlığa tıklayarak genişletilir / daraltılır.' : 'Vertical panel on the right edge. Click the header to expand / collapse.'}</Note>
            <Row label='MENÜ' val={lang === 'tr' ? 'Bu kılavuzu, dil seçeneklerini ve proje bilgilerini açar' : 'Opens this guide, language options and project info'} />
            <Row label={lang === 'tr' ? 'Kullanıcı' : 'User badge'} val={lang === 'tr' ? 'Giriş yapan kullanıcı adı ve simülasyon sahibi' : 'Logged-in username and simulation owner'} />
            <Row label='BAŞLAT / DURDUR' val={lang === 'tr' ? 'Simülasyonu çalıştırır veya duraklatır; durumun veritabanına kaydeder' : 'Runs or pauses the simulation; saves state to database on pause'} />
            <Row label='SONLANDIR' val={lang === 'tr' ? 'Simülasyonu kalıcı olarak sonlandırır — geri alınamaz' : 'Permanently terminates the simulation — cannot be undone'} />
            <Row label='ÇIKIŞ' val={lang === 'tr' ? 'Ana panele döner; simülasyon arka planda çalışmaya devam eder' : 'Returns to dashboard; simulation keeps running in the background'} />
            <Sub>{lang === 'tr' ? 'HIZ Kontrolü' : 'Speed Control'}</Sub>
            <Bullet>{lang === 'tr' ? '×1 — Gerçek zamanlı gözlem (en yavaş)' : '×1 — Real-time observation (slowest)'}</Bullet>
            <Bullet>{lang === 'tr' ? '×5 — Hızlı takip' : '×5 — Fast tracking'}</Bullet>
            <Bullet>{lang === 'tr' ? '×20 — Çok hızlı' : '×20 — Very fast'}</Bullet>
            <Bullet>{lang === 'tr' ? '×100 — Uzun dönem araştırma' : '×100 — Long-term research'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Özel: 1–1000 arası istediğiniz değeri girin' : 'Custom: enter any value between 1 and 1000'}</Bullet>

            <H>{lang === 'tr' ? '4 — SOL PANEL — MODÜLLERİ' : '4 — LEFT PANEL — MODULES'}</H>
            <Note>{lang === 'tr' ? 'Sol kenar panelindeki her ikon bir modülü açar. Tıklanınca sağdan kayan detay penceresi gelir.' : 'Each icon in the left edge panel opens a module. Clicking slides in a detail window from the right.'}</Note>

            <Sub>👥 {lang === 'tr' ? 'NÜFUS' : 'POPULATION'}</Sub>
            <Bullet>{lang === 'tr' ? 'Yaşayan bireylerin tam listesi, yaş piramidi, cinsiyet oranı, nesil sayısı' : 'Full list of living individuals, age pyramid, sex ratio, generation count'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Bireye tıklayarak genetik profil, sağlık ve sosyal ilişkileri görün' : 'Click any individual to see genome, health & social relationships'}</Bullet>

            <Sub>🧬 {lang === 'tr' ? 'BİYOLOJİ' : 'BIOLOGY'}</Sub>
            <Bullet>{lang === 'tr' ? '32 genetik lokus ve nesiller arası evrim grafikleri' : '32 genetic loci and cross-generation evolution charts'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Bağışıklık, zeka, doğurganlık ve fiziksel özelliklerin değişimi' : 'Trends in immunity, intelligence, fertility and physical traits'}</Bullet>

            <Sub>🌿 {lang === 'tr' ? 'ÇEVRE' : 'ENVIRONMENT'}</Sub>
            <Bullet>{lang === 'tr' ? '10 biyom, 8 hava tipi, mevsim döngüleri; besin ve su bolluğu anlık' : '10 biomes, 8 weather types, season cycles; food & water levels live'}</Bullet>

            <Sub>🌙 {lang === 'tr' ? 'ASTRONOMİ' : 'ASTRONOMY'}</Sub>
            <Bullet>{lang === 'tr' ? 'Ay döngüsü, gündönümleri, tutulmalar ve yıldız haritası bilgisi' : 'Lunar cycle, solstices, eclipses and star-map knowledge'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Gök gözlemi bilgisi nüfus ve dil gelişimiyle orantılı birikir' : 'Astronomical knowledge accumulates with population and language growth'}</Bullet>

            <Sub>🎭 {lang === 'tr' ? 'KÜLTÜR' : 'CULTURE'}</Sub>
            <Bullet>{lang === 'tr' ? '18 kültürel mem; selamlama ritüellerinden yazılı mite uzanan norm yayılımı' : '18 cultural memes; norm spread from greeting rituals to written myth'}</Bullet>

            <Sub>🔤 {lang === 'tr' ? 'DİL' : 'LANGUAGE'}</Sub>
            <Bullet>{lang === 'tr' ? '7 aşama: ön-dilsel → jestsel → duygusal sesler → proto-kelimeler → sözdizim → soyut → yazı' : '7 stages: pre-linguistic → gestural → emotional sounds → proto-words → syntax → abstract → writing'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Dil gelişimi FOXP2 gen ekspresyonu ve grup büyüklüğüne bağlıdır' : 'Language depends on FOXP2 gene expression and group size'}</Bullet>

            <Sub>⚙ {lang === 'tr' ? 'TEKNOLOJİ' : 'TECHNOLOGY'}</Sub>
            <Bullet>{lang === 'tr' ? '26 teknoloji, 4 kademe: Ateş → Taş aletler → Tarım → Metalürji → Yazı sistemi' : '26 technologies, 4 tiers: Fire → Stone tools → Agriculture → Metallurgy → Writing'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Her keşif birikmeli araştırmayla gerçekleşir; tek birey keşfedemez, grup gerektirir' : 'Each discovery builds cumulatively; no single individual discovers alone'}</Bullet>

            <Sub>☽ {lang === 'tr' ? 'İNANÇ' : 'BELIEF'}</Sub>
            <Bullet>{lang === 'tr' ? '6 sistem: animizm → atakültü → şamanizm → politeizm → monoteizm → felsefe' : '6 systems: animism → ancestor cult → shamanism → polytheism → monotheism → philosophy'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Yalnızca ölüm farkındalığı kazanmış bireylerde kendiliğinden oluşur' : 'Emerges only in individuals who have developed death awareness'}</Bullet>

            <Sub>🤝 {lang === 'tr' ? 'SOSYAL' : 'SOCIAL'}</Sub>
            <Bullet>{lang === 'tr' ? '6 grup rolü (lider, yaşlı, savaşçı, toplayıcı, şifacı, üye)' : '6 group roles (leader, elder, warrior, gatherer, healer, member)'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Grup bölünmesi, liderlik yarışması ve gruplar arası çatışma dinamikleri' : 'Group fission, leadership contests and inter-group conflict dynamics'}</Bullet>

            <Sub>💰 {lang === 'tr' ? 'EKONOMİ' : 'ECONOMY'}</Sub>
            <Bullet>{lang === 'tr' ? '12 kaynak, 11 mal türü; ihtiyaç ve ünete dayalı takas ekonomisi' : '12 resources, 11 goods; need-and-reputation based barter economy'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Gini katsayısı ile zenginlik eşitsizliği ölçülür' : 'Gini coefficient measures wealth inequality'}</Bullet>

            <Sub>🎨 {lang === 'tr' ? 'SANAT' : 'ART'}</Sub>
            <Bullet>{lang === 'tr' ? '12 sanat formu: mağara resmi, heykel, müzik, epik şiir, yazılı hikaye' : '12 art forms: cave painting, sculpture, music, epic poem, written story'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Sanat keşfi bireysel refahı ve toplum bütünlüğünü artırır' : 'Art discovery increases individual wellbeing and social cohesion'}</Bullet>

            <Sub>🏛️ {lang === 'tr' ? 'MİMARİ' : 'ARCHITECTURE'}</Sub>
            <Bullet>{lang === 'tr' ? '12 yapı türü: çukur ev → çamur tuğla → taş tapınak → şehir surları' : '12 structure types: pit house → mud brick → stone temple → city walls'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Yerleşim yerleri ve ticaret merkezlerinin oluşumu izlenir' : 'Formation of settlements and marketplaces tracked'}</Bullet>

            <Sub>⚖️ {lang === 'tr' ? 'HUKUK' : 'LAW'}</Sub>
            <Bullet>{lang === 'tr' ? '13 norm: karşılıklılık → hırsızlık yasağı → mülkiyet hakkı → yazılı hukuk' : '13 norms: reciprocity → no theft → property rights → written law'}</Bullet>
            <Bullet>{lang === 'tr' ? 'İhlallar sürgünle cezalandırılabilir; normlar toplumun dil aşamasına göre gelişir' : 'Violations can be punished by exile; norms evolve with language stage'}</Bullet>

            <Sub>🦠 {lang === 'tr' ? 'MİKROBİYOM' : 'MICROBIOME'}</Sub>
            <Bullet>{lang === 'tr' ? '9 patojen türü; bağışıklık, bulaşma ve salgın dinamikleri' : '9 pathogen types; immunity, transmission and epidemic dynamics'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Genetik bağışıklık gücü hastalık direncini doğrudan etkiler' : 'Genetic immune strength directly affects disease resistance'}</Bullet>

            <Sub>🧠 {lang === 'tr' ? 'PSİKOLOJİ' : 'PSYCHOLOGY'}</Sub>
            <Bullet>{lang === 'tr' ? 'Ruh halleri: sakin, mutlu, heyecanlı, endişeli, yasını tutan, depresif' : 'Mental states: calm, content, excited, anxious, grieving, depressed'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Theory of Mind (0–3): başkalarının bakış açısını anlama kapasitesi' : 'Theory of Mind (0–3): capacity to understand others\' perspectives'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Bağlanma biçimi (güvenli / kaygılı / kaçıngan) oksitosine duyarlılık geninden türer' : 'Attachment style (secure/anxious/avoidant) derived from oxytocin sensitivity gene'}</Bullet>

            <Sub>🔬 {lang === 'tr' ? 'EPİGENETİK' : 'EPIGENETICS'}</Sub>
            <Bullet>{lang === 'tr' ? '8 metilasyon lokusu; stres, beslenme ve çevrenin gen ifadesine etkisi' : '8 methylation loci; effect of stress, nutrition & environment on gene expression'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Epigenetik değişiklikler kısmen çocuklara aktarılır (kalıtsal) ' : 'Epigenetic changes are partially inherited by offspring'}</Bullet>

            <Sub>🌳 {lang === 'tr' ? 'SOY AĞACI' : 'GENEALOGY'}</Sub>
            <Bullet>{lang === 'tr' ? 'Kurucu çiftinden bugüne tüm akrabalık ilişkileri' : 'All kinship relationships from the founding pair to present'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Akraba yetiştirme (inbreeding) katsayıları ve genetik çeşitlilik' : 'Inbreeding coefficients and genetic diversity metrics'}</Bullet>

            <Sub>⚡ {lang === 'tr' ? 'TANRI MODU' : 'GOD MODE'}</Sub>
            <Bullet>{lang === 'tr' ? 'Doğal afet başlat: salgın, kuraklık, deprem, volkan, sel' : 'Trigger natural disaster: epidemic, drought, earthquake, volcano, flood'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Kurucu bireylerinin genetik profilini ayarla (yalnızca kurucular)' : 'Adjust founder genome parameters (founders only)'}</Bullet>
            <Note>{lang === 'tr' ? 'Tanrı müdahaleleri geri alınamaz. Dikkatli kullanın.' : 'God interventions cannot be undone. Use with caution.'}</Note>

            <Sub>⏳ {lang === 'tr' ? 'ZAMAN MAKİNESİ' : 'TIME MACHINE'}</Sub>
            <Bullet>{lang === 'tr' ? 'Her 365 simülasyon günde bir otomatik kontrol noktası kaydedilir' : 'A checkpoint is saved automatically every 365 simulation days'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Geçmiş nüfus, teknoloji ve grup yapısı karşılaştırmalı görüntülenir' : 'Past population, technology and group structure viewed comparatively'}</Bullet>

            <Sub>🤖 {lang === 'tr' ? 'AI ANALİZ' : 'AI ANALYSIS'}</Sub>
            <Bullet>{lang === 'tr' ? 'Aria yapay zekası canlı simülasyon verilerini istatistiksel olarak analiz eder' : 'Aria AI performs statistical analysis on live simulation data'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Nüfus eğrileri, genetik çeşitlilik, bilinç ve dil gelişim raporları' : 'Reports on population curves, genetic diversity, consciousness and language'}</Bullet>

            <Sub>🧪 {lang === 'tr' ? 'HİPOTEZ' : 'HYPOTHESIS'}</Sub>
            <Bullet>{lang === 'tr' ? 'Bir hipotez girin; Aria bunu canlı simülasyon verileriyle değerlendirir' : 'Enter a hypothesis; Aria evaluates it against live simulation data'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Örnek: "Yüksek IQ\'lu kurucular daha hızlı dil geliştirir"' : 'Example: "High-IQ founders develop language faster"'}</Bullet>

            <H>{lang === 'tr' ? '5 — OLAY AKIŞI' : '5 — EVENT FEED'}</H>
            <Bullet>{lang === 'tr' ? 'Haritanın sol altında 3 satırlık özet akış görünür; sürüklenebilir' : '3-line summary feed appears bottom-left on the map; draggable'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Doğum, ölüm, keşif, çatışma, salgın ve inanç olayları anlık yayınlanır' : 'Birth, death, discovery, conflict, epidemic and belief events broadcast live'}</Bullet>

            <H>{lang === 'tr' ? '6 — ARIA ASISTANI' : '6 — ARIA ASSISTANT'}</H>
            <Row label={lang === 'tr' ? 'Erişim' : 'Access'} val={lang === 'tr' ? 'Ekranda beliren ARIA butonuna tıklayın' : 'Click the ARIA button that appears on screen'} />
            <Bullet>{lang === 'tr' ? '"Simülasyonu başlat/durdur" · "Hızı artır" · "Nüfus panelini aç"' : '"Start/pause simulation" · "Increase speed" · "Open population panel"'}</Bullet>
            <Bullet>{lang === 'tr' ? '"Nüfus kaç?" · "Kaçıncı yıldayız?" · "Son keşif ne?"' : '"What is the population?" · "What year?" · "Last discovery?"'}</Bullet>
            <Note>{lang === 'tr' ? 'Aria simülasyonun tam durumunu okuyarak akıllıca yanıt verir.' : 'Aria reads the full simulation state to give intelligent answers.'}</Note>

            <H>{lang === 'tr' ? '7 — İPUÇLARI' : '7 — TIPS'}</H>
            <Bullet>{lang === 'tr' ? 'Otomatik kayıt her 365 simülasyon günde bir yapılır; veri kaybı olmaz' : 'Auto-save every 365 sim days — no data loss'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Uzun dönem gözlem için ×100 hızı kullanın; bilinç ve dil yüzyıllar içinde gelişir' : 'Use ×100 for long-term observation; consciousness and language develop over centuries'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Kurucular 60 yaşına kadar ölmez; ilk nesil mümkün olduğunca geniş olsun' : 'Founders cannot die before 60 — maximize first-generation offspring'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Dil aşama 2+ için en az 5 kişilik gruplar gerekir; grup büyüklüğü kritiktir' : 'Language stage 2+ requires groups of 5+; group size is critical'}</Bullet>
            <Bullet>{lang === 'tr' ? 'İnanç sistemleri yalnızca ölüm farkındalığı olan bireylerde oluşur; bu bilince bağlıdır' : 'Belief systems only form in individuals with death awareness — tied to consciousness'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Akraba yetiştirme (inbreeding) uzun vadede ölüm riskini artırır; farklı gruplara göç teşvik eder' : 'Inbreeding increases death risk long-term; migration between groups is beneficial'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Tarayıcıyı kapatmak simülasyonu durdurmaz; sunucu arka planda çalışır' : 'Closing the browser does not stop the simulation; server runs in background'}</Bullet>
            <Bullet>{lang === 'tr' ? 'Mediteran veya kıyı biyomları besin/su bolluğu açısından en elverişlidir' : 'Mediterranean or coastal biomes offer the best food & water abundance'}</Bullet>

            <div style={{ marginTop: 16, paddingTop: 8, borderTop: '1px solid #0a1a10', display: 'flex', justifyContent: 'center' }}>
              <div style={{ fontSize: 'clamp(11px, 1.3vw, 13px)', color: '#00e887', letterSpacing: '0.06em', lineHeight: 1.55, textShadow: '0 0 8px rgba(0,232,135,0.25)', maxWidth: '100%', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                <div>ANATOLİA-SİM · RST Q-Nation 200120401018 © 2026</div>
                <div style={{ whiteSpace: 'normal', lineHeight: 1.5 }}>Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
