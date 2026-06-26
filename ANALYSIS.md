# Anatolia Sim — Sistem Analiz Raporu
**Versiyon:** 1.8.0  
**Tarih:** 2026-06-26  
**Hazırlayan:** Claude Code (Automated Analysis)

---

## 1. GENEL MİMARİ

Anatolia Sim, insanlık medeniyetini atom seviyesinde simüle eden çok katmanlı bir platformdur.

```
┌─────────────────────────────────────────────────────────┐
│                  ANATOLIA SIM v1.8.0                    │
├─────────────────┬───────────────────┬───────────────────┤
│  WEB İSTEMCİSİ  │  MASAÜSTÜ (Electron)  │    SUNUCU      │
│  React + Vite   │  Electron 31 +    │  Express.js 4  │
│  TypeScript     │  electron-updater │  Node.js ≥18   │
│  Tailwind CSS   │  main.mjs         │  WebSocket (ws) │
│  Zustand Store  │  preload.cjs      │  PORT: 3001    │
└─────────────────┴───────────────────┴───────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│                   VERİTABANI KATMANI                    │
├─────────────────────────────────────────────────────────┤
│  Mod 1 (Web/Render):  PostgreSQL (Supabase)             │
│  Mod 2 (Masaüstü):   PGlite (WebAssembly, yerel)       │
│  Schema: antsim şeması, pgcrypto uzantısı              │
└─────────────────────────────────────────────────────────┘
```

---

## 2. SUNUCU DETAYLARI

### 2.1 Giriş Noktası (`server/src/index.js`)
| Özellik | Değer |
|---|---|
| Framework | Express.js 4 |
| HTTP Sunucu | Node.js `http.createServer` |
| WebSocket | `ws` kütüphanesi, `/ws` path |
| Port | `process.env.PORT ?? 3001` |
| Rate Limit | 15dk/2000 istek (localhost hariç) |
| İçerik Güvenliği | Helmet CSP — `'unsafe-inline'` (Vite chunk'ları için) |

### 2.2 API Rotaları
| Rota | Dosya | Açıklama |
|---|---|---|
| `/api/auth` | `routes/auth.js` | Giriş, çıkış, token yenileme |
| `/api/simulations` | `routes/simulations.js` | Simülasyon CRUD, başlatma/durdurma |
| `/api/god` | `routes/god.js` | Tanrı müdahale komutları |
| `/api/analysis` | `routes/analysis.js` | İstatistik ve analiz |
| `/api/aria` | `routes/aria.js` | Aria AI asistan (Anthropic Claude) |
| `/api/admin` | `routes/admin.js` | Kullanıcı yönetimi, temizlik |
| `/api/health` | inline | Sağlık kontrolü + versiyon |
| `/api/system/status` | inline | Genel sistem durumu (auth gerekmez) |

### 2.3 WebSocket Protokolü
- WS bağlantısı `simId` query param ile açılır
- İlk mesaj: `{ type: "auth", token: "<JWT>" }` — 5 saniye timeout
- Heartbeat: her 30 saniyede ping/pong (Render 90s kapatma önlemi)
- Sunucu → İstemci mesaj tipleri: `tick`, `status`, `simulation_ended`, `error`

### 2.4 Güvenlik Katmanı
- JWT access token (15 dk) + refresh token (httpOnly cookie)
- Bcrypt (salt 12) parola hash
- CORS: sadece izinli origin listesi
- Rate limiting: production'da 2000 istek/15dk
- Render free-tier: `setInterval` ile 4dk'da bir self-ping (spin-down önlemi)

---

## 3. VERİTABANI ŞEMASİ

### 3.1 Tablolar
```
antsim şeması (pgcrypto ile UUID üretimi)

users                  → Kullanıcılar (user_code, TC, onay, ban sistemi)
simulations            → Simülasyon kayıtları (founder JSONB, world_state JSONB)
individuals            → Bireyler (genome, phenotype, epigenome, mind, social — hepsi JSONB)
checkpoints            → Her 90 günde snapshot (population_snapshot JSONB)
god_interventions      → Tanrı müdahaleleri
individual_conversations → Birey diyalogları (AI destekli)
technologies           → Keşfedilen teknolojiler
belief_systems         → İnanç sistemleri
language_records       → Dil evrim kayıtları
simulation_events      → Tüm simülasyon olayları
social_groups          → Sosyal gruplar
publications           → Yayınlar (PDF/rapor)
```

### 3.2 İndeksler (Performans)
```sql
idx_individuals_simulation    → (simulation_id)
idx_individuals_alive         → (simulation_id, alive)
idx_checkpoints_simulation    → (simulation_id, sim_day)
idx_events_simulation         → (simulation_id, sim_day)
idx_technologies_simulation   → (simulation_id)
idx_groups_simulation         → (simulation_id, active)
idx_simulations_user          → (user_id)
idx_simulations_status        → (status)
idx_conversations_simulation  → (simulation_id, sim_day)
idx_individuals_parent        → (parent_1_id)
idx_beliefs_simulation        → (simulation_id, extinct)
idx_language_records_simulation → (simulation_id, recorded_day)
```

### 3.3 Dual Database Modu
```javascript
// Masaüstü modu: DESKTOP_LOCAL_DB=1
// → PGlite (WebAssembly PostgreSQL)
// → userData/db klasöründe yerel depo
// → Seri sorgu kuyruğu (PGlite tek bağlantı)

// Web/Render modu: DATABASE_URL env var
// → PostgreSQL bağlantı pool (max 5 bağlantı)
// → IPv4 DNS çözümlemesi (Render IPv6 sorunu)
// → SSL: rejectUnauthorized: false (Supabase uyumu)
```

---

## 4. MASAÜSTÜ UYGULAMA (`desktop/main.mjs`)

### 4.1 Başlangıç Akışı
```
app.whenReady()
  └→ boot()
       ├→ CLIENT_INDEX kontrolü (build yoksa hata)
       ├→ pickDesktopPort() — 3001 veya ephemeral port
       ├→ loadConfig() — userData/config.json veya bundled-config.json
       │     (Render URL tespit edilirse null döner — setup gösterilir)
       ├→ showSetupWindow() — ilk kurulumda gösterilir
       ├→ createMainWindow() — 1600×1000, min 1280×800
       ├→ loading.html yükleme ekranı
       ├→ ensureLocalServer() — Node.js sunucu alt süreci başlatır
       ├→ loadURL(LOCAL_URL) — ana uygulama
       ├→ startVersionWatcher() — 60s'de bir health check
       └→ setupAutoUpdater() — electron-updater (sadece packaged)
```

### 4.2 Sunucu Alt Süreci
- `process.execPath` ile Node.js spawn
- Otomatik yeniden başlatma (çöküş sonrası 2s bekleme)
- 90s boot timeout
- Heap: varsayılan 768 MB (config'den override edilebilir)
- Worker sayısı: CPU çekirdek sayısı kadar (config'den override)

### 4.3 Özellikler
| Özellik | Durum |
|---|---|
| Auto Updater (GitHub Releases) | ✅ Aktif (packaged) |
| Version Watcher (hot reload) | ✅ 60s döngü |
| Setup Wizard (ilk kurulum) | ✅ setup.html |
| Konum Servisi (Win/Mac) | ✅ PowerShell/Swift |
| Single Instance Lock | ✅ |
| F5/Ctrl+R Yenileme | ✅ |
| CSP Override (Electron) | ✅ onHeadersReceived |
| GPU Crash Limit Devre Dışı | ✅ |

### 4.4 Config Sistemi
```
Öncelik sırası:
1. userData/config.json (kullanıcı kaydetti)
2. desktop/bundled-config.json (build'e gömülü)
3. null → Setup wizard göster

Kaydedilen alanlar:
- DATABASE_URL (Supabase veya boş → yerel mod)
- DESKTOP_LOCAL_DB
- JWT_SECRET, JWT_REFRESH_SECRET (userData/secrets.json'dan otomatik üretilir)
- MAX_WORKERS, DESKTOP_SERVER_HEAP_MB
- ANTHROPIC_API_KEY
```

---

## 5. SİMÜLASYON ENGİNLERİ

### 5.1 Engine Listesi (20 Engine)
| Engine | Dosya | Görev |
|---|---|---|
| SimulationEngine | `simulationLoop.js` | Ana döngü, 1 tick = 1 gün |
| BiologyEngine | `biology/individual.js` | Yaşam evreleri, fizyoloji |
| GenomeEngine | `biology/genome.js` | 32 lokus, genetik çaprazlama |
| MortalityEngine | `biology/mortality.js` | Ölüm olasılıkları |
| ReproductionEngine | `biology/reproduction.js` | Çoğalma, ikizler, komplikasyonlar |
| EnvironmentEngine | `environment/environmentEngine.js` | Biyom, hava, kaynak |
| AstronomyEngine | `astronomy/astronomyEngine.js` | Gökcisimi gözlemleri, takvim |
| EpigeneticsEngine | `epigenetics/epigeneticsEngine.js` | Epigenomik güncellemeler |
| MicrobiomeEngine | `microbiome/microbiomeEngine.js` | Patogenler, salgın |
| PsychologyEngine | `psychology/psychologyEngine.js` | Ruh hali, bağlanma, yas |
| ConsciousnessEngine | `consciousness/consciousnessEngine.js` | Bilinç, Theory of Mind |
| LanguageEngine | `language/languageEngine.js` | 7 dil aşaması, FOXP2 |
| NameEngine | `language/nameEngine.js` | Fonetik profil, isim üretimi |
| SocialEngine | `social/socialEngine.js` | Grup dinamikleri, rol ataması |
| EconomyEngine | `economy/economyEngine.js` | Kaynak toplama, ticaret |
| BeliefEngine | `belief/beliefEngine.js` | İnanç oluşumu, ritual, yayılma |
| CultureEngine | `culture/cultureEngine.js` | Kültürel meme yayılımı |
| ArtEngine | `art/artEngine.js` | Sanat biçimleri ve etkileri |
| ArchitectureEngine | `architecture/architectureEngine.js` | Yerleşim, yapı |
| LawEngine | `law/lawEngine.js` | Norm oluşumu, sosyal düzen |
| TechnologyEngine | `technology/technologyEngine.js` | Tech tree, keşif |
| DecisionEngine | `agent/decisionEngine.js` | Eylem seçimi (AI agent) |
| ActivityEngine | `agent/activityEngine.js` | Deneyim birikimi, tech emergence |
| WorkerPool | `workerPool.mjs` | Paralel işçi havuzu |

### 5.2 Tick Döngüsü (1 Gün = 1 Tick)
```
Tick sırası (simulationLoop.js):
 0. Yaşam evresi ve yaş güncelleme
 1. Çevre güncellemesi (hava, kaynak baskısı)
 1b. Doğal afet kontrolü
 2b. Astronomi bonusları
 2c. Toprak sağlığı
 3. Worker Pool: epigenomik, mikrobiom, ekonomi, psikoloji, bilinç
 3b. Bebek ekonomisi (ana iş parçacığı — emzirme)
 4. Fizyoloji (sağlık, yaşlanma, hava hasarı)
 4b. Hareket (band merkezi, çekim, korku)
 4c. Korku azalması
 4d. Su deneyimi / gözlemsel yüzme öğrenimi
 6. Sosyal gruplar
 7. Sosyal etkileşimler, çiftleşme, bağlanma, hastalık yayılımı
 8. Üreme (yeni doğanlar)
 9. Mikrobiom ve salgın
 10. Ölüm kontrolleri
 11. Hava olayı loglama
 12. Dil evrimi
 12b. Aile öğrenimi
 12c. FOXP2 ifadesi güncelleme
 12d. Organik kelime edinimi
 13. Teknoloji keşfi
 13b. Gözlemsel teknoloji öğrenimi
 14. İnanç oluşumu ve yayılması
 15. Kültür
 16. Sanat
 17. Mimarlık
 18. Hukuk ve normlar
 19. Astronomi
 19b. Sosyal anlatı olayları
 20. İnsan çevresel etkisi
 21. İstatistik hesaplama
 22. Checkpoint (her 90 günde, fire-and-forget)
 23. Broadcast (WebSocket)
```

### 5.3 Performans Optimizasyonları
| Optimizasyon | Açıklama |
|---|---|
| Spatial Grid | O(n²)→O(n) komşu arama, 2° hücre boyutu |
| Worker Pool | Çok çekirdekli paralel bireysel hesaplama |
| Worker Threshold | ≥20 birey: worker pool, <20: ana thread |
| Event Buffer | 50 olay veya 5s sonra toplu DB yazımı |
| Batch UPSERT | 200 bireylik chunk'lar halinde DB yazımı |
| Word Count Cache | Pahalı O(n×v) hesap sadece checkpoint'te |
| Broadcast Throttle | Hız ≤20: her tick; >100: her 10 tick |
| Fast-Forward (Warp) | Sleep atla, sadece 100 günde bir broadcast |

---

## 6. GENOME SİSTEMİ (32 Lokus)

### 6.1 Lokus Kategorileri
```
Zeka (5): BDNF_01, COMT_01, DTNBP1_01, NRG1_01, DISC1_01
Dil (2): FOXP2_01, CNTNAP2_01
Sosyal/Duygusal (5): OXTR_01, SLC6A4_01, DRD4_01, MAOA_01 (X-bağlı), AVPR1A_01
Bilinç (3): NRXN1_01, SHANK3_01, RELN_01
Fiziksel (7): HEIGHT_01/02/03, STRENGTH_01, METABOLISM_01, IMMUNE_01/02, ACTN3_01
Sağlık/Uzun Ömür (2): TERT_01, APOE_01
Motivasyon/Liderlik (2): DRD2_01, CACNA1C_01
Bellek/Öğrenme (1): ADRA2B_01
Üreme (1): FSHR_01
Görünüm (3): HERC2_01, MC1R_01, SLC24A5_01
```

### 6.2 İfade Tipleri
- `codominant`: Ortalama (çoğunluk)
- `dominant`: Maksimum allel değeri
- `polygenic`: Ağırlıklı toplam
- `x_linked`: MAOA — erkekte tek allel

---

## 7. KARDİNAL KURALLAR (Cardinal Rules)

Sıkı separation-of-concerns kuralları test suite'iyle zorunlu kılınmıştır:

| Kural | Kuralı Yalnızca İzin Verilen Dosya |
|---|---|
| `.consciousness` ataması | Yalnızca `consciousnessEngine.js` |
| `phenotype` doğrudan mutasyonu | `genome.js`, `epigeneticsEngine.js`, `individual.js` |
| `foxp2_expression` ataması | `languageEngine.js`, `individual.js` |
| `ind.beliefs.add()` | Yalnızca `beliefEngine.js` |
| `known_techs.add()` | `technologyEngine.js`, `activityEngine.js` |
| `polytheism` prereq | `pottery` (writing_system değil) |

**Test dosyaları:**
- `cardinal-rule.test.js` — temel kurallar
- `cardinal-rule-extended.test.js` — genişletilmiş kurallar
- `cardinal-rule-behavioral.test.js` — davranışsal kurallar
- `god-mode-cardinal.test.js` — tanrı müdahalesi kuralları

---

## 8. İZLENEN HATALAR (BUG Kayıtları)

| ID | Durum | Açıklama | Dosya |
|---|---|---|---|
| BUG-01 | ✅ Çözüldü | Çiftleşme araması O(n²) → Spatial grid callback | `reproduction.js:6,20` |
| BUG-02 | ✅ Çözüldü | Ölü bireyler komşu listesinde kalıyor | `simulationLoop.js:277,676` |
| BUG-03 | ✅ Çözüldü | Ölüm sonrası grup üyeliği tutarsızlığı | `simulationLoop.js:609,652` |
| BUG-04 | ✅ Çözüldü | Çöken worker'lar otomatik yeniden başlatılmıyor | `workerPool.mjs:26` |
| BUG-05 | ✅ Çözüldü | Kelime sayısı O(n×v) her tick hesaplanıyor | `simulationLoop.js:107,911,1650` |
| BUG-06 | ✅ Çözüldü | Worker sonsuz askı → 30s timeout | `workerPool.mjs:10,88` |
| BUG-07 | ❓ Bilinmiyor | Kod tabanında referans yok |  |
| BUG-08 | ✅ Çözüldü | Gün 0 checkpoint — sadece 2 kurucu snapshot | `simulationLoop.js:891` |
| BUG-09 | ✅ Çözüldü | Çakışan DB yazımları (event flush) | `simulationManager.js:102` |
| BUG-10 | ❓ Bilinmiyor | Kod tabanında referans yok |  |
| BUG-11 | ✅ Çözüldü | İstemci restart sonrası engine durumunu bilmiyor | `index.js:144` |

> ⚠️ **Not:** BUG-07 ve BUG-10 kodda referans edilmiyor. Bu numaralar atlanmış veya geçmişte kaldırılmış olabilir.

---

## 9. ÖZELLIK BAYRAKI SİSTEMİ (Features)

| Feature | Açıklama | Durum |
|---|---|---|
| Feature 1 | Centroid migration trail (son 20 checkpoint) | ✅ Aktif |
| Feature 5 | Fast-forward / Warp mode (sleep atla) | ✅ Aktif |
| Feature 11 | Milestone takibi (medeniyet ilkleri) | ✅ Aktif |
| Feature 14 | Tick performans metrikleri (rolling 120) | ✅ Aktif |
| Feature 15 | Allel frekans anlık görüntüsü (checkpoint'te) | ✅ Aktif |

---

## 10. WEB İSTEMCİSİ

### 10.1 Teknoloji Yığını
| Katman | Teknoloji |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| State | Zustand (`simStore.ts`) |
| CSS | Tailwind CSS + PostCSS |
| HTTP | Axios (interceptor ile 401 auto-refresh) |
| WS | Native WebSocket (`useSimWebSocket.ts`) |
| 3D Globe | Three.js (WebGL, web worker) |
| i18n | Custom (`i18n.ts`) — 5 dil: tr/en/de/fr/ar |
| Test | Vitest |

### 10.2 Sayfalar
- `/login` — Giriş sayfası (sistem durumu paneli ile)
- `/` — Dashboard (simülasyon listesi)
- `/simulation/:simId` — Ana simülasyon sayfası
- `/admin` — Yönetici paneli

### 10.3 Panel Sistesi (22 Panel)
```
AnalysisPanel, ArchitecturePanel, ArtPanel, AstronomyPanel,
BeliefPanel, BiologyPanel, CulturePanel, DetailPanel,
EconomyPanel, EnvironmentPanel, EpigeneticsPanel, EventsPanel,
GenealogyPanel, GodPanel, HypothesisPanel, LanguagePanel,
LawPanel, MicrobiomePanel, MomentsPanel, PerformancePanel,
PopulationPanel, PopulationPyramidPanel, PsychologyPanel,
ReportPanel, SocialPanel, StatsPanel, TechnologyPanel, TimeMachinePanel
```

### 10.4 WebSocket Mesaj Akışı
```
İstemci bağlanır → auth mesajı gönderir (5s timeout)
Sunucu doğrular → status mesajı gönderir (engine_running, is_warping)
Simülasyon çalışırken → tick mesajları (stats + events)
Simülasyon bitince → simulation_ended mesajı
```

### 10.5 Zustand Store Alanları
- Auth: user, accessToken
- Simülasyon: currentSim, stats, events
- Warp modu: isWarping, fastForwardTarget
- Migration: centroidTrail
- Milestone olayları
- Engine metrikleri
- Auto-update durumu (updatePercent, updateReady)
- UI: activePanel, lang, theme, speedMultiplier, sidebarExpanded

---

## 11. DEPLOYMENT

### 11.1 Web (Render.com Free Tier)
```yaml
Branch: main
Build: cd client && npm install && npm run build && cd ../server && npm install
Start: cd server && npm start
Health: /api/health
DISABLE_WORKERS: "true"  # 512MB RAM kısıtlaması
Node: --dns-result-order=ipv4first --max-old-space-size=350
```

### 11.2 Masaüstü (Electron + GitHub Releases)
| Platform | Format | Mimari |
|---|---|---|
| Windows | NSIS Installer | x64 |
| macOS | DMG | x64, arm64 |
| Linux | AppImage | x64 |

**Publish:** GitHub Releases (`atabeyler/anatolia-sim`)  
**Auto-update:** `electron-updater` — app başlangıcından 5s sonra kontrol

---

## 12. KRİTİK RİSKLER ve ÖNERİLER

### 12.1 Güvenlik Açıkları
| Risk | Seviye | Açıklama |
|---|---|---|
| `'unsafe-inline'` CSP | ORTA | Vite inline chunk'ları için. XSS vektörü açık kalıyor |
| `'unsafe-eval'` (Electron CSP) | YÜKSEK | Electron CSP'de `unsafe-eval` var — Electron'da tehlikeli |
| `ssl: { rejectUnauthorized: false }` | DÜŞÜK | DB SSL sertifika doğrulama devre dışı |
| Rate limit localhost bypass | DÜŞÜK | Masaüstü için gerekli ama localhost'tan saldırı mümkün |

### 12.2 Mimari Riskler
| Risk | Açıklama |
|---|---|
| BUG-07, BUG-10 eksik | Bu numaralar kodda hiç referans edilmiyor — takip kaybı |
| PGlite tek bağlantı | Seri sorgu kuyruğu performansı düşürüyor |
| Event kayıpları | Kalıcı DB hatasında event buffer'daki olaylar kayboluyor |
| Render spin-down | Self-ping geçici çözüm — ücretli plan önerilir |
| Max 350 MB heap (Render) | Büyük simülasyonlarda OOM riski |

### 12.3 Eksik Özellikler
- [ ] BUG-07 ve BUG-10 dokumentasyonu
- [ ] Event kaybı için dead-letter mekanizması
- [ ] Admin panelinde simülasyon zorla durdurma
- [ ] Masaüstü: çoklu profil desteği
- [ ] Masaüstü: yerel veritabanı yedekleme UI'ı

---

## 13. TEST KAPSAMİ

```
server/tests/
├── cardinal-rule.test.js           — Mimari kural ihlali tespiti
├── cardinal-rule-extended.test.js  — Genişletilmiş kural testleri
├── cardinal-rule-behavioral.test.js — Davranışsal kural testleri
├── god-mode-cardinal.test.js       — Tanrı modu kural testleri
├── simulation-bugs.test.js         — Bilinen bug regresyon testleri
├── missing-coverage.test.js        — Eksik kapsam testleri
├── simulationLoop.test.js
├── mortality.test.js
├── reproduction.test.js / inbreeding.test.js
├── genome.test.js
├── economy.test.js
├── psychology.test.js
├── consciousness.test.js
├── language.test.js / language-stage.test.js / nameEngine.test.js
├── belief.test.js / culture.test.js / art.test.js
├── technology.test.js / architecture.test.js / law.test.js
├── social.test.js
├── microbiome.test.js
├── astronomy.test.js
└── epigenetics.test.js

client/src/
└── utils/i18n.test.ts              — Çok dilli metin testleri
```

**Test Runner:** Vitest  
**Toplam Test Dosyası:** 26 sunucu + 1 istemci

---

## 14. VERSİYON TARİHÇESİ (Son 5 Sürüm)

| Versiyon | Değişiklik |
|---|---|
| 1.8.0 | Sistem analizi ve kapsamlı dokümantasyon |
| 1.7.9 | Versiyon metadata senkronizasyonu |
| 1.7.8 | Önceki sürüm |
| 1.7.7 | Render deploy + yeni installer build |
| 1.7.4 | Supabase secret güncellemesi |
| 1.7.3 | DATABASE_URL installer'a gömme |
| 1.7.2 | Masaüstü setup ekranı, Supabase senkronizasyonu |

---

*Bu rapor otomatik kod analizi ile üretilmiştir. Anatolia Sim v1.8.0*
