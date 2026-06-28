# ANATOLIA SIM — YENİ OTURUM BRİEFİNG

Bu belgeyi yeni bir Claude oturumunda ilk mesaj olarak gönder.

---

## PROJE VİZYONU

**Ne yapıyoruz:** Gerçek dünyayı simüle ediyoruz. Gerçek insan medeniyetinin nasıl geliştiğini, binlerce yıl içinde ne seviyeye geleceğini simüle eden bir sistem.

**Tez konusu:** Simülasyon hipotezi — gerçekliğin simüle edilip edilemeyeceğini test etmek. Bireysel ajan simülasyonundan makro medeniyet emergence'ına geçişin modellemesi.

**Hedef:** Dünya çapında bu alanda en iyi akademik simülasyon.

**Önemli:** Bu bir oyun değil, tez projesi. Geliştirici (kullanıcı) Rust bilmiyor ama sen yazacaksın.

---

## MEVCUT PROJE (Kenarda bekleyecek)

**Repo:** `atabeyler/anatolia-sim` (GitHub)
**Stack:** Node.js + Express + SQLite + React + Electron
**Versiyon:** v2.2.9
**Deploy:** Render.com (web), Electron (masaüstü)
**Performans durumu:** ~351 yaşayanda 248ms/tik — v2.2.9 ile heavy mode eklendi ama mimari sınıra yaklaşıldı.

---

## YENİ PROJE

**Repo:** `atabeyler/anatolia-rst-sim` (GitHub)
**Stack:**
```
Simulation Core  → Rust (Tokio + Axum + Rayon)
Parallelism      → Rayon (gerçek çok çekirdek)
Database         → SQLite (SQLx async)
Frontend         → React (mevcut koddan port, minimal değişiklik)
Desktop          → Tauri (Electron yerine, Rust native, ~10MB)
Web Deploy       → Native binary (Render'da Node.js yok)
Architecture     → Custom ECS (Bevy çok oyun odaklı)
```

**Neden Rust:**
- Mevcut JS mimarisi max ~500 bireyde tıkanıyor
- Rust ile 50.000+ birey hedefi
- Gerçek paralel hesap (Rayon)
- Tauri ile masaüstü çok daha hafif
- Render'da native binary = Node.js overhead yok

---

## SİMÜLASYON MİMARİSİ (Mevcut — Rust'a taşınacak)

### Temel Prensipler
1. Her birey **benzersiz** — kopyalanmış davranış yok
2. Her şey **emergence** — kültür, dil, inanç, teknoloji kimse programlamadan çıkıyor
3. Fizik kuralları konulur, gerisi kendi kendine oluşur
4. Gerçek dünyayı simüle ediyoruz — validasyon gerçek antropoloji/arkeoloji verileriyle

### Katmanlı Ölçek (Gelecek mimari)
```
0-50 kişi      → Her birey ayrı simüle edilir
50-500 kişi    → Klan/kabile seviyesi
500-5000 kişi  → Yerleşim/şehir seviyesi
5000+          → Uygarlık/imparatorluk seviyesi
```
Her katmanda bireyler istatistiksel temsilcilere dönüşür. Bu bilimsel olarak da doğru.

---

## KARDİNAL KURALLAR

Bunlar kesinlikle ihlal edilemez. Simülasyonun bilimsel bütünlüğünün temeli:

### 1. Bilinç Kardinal Kuralı
```
// consciousnessEngine.js
// Cardinal rule: this formula is the ONLY way consciousness may change.
// No external code may directly set ind.mind.consciousness.
```
Bilinç = `genetik tavan × dil faktörü × sosyal faktör × theory of mind`
Başka hiçbir sistem doğrudan `mind.consciousness` yazamaz.
Teorik temel: Global Workspace Theory (Baars 1988, Dehaene 2011)

### 2. Epigenetik Kardinal Kuralı
```
// epigeneticsEngine.js
// Cardinal Rule: epigenetic changes on non-founders are physiological responses
// to the individual's own internal signals — not scripted behaviours.
```
Kurucular (founders) dışındaki bireylerde epigenetik değişiklikler sadece kişinin kendi
iç sinyallerine (stres, beslenme, çevre) yanıt olarak oluşur. Dışarıdan yazılamaz.
Kalıtım katsayıları `inheritEpigenome()` ile nesile aktarılır.

### 3. Teknoloji Kardinal Kuralı
```
// technologyEngine.js
// cardinal rule: tech can only be learned via observation of a nearby peer who personally knows it
```
Teknoloji sadece gözlemle öğrenilir. Bir birey bir teknolojiyi ancak onu zaten bilen
birinin yakınındaysa öğrenebilir. Rastgele atama yok.

### 4. Sanat Kardinal Kuralı
```
// artEngine.js
// Cardinal Rule: behavior must arise from what the individual does,
// not from a system scan of their traits.
```
Sanat davranışı bireyin gerçek aktivitesinden doğar. Trait taramasından oluşturulamaz.
Görsel sanat/müzik için gerçek crafting aktivitesi gerekir.

### 5. Hukuk Kardinal Kuralı
```
// lawEngine.js
// Cardinal Rule: each individual's own phenotype determines whether they violate a norm.
// No external lottery picks a random violator.
```
Norm ihlali rastgele seçimle değil, bireyin kendi fenotipi (agresyon, vicdanlılık)
ile belirlenir. Shuffle sırası seçim yanlılığı oluşturmamalı.

### 6. Sosyal Rol Kardinal Kuralı
```
// socialEngine.js
// Roles emerge from behavioral counts (_behaviorCounts), not assigned from phenotype.
// This satisfies the Cardinal Rule.
```
Sosyal roller (lider, şaman, avcı) fenotipten atanmaz. Bireyin gerçek davranış
geçmişinden (`_behaviorCounts`) emerge eder.

---

## GENOM SİSTEMİ

### Gen Lokusleri (34 lokus)
```
Zeka:
  BDNF_01    → neural_plasticity      (codominant)
  COMT_01    → working_memory         (codominant)
  DTNBP1_01  → fluid_intelligence     (codominant)
  NRG1_01    → cognitive_speed        (codominant)
  DISC1_01   → executive_function     (codominant)

Dil & İletişim:
  FOXP2_01   → language_capacity      (codominant, haploinsufficiency)
  CNTNAP2_01 → language_learning      (codominant)

Sosyal & Duygusal:
  OXTR_01    → social_bonding         (codominant)
  SLC6A4_01  → serotonin_transport    (codominant)
  DRD4_01    → curiosity              (codominant)
  MAOA_01    → aggression             (x_linked)

Bilinç & İnanç Kapasitesi:
  NRXN1_01   → self_awareness         (codominant)
  SHANK3_01  → prefrontal_dev         (codominant)
  RELN_01    → theory_of_mind         (codominant)

Fiziksel:
  HEIGHT_01/02/03 → height            (polygenic)
  STRENGTH_01     → physical_strength (codominant)
  METABOLISM_01   → metabolism        (codominant)
  IMMUNE_01/02    → immune_strength/breadth (codominant)
  TERT_01         → telomere_length   (codominant)
  APOE_01         → longevity         (codominant)

Davranışsal:
  DRD2_01    → motivation             (codominant)
  AVPR1A_01  → pair_bonding           (codominant)
  ACTN3_01   → muscle_fiber_type      (codominant)
  ADRA2B_01  → memory_consolidation   (codominant)
  CACNA1C_01 → novelty_seeking        (codominant)
  FSHR_01    → fertility              (codominant)

Fiziksel Görünüm:
  HERC2_01   → eye_color              (dominant)
  MC1R_01    → hair_color             (codominant)
  SLC24A5_01 → skin_pigmentation      (dominant)
```

### Kalıtım Sistemi
- Her lokus: allele1 + allele2 (her biri 0-1 arası değer)
- Gamet oluşturma: `createGamete()` — crossing over + mutasyon
- Fenotype hesaplama: `computePhenotype()` — her lokus tipi farklı işlenir
- Stres altında mutasyon oranı artar
- Akraba evliliği katsayısı: `computeInbreedingCoefficient()`

---

## EPİGENETİK SİSTEM

### Lokusleri
```
HPA_AXIS        (COMT)    → stres yanıtı,         heritability: 0.3, reversible
BDNF_PROMOTER   (BDNF)    → öğrenme plastisite,   heritability: 0.2, reversible
MAOA_REGULATION (MAOA)    → agresyon kontrolü,    heritability: 0.4, irreversible
LEPTIN_RESIST   (LEPR)    → metabolizma,          heritability: 0.5, reversible
INSULIN_SENS    (health)  → insülin duyarlılığı,  heritability: 0.35, reversible
```
- Çevresel baskı (stres, beslenme yetersizliği) metilasyon değiştirir
- `inheritEpigenome()` ile nesile kalıtılır (heritability katsayısına göre)
- Kurucular dışında dışarıdan epigenome yazılamaz (Kardinal Kural)

---

## BİREY YAPISI

Her bireyin alanları:
```
Kimlik:     id, sex, birth_day, death_day, is_dead, is_founder
Konum:      x, y (coğrafi koordinat), group_id
Sağlık:     health { hp, calories, hydration, pregnancy, infections[] }
Psikoloji:  psychology { stress_level, mental_state, bonding_scores }
Bilinç:     mind { consciousness (0-1), theory_of_mind }
Dil:        language { stage (0-5), vocabulary{}, foxp2_expression }
Teknoloji:  known_techs (Set)
İnanç:      beliefs (Set)
Ekonomi:    inventory { food, water, tools, crafts... }
Sosyal:     social { group_id, role, bonds }
Epigenome:  epigenome { HPA_AXIS, BDNF_PROMOTER... }
Davranış:   _behaviorCounts { hunt, gather, craft... }
Hafıza:     memory { events[], relationships }
Korku:      _fears { predator, disaster, scarcity, infection }
```

### Yaşam Evreleri
```
INFANT:     0-2 yaş   (anne envanterinden beslenir)
CHILD:      2-12 yaş
ADOLESCENT: 12-18 yaş
ADULT:      18-45 yaş
ELDER:      45+ yaş
```

---

## SİMÜLASYON ENGINE'LERİ

### 1. Biology
- **genome.js**: Lokus tanımları, gamet oluşturma, fenotip hesaplama, mutasyon
- **individual.js**: Birey yaratma (founder/newborn), yaşam evreleri
- **reproduction.js**: Üreme kontrolü, ikiz doğum, doğum komplikasyonları
- **mortality.js**: Ölüm olasılığı hesaplama (yaş, sağlık, çevre faktörleri)

### 2. Psychology
- Ruh hali (mental_state): calm, stressed, grieving, excited
- Bağlanma sistemi (bonding_scores): sosyal bağlar
- Kalabalık nüfus psikoloji istatistikleri

### 3. Consciousness
- Global Workspace Theory temelli
- Formül: `genetik_tavan × dil × sosyal × theory_of_mind`
- Sadece `updateConsciousness()` değiştirebilir

### 4. Language
- 5 aşama (stage 0-5):
  - 0: Sessiz
  - 1: Jestler/işaretler
  - 2: Proto-kelimeler
  - 3: Basit dil
  - 4: Karmaşık dil
  - 5: Soyut dil
- FOXP2 ifadesi dil kapasitesini etkiler
- Kelime hazinesi: CORE_CONCEPTS çevresinde oluşur
- Sosyal öğrenme: öğretmenden öğrenim (yakın mesafe gerekir)
- Bölgeye özgü fonoloji (phonology_seed)

### 5. Technology
- Tech tree: tier sistemi (0'dan başlar)
- Sadece gözlemle öğrenilir (Kardinal Kural)
- `checkTechEmergence()`: birey kendi başına keşfedebilir (eşik değerleri)
- Temel teknolojiler: fire_making, stone_tools, foraging
- İleri: hunting_spear, cooking, pottery, agriculture...

### 6. Belief
- `tryFormBelief()`: doğal afet, kıtlık, hava olayları tetikler
- İnanç yayılımı: grup içinde sosyal baskı
- Ritual emergence: yeterli inanç birikiminde
- `discoveredBeliefs` Set: medeniyetin bilinen inançları

### 7. Culture
- Kültürel memler (meme_id) gruplar arasında yayılır
- Grup kimliği oluşturur
- Tabu sistemi: bazı davranışlar kültürel olarak yasaklanır

### 8. Art
- Aktiviteden doğar (crafting, gözlem) — trait taramasından değil
- Keşfedilen sanat `discoveredArts` Set'e girer
- Sanat etkileri: grup moralini, yaratıcılığı artırır

### 9. Economy
- Kaynak toplama: gatherResources (biyom ve teknolojiye göre)
- Tüketim: consumeResources (günlük yiyecek/su ihtiyacı)
- Üretim: produceGoods (teknolojiye bağlı)
- Ticaret: attemptTrade (yakın bireyler arası)
- Ekonomik istatistikler: Gini katsayısı, refah dağılımı

### 10. Social
- Grup dinamikleri: birleşme, bölünme, liderlik
- Rol atama: davranış geçmişinden emerge eder
- Grup purge: boş gruplar temizlenir

### 11. Microbiome & Disease
- Gut microbiome diversity
- Enfeksiyon yayılımı (spreadInfection)
- Patojen tipleri: bakteriyel, viral, parazitik
- Bağışıklık: bireysel immune_strength

### 12. Epigenetics
- Çevresel stres → metilasyon değişimi
- Nesile kalıtım (heritability katsayıları)
- Kurucular özel: doğrudan epigenome yazılabilir

### 13. Environment
- Biyom tipleri: mediterranean, coastal, tropical_rainforest, temperate_forest, boreal_forest, tundra, mountain, grassland, desert, tropical_savanna
- Hava durumu: rain, heavy_rain, snow, blizzard, storm, heat_wave, drought
- Mevsimler: spring, summer, autumn, winter
- Doğal afetler: earthquake, flood, wildfire, blizzard_disaster
- Kaynak baskısı: food_abundance, water_abundance

### 14. Architecture
- Yerleşim oluşturma (createSettlement)
- İnşaat süreci
- Kalabalık kontrolü

### 15. Law
- Norm oluşturma (processLawTick)
- İhlal tespiti: fenotipten (agresyon, vicdanlılık)
- Sosyal düzen metriği

### 16. Astronomy
- Gök gözlemleri (celestialObservations Set)
- Astronomi bilgisi bonusları (tarım verimliliği, navigasyon)
- Mevsimsel hesaplamalar

### 17. Agent (Karar Sistemi)
- `selectAction()`: birey günlük aksiyonu seçer
- `accumulateExperience()`: deneyim biriktirir
- `checkTechEmergence()`: teknoloji emergence eşikleri

---

## TICK SİSTEMİ (Simülasyon Döngüsü)

Her tik = 1 simülasyon günü

### Tik içindeki işlem sırası:
1. Dünya durumu güncelle (hava, mevsim, kaynaklar)
2. Doğal afet kontrolü
3. Per-birey hesaplar (gather, consume, produce, mental state)
4. Bebek ekonomisi (anne envanterinden)
5. Fizyoloji güncelleme (HP, kalori, hidrasyon)
6. Çiftleşme dürtüsü
7. Hareket (band cohesion + survival needs + mating)
8. Korku azalması (T3'te)
9. Su deneyimi (gözlemsel yüzme öğrenimi)
10. Sosyal gruplar (T2'de)
11. Sosyal etkileşimler (bağlanma, ticaret, hastalık)
12. Üreme
13. Mikrobiyom & hastalık
14. Ölüm kontrolleri
15. Dil evrimi (T3'te)
16. Aile öğrenimi (T3'te)
17. FOXP2 ifadesi (T5'te)
18. Kelime hazinesi (T5'te)
19. Teknoloji emergence (T3'te)
20. Teknoloji gözlem öğrenimi (T2'de)
21. İnanç oluşumu (T2'de)
22. İnanç yayılımı (T3'te)
23. Kültür (T2'de)
24. Sanat (T3'te)
25. Mimari (T7'de)
26. Hukuk (T7'de, staggered)
27. Astronomi (T5'te)
28. Sosyal anlatı olayları (1% örnekleme)
29. İstatistik hesaplama
30. Checkpoint (her 1095 günde)
31. Broadcast (WebSocket)

### Throttle Sistemi (v2.2.9)
```
Normal mod (alive ≤ 280):  T2=2, T3=3, T5=5, T7=7
Heavy mod  (alive > 280):  T2=4, T3=6, T5=10, T7=14
100x hız:                  T2=4, T3=6, T5=10, T7=14
```
Stagger offsetleri (aynı T'li sistemler farklı günlere dağıtılır):
- S1 = T2>2 ? 2 : 1
- S2 = T3>3 ? 2 : 1
- S3 = T3>3 ? 4 : 2

---

## PERFORMANS TARİHİ

| Versiyon | Ort. ms | Maks ms | Tik/sn | Yaşayan | Ana değişiklik |
|----------|---------|---------|--------|---------|----------------|
| v2.2.3 | 339 | 1501 | 2.9 | 359 | — |
| v2.2.4 | 177 | 501 | 5.7 | 286 | O(N²) belief fix, group fix |
| v2.2.5 | ~160 | ~450 | ~6 | ~270 | subStatCache, artEffects fix |
| v2.2.6 | ~150 | ~420 | ~6.7 | ~260 | persist=false narrative events |
| v2.2.7 | 137 | 401 | 7.3 | 229 | 100x adaptive throttle |
| v2.2.8 | 124 | 455 | 8.1 | 237 | Stagger offsets, lang/tech throttle |
| v2.2.9 | ~140 | ~800 | ~6 | 351 | Heavy mode (alive>280), son ms panel |

---

## VERİTABANI YAPISI

### Tablolar (SQLite)
- `individuals`: tüm bireyler (canlı + ölü)
- `checkpoints`: 1095 günde bir nüfus snapshot
- `events`: simülasyon olayları (ölüm, doğum, teknoloji, inanç...)
- `technologies`: keşfedilen teknolojiler
- `beliefs`: keşfedilen inançlar
- `languages`: dil kayıtları
- `groups`: sosyal gruplar
- `conversations`: konuşmalar
- `publications`: yayınlar

### Event Sistemi
- `persist=true`: DB'ye yazılır (ölüm, doğum, teknoloji, inanç, milestone)
- `persist=false`: Sadece ring buffer + WebSocket (narrative, iletişim)
- Event buffer: 50 olayda veya 5 saniyede flush (async, non-blocking)

---

## KOĞRAFİ SİSTEM

- Koordinatlar: gerçek dünya enlem/boylam
- `isOnLand()`: land mask — bireyleri okyanusa düşmekten korur
- Analand başlangıcı: Anatolia bölgesi (31-41 koordinatları)
- `buildSpatialGrid()`: O(1) komşu arama (hücre boyutu = SOCIAL_INTERACTION_RADIUS = 2°)
- `getNeighbours()`: 3×3 grid hücresi taraması

---

## API YAPISI

### Endpoint'ler
```
POST /api/simulations          → yeni simülasyon
GET  /api/simulations/:id      → simülasyon durumu
POST /api/simulations/:id/start → başlat
POST /api/simulations/:id/pause → duraklat
GET  /api/simulations/:id/metrics → performans metrikleri
GET  /api/simulations/:id/diagnostics → hata log
GET  /api/simulations/:id/db-status → DB istatistikleri
POST /api/simulations/:id/fast-forward → warp modu
WebSocket /ws                  → gerçek zamanlı tick verisi
```

---

## FRONTEND (React)

### Paneller
- **SimulationPanel**: Harita, biyom görünümü, birey noktaları
- **PerformancePanel**: Son ms, Ort/Maks/Min ms, Tik/sn, Heavy mode göstergesi
- **PopulationPanel**: Nüfus grafiği, demografi
- **EventsPanel**: Olaylar akışı (doğum, ölüm, teknoloji...)
- **IndividualPanel**: Birey detayı (genom, psikoloji, dil...)
- **GroupPanel**: Grup listesi, roller
- **TechPanel**: Teknoloji ağacı
- **BeliefPanel**: İnanç sistemi

### Store (Zustand)
- `useSimStore`: simülasyon durumu, metrikler, WebSocket

---

## RUST PROJESİ İÇİN ÖNCE YAPILACAKLAR

1. Proje iskeletini kur (Cargo.toml, workspace yapısı)
2. Temel veri yapıları (Individual, Genome, WorldState struct'ları)
3. ECS sistemi tasarımı (Component, Entity, System)
4. Rayon ile paralel tik döngüsü
5. Axum ile HTTP + WebSocket server
6. SQLx ile SQLite bağlantısı
7. Engine'lerin tek tek portu (biology önce)
8. React frontend entegrasyonu
9. Tauri desktop wrapper

---

## ÖNEMLİ NOTLAR

- Kullanıcı Rust bilmiyor, sen yazıyorsun
- Mevcut `anatolia-sim` kenarda bekliyor, referans olarak kullanılabilir
- Simülasyon mekaniği JS versiyonuyla aynı kalacak, sadece Rust'a çevrilecek
- Kardinal kurallar kesinlikle korunacak
- Akademik tez — bilimsel doğruluk performanstan önce gelir
- Uzun vadede katmanlı ölçek sistemi gerekecek (bireysel → grup → uygarlık)
