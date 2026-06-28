# ANATOLIA SIM — YENİ OTURUM BRİEFİNG

Bu belgeyi yeni bir Claude oturumunda ilk mesaj olarak gönder.

---

## PROJE VİZYONU

**Ne yapıyoruz:** Gerçek dünyayı simüle ediyoruz. Gerçek insan medeniyetinin nasıl geliştiğini, binlerce yıl içinde ne seviyeye geleceğini simüle eden bir sistem.

**Tez konusu:** Simülasyon hipotezi — gerçekliğin simüle edilip edilemeyeceğini test etmek. Bireysel ajan simülasyonundan makro medeniyet emergence'ına geçişin modellemesi.

**Hedef:** Dünya çapında bu alanda en iyi akademik simülasyon.

**Önemli:** Bu bir oyun değil, tez projesi. Geliştirici (kullanıcı) Rust bilmiyor ama sen yazacaksın.

**Şirket:** Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. (RST Q-Nation 200120401018)

**HER ZAMAN VERSİYON YENİLE:** Her değişiklik setinde `package.json` versiyonunu yükselt.

---

## MEVCUT PROJE (Kenarda bekleyecek)

**Repo:** `atabeyler/anatolia-sim` (GitHub)
**Stack:** Node.js + Express + PostgreSQL + React + Electron
**Versiyon:** v2.2.9
**Deploy:** Render.com (web), Electron (masaüstü)
**Performans durumu:** ~351 yaşayanda 248ms/tik — v2.2.9 ile heavy mode eklendi ama mimari sınıra yaklaşıldı.

### Veritabanı Modları
```
DESKTOP_LOCAL_DB=1     → Tam offline (PGlite her şey için)
DESKTOP_SIM_LOCAL=1    → Hibrit (Render kullanıcılar için, PGlite sim verisi için)
neither                → Web modu (Render her şey için)
```
- **PGlite**: `@electric-sql/pglite` — tarayıcıda/Electron'da çalışan PostgreSQL uyumlu embedded DB
- **PostgreSQL pool**: `pg` paketi, max 5 bağlantı, SSL remote, search_path=antsim
- DB path: `.anatolia-sim/pgdata` (yerel mod)

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

### Fenotip Trait'leri (Simulations route — TRAIT_LOCI)
```
fluid_intelligence: BDNF, COMT, DTNBP1, NRG1, DISC1
curiosity:          DRD4
conscientiousness:  DISC1, COMT
language_capacity:  FOXP2, CNTNAP2
artistic_sense:     NRG1, DRD4
self_awareness:     NRXN1, SHANK3
stress_resilience:  SLC6A4
learning_rate:      ADRA2B, BDNF, COMT
risk_tolerance:     CACNA1C, DRD4
innovation:         CACNA1C, NRG1, BDNF
empathy:            OXTR, RELN
social_bonding:     OXTR
aggression:         MAOA
cooperation:        AVPR1A, OXTR
dominance:          DRD2, MAOA, DISC1
height:             HEIGHT_01/02/03
metabolism:         METABOLISM_01
physical_strength:  STRENGTH_01
endurance:          ACTN3, METABOLISM, STRENGTH
immune_strength:    IMMUNE_01/02
fertility:          FSHR
longevity:          TERT, APOE
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
Görünüş:    appearance { height_cm, weight_kg, eye_color, hair_color, skin_tone }
```

### Yaşam Evreleri
```
INFANT:     0-2 yaş   (anne envanterinden beslenir)
CHILD:      2-12 yaş
ADOLESCENT: 12-18 yaş
ADULT:      18-45 yaş
ELDER:      45+ yaş
```

### Fiziksel Görünüş (agePhysique)
- Erkek yetişkin boy: 155-200 cm (heightFactor ile)
- Kadın yetişkin boy: 145-185 cm
- Yaşa göre büyüme eğrisi: newborn→infant→child→adolescent→adult

---

## KARAR SİSTEMİ (decisionEngine.js)

10 eylem, her tik bireyin ihtiyacına göre puanlandırılır:
```
FORAGE      → Yiyecek ara (kalori < 0.4 ise öncelik)
DRINK       → Su ara (hidrasyon < 0.3 ise acil)
FLEE        → Kaç (korku veya predator yakınsa)
SEEK_WARMTH → Isın (soğuk iklimde, düşük HP'de)
REST        → Dinlen (HP < 0.3 ise)
HUNT        → Av (av yoğunluğu varsa ve beceri yeterliyse)
CRAFT       → Üret (alet/zanaat — teknoloji gerektirir)
SOCIALIZE   → Sosyalleş (bağ puanı düşükse)
MATE        → Üre (yetişkin, sağlıklı, partner bulunabilir)
EXPLORE     → Keşfet (merak puanı yüksek, kaynak yeterliyse)
```
- `accumulateExperience()`: eylem sonrası deneyim biriktirilir
- `checkTechEmergence()`: belirli deneyim eşiklerinde teknoloji keşfi

---

## SİMÜLASYON ENGINE'LERİ

### 1. Biology
- **genome.js**: Lokus tanımları, gamet oluşturma, fenotip hesaplama, mutasyon
- **individual.js**: Birey yaratma (founder/newborn), yaşam evreleri, `getAge()`
- **reproduction.js**: Üreme kontrolü, ikiz doğum, doğum komplikasyonları
- **mortality.js**: Ölüm olasılığı hesaplama (yaş, sağlık, çevre faktörleri)

#### Ölüm Nedeni Kategorileri (mortality.js)
```
starvation, dehydration, old_age, predator, genetic_disease,
infection, trauma, birth_complications, conflict, drowning, unknown,
disease_intestinal_parasite, disease_cholera_like,
disease_respiratory_common, disease_pneumonia_like,
disease_plague_like, disease_malaria_like, disease_fever_tick,
disease_wound_infection, disease_fungal_skin
```

### 2. Psychology
- Ruh hali (mental_state): calm, stressed, grieving, excited
- Bağlanma sistemi (bonding_scores): sosyal bağlar
- Kalabalık nüfus psikoloji istatistikleri

### 3. Consciousness
- Global Workspace Theory temelli (Baars 1988, Dehaene 2011)
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
- **nameEngine.js**: prosedürel Anadolu-esintili isim üretimi
  - Erkek: Arak, Katan, Talur, Muran, Dalan, Korun...
  - Kadın: Ela, Sera, Kaya, Mara, Sina, Tala...

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
Stagger offsetleri:
- S1 = T2>2 ? 2 : 1
- S2 = T3>3 ? 2 : 1
- S3 = T3>3 ? 4 : 2

### Coğrafi Sistem
- Koordinatlar: gerçek dünya enlem/boylam
- `isOnLand()`: land mask — bireyleri okyanusa düşmekten korur
- Başlangıç bölgesi: Anatolia (31-41 koordinatları)
- `buildSpatialGrid()`: O(1) komşu arama (hücre boyutu = SOCIAL_INTERACTION_RADIUS = 2°)
- `getNeighbours()`: 3×3 grid hücresi taraması

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

## VERİTABANI YAPISI (PostgreSQL / PGlite)

### Tablolar
```sql
users               -- Kullanıcılar (id, first_name, last_name, tc_no, email,
                    -- password_hash, user_code, username, role, is_approved)
simulations         -- Simülasyonlar (id, user_id, name, status, current_day,
                    -- current_year, world_state JSON, speed_multiplier...)
individuals         -- Bireyler (id, sim_id, sex, birth_day, death_day, is_dead,
                    -- is_founder, x, y, genome JSON, phenotype JSON,
                    -- epigenome JSON, health JSON, mind JSON, language JSON,
                    -- inventory JSON, social JSON, _behaviorCounts JSON...)
checkpoints         -- Anlık durum kayıtları (id, sim_id, sim_day, sim_year,
                    -- population_count, world_state JSON)
god_interventions   -- Tanrı müdahaleleri (id, sim_id, type, params JSON,
                    -- affected, deaths, user_note)
individual_conversations -- Gemini AI konuşmaları (id, sim_id, individual_id,
                    -- message, response, created_at)
technologies        -- Keşfedilen teknolojiler (id, sim_id, tech_id, discovered_day)
belief_systems      -- İnanç sistemleri (id, sim_id, belief_id, emerged_day)
language_records    -- Dil kayıtları (id, sim_id, stage, vocabulary JSON)
simulation_events   -- Olaylar (id, sim_id, sim_day, sim_year, event_type,
                    -- description, importance, data JSON, persist)
social_groups       -- Sosyal gruplar (id, sim_id, members JSON, role_counts JSON)
publications        -- Yayınlar (id, sim_id, title, content, created_at)
```

### Event Sistemi
- `persist=true`: DB'ye yazılır (ölüm, doğum, teknoloji, inanç, milestone)
- `persist=false`: Sadece ring buffer + WebSocket (narrative, iletişim)
- Event buffer: 50 olayda veya 5 saniyede flush (async, non-blocking)
- Event tipleri: birth, death, technology, language, discovery, disaster, belief, culture, activity, thought, sleep, mating, communication, norm_emerged, norm_violation

---

## API YAPISI (Server Routes)

### Auth Routes (`/api/auth`)
```
POST /api/auth/register    → Kayıt (first_name, last_name, tc_no, email, password, user_code)
POST /api/auth/login       → Giriş → JWT token döner
POST /api/auth/approve     → Admin onayı (token ile)
GET  /api/auth/me          → Mevcut kullanıcı bilgisi
```
- TC kimlik no: 11 haneli sayı zorunlu
- Şifre: 8+ karakter, büyük/küçük harf, rakam, özel karakter
- Web modunda: kayıt → admin email bildirimi → admin onayı (7 günlük JWT token)
- Desktop modunda: otomatik onay (isApproved=true, role='user')
- Rate limiting: login (15dk/10), register (1saat/5)
- User code: 4-20 karakter, harf+rakam (ör: ANSAB1234)

### Simulation Routes (`/api/simulations`)
```
POST /api/simulations                    → Yeni simülasyon oluştur
GET  /api/simulations                    → Kullanıcının simülasyonları
GET  /api/simulations/:id                → Simülasyon detayı
POST /api/simulations/:id/start          → Başlat
POST /api/simulations/:id/pause          → Duraklat
DELETE /api/simulations/:id             → Sil
GET  /api/simulations/:id/metrics        → Performans metrikleri
GET  /api/simulations/:id/diagnostics   → Hata log
GET  /api/simulations/:id/db-status     → DB istatistikleri
GET  /api/simulations/:id/population    → Nüfus listesi (alive=true&limit=50)
POST /api/simulations/:id/fast-forward  → Warp modu hedefi
GET  /api/simulations/:id/checkpoints   → Checkpoint listesi
POST /api/simulations/:id/checkpoint    → Manuel checkpoint kaydet
POST /api/simulations/:id/restore/:cpId → Checkpoint geri yükle
WebSocket /ws?simId=...                  → Gerçek zamanlı tick verisi
```

### God Routes (`/api/god`)
```
POST /api/god/:simId/intervene   → Müdahale (type + params)
POST /api/god/:simId/quarantine  → Karantina modu (enabled: bool)
POST /api/god/:simId/talk/:indId → Bireyyle konuş (Gemini AI)
```
Müdahale tipleri:
- `earthquake`: magnitude, lat, lon, radius
- `flood`: severity, lat, lon, radius
- `drought`: {}
- `epidemic`: mortality_rate, spread_rate
- `volcano`: power, lat, lon, radius
- `meteor`: size, lat, lon
- `genetic_boost`: individual_id, trait, amount (SADECE kurucular)
- `instant_death`: individual_id
- `longevity`: individual_id, extra_years

### Analysis Routes (`/api/analysis`)
```
POST /api/analysis/:simId          → BOLD AI analiz sohbeti (Gemini)
POST /api/analysis/:simId/hypothesis → Hipotez testi
```
- Context: canlı simülasyon verisi, worldState, nüfus istatistikleri
- Hipotez sonucu: verdict (supported/refuted/inconclusive), confidence, ci_lower, ci_upper, n_evidence, reasoning

### Aria Routes (`/api/aria`)
```
POST /api/aria/chat    → Aria AI genel asistan (Gemini)
```
- Aria: genel simülasyon soruları için asistan
- BOLD: simülasyon-spesifik analiz için

### Admin Routes (`/api/admin`)
- Kullanıcı yönetimi, onay işlemleri

---

## YI (YAPAY ZEKA) ENTEGRASYONU

### Gemini AI (gemini.js)
```javascript
// Varsayılan model: gemini-2.0-flash-lite
// Ortam değişkeni: GEMINI_MODEL, GEMINI_API_KEY
geminiChat({ system, user, model, max_tokens=500, temperature=0.2 })
```
- Retry: 3 deneme, 1s/2s/4s backoff
- Retryable HTTP kodları: 429, 500, 502, 503, 504
- Dil desteği: tr/en/de/fr/ar (system prompt'a dil talimatı eklenir)

### BOLD AI (analysis.js)
- Canlı simülasyon verisi ile bağlamsal analiz
- Engine context: worldState, nüfus, ölümler, teknoloji, inanç, kültür, hukuk
- Dil talimatı: "Respond ONLY in [Language]"
- Hipotez testi: statistical verdict + confidence interval

### Individual Talk (god.js)
- Seçili bireyle Gemini üzerinden konuşma
- Yanıt bireyin dil aşamasına göre kısıtlanır (stage 0-5)
- Konuşma geçmişi `individual_conversations` tablosuna kaydedilir

---

## WEBSOCKET SİSTEMİ (useSimWebSocket.ts)

### Bağlantı
```
ws://host/ws?simId=...
wss://host/ws?simId=... (HTTPS'de)
```
- Token: URL'de değil, ilk mesaj olarak gönderilir (proxy güvenliği)
- Reconnect: exponential backoff 3s → 6s → 12s → 30s max
- 1008 close code: simülasyon bulunamadı → yeniden bağlanma yok
- Visibility change: sekme geri gelince hemen bağlan
- iOS bfcache: pageshow event'te yeni bağlantı

### Mesaj Tipleri (Server → Client)
```
tick             → {stats, events[], centroid_trail, is_warping, fast_forward_target}
milestone        → {key, description, icon, day}
status           → {engine_running, is_warping, fast_forward_target}
simulation_ended → {reason}
error            → {error}
{"type":"ping"}  → Client {"type":"pong"} ile yanıt verir
```

### Store'a Yazılan Veriler (useSimStore)
```
setStats(data.stats)
addEvent(event) → deduplicated, max 200 event
setCentroidTrail(data.centroid_trail)
setIsWarping(bool)
setFastForwardTarget(number|null)
addMilestone({key, description, icon, day})
setSimulationEnded(reason)
```

---

## FRONTEND MİMARİSİ (React + Vite + TypeScript)

### State Management: Zustand (useSimStore)
```typescript
// Temel state alanları:
user: { id, username, email, role, first_name, last_name } | null
accessToken: string | null
currentSim: Simulation | null
stats: SimStats | null
events: SimEvent[]          // max 200, deduplicated
centroidTrail: CentroidPoint[]
milestones: MilestoneEvent[]
moments: Moment[]
engineMetrics: EngineMetrics | null
watchedIndividualId: string | null
activePanel: string | null
lang: 'en' | 'tr' | 'de' | 'fr' | 'ar'
theme: 'dark' | 'light'
speedMultiplier: number
sidebarExpanded: boolean
isWarping: boolean
fastForwardTarget: number | null
simulationEnded: string | null
updatePercent: number | null
updateReady: { version? } | null
```

### i18n Sistemi (utils/i18n.ts)
- 5 dil: tr, en, de, fr, ar
- `text(lang, {tr, en, de, fr, ar})` helper
- `translateEventDescription()`: olay açıklaması çevirisi
- `translateEventType()`: olay tipi çevirisi
- `translateStageName()`: aşama adı çevirisi
- Dil değiştirme: toggleLang() veya setLang()
- localStorage'a kaydedilir: `anatolia_lang`
- Dil sırası: LANG_CODES dizisi ile çevrim

---

## SOL PANEL (LeftPanel.tsx) — MODÜLLER

21 modül, sidebar'da listelenmiş:

```
population   → Nüfus          (Users ikonu)
biology      → Biyoloji        (Dna ikonu)
environment  → Çevre           (TreePine ikonu)
astronomy    → Astronomi        (Telescope ikonu)
culture      → Kültür           (Brain ikonu)
language     → Dil              (MessageSquare ikonu)
technology   → Teknoloji        (Cpu ikonu)
belief       → İnanç            (Flame ikonu)
social       → Sosyal           (Swords ikonu)
economy      → Ekonomi          (Coins ikonu)
art          → Sanat            (Music ikonu)
architecture → Mimari           (Building2 ikonu)
law          → Hukuk            (Scale ikonu)
microbiome   → Mikrobiyom       (Microscope ikonu)
psychology   → Psikoloji        (HeartPulse ikonu)
epigenetics  → Epigenetik       (Zap ikonu)
genealogy    → Soy Ağacı        (GitBranch ikonu)
--- AYRAÇ ---
god          → Tanrı Modu       (Zap ikonu, turuncu #f97316)
timemachine  → Zaman Makinesi   (Clock ikonu, mavi #00d4ff)
analysis     → AI Analiz        (Bot ikonu, yeşil #4ecb71)
hypothesis   → Hipotez          (FlaskConical ikonu, altın #d4a838)
```

Sidebar genişleme: 176px (expanded) / 48px (collapsed), animasyonlu
Aktif panel: setActivePanel() ile toggle (aynı panele tıklayınca kapanır)

---

## UI PANELLERİ

### 1. PopulationPanel (Nüfus)
- Canlı nüfus, toplam doğan, yaşayan/ölü oranı
- Bireysel profil listesi (ad, yaş, cinsiyet, sağlık)
- Ölüm nedeni istatistikleri (CAUSE_I18N ile çeviri)
- Prosedürel isim üretimi (nameEngine — ID hash'den)
- Yaşam evresi renk kodlaması
- Açılır birey detayı (expand/collapse)

### 2. BiologyPanel (Biyoloji)
- Seçili bireyin genom/fenotip görünümü
- Tüm trait değerleri (fluid_intelligence... longevity)
- Epigenome durumu
- Sağlık metrikleri (HP, kalori, hidrasyon)

### 3. EnvironmentPanel (Çevre)
- Mevcut biyom, mevsim, sıcaklık
- Food/water abundance gauge'ları
- Hava durumu
- Son afet durumu

### 4. AstronomyPanel (Astronomi)
- Keşfedilen gök gözlemleri
- Astronomi bilgi seviyesi
- Mevsimsel navigasyon bonusları

### 5. CulturePanel (Kültür)
- Aktif kültürel memler
- Kültür yayılım haritası
- Tabu listesi

### 6. LanguagePanel (Dil)
- Mevcut dil aşaması (0-5)
- Kelime hazinesi sayısı
- FOXP2 ifade düzeyi
- Dil aşaması ilerleme çubuğu

### 7. TechnologyPanel (Teknoloji)
- Keşfedilen teknolojiler listesi
- Teknoloji ağacı görünümü
- Keşif tarihleri (gün/yıl)

### 8. BeliefPanel (İnanç)
- Aktif inanç sistemleri
- İnanç yayılım oranları
- Ritual gelişimi

### 9. SocialPanel (Sosyal)
- Grup listesi ve üye sayıları
- Rol dağılımı (lider, şaman, avcı)
- Grup birleşme/bölünme olayları

### 10. EconomyPanel (Ekonomi)
- Gini katsayısı
- Ortalama refah
- Kaynak dağılımı
- Ticaret aktivitesi

### 11. ArtPanel (Sanat)
- Keşfedilen sanat biçimleri
- Sanatın grup morali üstüne etkisi

### 12. ArchitecturePanel (Mimari)
- Yerleşimler ve inşaatlar
- Kalabalık seviyesi

### 13. LawPanel (Hukuk)
- Aktif normlar
- İhlal oranları
- Sosyal düzen metriği

### 14. MicrobiomePanel (Mikrobiyom)
- Gut microbiome diversity
- Aktif enfeksiyonlar
- Patojen dağılımı

### 15. PsychologyPanel (Psikoloji)
- Ortalama stres seviyesi
- Mental state dağılımı (calm/stressed/grieving/excited)
- Bağlanma puanı

### 16. EpigeneticsPanel (Epigenetik)
- Popülasyon genelinde epigenome durumu
- HPA_AXIS, BDNF_PROMOTER, MAOA_REGULATION...
- Nesiller arası kalıtım görünümü

### 17. GenealogyPanel (Soy Ağacı)
- Aile ağacı görünümü
- Akraba evliliği katsayıları
- Soy hatları

### 18. GodPanel (Tanrı Modu) ⚡
**Doğal Afetler (6 tür):**
- Deprem (earthquake): magnitude, lat/lon, radius
- Sel (flood): severity, lat/lon, radius
- Kuraklık (drought)
- Salgın (epidemic): mortality_rate, spread_rate
- Volkan (volcano): power, lat/lon, radius
- Meteor (meteor): size, lat/lon

**Bireysel Anomali:**
- Dropdown: canlı bireyler listesi (50 kişi, API'den)
- Uzun Ömür: seçili bireye +50 yıl
- Anında Ölüm: seçili bireyyi öldür (confirm dialog)
- Yenile butonu: nüfus listesini güncelle

**Bireyyle Konuş (Gemini AI):**
- Textarea: mesaj yaz
- Bireyin dil aşamasına göre yanıt alır
- Konuşma geçmişi gösterilir

**Karantina Modu:**
- Toggle: afetleri bastır
- API: POST /api/god/:simId/quarantine

### 19. TimeMachinePanel (Zaman Makinesi) ⏰
- Checkpoint listesi (her 365 günde otomatik kaydedilir)
- Manuel kaydet butonu
- Seçili checkpoint'e geri dönme
- API: GET /checkpoints, POST /checkpoint, POST /restore/:id

### 20. AnalysisPanel (AI Analiz — BOLD)
- Gemini AI ile sohbet arayüzü
- Hazır sorular: "Nüfus neden büyümeyi durdurdu?", "Çöküş riski?"...
- Canlı simülasyon bağlamı otomatik eklenir
- Yanıtlar seçilen dilde gelir

### 21. HypothesisPanel (Hipotez Testi)
- Hipotez textarea
- Örnek hipotezler (4 dilde)
- Adam & Eve Metrikleri: bilinç, ToM, kelime, dil aşaması, teknoloji, inanç, sanat, QoL
- Test sonucu: supported/refuted/inconclusive + güven aralığı + açıklama

### 22. StatsPanel (İstatistikler)
- Çizgi grafik (Recharts): nüfus, besin, su, mutluluk, bilinç, dil
- 6 metrik seçilebilir
- Sürüklenebilir panel (useDrag hook)
- Gauge bar'lar (0-100%)

### 23. EventsPanel (Olaylar)
- Filtreler: Tümü, Doğum, Ölüm, Teknoloji, Dil, Keşif, Afet, İnanç, Kültür, Aktivite
- Renk kodlu olay ikonları (+ doğum, † ölüm, ⚙ teknoloji...)
- Olay yükleme: GET /api/simulations/:id/events
- Ring buffer: max 200 event (WebSocket'ten)

### 24. PopulationPyramidPanel (Nüfus Piramidi)
- Yaş-cinsiyet piramidi
- Yaş grubu dağılımı

### 25. ReportPanel (Rapor)
- Simülasyon özeti
- Dönemsel istatistikler

### 26. MomentsPanel (Anlar)
- Önemli anlar galerisi
- Birey ve medeniyet milestone'ları
- `addMoment()` ile eklenir, max 100 moment

### 27. PerformancePanel (Performans)
- Poll interval: 5000ms
- Satırlar: Son ms (amber), Ort. ms (yeşil), Maks ms (kırmızı), Min ms (mavi)
- AĞIR MOD (HEAVY MODE) badge: alive > 280 olunca görünür (#d4a838)
- Tik/sn, Hız, Nüfus, Toplam Doğan, Güncel Gün
- Progress bar'lar: max 500ms ölçeği
- Centroid trail mini-harita

---

## LAYOUT BİLEŞENLERİ

### LeftPanel (Sol Kenar Çubuğu)
- 21 modül butonu
- Genişleyebilir/daraltılabilir (176px / 48px)
- Aktif panel: turuncu/mavi/yeşil renk vurgusu

### FooterBar (Alt Çubuk)
- "RST Q-Nation 200120401018 © 2026 · Bold Askeri Teknoloji ve Savunma Sanayi A.Ş."
- Modes: 'fixed' (simülasyon sayfasında), 'flow' (dashboard), 'inline'
- UpdateBanner görünürken 44px yukarı kayar

### UpdateBanner (Güncelleme Bildirimi)
- `updatePercent`: indirme yüzdesi
- `updateReady`: yeni versiyon hazır
- Electron auto-updater entegrasyonu

### LangToggle (Dil Değiştirici)
- 5 dil döngüsü: tr → en → de → fr → ar → tr
- localStorage'a kaydeder

### AriaButton
- Aria AI asistanına kısa yol

### SimMenuOverlay
- Simülasyon ayarları overlay'i

---

## SİMÜLASYON BİLEŞENLERİ

### WorldGlobe (Dünya Küresi)
- Three.js + React Three Fiber (@react-three/fiber)
- OrbitControls + Stars (@react-three/drei)
- Gerçek Dünya doku haritaları (THREE.js r128 textures)
- Bireyler: soft-glow sprite noktaları (renk kodlu)
- Centroid trail: göç izleme çizgisi
- Biyoma göre renk kodlama
- Gezegen seçeneği: Dünya + Jüpiter (gradient bant dokusu)

### WitnessPanel (Tanık Paneli)
- Sürüklenebilir panel (useDrag hook)
- Seçili bireyin anlık yaşam anlatısı
- Health, mind, language, fears gibi durumları insanlaştırır
- `watchedIndividualId` store'dan

### MilestoneToast (Kilometre Taşı Bildirimi)
- WebSocket'ten gelen milestone olayları
- Pop-up bildirim (ikon + açıklama)

---

## SİMÜLASYON OLUŞTURMA SİHİRBAZI (SimCreationWizard)

### Adımlar
1. **Temel Ayarlar**: Simülasyon adı, başlangıç koordinatları
2. **Adam** (Erkek kurucu): 20 trait + 3 görünüş seçeneği
3. **Havva** (Kadın kurucu): 20 trait + 3 görünüş seçeneği
4. **Onay**: Özet görünümü ve başlat

### 20 Genetik Trait (SimCreationWizard)
```
ZİHİN — BİLİŞSEL:
  fluid_intelligence  → Zeka (Genius/Ordinary)
  curiosity           → Merak
  language_capacity   → Dil Yeteneği
  learning_rate       → Öğrenme Hızı

ZİHİN — KİŞİLİK:
  conscientiousness   → Disiplin
  self_awareness      → Öz Farkındalık
  stress_resilience   → Stres Direnci
  risk_tolerance      → Risk Toleransı
  innovation          → İnovasyon
  artistic_sense      → Sanat Duygusu

SOSYAL:
  empathy             → Empati
  social_bonding      → Sosyal Bağ
  aggression          → Saldırganlık
  cooperation         → İşbirliği
  dominance           → Liderlik Eğilimi

BEDEN:
  physical_strength   → Fiziksel Güç
  endurance           → Dayanıklılık
  immune_strength     → Bağışıklık
  fertility           → Üreme Dürtüsü
  longevity           → Uzun Ömür
```

### 3 Görünüş Seçeneği
```
Göz rengi:   brown / hazel / green / blue
Saç rengi:   black / dark / brown / light / blond / red
Ten rengi:   fair / light / olive / tan / brown / dark
```

### Trait Meta Bilgisi (TRAIT_META)
Her trait için:
- `lo`/`hi`: Düşük/yüksek değer tanımı (5 dilde)
- `fx`: Etki alanları (Teknoloji hızı, Araştırma...)
- `d`: 3 seviye açıklaması
- `r`: 3 referans karşılaştırması (Neanderthal, Orta Çağ Anadolu, ...)

### Kurucu Fiziksel Ölçüler
```
Yenidoğan:  48-54 cm, 2.8-4.0 kg
Bebek:      54-85 cm, 4-12 kg
Çocuk:      85-adultH*0.83 cm, 12-35 kg
Ergen:      adultH*0.83-adultH cm
Yetişkin:   Erkek 155-200cm, Kadın 145-185cm
```

---

## YETKİLENDİRME (Auth Sistemi)

### Kullanıcı Rolleri
```
pending  → Kayıt yapılmış ama onay bekliyor
user     → Onaylanmış kullanıcı
admin    → Tam yetki
```

### Onay Akışı (Web)
1. Kullanıcı kayıt → role='pending', is_approved=false
2. Admin email bildirimi (nodemailer/email.js)
3. Admin approval token'ı tıklar (7 günlük JWT)
4. `POST /api/auth/approve?token=...` → role='user', is_approved=true
5. Kullanıcıya onay email'i gönderilir

### Onay Akışı (Desktop)
- `isDesktopLocalDb=true` → otomatik onay, role='user'

### JWT
- Secret: `process.env.JWT_SECRET || 'anatolia-sim-local-approval-secret'`
- Token: Bearer authentication
- `authenticate` middleware: header'dan okur, doğrular
- `requireSimulationOwner`: simülasyonun sahibi olduğunu kontrol eder

---

## ELECTRON DESKTOP

### Özellikler
- electron v31.6.0, electron-builder v25.1.8
- electron-updater: otomatik güncelleme
- Ana süreç: `desktop/main.mjs`
- `inject-config.mjs`: build'den önce config enjeksiyonu

### Build Hedefleri
```
npm run dist        → Windows NSIS (.exe)
npm run dist:mac    → macOS DMG (x64 + arm64)
npm run dist:linux  → Linux AppImage (x64)
```

### Auto-Update Flow
1. `updatePercent` → UpdateBanner'da indirme yüzdesi
2. `updateReady` → "Yeniden Başlat ve Yükle" butonu
3. UpdateBanner FooterBar'ın üstünde 44px yükseklikte

### GitHub Publish
```json
{
  "provider": "github",
  "owner": "atabeyler",
  "repo": "anatolia-sim",
  "releaseType": "release"
}
```

---

## GITHUB ACTIONS CI

- Workflow: Windows Installer Derlemesi
- Tetikleyici: push to main
- Başarısız commits TypeScript build hatası verirse sonraki commit ile düzelir
- TypeScript derleme hatası = EngineMetrics interface güncellenmemiş

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

## SAYFALAR (React Router)

### Routing
```
/              → LoginPage (giriş yapılmamışsa)
/dashboard     → DashboardPage
/simulation/:id → SimulationPage
/watch/:simId  → WatchPage (herkese açık izleme)
/admin         → AdminPage (sadece role='admin')
```

### LoginPage (Giriş Sayfası)
- **Arka plan:** Canvas tabanlı yıldız alanı (280 yıldız, kayan yıldız efekti, hue 200-260)
- **Scan line:** HUD tarama çizgisi animasyonu
- **Sekmeler:** GİRİŞ (Login) / KAYIT (Register) — aralarında geçiş
- **Login formu:** Email + Şifre
- **Register formu:** Ad, Soyad, TC Kimlik No, Email, Şifre, Kullanıcı Kodu (ANS + 2 harf + 4 rakam)
- **Başarılı login:** JWT token → sessionStorage'a `anatolia_session_active` → /dashboard'a yönlendirme
- **Dil değiştirici:** LangToggle (5 dil) sağ üstte
- **Footer:** FooterBar (mode='flow')
- **Hata mesajları:** "Kullanıcı kodu bulunamadı", "Yanlış şifre", "Onay bekliyor" vb.

### DashboardPage (Ana Sayfa)
- **Header:** Logo + Kullanıcı kodu + Çıkış butonu
- **Simülasyon listesi:** Kullanıcının simülasyonları (durum, nüfus, gün/yıl)
- **Yeni Simülasyon:** SimCreationWizard modal
- **Live panel:** 20 saniyede bir güncellenen canlı simülasyonlar
- **Cloud sims:** Bulut senkronizasyonu (hibrit modda)
- **Karşılaştırma modu:** compareMode toggle
- **Silme:** confirm dialog + `/api/simulations/:id` DELETE
- **Aria entegrasyonu:** `window.__ariaDashboardReady`, `window.__ariaWizardOpen`
  - Aria komutları: create_simulation, open_simulation, toggle_compare, wizard_exit, open_menu, delete_simulation
- **Menu:** SimMenuOverlay (hamburger butonu)
- **Footer:** FooterBar (mode='flow')

### SimulationPage (Simülasyon Sayfası)
- **URL:** `/simulation/:id`
- **WebSocket:** `useSimWebSocket(simId)` bağlantısı
- **Üst Bar:**
  - Simülasyon adı
  - Tarih göstergesi (Yıl X · Gün Y)
  - Mevsim ikonu (spring/summer/autumn/winter)
  - Hız butonları: 1x, 5x, 20x, 100x (SPEEDS dizisi)
  - BAŞLAT / DURDUR / HIZLANDIR / KORUMA / SAĞLIK / ÖLÜM / SİL / GÖRKEMLI / KAYIT / DURDUR / WARP butonları (SHOWCASE_BUTTONS)
  - Hamburger menü
  - Çıkış

- **İki Tab:**
  - `harita` (MAP): WorldGlobe — 3D dünya küresi
  - `durum` (STATUS): İstatistik panelleri

- **Modül Butonları (23 adet) — MODULES dizisi:**
  ```
  population   → 👥 NÜFUS
  olaylar      → 📋 OLAYLAR (special)
  language     → 🔤 DİL
  timemachine  → ⏳ GEÇMİŞ
  analysis     → 📊 ANALİZ
  pyramid      → 📐 PİRAMİT
  biology      → 🧬 MUTASYON
  god          → ✦ TANRI (turuncu accent)
  psychology   → 🧠 AKIL
  environment  → 🌿 ÇEVRE
  technology   → ⚙ TEKNOLOJİ
  belief       → ☽ İNANÇ
  social       → 🤝 SOSYAL
  economy      → 💰 EKONOMİ
  culture      → 🎭 KÜLTÜR
  art          → 🎨 SANAT
  astronomy    → 🌙 ASTRONOMİ
  moments      → ✦ ANLAR
  hypothesis   → 💡 HİPOTEZ
  epigenetics  → 🔬 EPİGEN.
  architecture → 🏛️ MİMARİ
  law          → ⚖️ HUKUK
  microbiome   → 🦠 MİKROBİYOM
  ```

- **Önemli Olay Tipleri (ticker'da gösterilir):**
  `birth, death, language, belief, technology, word, discovery`

- **LeftPanel:** Soldaki 21 modül listesi (icons + etiket)
- **StatsPanel:** Sürüklenebilir istatistik penceresi
- **WitnessPanel:** Tanık paneli (sürüklenebilir)
- **MilestoneToast:** Kilometre taşı pop-up
- **Footer:** FooterBar (mode='fixed', UpdateBanner görünürse 44px yukarı)

### WatchPage (Canlı İzleme)
- **URL:** `/watch/:simId`
- **Amaç:** Kimlik doğrulama olmadan simülasyonu izlemek (misafirler için)
- **15 saniyede bir** yenileme (`REFRESH_INTERVAL = 15`)
- **LiveSnapshot:** `{simulation_id, simulation_name, current_day, current_year, population_count, agents_snapshot[], stats{}, groups[], is_running, updated_at}`
- **Ajan haritası:** x,y koordinatlar + cinsiyet + grup rengi
- **Grup paleti:** `#4f9ef7, #f97316, #22c55e, #a855f7, #f59e0b, #ef4444, #06b6d4, #ec4899, #84cc16, #facc15`
- **Renk:** ID hash'den grup rengi belirlenir

### AdminPage (Yönetici Paneli)
- **Sadece:** role='admin' kullanıcılar erişebilir
- **Sekmeler:** Bekleyen / Onaylananlar / Tümü
- **Kullanıcı satırı:** user_code, ad, soyad, tc_no, email, rol, created_at
- **Badge'ler:** pending (sarı), approved (yeşil), banned (kırmızı), admin (mavi)
- **Eylemler:**
  - approve: `POST /api/admin/users/:id/approve`
  - reject: `POST /api/admin/users/:id/reject`
  - ban + sebep: `POST /api/admin/users/:id/ban`
  - unban: `POST /api/admin/users/:id/unban`
  - delete: `DELETE /api/admin/users/:id`
  - impersonate: `POST /api/admin/users/:id/impersonate`
- **Simülasyon izleme:** `GET /api/simulations/live` ile canlı simülasyon listesi

---

## MENÜ SİSTEMİ (SimMenuOverlay)

### Menü Yapısı
```
Hamburger butonu → SimMenuOverlay açılır
```

### Menü Sayfaları (Page tipleri)
```
language → Dil Seçimi
guide    → Kullanım Kılavuzu
about    → Hakkında
mission  → Misyon
contact  → İletişim
```

### Dil Seçim Sayfası (language)
- 5 dil kartı
- Tıklayınca `setLang()` çağırır + localStorage'a kaydeder

### Kılavuz Sayfası (guide)
- `menuI18n.ts`'deki `GUIDE_BLOCKS` ile yapılandırılmış
- Blok tipleri: `h` (başlık), `sub` (alt başlık), `row` (satır etiket-değer), `note` (not), `bullet` (madde)
- 5 dilde tam çeviri

### Hakkında / Misyon / İletişim Sayfaları
- Statik içerik, `menuI18n.ts`'den
- Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. bilgileri

### Mobil Eylemler
- `mobileActions` prop: SimulationPage'den ÇIKIŞ/SONLANDIR butonları eklenir

---

## i18n SİSTEMİ (Ayrıntılı)

### Dil Kodu Tipi
```typescript
type LangCode = 'tr' | 'en' | 'de' | 'fr' | 'ar';
const LANG_CODES = ['tr', 'en', 'de', 'fr', 'ar'] as const;
```

### text() Fonksiyonu
```typescript
text(lang: LangCode, values: TranslationMap): string
// values: Partial<Record<LangCode, string>> — en veya tr zorunlu
// Önce: values[lang] varsa onu kullan
// Sonra: UI_FALLBACK_LABELS'dan bak
// Son: en veya tr fallback
```

### UI_FALLBACK_LABELS (Yerleşik Çeviriler)
Otomatik çevirilen yerleşik anahtar kelimeler:
```
total, male, female, all, age, infant, child, youth, adult, elder,
yr, founder, loading_data, compare, deceased, no_population,
more_individuals, youngest_first, oldest_first, pregnant,
population, biology, environment, astronomy, culture, language,
technology, belief, social, economy, art, architecture, law,
microbiome, psychology, epigenetics, genealogy, god_mode,
time_machine, report, terminate, exit, speed, set, menu, user,
pause, season, year, birth, death, tech
```

### Diğer i18n Fonksiyonları
```typescript
translateEventDescription(description: string, lang: LangCode): string
translateEventType(type: string, lang: LangCode): string
translateStageName(stage: number, lang: LangCode): string
translateSeason(season: string, lang: LangCode): string
```

### menuI18n.ts
- `menuText(lang, key)`: menü metni çevirisi
- `guideText(lang, text)`: kılavuz metni çevirisi
- `pageText(lang, key)`: sayfa başlığı çevirisi
- `LANGUAGES`: 5 dil nesnesi (code, name, flag)
- `GUIDE_BLOCKS`: Kılavuz içerik bloklarının dizisi

### Dil Sırası ve Döngü
```typescript
// LANG_CODES = ['tr', 'en', 'de', 'fr', 'ar']
toggleLang() → sıradaki dile geç → localStorage'a kaydet
setLang(l)   → direkt set et → localStorage'a kaydet
getSavedLang() → localStorage'dan oku, geçersizse 'en' döndür
```

### RTL Desteği
- Arapça (ar) için RTL desteği mevcuttur
- Tailwind CSS `dir` attribute gerekebilir

---

## KONUM SİSTEMİ

### Koordinat Sistemi
- **Tip:** Gerçek dünya coğrafi koordinatlar
- **x:** boylam (longitude), **y:** enlem (latitude)
- **Başlangıç bölgesi:** Anadolu — enlem 36-42°N, boylam 26-45°E
- **Biyom bölgeleri:** Koordinata göre biyom atanır

### Land Mask (landMask.js)
- `isOnLand(x, y)` → boolean
- Bireylerin okyanusa düşmesini engeller
- Grid tabanlı kara/deniz maskesi

### Mekansal Grid (Spatial Grid)
```javascript
buildSpatialGrid(population, cellSize=2)
// cellSize: 2° ≈ ~220km çaplı hücre
getNeighbours(grid, x, y, cellSize)
// 3×3 hücre komşuluk = ~660km yarıçap sosyal etkileşim
```

### Hareket Sistemi
- **Band cohesion:** Grupla birlikte hareket et
- **Survival needs:** Su/yiyecek kaynağına git
- **Mating:** Partner ara
- **Flee:** Tehlikeden kaç

### Biyom Koordinat Haritası
```
mediterranean:       Ege/Akdeniz kıyıları
coastal:             Sahil bölgeleri
temperate_forest:    Orta Anadolu/Karadeniz
mountain:            Dağlık bölgeler
grassland:           Orta Asya step
tropical_savanna:    Güney kıta bölgeleri
tropical_rainforest: Tropikal bölgeler
boreal_forest:       Kuzey bölgeler
tundra:              Kutup yakını
desert:              Orta Doğu/Sahara
```

### WorldGlobe (3D Harita)
- **Library:** Three.js + React Three Fiber
- **Kamera:** OrbitControls (döndürme, yakınlaştırma)
- **Arka plan:** Stars (yıldız alanı)
- **Doku:** Gerçek NASA/mrdoob Dünya dokuları (2048px):
  - `earth_atmos_2048.jpg` (atmosfer)
  - `earth_normal_2048.jpg` (bump map)
  - `earth_specular_2048.jpg` (speküler)
- **Bireyler:** Koordinattan sfera yüzeyine projeksiyon
  - Renk: cinsiyet (erkek=mavi, kadın=pembe) veya grup rengi
  - Boyut: soft-glow sprite texture
- **Centroid trail:** Göç izleme çizgisi (geçmiş noktalar)

---

## RENK PALETİ VE TASARIM SİSTEMİ

### Tailwind CSS Özel Renkler
```css
--sim-bg:      #030310   (koyu arka plan)
--sim-surface: #070716   (panel arka planı)
--sim-border:  #1a1a35   (kenarlık)
--sim-accent:  #4f6ef7   (mavi vurgu)
--sim-gold:    #d4a838   (altın — başlıklar)
--sim-text:    #c8e6c9   (ana metin, açık yeşil)
--sim-muted:   #8abda0   (soluk metin)
```

### Olay Renkleri
```
birth:      #7aff9a  (yeşil)
death:      #e08080  (kırmızı)
technology: #7dd3fc  (açık mavi)
language:   #a0b4ff  (lavanta)
discovery:  #d4a838  (altın)
disaster:   #f97316  (turuncu)
belief:     #a855f7  (mor)
culture:    #c084fc  (açık mor)
activity:   #f59e0b  (amber)
```

### Font
- **Monospace:** Share Tech Mono (panel metinleri, sayılar)
- Tailwind class: `font-share-tech`

---

## ÖNEMLİ NOTLAR — KESİNLİKLE UYULACAK KURALLAR

### Kodlama Kuralları
- **Tüm kod İngilizce yazılmalı**: Değişken adları, fonksiyon adları, yorumlar, commit mesajları — hepsi İngilizce. Yurtdışı sunum/akademik yayın için.
- Türkçe sadece kullanıcıya chat'te yazarken kullanılır, kodda asla.
- Yorumlar: sadece neden açıklanıyor, ne değil. Minimum yorum.

### Git Kuralları
- **Her zaman main branch'e push et** — feature branch açılmaz.
- `git push -u origin main` (başka branch yok)
- **HER ZAMAN VERSİYON YENİLE**: Her değişiklik setinde `package.json` versiyonunu yükselt (major.minor.patch)
- **Yapay zeka imzası ekleme**: Commit mesajlarına asla "Co-Authored-By: Claude" veya benzeri AI imzası eklenmez.

### Uygulama Başlangıç Dili
- **Uygulama her zaman İngilizce başlamalı** (default lang = 'en')
- `getSavedLang()` → localStorage yoksa 'en' döner (bu zaten doğru)
- Yeni kullanıcı ilk açılışta İngilizce görmeli

### Proje Notları
- Kullanıcı Rust bilmiyor, sen yazıyorsun
- Mevcut `anatolia-sim` kenarda bekliyor, referans olarak kullanılabilir
- Simülasyon mekaniği JS versiyonuyla aynı kalacak, sadece Rust'a çevrilecek
- Kardinal kurallar kesinlikle korunacak
- Akademik tez — bilimsel doğruluk performanstan önce gelir
- Uzun vadede katmanlı ölçek sistemi gerekecek (bireysel → grup → uygarlık)
- Şirket adı: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.
- Kayıt kodu formatı: ANSXX#### (ör: ANSAB1234)
