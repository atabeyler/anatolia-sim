import { useState, useEffect, useRef } from 'react';

/* ── helpers ─────────────────────────────────────────────────────────────── */
const toCm   = (v: number) => Math.round(150 + Math.max(0, Math.min(1, v)) * 45);
const fromCm = (cm: number) => Math.max(0, Math.min(1, (cm - 150) / 45));
const toKg   = (hv: number, mv: number) => { const h = toCm(hv)/100; return Math.round(h*h*(19+Math.max(0,Math.min(1,mv))*8)); };
const fromKg = (kg: number, hv: number) => { const h = toCm(hv)/100; return Math.max(0, Math.min(1, (kg/(h*h)-19)/8)); };

/* ── option lists ───────────────────────────────────────────────────────── */
const EYE_OPTS  = [
  {v:'brown', tr:'Kahverengi', en:'Brown', c:'#6b3a1f'},
  {v:'hazel',  tr:'Ela',        en:'Hazel', c:'#8b6914'},
  {v:'green',  tr:'Yeşil',      en:'Green', c:'#2d6a2d'},
  {v:'blue',   tr:'Mavi',       en:'Blue',  c:'#1a5276'},
];
const HAIR_OPTS = [
  {v:'black', tr:'Siyah', en:'Black', c:'#111'},
  {v:'dark',  tr:'Koyu',  en:'Dark',  c:'#2c1810'},
  {v:'brown', tr:'Kahve', en:'Brown', c:'#5c3317'},
  {v:'light', tr:'Açık',  en:'Light', c:'#c68642'},
  {v:'blond', tr:'Sarı',  en:'Blond', c:'#d4a017'},
  {v:'red',   tr:'Kızıl', en:'Red',   c:'#8b2500'},
];
const SKIN_OPTS = [
  {v:'fair',  tr:'Açık',   en:'Fair',  c:'#fde8d0'},
  {v:'light', tr:'Bej',    en:'Light', c:'#f5c9a0'},
  {v:'olive', tr:'Buğday', en:'Olive', c:'#c68642'},
  {v:'tan',   tr:'Bronz',  en:'Tan',   c:'#a0614a'},
  {v:'brown', tr:'Esmer',  en:'Brown', c:'#7b4a2d'},
  {v:'dark',  tr:'Koyu',   en:'Dark',  c:'#3d1f0d'},
];

/* ── all genetics traits (20) ────────────────────────────────────────────── */
const ALL_TRAITS = [
  {id:'fluid_intelligence', tr:'Zeka',           en:'Intelligence',   c:'#7c3aed', gTr:'ZİHİN — BİLİŞSEL', gEn:'MIND — COGNITIVE'},
  {id:'curiosity',          tr:'Merak',           en:'Curiosity',      c:'#f59e0b', gTr:'ZİHİN — BİLİŞSEL', gEn:'MIND — COGNITIVE'},
  {id:'language_capacity',  tr:'Dil Yeteneği',    en:'Language',       c:'#14b8a6', gTr:'ZİHİN — BİLİŞSEL', gEn:'MIND — COGNITIVE'},
  {id:'learning_rate',      tr:'Öğrenme Hızı',    en:'Learning Rate',  c:'#818cf8', gTr:'ZİHİN — BİLİŞSEL', gEn:'MIND — COGNITIVE'},
  {id:'conscientiousness',  tr:'Disiplin',        en:'Discipline',     c:'#3b82f6', gTr:'ZİHİN — KİŞİLİK',  gEn:'MIND — CHARACTER'},
  {id:'self_awareness',     tr:'Öz Farkındalık',  en:'Self Awareness', c:'#8b5cf6', gTr:'ZİHİN — KİŞİLİK',  gEn:'MIND — CHARACTER'},
  {id:'stress_resilience',  tr:'Stres Direnci',   en:'Stress Resil.',  c:'#10b981', gTr:'ZİHİN — KİŞİLİK',  gEn:'MIND — CHARACTER'},
  {id:'risk_tolerance',     tr:'Risk Toleransı',  en:'Risk Tolerance', c:'#fb7185', gTr:'ZİHİN — KİŞİLİK',  gEn:'MIND — CHARACTER'},
  {id:'innovation',         tr:'İnovasyon',       en:'Innovation',     c:'#e879f9', gTr:'ZİHİN — KİŞİLİK',  gEn:'MIND — CHARACTER'},
  {id:'artistic_sense',     tr:'Sanat Duygusu',   en:'Art Sense',      c:'#f97316', gTr:'ZİHİN — KİŞİLİK',  gEn:'MIND — CHARACTER'},
  {id:'empathy',            tr:'Empati',          en:'Empathy',        c:'#ec4899', gTr:'SOSYAL',            gEn:'SOCIAL'},
  {id:'social_bonding',     tr:'Sosyal Bağ',       en:'Social Bonding', c:'#f472b6', gTr:'SOSYAL',            gEn:'SOCIAL'},
  {id:'aggression',         tr:'Saldırganlık',    en:'Aggression',     c:'#ef4444', gTr:'SOSYAL',            gEn:'SOCIAL'},
  {id:'cooperation',        tr:'İşbirliği',       en:'Cooperation',    c:'#34d399', gTr:'SOSYAL',            gEn:'SOCIAL'},
  {id:'dominance',          tr:'Liderlik Eğilimi',en:'Leadership',     c:'#fb923c', gTr:'SOSYAL',            gEn:'SOCIAL'},
  {id:'physical_strength',  tr:'Fiziksel Güç',    en:'Phys. Strength', c:'#fb923c', gTr:'BEDEN',             gEn:'BODY'},
  {id:'endurance',          tr:'Dayanıklılık',    en:'Endurance',      c:'#fbbf24', gTr:'BEDEN',             gEn:'BODY'},
  {id:'immune_strength',    tr:'Bağışıklık',      en:'Immunity',       c:'#22c55e', gTr:'BEDEN',             gEn:'BODY'},
  {id:'fertility',          tr:'Üreme Dürtüsü',   en:'Fertility',      c:'#f43f5e', gTr:'BEDEN',             gEn:'BODY'},
  {id:'longevity',          tr:'Uzun Ömür',       en:'Longevity',      c:'#84cc16', gTr:'BEDEN',             gEn:'BODY'},
];

/* ── trait metadata ─────────────────────────────────────────────────────── */
type TM = {
  lo: [string,string]; hi: [string,string];
  fx: [string,string][];
  d: [[string,string],[string,string],[string,string]];
  r: [[string,string,string,string],[string,string,string,string],[string,string,string,string]];
  // r tuple: [trName, enName, trDetail, enDetail]
};
const TRAIT_META: TM[] = [
  /* 0 fluid_intelligence */ {
    lo:['Sıradan','Ordinary'], hi:['Dahi','Genius'],
    fx:[['Teknoloji Hızı','Tech Speed'],['Bilimsel Keşif','Research'],['Stratejik Düşünce','Strategy']],
    d:[
      ['Temel ihtiyaçlara odaklanır; yenilik yavaş ve ağrılı gelişir.','Focused on basic needs; innovation is slow and painful.'],
      ['Pratik zeka öne çıkar; dengeli ve ölçülü bir ilerleme sağlanır.','Practical intelligence dominates; steady, measured progress.'],
      ['Çağını aşan icatlar doğar; teknoloji sıçramaları yaşanır.','Era-defining inventions emerge; technological leaps occur.'],
    ],
    r:[
      ['Neanderthal Toplulukları','Neanderthal Communities','Temel araçlar ve ateş yeterli görülür; sembolik düşünce sınırlıdır.','Basic tools and fire suffice; symbolic thinking is limited.'],
      ['Orta Çağ Anadolu','Medieval Anatolia','Pratik bilgi birikimi güçlü; teorik ilerleme yavaştır.','Practical knowledge is strong; theoretical advancement is slow.'],
      ['Atina · İskenderiye','Athens · Alexandria','Felsefe, matematik ve doğa bilimi medeniyetin özünü oluşturur.','Philosophy, math and natural science form the core of civilization.'],
    ],
  },
  /* 1 curiosity */ {
    lo:['Durağan','Stagnant'], hi:['Kaşif','Explorer'],
    fx:[['Keşif Hızı','Exploration Rate'],['Ticaret Ağı','Trade Network'],['Kültürel Çeşitlilik','Cultural Diversity']],
    d:[
      ['Topluluk kendi sınırlarına kapanır; değişime karşı direniş güçlüdür.','The community retreats inward; resistance to change is strong.'],
      ['Seçici keşif — pratik ve faydalı yeniliklere yönelir.','Selective exploration — focuses on practical innovations.'],
      ['Sınırsız merak; kıtalararası ticaret ve büyük keşifler hızlanır.','Boundless curiosity; intercontinental trade and great discoveries accelerate.'],
    ],
    r:[
      ['İzole Ada Toplulukları','Isolated Island Communities','Dışarıdaki dünyadan habersiz; içe dönük döngüsel bir yaşam.','Unaware of the outside world; an inward, cyclical existence.'],
      ['Anadolu Kervan Yolları','Anatolian Caravan Routes','Doğu ile Batı arasında bilgi ve mal akışı.','Flow of knowledge and goods between East and West.'],
      ['Fenikeli Tüccarlar','Phoenician Merchants','Akdeniz\'i aşan ticaret ağı; alfabe ve kültür taşıyıcısı.','A trade network spanning the Mediterranean; carrier of the alphabet and culture.'],
    ],
  },
  /* 2 language_capacity */ {
    lo:['Kısıtlı','Limited'], hi:['Hatip','Orator'],
    fx:[['Kültür Yayılımı','Culture Spread'],['Diplomasi','Diplomacy'],['Bilgi Aktarımı','Knowledge Transfer']],
    d:[
      ['Bilgi nesiller arası aktarılamaz; kurumlar zayıf ve kısa ömürlü kalır.','Knowledge cannot be passed between generations; institutions remain weak.'],
      ['Yazılı kültür gelişir; yasalar, destanlar ve tarih kayda alınır.','Written culture develops; laws, epics and history are recorded.'],
      ['Felsefe, hukuk ve edebiyat medeniyetin çekirdeğine yerleşir.','Philosophy, law and literature settle at the core of civilization.'],
    ],
    r:[
      ['Tarih Öncesi Topluluklar','Pre-Historic Communities','Yalnızca sözlü gelenek; hafıza nesil sınırlıdır.','Oral tradition only; memory is limited to one generation.'],
      ['Sümer Yazıcıları','Sumerian Scribes','Çivi yazısı ile ticaret kayıtları ve yasalar kalıcı hale gelir.','Cuneiform makes trade records and laws permanent.'],
      ['Antik Atina · Osmanlı Divanı','Ancient Athens · Ottoman Divan','Hatiplik, şiir ve retorik devlet yönetiminin ayrılmaz parçasıdır.','Oratory, poetry and rhetoric are inseparable from governance.'],
    ],
  },
  /* 3 learning_rate */ {
    lo:['Gelenekçi','Traditionalist'], hi:['Adaptif','Adaptive'],
    fx:[['Teknoloji Adaptasyonu','Tech Adoption'],['Kriz Yönetimi','Crisis Management'],['Nesil Dönüşümü','Generational Change']],
    d:[
      ['Değişime yavaş uyum; gelenekler baskın, yenilik toplumsal sürtüşmeye yol açar.','Slow adaptation; traditions dominate, innovation causes social friction.'],
      ['Dengeli öğrenme; istikrarlı ve sürdürülebilir bir ilerleme temposu.','Balanced learning; stable and sustainable pace of progress.'],
      ['Kriz anında hızlı uyum; yabancı teknolojiler süratle benimsenir.','Rapid adaptation in crisis; foreign technologies adopted swiftly.'],
    ],
    r:[
      ['Geç Bizans','Late Byzantium','Yeni gelişmelere kapalı yapı; değişim çoğunlukla dışarıdan zorla gelir.','Closed to new developments; change usually comes forced from outside.'],
      ['Roma İmparatorluğu','Roman Empire','Fethedilen halklardan teknoloji ve kültür özümsenir.','Technology and culture absorbed from conquered peoples.'],
      ['Meiji Japonya\'sı','Meiji Japan','Batı teknolojisi onlarca yılda özümsenerek yerel kimlikle harmanlanır.','Western technology absorbed in decades and blended with local identity.'],
    ],
  },
  /* 4 conscientiousness */ {
    lo:['Özgür Ruh','Free Spirit'], hi:['Disiplinli','Disciplined'],
    fx:[['Üretim Verimliliği','Production Eff.'],['Ordu Gücü','Military Power'],['Altyapı','Infrastructure']],
    d:[
      ['Yaratıcı ama dağınık; uzun vadeli planlama ve örgütlenme güçleşir.','Creative but scattered; long-term planning and organization become difficult.'],
      ['Hem üretim hem özgürlük bir arada — dengeli ve işlevsel bir yapı.','Production and freedom coexist — a balanced, functional structure.'],
      ['Güçlü ordu ve altyapı; disiplin büyük medeniyetlerin çimentosudur.','Strong military and infrastructure; discipline is the cement of great civilizations.'],
    ],
    r:[
      ['Göçebe Türk Boyları','Nomadic Turkish Tribes','Hızlı hareket ve özgürlük; kalıcı yapı ve kurumlar ikincil planda.','Swift movement and freedom; permanent structures and institutions are secondary.'],
      ['Abbasi Halifeliği','Abbasid Caliphate','Bilim kurumları ile askeri disiplin dengeli biçimde var olur.','Scientific institutions and military discipline coexist in balance.'],
      ['Roma Lejionu · Prusya','Roman Legion · Prussia','Disiplin, devlet örgütlenmesinin ve fetihlerinin temel taşıdır.','Discipline is the cornerstone of state organization and conquests.'],
    ],
  },
  /* 5 self_awareness */ {
    lo:['İçgüdüsel','Instinctive'], hi:['Bilge','Wise'],
    fx:[['Lider Kalitesi','Leader Quality'],['Kriz Kararları','Crisis Decisions'],['Toplum Uyumu','Social Cohesion']],
    d:[
      ['Anlık tepkiler hakimdir; hatalar tekrarlanır, uzun vadeli sonuçlar öngörülmez.','Immediate reactions dominate; mistakes repeat, long-term outcomes are unseen.'],
      ['Tecrübeyle öğrenen, hatalardan ders çıkaran olgun bir liderlik kültürü.','A mature leadership culture that learns from experience and mistakes.'],
      ['Derin felsefi gelenek; devlet kurumları kuşaklar boyu işlevini korur.','Deep philosophical tradition; state institutions function across generations.'],
    ],
    r:[
      ['Erken Orta Asya Göçebeleri','Early Central Asian Nomads','Kişisel kahramanlık ön planda; kurumsal süreklilik zayıf.','Personal heroism comes first; institutional continuity is weak.'],
      ['Selçuklu Devlet Geleneği','Seljuk State Tradition','Tecrübeli vezirler ve danışmanlar devlet hafızasını korur.','Experienced viziers and advisors preserve institutional memory.'],
      ['Konfüçyüs Çin\'i · Stoacı Roma','Confucian China · Stoic Rome','Öz disiplin ve bilgelik, iyi yönetimin temeli sayılır.','Self-discipline and wisdom are considered the basis of good governance.'],
    ],
  },
  /* 6 stress_resilience */ {
    lo:['Kırılgan','Fragile'], hi:['Çelik','Steel'],
    fx:[['Kriz Hayatta Kalma','Crisis Survival'],['Savaş Morali','Battle Morale'],['Çevre Adaptasyonu','Env. Adaptation']],
    d:[
      ['Kıtlık ve savaşta toplum çabuk çöker; göç ya da çözülme kaçınılmaz.','Society collapses quickly under famine and war; migration or dissolution is inevitable.'],
      ['Ortalama krizleri atlatır; büyük yıkımların izi yüzyıl sürer.','Survives average crises; the mark of great catastrophes lasts a century.'],
      ['Uzun savaşlara, salgınlara ve yıkımlara rağmen toplum ayakta kalır.','Society stands despite long wars, epidemics, and devastation.'],
    ],
    r:[
      ['Küçük Ada Medeniyetleri','Small Island Civilizations','İklim değişikliği ya da kuraklık karşısında savunmasız; çöküş ani.','Vulnerable to climate change or drought; collapse is sudden.'],
      ['Bizans İmparatorluğu','Byzantine Empire','Yüzyıllarca kriz ve kuşatmalara rağmen direnç ve süreklilik.','Resilience and continuity despite centuries of crises and sieges.'],
      ['Osmanlı · Roma','Ottoman · Rome','Yıkıcı savaşlardan sonra dahi toparlanma ve yeniden inşa kapasitesi.','Capacity for recovery and reconstruction even after devastating wars.'],
    ],
  },
  /* 7 risk_tolerance */ {
    lo:['Temkinli','Cautious'], hi:['Cüretkar','Bold'],
    fx:[['Fetih Seferleri','Conquest Campaigns'],['Ekonomik Yatırım','Economic Investment'],['Deniz Keşfi','Naval Exploration']],
    d:[
      ['Savunmacı strateji; büyüme yavaş ama toprak ve kaynak kaybı minimal.','Defensive strategy; growth is slow but territory and resource loss is minimal.'],
      ['Hesaplı riskler alınır; dengeli ve uzak görüşlü bir politika izlenir.','Calculated risks are taken; a balanced and far-sighted policy is pursued.'],
      ['Hızlı genişleme; yüksek kazanım ya da büyük çöküş — orta yol azdır.','Rapid expansion; high gain or great collapse — there is little middle ground.'],
    ],
    r:[
      ['Savunmacı Çin','Defensive China','Çin Seddi politikası: dışa kapalılık ve içsel istikrar önceliği.','Great Wall policy: closed to outside, prioritizing internal stability.'],
      ['Venedik Cumhuriyeti','Republic of Venice','Ticaret ve ittifakla büyüme; riskler titizlikle hesaplanır.','Growth through trade and alliances; risks are carefully calculated.'],
      ['İskender · Vikinglar','Alexander · Vikings','Bilinmeyene atılan cesur adım; ya imparatorluk ya yok oluş.','A bold step into the unknown; either empire or extinction.'],
    ],
  },
  /* 8 innovation */ {
    lo:['Gelenekçi','Conservative'], hi:['Öncü','Pioneer'],
    fx:[['Teknoloji Ağacı','Technology Tree'],['Üretim Araçları','Production Tools'],['Mimari','Architecture']],
    d:[
      ['Köklü gelenekler egemendir; yavaş ama sağlam, kademeli bir ilerleme var.','Deep traditions dominate; slow but solid, incremental progress.'],
      ['Pratik yenilikler ön planda; mevcut olanı sürekli iyileştirme zihniyeti.','Practical innovations take the lead; a mindset of continuous improvement.'],
      ['Çağını aşan buluşlar; teknoloji ve bilimdeki atılımlar nesilleri şekillendirir.','Era-defining inventions; breakthroughs in technology and science shape generations.'],
    ],
    r:[
      ['Geç Bizans','Late Byzantium','Kurumsal muhafazakarlık; yenilik tehditlere karşı dondurulmuş.','Institutional conservatism; innovation frozen against perceived threats.'],
      ['İslam Altın Çağı','Islamic Golden Age','Matematik, astronomi ve tıp alanında sistematik, birikimli ilerleme.','Systematic, cumulative progress in mathematics, astronomy and medicine.'],
      ['Rönesans İtalya\'sı · Bağdat','Renaissance Italy · Baghdad','Sanat ve bilimin iç içe geçtiği yaratıcı patlama dönemi.','A creative explosion where art and science are intertwined.'],
    ],
  },
  /* 9 artistic_sense */ {
    lo:['Sade','Austere'], hi:['Estetik Usta','Aesthetic Master'],
    fx:[['Kültür Puanı','Culture Score'],['Diplomatik Cazibe','Diplomatic Pull'],['Mimari Miras','Architectural Legacy']],
    d:[
      ['İşlevsellik ön planda; estetik ikincil, süsleme yok denecek kadar az.','Functionality first; aesthetics are secondary, ornamentation nearly absent.'],
      ['Kültürel kimlik oluşur; mimari, müzik ve el sanatları filiz verir.','Cultural identity forms; architecture, music and crafts begin to flourish.'],
      ['Evrensel sanat mirası bırakılır; güzellik bizzat bir güç unsuru olur.','A universal artistic legacy is left; beauty itself becomes a source of power.'],
    ],
    r:[
      ['Erken Neolitik Topluluklar','Early Neolithic Communities','Araç ve barınak işlevsel; süslemeler henüz rudimenter.','Tools and shelters are functional; decorations are still rudimentary.'],
      ['Anadolu Selçuklu Mimarisi','Anatolian Seljuk Architecture','Geometrik bezeme ve çini sanatı zirvede; cami ve medrese ustalığı.','Geometric ornamentation and tile art at their peak; mastery of mosque and madrassa.'],
      ['Osmanlı · Bizans','Ottoman · Byzantium','Saray kültürü, mozaik ve minyatür — güzelliğin devlet politikası olduğu çağ.','Palace culture, mosaic and miniature — an era where beauty is state policy.'],
    ],
  },
  /* 10 empathy */ {
    lo:['Soğuk','Cold'], hi:['Şefkatli','Compassionate'],
    fx:[['Sosyal Uyum','Social Cohesion'],['Sınıf Çatışması','Class Conflict'],['Hukuki Eşitlik','Legal Equality']],
    d:[
      ['Güçlü hiyerarşi; sosyal eşitsizlik yaygın, zayıfların korunması sınırlı.','Strong hierarchy; social inequality is widespread, protection of the weak is limited.'],
      ['Sınırlı sosyal güvenlik ağı; orta sınıf kademeli biçimde gelişir.','A limited social safety net; the middle class develops gradually.'],
      ['Güçlü yardımlaşma kültürü; iç çatışmalar azalır, uyum güçlenir.','A strong culture of mutual aid; internal conflicts decrease, cohesion strengthens.'],
    ],
    r:[
      ['Sparta Kast Sistemi','Spartan Caste System','Helotlar sistematik baskı altında; güçlü olan hayatta kalır.','Helots under systematic oppression; the strong survive.'],
      ['Orta Çağ Feodal Düzeni','Medieval Feudal Order','Kilise aracılığıyla sınırlı koruma; yardım erdem sayılır ama zorunlu değildir.','Limited protection through the Church; charity is a virtue but not obligatory.'],
      ['Endülüs İslam Medeniyeti','Andalusian Islamic Civilization','Üç dinin bir arada yaşadığı tolerans modeli; hoşgörü devlet politikası.','A model of tolerance where three faiths coexist; tolerance is state policy.'],
    ],
  },
  /* 11 social_bonding */ {
    lo:['Bireyci','Individualist'], hi:['Toplulukçu','Collectivist'],
    fx:[['Koalisyon Gücü','Coalition Power'],['İç Savaş Riski','Civil War Risk'],['Büyük Projeler','Grand Projects']],
    d:[
      ['Güçlü bireyler; zayıf devlet kurumları ve parçalı, dağınık yapılar.','Strong individuals; weak state institutions and fragmented structures.'],
      ['Aile ve klan bağları sağlam; devlet orta ölçekte çalışır.','Family and clan ties are solid; the state operates at a medium scale.'],
      ['Güçlü kolektif eylem; dev altyapı ve inşaat projeleri hayata geçer.','Strong collective action; grand infrastructure and construction projects come to life.'],
    ],
    r:[
      ['Bozkır Göçebe Toplulukları','Steppe Nomadic Communities','Bireysel özgürlük yüksek; kalıcı kurumlar kurmak güç.','Individual freedom is high; establishing permanent institutions is difficult.'],
      ['Anadolu Köy Kültürü','Anatolian Village Culture','İmece geleneği; klan ve komşuluk dayanışması toplumu ayakta tutar.','İmece tradition; clan and neighborhood solidarity keeps society standing.'],
      ['Eski Mısır · Çin İmparatorluğu','Ancient Egypt · Chinese Empire','Dev inşaat projeleri ve merkezi devlet — kolektif gücün doruk noktası.','Massive construction projects and central state — the pinnacle of collective power.'],
    ],
  },
  /* 12 aggression */ {
    lo:['Barışçıl','Peaceful'], hi:['Savaşçı','Warlike'],
    fx:[['Askeri Güç','Military Power'],['Toprak Genişlemesi','Territorial Expansion'],['Diplomatik İlişkiler','Diplomatic Relations']],
    d:[
      ['Barışçıl ilişkiler; kültür, ticaret ve diplomasi ön plana geçer.','Peaceful relations; culture, trade and diplomacy take the foreground.'],
      ['Savunma güçlü; saldırı hesaplı ve stratejik olarak kullanılır.','Defense is strong; aggression is used in a calculated, strategic manner.'],
      ['Hızlı toprak genişlemesi; sürekli savaş hali toplumu ve kurumları şekillendirir.','Rapid territorial expansion; the permanent state of war shapes society and institutions.'],
    ],
    r:[
      ['Hitit Diplomasisi','Hittite Diplomacy','Tarihte bilinen ilk barış antlaşması; savaş yerine müzakere.','The first known peace treaty in history; negotiation instead of war.'],
      ['Osmanlı Denge Politikası','Ottoman Balance Policy','Güç yoluyla barış; stratejik savaş ve diplomatik ittifakların dengesi.','Peace through power; a balance of strategic war and diplomatic alliances.'],
      ['Moğol İmparatorluğu · Vikinglar','Mongol Empire · Vikings','Fetih kültürü; korku ve hız yoluyla geniş coğrafyalar denetim altına alınır.','A culture of conquest; vast geographies controlled through fear and speed.'],
    ],
  },
  /* 13 cooperation */ {
    lo:['Rekabetçi','Competitive'], hi:['Dayanışmacı','Cooperative'],
    fx:[['İttifak Ağı','Alliance Network'],['Kaynak Paylaşımı','Resource Sharing'],['Ortak Projeler','Joint Projects']],
    d:[
      ['İç rekabet yenilik doğurur; ama kaynaklar dağınık ve verimsiz kullanılır.','Internal competition breeds innovation; but resources are used scattered and inefficiently.'],
      ['Seçici iş birliği; stratejik ittifaklar dikkatle kurulur ve korunur.','Selective cooperation; strategic alliances are carefully built and maintained.'],
      ['Güçlü ittifak ağları; ortak projeler medeniyetin ilerleyiş hızını artırır.','Strong alliance networks; joint projects accelerate the pace of civilizational progress.'],
    ],
    r:[
      ['İtalyan Şehir Devletleri','Italian City-States','Floransa, Venedik, Cenova rekabeti: yenilik ateşleyici, güç dağıtık.','Florence, Venice, Genoa rivalry: competition ignites innovation, power remains dispersed.'],
      ['Hansa Birliği','Hanseatic League','Kuzey Avrupa ticaret şehirlerinin ortak savunma ve ticaret ağı.','A joint defense and trade network of northern European merchant cities.'],
      ['Roma Müttefik Sistemi · Osmanlı Millet Düzeni','Roman Alliance System · Ottoman Millet Order','Farklı halkların ortak çatı altında örgütlenmesi — çoklukta birlik.','Organization of diverse peoples under a common roof — unity within diversity.'],
    ],
  },
  /* 14 dominance */ {
    lo:['Eşitlikçi','Egalitarian'], hi:['Otoriter','Authoritarian'],
    fx:[['Devlet Yapısı','State Structure'],['Karar Hızı','Decision Speed'],['Ordu Komutası','Military Command']],
    d:[
      ['Demokratik eğilim; geniş katılımlı yavaş kararlar, çatışmalar uzlaşıyla çözülür.','Democratic tendency; wide-participation slow decisions, conflicts resolved by consensus.'],
      ['Oligarşik yapı; liderler seçilir, yetki dengeli biçimde dağıtılır.','Oligarchic structure; leaders are chosen, power is balanced and distributed.'],
      ['Güçlü merkezi otorite; hızlı kararlar ve sert yönetim büyük toplulukları yönetir.','Strong central authority; swift decisions and firm governance manage large communities.'],
    ],
    r:[
      ['Atina Demokrasisi','Athenian Democracy','Agora tartışmaları; her yurttaşın söz hakkı, kararlar ağır alınır.','Agora debates; every citizen has a voice, decisions are taken slowly.'],
      ['Venedik Doge Konseyi','Venetian Doge Council','Aristokrat oy birliği; liderlik tekeli önlenir, denge korunur.','Aristocratic consensus; monopoly of leadership is prevented, balance is maintained.'],
      ['Osmanlı Sultanlığı · Moğol Han Sistemi','Ottoman Sultanate · Mongol Khan System','Mutlak otorite; süratli seferber olma ve merkezi kaynak yönetimi.','Absolute authority; rapid mobilization and centralized resource management.'],
    ],
  },
  /* 15 physical_strength */ {
    lo:['Narin','Slender'], hi:['Güçlü','Powerful'],
    fx:[['Savaş Gücü','Combat Power'],['Tarım Üretimi','Agricultural Output'],['İnşaat Kapasitesi','Construction Cap.']],
    d:[
      ['Strateji, zeka ve teknoloji öne çıkar; kaba kuvvetten ziyade yetkinlik belirleyici.','Strategy, intelligence and technology come to the fore; skill rather than brute force is decisive.'],
      ['Dengeli fizik; hem tarımda hem muharebe alanında yeterli kapasite.','Balanced physique; sufficient capacity in both agriculture and combat.'],
      ['Yüksek üretim ve savaş kapasitesi; büyük yapılar ve uzun seferler mümkün.','High production and combat capacity; great structures and long campaigns become possible.'],
    ],
    r:[
      ['Bizans Strateji Odaklı Ordu','Byzantine Strategic Army','Sayısal üstünlük yerine taktik üstünlük; az kuvvetle çok başarı.','Tactical superiority over numerical strength; great success with few forces.'],
      ['Osmanlı Yeniçeri Ocağı','Ottoman Janissary Corps','Eğitim ve fiziksel kapasite bir arada; disiplinli ağır piyade.','Training and physical capacity together; disciplined heavy infantry.'],
      ['Spartalı Savaşçılar · Moğol Atlıları','Spartan Warriors · Mongol Cavalry','Fizik üstünlük medeniyetin temeli; savaşa adanmış toplum modeli.','Physical superiority is the foundation of civilization; a society dedicated to war.'],
    ],
  },
  /* 16 endurance */ {
    lo:['Kırılgan','Fragile'], hi:['Yılmaz','Relentless'],
    fx:[['Uzun Sefer Kapasitesi','Long Campaign Cap.'],['Kıtlık Direnci','Famine Resistance'],['Nüfus Büyümesi','Population Growth']],
    d:[
      ['Kısa seferler ve şehir savunması tercih edilir; yorgunluk ve hastalık hızlı girer.','Short campaigns and city defense are preferred; fatigue and disease set in quickly.'],
      ['Orta mesafe seferler; kıtlık kısmen atlatılır, toplum büyük kayıplar verir.','Medium-range campaigns; famine is partially overcome, society suffers major losses.'],
      ['Kıtalararası seferler ve aşırı koşullarda hayatta kalış; toplum zorlukla güçlenir.','Intercontinental campaigns and survival in extreme conditions; society grows stronger through hardship.'],
    ],
    r:[
      ['Küçük Akdeniz Şehir Devletleri','Small Mediterranean City-States','Kısa mesafeli ticaret ve savunma; uzun mesafeli güç projeksiyonu sınırlı.','Short-range trade and defense; long-range power projection is limited.'],
      ['Selçuklu Sefer Ordusu','Seljuk Campaign Army','At ve deve ile uzun bozkır seferleri; lojistik zorlukları aşma kapasitesi.','Long steppe campaigns with horse and camel; capacity to overcome logistical challenges.'],
      ['Moğol · Türk Büyük Göç Dalgaları','Mongol · Turkish Great Migrations','Binlerce kilometre at sırtında; iklim ve coğrafya engel tanınmaz.','Thousands of kilometers on horseback; climate and geography pose no barriers.'],
    ],
  },
  /* 17 immune_strength */ {
    lo:['Hassas','Delicate'], hi:['Gürbüz','Robust'],
    fx:[['Salgın Direnci','Epidemic Resistance'],['Nüfus İstikrarı','Population Stability'],['Coğrafi Yayılım','Geographic Spread']],
    d:[
      ['Salgın hastalıklar toplumda yıkıcı etki yaratır; nüfus çabuk erir.','Epidemic diseases have a devastating effect on society; population erodes quickly.'],
      ['Endemik hastalıklarla denge kurulur; kayıplar acı ama yönetilebilir.','Balance is struck with endemic diseases; losses are painful but manageable.'],
      ['Nüfus istikrarı güçlü; salgınlar görece hızlı atlatılır, toplum toparlanır.','Population stability is strong; epidemics are overcome relatively quickly, society recovers.'],
    ],
    r:[
      ['Kara Ölüm Sonrası Avrupa','Post-Black Death Europe','Nüfusun üçte birini silen veba; kültürel ve ekonomik çöküş dönemi.','A plague that wiped out a third of the population; a period of cultural and economic collapse.'],
      ['Orta Çağ Anadolu Kentleri','Medieval Anatolian Cities','Doğu-Batı ticaretinin buluşma noktası; salgınlara maruz ama dirençli.','The meeting point of East-West trade; exposed to epidemics but resilient.'],
      ['Osmanlı Şehirleri (erken dönem)','Ottoman Cities (Early Period)','Karantina uygulamaları erken benimsendi; görece düşük salgın ölüm oranı.','Quarantine practices adopted early; relatively low epidemic mortality rates.'],
    ],
  },
  /* 18 fertility */ {
    lo:['Kontrollü','Controlled'], hi:['Verimli','Prolific'],
    fx:[['Nüfus Artış Hızı','Population Growth'],['Yayılma Kapasitesi','Expansion Capacity'],['Kaynak Baskısı','Resource Pressure']],
    d:[
      ['Yavaş nüfus artışı; kaynaklara baskı az, yaşam kalitesi yüksek tutulabilir.','Slow population growth; low pressure on resources, high quality of life is maintainable.'],
      ['Dengeli büyüme; istikrarlı ve sürdürülebilir coğrafi genişleme.','Balanced growth; stable and sustainable geographic expansion.'],
      ['Hızlı nüfus patlaması; toprak ve kaynak ihtiyacı baskı yaratır, göç artar.','Rapid population explosion; need for land and resources creates pressure, migration increases.'],
    ],
    r:[
      ['Antik Yunan Şehir Devletleri','Ancient Greek City-States','Nüfus kontrolü bilinçli uygulandı; toprak sınırlı, kalite ön planda.','Population control was consciously practiced; land is limited, quality comes first.'],
      ['Osmanlı Klasik Dönemi','Ottoman Classical Period','Dengeli demografik büyüme; sürdürülebilir toprak ve kaynak yönetimi.','Balanced demographic growth; sustainable land and resource management.'],
      ['Erken İslam Fetihleri','Early Islamic Conquests','Demografik dinamizm ve genç nüfus; fetihlerin arkasındaki insan gücü.','Demographic dynamism and a young population; the human power behind the conquests.'],
    ],
  },
  /* 19 longevity */ {
    lo:['Kısa Ömürlü','Short-Lived'], hi:['Uzun Ömürlü','Long-Lived'],
    fx:[['Kurumsal Hafıza','Institutional Memory'],['Nesil Aktarımı','Gen. Transfer'],['Bilge Lider Süresi','Elder Leadership']],
    d:[
      ['Tecrübe birikmeden nesil değişir; kurumlar zayıf ve kısa ömürlü kalır.','Generations change before experience accumulates; institutions remain weak and short-lived.'],
      ['Orta yaşam süresi; bilgi ve tecrübe kuşaklar arası yavaşça aktarılır.','Medium lifespan; knowledge and experience are slowly transferred between generations.'],
      ['Uzun ömürlü liderler ve güçlü kurumsal hafıza; medeniyetin sürekliliği güvence altında.','Long-lived leaders and strong institutional memory; the continuity of civilization is secured.'],
    ],
    r:[
      ['Erken Göçebe Topluluklar','Early Nomadic Communities','Kısa ortalama yaşam; bilgelik aktarımı sözlü ve sınırlı.','Short average lifespan; wisdom transfer is oral and limited.'],
      ['Osmanlı Vezir Sistemi','Ottoman Vizier System','Tecrübeli bürokrasi; devlet hafızası kurumsal kanallarla korunur.','Experienced bureaucracy; state memory is preserved through institutional channels.'],
      ['Çin İmparatorluk Bürokrasisi · Roma Senatosu','Chinese Imperial Bureaucracy · Roman Senate','Nesiller boyu süren kurumsal derinlik — medeniyetin güvencesi.','Institutional depth spanning generations — the guarantee of civilization.'],
    ],
  },
];

const TRAIT_DEFAULTS = Object.fromEntries(ALL_TRAITS.map(t => [t.id, 0.5]));

export const founderDefaults = (sex: 'male'|'female') => ({
  name: sex==='male' ? 'Alp Anatol' : 'Ayla Anatol',
  ageYears: sex==='male' ? 22 : 20,
  sex,
  eye_color:'brown', hair_color: sex==='male' ? 'dark' : 'brown', skin_tone:'olive',
  height: sex==='male' ? 0.56 : 0.44, metabolism: 0.45,
  ...TRAIT_DEFAULTS,
  fluid_intelligence:0.68, curiosity:0.60, conscientiousness:0.72,
  language_capacity:0.55,  artistic_sense:0.50, self_awareness:0.55,
  stress_resilience:0.65,  empathy:0.60,  social_bonding:0.75,
  aggression:0.35, cooperation:0.72, dominance:0.50,
  physical_strength:0.72,  endurance:0.70, immune_strength:0.74,
  fertility:0.80, longevity:0.68, learning_rate:0.65,
  risk_tolerance:0.45, innovation:0.55,
});

/* ── step definitions ────────────────────────────────────────────────────── */
type StepDef =
  | { type: 'sim-info' }
  | { type: 'identity';   f: 1|2 }
  | { type: 'physical';   f: 1|2 }
  | { type: 'appearance'; f: 1|2 }
  | { type: 'trait';      f: 1|2; idx: number }
  | { type: 'summary' };

const STEPS: StepDef[] = [
  { type: 'sim-info' },
  { type: 'identity',   f: 1 },
  { type: 'physical',   f: 1 },
  { type: 'appearance', f: 1 },
  ...ALL_TRAITS.map((_, i) => ({ type: 'trait' as const, f: 1 as const, idx: i })),
  { type: 'identity',   f: 2 },
  { type: 'physical',   f: 2 },
  { type: 'appearance', f: 2 },
  ...ALL_TRAITS.map((_, i) => ({ type: 'trait' as const, f: 2 as const, idx: i })),
  { type: 'summary' },
];
const TOTAL = STEPS.length;

/* ── shared styles ───────────────────────────────────────────────────────── */
const CLIP = 'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))';
const inputBase: React.CSSProperties = {
  outline:'none', fontFamily:'Share Tech Mono,monospace',
  background:'rgba(7,7,26,0.9)', border:'1px solid rgba(79,110,247,0.25)',
  padding:'9px 12px', fontSize:14, color:'#e0e0f0', clipPath:CLIP, width:'100%',
};
const btnBase: React.CSSProperties = {
  fontFamily:'Share Tech Mono,monospace', letterSpacing:'0.12em', fontSize:16,
  clipPath:CLIP, cursor:'pointer', padding:'9px 20px',
};
const btnNext  = { ...btnBase, background:'rgba(79,110,247,0.25)', border:'1px solid rgba(79,110,247,0.5)',  color:'#e0e0f0' };
const btnBack  = { ...btnBase, background:'rgba(22,22,58,0.5)',    border:'1px solid rgba(79,110,247,0.2)',  color:'#e0e0f0' };
const btnExit  = { ...btnBase, background:'rgba(150,30,30,0.15)',  border:'1px solid rgba(200,34,34,0.3)',   color:'#e0e0f0', padding:'9px 14px' };
const btnStart = { ...btnBase, fontSize:14, background:'rgba(78,203,113,0.2)', border:'1px solid rgba(78,203,113,0.5)', color:'#4ecb71', padding:'9px 28px' };

/* ── sub-components ──────────────────────────────────────────────────────── */
function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize:14, color:'#4f9ef7', fontFamily:'Share Tech Mono,monospace',
      letterSpacing:'0.12em', marginBottom:6 }}>
      {children}
    </div>
  );
}

function HudInput({ label, type='text', value, onChange, min, max, step }: any) {
  return (
    <div style={{ marginBottom:16 }}>
      <Lbl>{label}</Lbl>
      <input type={type} value={value} onChange={onChange} min={min} max={max} step={step}
        style={inputBase}
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,110,247,0.7)')}
        onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(79,110,247,0.25)')}
      />
    </div>
  );
}

function NumInput({ value, unit, min, max, color, onChange }: {
  value: number; unit: string; min: number; max: number; color: string;
  onChange: (v: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));
  useEffect(() => setRaw(String(value)), [value]);
  function commit(s: string) {
    const v = parseInt(s, 10);
    if (!isNaN(v)) { const c = Math.max(min, Math.min(max, v)); onChange(c); setRaw(String(c)); }
    else setRaw(String(value));
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <input type="number" min={min} max={max} value={raw}
        onChange={e => setRaw(e.target.value)}
        onBlur={e => { commit(raw); e.currentTarget.style.borderColor = 'rgba(79,110,247,0.25)'; }}
        onKeyDown={e => e.key==='Enter' && commit((e.target as HTMLInputElement).value)}
        style={{ ...inputBase, width:100, fontSize:20, color, textAlign:'center', padding:'8px' }}
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,110,247,0.7)')}
      />
      <span style={{ fontSize:16, color:'#4f9ef7', fontFamily:'Share Tech Mono,monospace' }}>{unit}</span>
    </div>
  );
}

function SliderBar({ value, color, onChange }: { value: number; color: string; onChange: (v: number) => void }) {
  return (
    <div style={{ position:'relative', height:8, background:'rgba(10,10,30,0.9)',
      border:`1px solid ${color}40`, marginTop:8 }}>
      <div style={{ position:'absolute', inset:'0 auto 0 0', width:`${value*100}%`,
        background:`linear-gradient(90deg,${color}50,${color})`, transition:'width 0.1s' }} />
      <input type="range" min={0} max={1} step={0.01} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0, cursor:'pointer', margin:0 }} />
    </div>
  );
}

function ColorPicker({ label, opts, value, onChange, lang }: any) {
  return (
    <div style={{ marginBottom:20 }}>
      <Lbl>{label}</Lbl>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        {opts.map((o: any) => (
          <div key={o.v} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer' }}
            onClick={() => onChange(o.v)}>
            <div style={{
              width:38, height:38, background:o.c, clipPath:CLIP,
              border: value===o.v ? '2px solid #4f9ef7' : '2px solid rgba(79,158,247,0.15)',
              boxShadow: value===o.v ? '0 0 10px #4f9ef780' : 'none', transition:'all 0.15s',
            }} />
            <span style={{ fontSize:14, color: value===o.v ? '#4f9ef7' : '#e0e0f0',
              fontFamily:'Share Tech Mono,monospace', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>
              {lang==='tr' ? o.tr : o.en}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0',
      borderBottom:'1px solid rgba(79,110,247,0.1)' }}>
      <span style={{ fontSize:14, color:'#e0e0f0', fontFamily:'Share Tech Mono,monospace' }}>{label}</span>
      <span style={{ fontSize:14, color:'#e0e0f0', fontFamily:'Share Tech Mono,monospace' }}>{value}</span>
    </div>
  );
}

/* ── main wizard ─────────────────────────────────────────────────────────── */
interface Props {
  lang: 'en'|'tr'|'de'|'fr'|'ar';
  loading: boolean;
  onSubmit: (form: any, f1: any, f2: any) => void;
  onExit: () => void;
}

export default function SimCreationWizard({ lang, loading, onSubmit, onExit }: Props) {
  const [step, setStep] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [simForm, setSimForm] = useState<{ name: string; latitude: string; longitude: string }>(() => {
    try { const s = localStorage.getItem('anatolia-wizard-last'); if (s) return JSON.parse(s).simForm ?? { name:'', latitude:'', longitude:'' }; } catch {}
    return { name:'', latitude:'', longitude:'' };
  });
  const [f1, setF1] = useState<any>(() => {
    try { const s = localStorage.getItem('anatolia-wizard-last'); if (s) return JSON.parse(s).f1 ?? founderDefaults('male'); } catch {}
    return founderDefaults('male');
  });
  const [f2, setF2] = useState<any>(() => {
    try { const s = localStorage.getItem('anatolia-wizard-last'); if (s) return JSON.parse(s).f2 ?? founderDefaults('female'); } catch {}
    return founderDefaults('female');
  });

  const meta  = STEPS[step];
  const isF2  = meta.type !== 'sim-info' && meta.type !== 'summary' && (meta as any).f === 2;
  const fd    = isF2 ? f2 : f1;
  const setFd = isF2 ? setF2 : setF1;
  const setT  = (id: string, val: number) => setFd((p: any) => ({ ...p, [id]: val }));

  const next = () => setStep(s => Math.min(s + 1, TOTAL - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));
  const t    = (tr: string, en: string) => lang === 'tr' ? tr : en;

  const stepRef = useRef(step);
  stepRef.current = step;

  // Keep window globals in sync so AriaButton can send context to the API
  useEffect(() => {
    const cur = STEPS[step];
    (window as any).__ariaWizardStep = step;
    (window as any).__ariaWizardStepType = cur.type;
    (window as any).__ariaWizardFounder = (cur as any).f ?? null;
    (window as any).__ariaWizardTraitName = cur.type === 'trait'
      ? `${ALL_TRAITS[(cur as any).idx]?.tr} (${ALL_TRAITS[(cur as any).idx]?.id})`
      : null;
  }, [step]);

  useEffect(() => {
    (window as any).__ariaWizardReady = true;
    function onAriaWizard(e: Event) {
      const detail = (e as CustomEvent).detail;
      const { action, field, value, founder } = detail;

      // Determine target founder setter for 'set' action
      const curStep = STEPS[stepRef.current];
      const isF2now = curStep.type !== 'sim-info' && curStep.type !== 'summary' && (curStep as any).f === 2;
      const targetSet = founder === 1 ? setF1 : founder === 2 ? setF2 : (isF2now ? setF2 : setF1);

      switch (action) {
        case 'next':   setStep(s => Math.min(s + 1, TOTAL - 1)); break;
        case 'back':   setStep(s => Math.max(s - 1, 0)); break;
        case 'submit':
          if (STEPS[stepRef.current]?.type === 'summary') setConfirmOpen(true);
          else setStep(TOTAL - 1);
          break;
        case 'exit': onExit(); break;

        case 'set': {
          // Sim info fields
          if (field === 'sim_name')      { setSimForm((p: any) => ({...p, name: String(value)})); break; }
          if (field === 'sim_latitude')  { setSimForm((p: any) => ({...p, latitude: String(value)})); break; }
          if (field === 'sim_longitude') { setSimForm((p: any) => ({...p, longitude: String(value)})); break; }
          // Founder identity fields
          if (field === 'founder_name')  { targetSet((p: any) => ({...p, name: String(value)})); break; }
          if (field === 'founder_age')   { targetSet((p: any) => ({...p, ageYears: Math.max(16, Math.min(60, Math.round(Number(value))))})); break; }
          if (field === 'founder_sex')   { targetSet((p: any) => ({...p, sex: String(value)})); break; }
          // Physical fields — height: fromCm=(cm-150)/45, weight: fromKg uses current height
          if (field === 'founder_height') {
            const cm = Number(value);
            targetSet((p: any) => ({...p, height: fromCm(cm)}));
            break;
          }
          if (field === 'founder_weight' || field === 'founder_kilo') {
            const kg = Number(value);
            targetSet((p: any) => ({...p, metabolism: fromKg(kg, p.height)}));
            break;
          }
          if (field === 'founder_metabolism') {
            const num = Number(value);
            const norm = num > 1 ? num / 100 : num;
            targetSet((p: any) => ({...p, metabolism: Math.max(0, Math.min(1, norm))}));
            break;
          }
          // Appearance fields
          if (field === 'founder_eye')  { targetSet((p: any) => ({...p, eye_color: String(value)})); break; }
          if (field === 'founder_hair') { targetSet((p: any) => ({...p, hair_color: String(value)})); break; }
          if (field === 'founder_skin') { targetSet((p: any) => ({...p, skin_tone: String(value)})); break; }
          // Set whichever trait is on the CURRENT step
          if (field === 'current_trait') {
            const def = STEPS[stepRef.current];
            if (def?.type === 'trait') {
              const tid = ALL_TRAITS[(def as any).idx].id;
              const num = Number(value);
              const norm = num > 1 ? num / 100 : num;
              targetSet((p: any) => ({...p, [tid]: Math.max(0, Math.min(1, norm))}));
            }
            break;
          }
          // Fallback: treat field as direct trait/property key
          {
            const num = Number(value);
            if (!isNaN(num)) {
              const norm = num > 1 ? num / 100 : num;
              targetSet((p: any) => ({...p, [field]: Math.max(0, Math.min(1, norm))}));
            } else {
              targetSet((p: any) => ({...p, [field]: value}));
            }
          }
          break;
        }
      }
    }
    window.addEventListener('aria-wizard', onAriaWizard);
    return () => {
      (window as any).__ariaWizardReady = false;
      window.removeEventListener('aria-wizard', onAriaWizard);
    };
  }, [onExit]);

  const founderLabel = (meta.type !== 'sim-info' && meta.type !== 'summary')
    ? ((meta as any).f === 1 ? t('KURUCU 1 — ERKEK', 'FOUNDER 1 — MALE')
                              : t('KURUCU 2 — KADIN', 'FOUNDER 2 — FEMALE'))
    : null;

  const isSummary  = meta.type === 'summary';
  const canNext    = meta.type === 'sim-info' ? simForm.name.trim() !== '' : true;
  const traitColor = meta.type === 'trait' ? ALL_TRAITS[meta.idx].c : null;

  /* step title */
  function stepTitle(): string {
    switch (meta.type) {
      case 'sim-info':   return t('SİMÜLASYON BİLGİLERİ', 'SIMULATION INFO');
      case 'identity':   return t('KİMLİK BİLGİLERİ', 'IDENTITY');
      case 'physical':   return t('FİZİKSEL ÖLÇÜLER', 'PHYSICAL');
      case 'appearance': return t('DIŞ GÖRÜNÜŞ', 'APPEARANCE');
      case 'trait': {
        const tr = ALL_TRAITS[meta.idx];
        return lang === 'tr' ? tr.tr.toUpperCase() : tr.en.toUpperCase();
      }
      case 'summary': return t('ÖZET', 'SUMMARY');
    }
  }

  function stepSubtitle(): string | null {
    if (meta.type === 'trait') {
      const tr = ALL_TRAITS[meta.idx];
      return lang === 'tr' ? tr.gTr : tr.gEn;
    }
    return null;
  }

  /* ── step content ────────────────────────────────────────────────────── */
  function renderContent() {

    /* Sim info */
    if (meta.type === 'sim-info') return (
      <>
        <HudInput label={t('SİMÜLASYON ADI', 'SIMULATION NAME')} value={simForm.name}
          onChange={(e: any) => setSimForm(p => ({ ...p, name: e.target.value }))} />
        <HudInput label={t('ENLEM (°N)', 'LATITUDE (°N)')} type="number" step="0.0001" value={simForm.latitude}
          onChange={(e: any) => setSimForm(p => ({ ...p, latitude: e.target.value }))} />
        <HudInput label={t('BOYLAM (°E)', 'LONGITUDE (°E)')} type="number" step="0.0001" value={simForm.longitude}
          onChange={(e: any) => setSimForm(p => ({ ...p, longitude: e.target.value }))} />
      </>
    );

    /* Identity */
    if (meta.type === 'identity') return (
      <>
        <HudInput label={t('İSİM', 'NAME')} value={fd.name}
          onChange={(e: any) => setFd((p: any) => ({ ...p, name: e.target.value }))} />
        <HudInput label={t('YAŞ', 'AGE')} type="number" min={16} max={60} value={fd.ageYears}
          onChange={(e: any) => setFd((p: any) => ({ ...p, ageYears: +e.target.value }))} />
        <div style={{ marginBottom:16 }}>
          <Lbl>{t('CİNSİYET', 'SEX')}</Lbl>
          <div style={{ display:'flex', gap:8 }}>
            {[{ v:'male', tr:'ERKEK', en:'MALE' }, { v:'female', tr:'KADIN', en:'FEMALE' }].map(opt => (
              <button key={opt.v} onClick={() => setFd((p: any) => ({ ...p, sex: opt.v }))}
                style={{ fontFamily:'Share Tech Mono,monospace', letterSpacing:'0.12em', padding:'8px 22px', fontSize:14,
                  background: fd.sex===opt.v ? 'rgba(79,110,247,0.25)' : 'rgba(22,22,58,0.5)',
                  border: `1px solid ${fd.sex===opt.v ? 'rgba(79,110,247,0.6)' : 'rgba(79,110,247,0.15)'}`,
                  color:'#e0e0f0', clipPath:CLIP, cursor:'pointer' }}>
                {t(opt.tr, opt.en)}
              </button>
            ))}
          </div>
        </div>
      </>
    );

    /* Physical */
    if (meta.type === 'physical') return (
      <>
        <div style={{ marginBottom:24 }}>
          <Lbl>{t('BOY', 'HEIGHT')}</Lbl>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <NumInput value={toCm(fd.height)} unit="cm" min={145} max={200} color="#06b6d4"
              onChange={cm => setT('height', fromCm(cm))} />
          </div>
          <SliderBar value={fd.height} color="#06b6d4" onChange={v => setT('height', v)} />
        </div>
        <div style={{ marginBottom:12 }}>
          <Lbl>{t('KİLO', 'WEIGHT')}</Lbl>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <NumInput value={toKg(fd.height, fd.metabolism)} unit="kg" min={40} max={130} color="#a855f7"
              onChange={kg => setT('metabolism', fromKg(kg, fd.height))} />
          </div>
          <SliderBar value={fd.metabolism} color="#a855f7" onChange={v => setT('metabolism', v)} />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:5,
            fontSize:14, color:'#4f9ef7', fontFamily:'Share Tech Mono,monospace' }}>
            <span>{t('İnce', 'Lean')}</span><span>{t('Orta', 'Average')}</span><span>{t('Kaslı', 'Heavy')}</span>
          </div>
        </div>
      </>
    );

    /* Appearance */
    if (meta.type === 'appearance') return (
      <>
        <ColorPicker label={t('GÖZ RENGİ', 'EYE COLOR')}  opts={EYE_OPTS}  value={fd.eye_color}
          onChange={(v: string) => setFd((p: any) => ({ ...p, eye_color: v }))}  lang={lang} />
        <ColorPicker label={t('SAÇ RENGİ', 'HAIR COLOR')} opts={HAIR_OPTS} value={fd.hair_color}
          onChange={(v: string) => setFd((p: any) => ({ ...p, hair_color: v }))} lang={lang} />
        <ColorPicker label={t('TEN RENGİ', 'SKIN TONE')}  opts={SKIN_OPTS} value={fd.skin_tone}
          onChange={(v: string) => setFd((p: any) => ({ ...p, skin_tone: v }))}  lang={lang} />
      </>
    );

    /* Trait — enriched display */
    if (meta.type === 'trait') {
      const trait = ALL_TRAITS[meta.idx];
      const tm    = TRAIT_META[meta.idx];
      const val   = fd[trait.id] ?? 0.5;
      const pct   = `${(val * 100).toFixed(0)}%`;
      const tier  = val < 0.34 ? 0 : val < 0.67 ? 1 : 2;
      const isTr  = lang === 'tr';
      return (
        <div>
          {/* 1 — big percentage */}
          <div style={{ textAlign:'center', marginBottom:14 }}>
            <div style={{ fontSize:52, color: trait.c, fontFamily:'Orbitron,monospace',
              fontWeight:900, lineHeight:1, textShadow:`0 0 24px ${trait.c}70` }}>
              {pct}
            </div>
          </div>

          {/* 2 — slider + spectrum labels */}
          <SliderBar value={val} color={trait.c} onChange={v => setT(trait.id, v)} />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:5,
            fontSize:14, fontFamily:'Share Tech Mono,monospace' }}>
            <span style={{ color:'#e0e0f0' }}>{lang==='tr' ? tm.lo[0] : tm.lo[1]}</span>
            <span style={{ color:'#e0e0f0' }}>{lang==='tr' ? tm.hi[0] : tm.hi[1]}</span>
          </div>

          {/* 3 — simulation impact chips */}
          <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:18 }}>
            {tm.fx.map(fx => (
              <div key={fx[0]} style={{
                padding:'3px 10px', fontSize:14, fontFamily:'Share Tech Mono,monospace',
                color: trait.c, border:`1px solid ${trait.c}45`,
                background:`${trait.c}12`, clipPath:CLIP, letterSpacing:'0.07em',
              }}>
                {lang==='tr' ? fx[0] : fx[1]}
              </div>
            ))}
          </div>

          {/* 4a — dynamic description */}
          <div style={{ marginTop:14, fontSize:14, color:'#e0e0f0',
            fontFamily:'Share Tech Mono,monospace', lineHeight:1.65, letterSpacing:'0.03em' }}>
            {tm.d[tier][isTr ? 0 : 1]}
          </div>

          {/* 4b — historical reference card */}
          <div style={{ marginTop:12, padding:'10px 14px',
            background:'rgba(8,8,26,0.85)', border:`1px solid ${trait.c}28`, clipPath:CLIP }}>
            <div style={{ fontSize:14, color: trait.c, fontFamily:'Share Tech Mono,monospace',
              letterSpacing:'0.12em', marginBottom:6 }}>
              ◈ {isTr ? tm.r[tier][0] : tm.r[tier][1]}
            </div>
            <div style={{ fontSize:14, color:'#e0e0f0', fontFamily:'Share Tech Mono,monospace',
              lineHeight:1.55, letterSpacing:'0.03em' }}>
              {isTr ? tm.r[tier][2] : tm.r[tier][3]}
            </div>
          </div>
        </div>
      );
    }

    /* Summary */
    if (meta.type === 'summary') return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <div style={{ fontSize:16, color:'#4f9ef7', fontFamily:'Share Tech Mono,monospace',
            letterSpacing:'0.15em', marginBottom:8 }}>
            {t('SİMÜLASYON', 'SIMULATION')}
          </div>
          <SumRow label={t('AD', 'NAME')}    value={simForm.name || '—'} />
          <SumRow label={t('ENLEM', 'LAT')}  value={simForm.latitude || '—'} />
          <SumRow label={t('BOYLAM', 'LNG')} value={simForm.longitude || '—'} />
        </div>
        {([{ fd: f1, sex: 'male' }, { fd: f2, sex: 'female' }] as { fd: any; sex: string }[]).map(({ fd: founder, sex }) => (
          <div key={sex}>
            <div style={{ fontSize:16, color: sex==='male' ? '#4f9ef7' : '#ec4899',
              fontFamily:'Share Tech Mono,monospace', letterSpacing:'0.12em', marginBottom:8 }}>
              {sex==='male' ? t('KURUCU 1 — ERKEK', 'FOUNDER 1 — MALE') : t('KURUCU 2 — KADIN', 'FOUNDER 2 — FEMALE')}
            </div>
            <SumRow label={t('İSİM', 'NAME')}   value={founder.name} />
            <SumRow label={t('YAŞ', 'AGE')}     value={String(founder.ageYears)} />
            <SumRow label={t('BOY', 'HEIGHT')}  value={`${toCm(founder.height)} cm`} />
            <SumRow label={t('KİLO', 'WEIGHT')} value={`${toKg(founder.height, founder.metabolism)} kg`} />
            <SumRow label={t('ZEKA', 'IQ')}     value={`${(founder.fluid_intelligence * 100).toFixed(0)}%`} />
            <SumRow label={t('SOSYAL BAĞ', 'SOC.BOND')} value={`${(founder.social_bonding * 100).toFixed(0)}%`} />
            <SumRow label={t('BAĞIŞIKLIK', 'IMMUNITY')} value={`${(founder.immune_strength * 100).toFixed(0)}%`} />
          </div>
        ))}
      </div>
    );

    return null;
  }

  /* ── render ──────────────────────────────────────────────────────────── */
  const subtitle = stepSubtitle();
  return (
    <div style={{ width:'min(580px, 92vw)', height:'min(80vh, 720px)', margin:'0 auto', background:'rgba(4,4,15,0.97)',
      border:'1px solid rgba(79,110,247,0.4)', animation:'boot-in 0.3s ease-out both', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Progress */}
      <div style={{ height:2, background:'rgba(79,110,247,0.1)' }}>
        <div style={{ height:'100%', width:`${((step+1)/TOTAL)*100}%`,
          background:'linear-gradient(90deg,#4f6ef7,#4f9ef7)', transition:'width 0.25s ease-out' }} />
      </div>

      {/* Header */}
      <div style={{ padding:'12px 20px', borderBottom:'1px solid rgba(79,110,247,0.2)',
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          {founderLabel && (
            <div style={{ fontSize:14, color:'#4f9ef7', fontFamily:'Share Tech Mono,monospace',
              letterSpacing:'0.2em', marginBottom:3 }}>
              {founderLabel}
            </div>
          )}
          {subtitle && (
            <div style={{ fontSize:14, color:'#e0e0f0', fontFamily:'Share Tech Mono,monospace',
              letterSpacing:'0.15em', marginBottom:2 }}>
              {subtitle}
            </div>
          )}
          <div style={{
            fontSize: traitColor ? 24 : 14,
            color: traitColor ?? '#e0e0f0',
            fontFamily: traitColor ? 'Orbitron,monospace' : 'Share Tech Mono,monospace',
            letterSpacing:'0.15em', fontWeight:700,
            textShadow: traitColor ? `0 0 12px ${traitColor}60` : 'none',
          }}>
            {stepTitle()}
          </div>
        </div>
        <div style={{ fontSize:14, color:'#e0e0f0', fontFamily:'Orbitron,monospace', letterSpacing:'0.1em' }}>
          {step+1} / {TOTAL}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:'22px 24px', flex:1, overflowY:'auto' }}>
        {renderContent()}
      </div>

      {/* Confirmation modal */}
      {confirmOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:999,
          background:'rgba(0,0,10,0.82)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ maxWidth:400, width:'90%', background:'rgba(4,4,18,0.98)',
            border:'1px solid rgba(204,34,34,0.6)', clipPath:CLIP, padding:'28px 28px 24px' }}>
            <div style={{ fontSize:20, color:'#cc2222', fontFamily:'Orbitron,monospace',
              letterSpacing:'0.2em', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{
                display:'inline-block',
                fontSize: 52,
                lineHeight: 1,
                filter:'drop-shadow(0 0 8px #cc2222) drop-shadow(0 0 18px #cc222299)',
                animation:'warn-pulse 1.4s ease-in-out infinite',
              }}>⚠</span>
              <span style={{ textShadow:'0 0 12px #cc222288' }}>{t('UYARI', 'WARNING')}</span>
            </div>
            <div style={{ fontSize:16, color:'#e0e0f0', fontFamily:'Share Tech Mono,monospace',
              lineHeight:1.7, letterSpacing:'0.04em', marginBottom:24 }}>
              {t(
                'Bu adım geri döndürülemez. Simülasyon başlatıldıktan sonra kurucu ayarları değiştirilemez.',
                'This step is irreversible. Founder settings cannot be changed once the simulation is launched.'
              )}
            </div>
            <div style={{ fontSize:16, color:'#e0e0f0', fontFamily:'Share Tech Mono,monospace',
              letterSpacing:'0.12em', marginBottom:20, borderTop:'1px solid rgba(204,34,34,0.25)',
              paddingTop:16 }}>
              {t('Onaylıyor musunuz?', 'Do you confirm?')}
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button
                onClick={() => { setConfirmOpen(false); try { localStorage.setItem('anatolia-wizard-last', JSON.stringify({ simForm, f1, f2 })); } catch {} onSubmit(simForm, f1, f2); }}
                style={{ ...btnBase, fontSize:16, flex:1,
                  background:'rgba(78,203,113,0.18)', border:'1px solid rgba(78,203,113,0.55)',
                  color:'#4ecb71' }}>
                {t('ONAYLA', 'CONFIRM')}
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                style={{ ...btnBase, fontSize:16, flex:1,
                  background:'rgba(204,34,34,0.15)', border:'1px solid rgba(204,34,34,0.45)',
                  color:'#e05555' }}>
                {t('VAZGEÇ', 'CANCEL')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ padding:'8px 12px 6px', marginTop:-32, borderTop:'1px solid rgba(79,110,247,0.15)',
        display:'flex', gap:6 }}>
        <button onClick={onExit}
          style={{ ...btnExit, flex:1, textAlign:'center', padding:'9px 4px', minWidth:0 }}>
          {t('ÇIK', 'EXIT')}
        </button>
        {step > 0 && (
          <button onClick={back}
            style={{ ...btnBack, flex:1, textAlign:'center', padding:'9px 4px', minWidth:0 }}>
            ← {t('GERİ', 'BACK')}
          </button>
        )}
        {isSummary ? (
          <button onClick={() => setConfirmOpen(true)} disabled={loading}
            style={{ ...btnStart, flex:2, textAlign:'center', padding:'9px 4px', minWidth:0,
              opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? t('BAŞLATILIYOR…', 'INITIALIZING…') : t('BAŞLAT', 'LAUNCH')}
          </button>
        ) : (
          <button onClick={next} disabled={!canNext}
            style={{ ...btnNext, flex:2, textAlign:'center', padding:'9px 4px', minWidth:0,
              opacity: !canNext ? 0.4 : 1, cursor: !canNext ? 'not-allowed' : 'pointer' }}>
            {t('DEVAM ET', 'CONTINUE')} →
          </button>
        )}
      </div>
    </div>
  );
}
