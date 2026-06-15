import type { LangCode } from './i18n';

type Translation = Record<LangCode, string>;

export type GuideBlock =
  | { kind: 'h'; text: Translation }
  | { kind: 'sub'; text: Translation }
  | { kind: 'row'; label: Translation; value: Translation }
  | { kind: 'note'; text: Translation }
  | { kind: 'bullet'; text: Translation };

export const LANGUAGES: Array<{ code: LangCode; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
];

export const MENU_TEXT = {
  page_language: { tr: 'DİL SEÇENEKLERİ', en: 'LANGUAGE', de: 'SPRACHE', fr: 'LANGUE', ar: 'اللغة' },
  page_guide: { tr: 'KULLANIM KILAVUZU', en: 'USER GUIDE', de: 'BENUTZERHANDBUCH', fr: "GUIDE D'UTILISATION", ar: 'دليل المستخدم' },
  page_about: { tr: 'HAKKIMIZDA', en: 'ABOUT', de: 'ÜBER UNS', fr: 'À PROPOS', ar: 'حول' },
  page_mission: { tr: 'MİSYON & VİZYON', en: 'MISSION & VISION', de: 'MISSION & VISION', fr: 'MISSION & VISION', ar: 'المهمة والرؤية' },
  page_contact: { tr: 'İLETİŞİM', en: 'CONTACT', de: 'KONTAKT', fr: 'CONTACT', ar: 'تواصل' },
  menu_language: { tr: '🌐 Dil / Language', en: '🌐 Language', de: '🌐 Sprache', fr: '🌐 Langue', ar: '🌐 اللغة' },
  menu_guide: { tr: '📖 Kullanım Kılavuzu', en: '📖 User Guide', de: '📖 Anleitung', fr: '📖 Guide', ar: '📖 دليل' },
  menu_about: { tr: 'Hakkımızda', en: 'About', de: 'Über uns', fr: 'À propos', ar: 'حول' },
  menu_mission: { tr: 'Misyon & Vizyon', en: 'Mission & Vision', de: 'Mission', fr: 'Mission', ar: 'المهمة' },
  menu_contact: { tr: 'İletişim', en: 'Contact', de: 'Kontakt', fr: 'Contact', ar: 'تواصل' },
  back: { tr: '← GERİ', en: '← BACK', de: '← ZURÜCK', fr: '← RETOUR', ar: '← رجوع' },
} satisfies Record<string, Translation>;

export const PAGE_TEXT = {
  about: {
    tr: 'ANATOLİA-SİM, Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. bünyesinde Yalçın Atabey tarafından geliştirilen, simülasyon hipotezini deneysel olarak test etmeye yönelik ileri düzey bir medeniyet simülasyon platformudur.\n\nGerçek biyolojik, genetik, çevresel ve sosyal mekanizmaları temel alarak iki bireyden başlayan bir nüfusun binlerce yıl boyunca nasıl evrildiğini, dil, inanç, teknoloji ve devlet yapılarını nasıl geliştirdiğini müdahalesiz biçimde gözlemlemeyi sağlar.\n\nProje Kodu: RST Q-Nation 200120401018',
    en: 'ANATOLIA-SIM is an advanced civilization simulation platform developed by Yalçın Atabey under Bold Askeri Teknoloji ve Savunma Sanayi A.Ş., designed to experimentally test the simulation hypothesis.\n\nIt models biological, genetic, environmental and social mechanisms, observing a population that starts from two individuals and evolves over thousands of years toward language, belief, technology and governance.\n\nProject Code: RST Q-Nation 200120401018',
    de: 'ANATOLIA-SIM ist eine fortschrittliche Zivilisationssimulationsplattform, entwickelt von Yalçın Atabey unter Bold Askeri Teknoloji ve Savunma Sanayi A.Ş., um die Simulationshypothese experimentell zu testen.\n\nSie modelliert biologische, genetische, ökologische und soziale Mechanismen und beobachtet eine Bevölkerung, die mit zwei Individuen beginnt und sich über Jahrtausende zu Sprache, Glauben, Technologie und Regierung entwickelt.\n\nProjektcode: RST Q-Nation 200120401018',
    fr: "ANATOLIA-SIM est une plateforme avancée de simulation de civilisation développée par Yalçın Atabey au sein de Bold Askeri Teknoloji ve Savunma Sanayi A.Ş., conçue pour tester expérimentalement l'hypothèse de simulation.\n\nElle modélise des mécanismes biologiques, génétiques, environnementaux et sociaux, en observant une population issue de deux individus évoluer vers le langage, la croyance, la technologie et la gouvernance.\n\nCode du projet : RST Q-Nation 200120401018",
    ar: 'ANATOLIA-SIM منصة متقدمة لمحاكاة الحضارة طوّرها يالتشين أتابي ضمن Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. لاختبار فرضية المحاكاة تجريبياً.\n\nتحاكي آليات بيولوجية وجينية وبيئية واجتماعية، وتراقب مجتمعاً يبدأ من فردين ويتطور عبر آلاف السنين نحو اللغة والمعتقد والتكنولوجيا والحوكمة.\n\nرمز المشروع: RST Q-Nation 200120401018',
  },
  mission: {
    tr: 'MİSYON\nSimülasyon hipotezini bilimsel ve deneysel zeminlerde test etmek; insan medeniyetinin evrensel örüntülerini ortaya çıkarmak.\n\nVİZYON\nDünyanın en kapsamlı yapay yaşam ve medeniyet simülasyon platformu olmak; insanlığın kökeni, bilinci ve geleceği hakkında nesnel veriler üretmek.',
    en: "MISSION\nTest the simulation hypothesis on scientific and experimental grounds and reveal universal patterns of human civilization.\n\nVISION\nBecome the world's most comprehensive artificial life and civilization simulation platform, producing objective data about the origin, consciousness and future of humanity.",
    de: 'MISSION\nDie Simulationshypothese auf wissenschaftlicher und experimenteller Grundlage testen und universelle Muster menschlicher Zivilisation sichtbar machen.\n\nVISION\nDie umfassendste Plattform für künstliches Leben und Zivilisationssimulation werden und objektive Daten über Ursprung, Bewusstsein und Zukunft der Menschheit erzeugen.',
    fr: "MISSION\nTester l'hypothèse de simulation sur des bases scientifiques et expérimentales et révéler les schémas universels de la civilisation humaine.\n\nVISION\nDevenir la plateforme la plus complète de simulation de vie artificielle et de civilisation, produisant des données objectives sur l'origine, la conscience et l'avenir de l'humanité.",
    ar: 'المهمة\nاختبار فرضية المحاكاة على أسس علمية وتجريبية وكشف الأنماط الكونية للحضارة الإنسانية.\n\nالرؤية\nأن تصبح المنصة الأشمل لمحاكاة الحياة الاصطناعية والحضارة، وإنتاج بيانات موضوعية حول أصل الإنسانية ووعيها ومستقبلها.',
  },
  contact: {
    tr: 'Proje Sahibi: Yalçın Atabey\nKuruluş: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nE-posta: info@boldkimya.com.tr\nTelefon: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 Tüm hakları saklıdır.',
    en: 'Project Owner: Yalçın Atabey\nOrganization: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nE-mail: info@boldkimya.com.tr\nPhone: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 All rights reserved.',
    de: 'Projektinhaber: Yalçın Atabey\nOrganisation: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nE-Mail: info@boldkimya.com.tr\nTelefon: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 Alle Rechte vorbehalten.',
    fr: 'Propriétaire du projet : Yalçın Atabey\nOrganisation : Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nE-mail : info@boldkimya.com.tr\nTéléphone : +90 532 217 07 76\nORCID : 0009-0004-9037-5750\n\n© 2026 Tous droits réservés.',
    ar: 'مالك المشروع: يالتشين أتابي\nالمنظمة: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nالبريد الإلكتروني: info@boldkimya.com.tr\nالهاتف: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 جميع الحقوق محفوظة.',
  },
} satisfies Record<'about' | 'mission' | 'contact', Translation>;

export const GUIDE_BLOCKS: GuideBlock[] = [
  { kind: 'h', text: { tr: '1 — SİMÜLASYON OLUŞTURMA', en: '1 — CREATING A SIMULATION', de: '1 — SIMULATION ERSTELLEN', fr: '1 — CRÉER UNE SIMULATION', ar: '١ — إنشاء المحاكاة' } },
  { kind: 'row', label: { tr: 'Simülasyon Adı', en: 'Name', de: 'Name', fr: 'Nom', ar: 'الاسم' }, value: { tr: 'Medeniyetinize anlamlı bir ad verin. Raporlarda ve kontrol panelinde görünür.', en: 'Give your civilization a meaningful name. It appears in reports and the dashboard.', de: 'Geben Sie Ihrer Zivilisation einen aussagekräftigen Namen. Er erscheint in Berichten und im Kontrollpanel.', fr: 'Donnez un nom significatif à votre civilisation. Il apparaît dans les rapports et le tableau de bord.', ar: 'امنح حضارتك اسماً ذا معنى. يظهر في التقارير ولوحة التحكم.' } },
  { kind: 'row', label: { tr: 'Konum Seçimi', en: 'Location', de: 'Standort', fr: 'Emplacement', ar: 'الموقع' }, value: { tr: 'Haritadan başlangıç noktası seçin. Enlem/boylam biyom ve iklimi belirler.', en: 'Pick a starting point on the map. Latitude and longitude determine biome and climate.', de: 'Wählen Sie einen Startpunkt auf der Karte. Breite und Länge bestimmen Biom und Klima.', fr: 'Choisissez un point de départ sur la carte. Latitude et longitude déterminent le biome et le climat.', ar: 'اختر نقطة بداية على الخريطة. يحدد خط العرض والطول المنطقة الحيوية والمناخ.' } },
  { kind: 'row', label: { tr: 'Kurucular', en: 'Founders', de: 'Gründer', fr: 'Fondateurs', ar: 'المؤسسون' }, value: { tr: 'İki kurucunun adını, yaşını ve görünüşünü özelleştirin. Medeniyetin genetik atalarıdır.', en: 'Customize the names, ages and appearance of the two founders. They are the genetic ancestors of the civilization.', de: 'Passen Sie Namen, Alter und Aussehen der beiden Gründer an. Sie sind die genetischen Vorfahren der Zivilisation.', fr: "Personnalisez le nom, l'âge et l'apparence des deux fondateurs. Ils sont les ancêtres génétiques de la civilisation.", ar: 'خصّص أسماء وعمر ومظهر المؤسسين. إنهما السلفان الجينيان للحضارة.' } },

  { kind: 'h', text: { tr: '2 — ANA EKRAN VE HARİTA', en: '2 — MAIN SCREEN & MAP', de: '2 — HAUPTBILDSCHIRM & KARTE', fr: '2 — ÉCRAN PRINCIPAL & CARTE', ar: '٢ — الشاشة الرئيسية والخريطة' } },
  { kind: 'sub', text: { tr: '3B Dünya Haritası', en: '3D World Map', de: '3D-Weltkarte', fr: 'Carte du monde 3D', ar: 'خريطة العالم ثلاثية الأبعاد' } },
  { kind: 'bullet', text: { tr: 'Her ışık noktası bir bireydir. Sarı kurucu, mavi erkek, pembe kadındır.', en: 'Each light point is an individual. Yellow means founder, blue male, pink female.', de: 'Jeder Lichtpunkt ist ein Individuum. Gelb bedeutet Gründer, Blau männlich, Rosa weiblich.', fr: 'Chaque point lumineux est un individu. Jaune : fondateur, bleu : homme, rose : femme.', ar: 'كل نقطة ضوئية تمثل فرداً. الأصفر للمؤسس، الأزرق للذكر، الوردي للأنثى.' } },
  { kind: 'bullet', text: { tr: 'Biyom, sıcaklık, besin ve su bolluğu canlı güncellenir.', en: 'Biome, temperature, food and water abundance update live.', de: 'Biom, Temperatur, Nahrung und Wasser werden live aktualisiert.', fr: "Le biome, la température, la nourriture et l'eau se mettent à jour en direct.", ar: 'يتم تحديث المنطقة الحيوية والحرارة والغذاء والماء مباشرة.' } },

  { kind: 'h', text: { tr: '3 — KONTROLLER', en: '3 — CONTROLS', de: '3 — STEUERUNG', fr: '3 — CONTRÔLES', ar: '٣ — عناصر التحكم' } },
  { kind: 'row', label: { tr: 'Menü', en: 'Menu', de: 'Menü', fr: 'Menu', ar: 'القائمة' }, value: { tr: 'Kılavuzu, dil seçeneklerini ve proje bilgilerini açar.', en: 'Opens the guide, language options and project information.', de: 'Öffnet Anleitung, Sprachoptionen und Projektinformationen.', fr: 'Ouvre le guide, les options de langue et les informations du projet.', ar: 'يفتح الدليل وخيارات اللغة ومعلومات المشروع.' } },
  { kind: 'row', label: { tr: 'Başlat / Durdur', en: 'Start / Pause', de: 'Start / Pause', fr: 'Démarrer / Pause', ar: 'تشغيل / إيقاف مؤقت' }, value: { tr: 'Simülasyonu çalıştırır veya duraklatır; durumu veritabanına kaydeder.', en: 'Runs or pauses the simulation and saves state to the database.', de: 'Startet oder pausiert die Simulation und speichert den Zustand in der Datenbank.', fr: "Lance ou met en pause la simulation et enregistre l'état en base de données.", ar: 'يشغّل المحاكاة أو يوقفها مؤقتاً ويحفظ الحالة في قاعدة البيانات.' } },
  { kind: 'row', label: { tr: 'Hız', en: 'Speed', de: 'Geschwindigkeit', fr: 'Vitesse', ar: 'السرعة' }, value: { tr: '×1 ile ×1000 arasında gözlem hızını seçebilirsiniz.', en: 'Choose an observation speed from ×1 to ×1000.', de: 'Wählen Sie eine Beobachtungsgeschwindigkeit von ×1 bis ×1000.', fr: "Choisissez une vitesse d'observation de ×1 à ×1000.", ar: 'اختر سرعة المراقبة من ×1 إلى ×1000.' } },

  { kind: 'h', text: { tr: '4 — MODÜLLER', en: '4 — MODULES', de: '4 — MODULE', fr: '4 — MODULES', ar: '٤ — الوحدات' } },
  { kind: 'bullet', text: { tr: 'Nüfus, biyoloji, çevre, astronomi, kültür, dil, teknoloji, inanç, sosyal yapı ve ekonomi panelleri sol panelden açılır.', en: 'Population, biology, environment, astronomy, culture, language, technology, belief, social structure and economy panels open from the left panel.', de: 'Bevölkerung, Biologie, Umwelt, Astronomie, Kultur, Sprache, Technologie, Glaube, soziale Struktur und Wirtschaft öffnen sich über das linke Panel.', fr: 'Les panneaux population, biologie, environnement, astronomie, culture, langage, technologie, croyance, structure sociale et économie s’ouvrent depuis le panneau gauche.', ar: 'تُفتح لوحات السكان والبيولوجيا والبيئة والفلك والثقافة واللغة والتكنولوجيا والمعتقد والبنية الاجتماعية والاقتصاد من اللوحة اليسرى.' } },
  { kind: 'bullet', text: { tr: 'Her modül canlı simülasyon verisini gösterir; metrikler tick akışıyla güncellenir.', en: 'Each module displays live simulation data; metrics update with the tick stream.', de: 'Jedes Modul zeigt Live-Simulationsdaten; Metriken werden mit dem Tick-Strom aktualisiert.', fr: 'Chaque module affiche les données de simulation en direct ; les métriques suivent le flux de ticks.', ar: 'تعرض كل وحدة بيانات المحاكاة الحية؛ وتتحدث المقاييس مع تدفق التكات.' } },

  { kind: 'h', text: { tr: '5 — OLAY AKIŞI', en: '5 — EVENT FEED', de: '5 — EREIGNISFEED', fr: "5 — FLUX D'ÉVÉNEMENTS", ar: '٥ — تدفق الأحداث' } },
  { kind: 'bullet', text: { tr: 'Doğum, ölüm, keşif, çatışma, salgın, inanç ve kültür olayları canlı yayınlanır.', en: 'Birth, death, discovery, conflict, epidemic, belief and culture events are broadcast live.', de: 'Geburt, Tod, Entdeckung, Konflikt, Epidemie, Glaube und Kulturereignisse werden live übertragen.', fr: 'Naissance, mort, découverte, conflit, épidémie, croyance et culture sont diffusés en direct.', ar: 'تُبث أحداث الولادة والموت والاكتشاف والصراع والوباء والمعتقد والثقافة مباشرة.' } },

  { kind: 'h', text: { tr: '6 — ARIA ASİSTANI', en: '6 — ARIA ASSISTANT', de: '6 — ARIA-ASSISTENT', fr: '6 — ASSISTANT ARIA', ar: '٦ — مساعد ARIA' } },
  { kind: 'bullet', text: { tr: 'Aria simülasyon durumunu okuyarak nüfus, yıl, keşif ve panel komutlarına yanıt verir.', en: 'Aria reads the simulation state and answers population, year, discovery and panel commands.', de: 'Aria liest den Simulationszustand und beantwortet Befehle zu Bevölkerung, Jahr, Entdeckungen und Panels.', fr: "Aria lit l'état de la simulation et répond aux commandes sur la population, l’année, les découvertes et les panneaux.", ar: 'تقرأ Aria حالة المحاكاة وتجيب عن أوامر السكان والسنة والاكتشافات واللوحات.' } },

  { kind: 'h', text: { tr: '7 — İPUÇLARI', en: '7 — TIPS', de: '7 — TIPPS', fr: '7 — CONSEILS', ar: '٧ — نصائح' } },
  { kind: 'bullet', text: { tr: 'Uzun dönem gözlem için yüksek hız kullanın; bilinç, dil ve teknoloji yüzyıllar içinde gelişir.', en: 'Use higher speed for long-term observation; consciousness, language and technology develop over centuries.', de: 'Nutzen Sie höhere Geschwindigkeit für Langzeitbeobachtung; Bewusstsein, Sprache und Technologie entwickeln sich über Jahrhunderte.', fr: "Utilisez une vitesse élevée pour l'observation longue durée ; conscience, langage et technologie évoluent sur des siècles.", ar: 'استخدم سرعة أعلى للمراقبة الطويلة؛ فالوعي واللغة والتكنولوجيا تتطور عبر قرون.' } },
  { kind: 'bullet', text: { tr: 'Tanrı müdahaleleri doğal hipotez koşularından ayrı değerlendirilmelidir.', en: 'God interventions should be evaluated separately from natural hypothesis runs.', de: 'God-Interventionen sollten getrennt von natürlichen Hypothesenläufen bewertet werden.', fr: 'Les interventions God Mode doivent être évaluées séparément des exécutions naturelles.', ar: 'يجب تقييم تدخلات وضع الإله بشكل منفصل عن تشغيلات الفرضية الطبيعية.' } },
];

export function menuText(lang: LangCode, key: keyof typeof MENU_TEXT): string {
  return MENU_TEXT[key][lang] ?? MENU_TEXT[key].en ?? MENU_TEXT[key].tr;
}

export function pageText(lang: LangCode, key: keyof typeof PAGE_TEXT): string {
  return PAGE_TEXT[key][lang] ?? PAGE_TEXT[key].en ?? PAGE_TEXT[key].tr;
}

export function guideText(lang: LangCode, value: Translation): string {
  return value[lang] ?? value.en ?? value.tr;
}
