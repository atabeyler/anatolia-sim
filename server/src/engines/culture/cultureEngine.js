// Culture Engine
export const CULTURAL_MEMES={shared_greeting:{stage:1,foxp2_min:0.2,group_size_min:2,spread_rate:0.05},mourning_ritual:{stage:1,foxp2_min:0.3,group_size_min:3,spread_rate:0.03},food_sharing_norm:{stage:1,foxp2_min:0.2,group_size_min:2,spread_rate:0.06},reciprocity_norm:{stage:2,foxp2_min:0.4,group_size_min:4,spread_rate:0.04},gender_roles:{stage:2,foxp2_min:0.4,group_size_min:5,spread_rate:0.04},age_hierarchy:{stage:2,foxp2_min:0.4,group_size_min:4,spread_rate:0.05},gift_exchange:{stage:2,foxp2_min:0.5,group_size_min:5,spread_rate:0.03},body_decoration:{stage:3,foxp2_min:0.5,group_size_min:3,spread_rate:0.04},storytelling:{stage:3,foxp2_min:0.55,group_size_min:4,spread_rate:0.05},music_drumming:{stage:3,foxp2_min:0.5,group_size_min:3,spread_rate:0.06},dance_ritual:{stage:3,foxp2_min:0.5,group_size_min:4,spread_rate:0.05},naming_ceremony:{stage:3,foxp2_min:0.55,group_size_min:3,spread_rate:0.03},marriage_ceremony:{stage:4,foxp2_min:0.6,group_size_min:5,spread_rate:0.03},seasonal_festival:{stage:4,foxp2_min:0.6,group_size_min:6,spread_rate:0.03},taboo_system:{stage:4,foxp2_min:0.6,group_size_min:5,spread_rate:0.02},trade_ceremony:{stage:4,foxp2_min:0.65,group_size_min:6,spread_rate:0.02},written_myth:{stage:5,foxp2_min:0.7,group_size_min:10,spread_rate:0.02,requires_tech:['writing_system']},legal_code:{stage:5,foxp2_min:0.7,group_size_min:10,spread_rate:0.01,requires_tech:['writing_system']}};
const MEME_DESC={
  shared_greeting:'Grupta tutarlı bir selamlama jesti ortaya çıktı; bireyler karşılaşınca belirli bir el hareketi veya ses çıkarıyor. Bu basit davranış güven ve tanıma sinyali işlevi görüyor — grup kimliğinin ilk somut ifadesi.',
  mourning_ritual:'Ölen bir grup üyesinin ardından kolektif yas törenleri oluştu: sessizlik dönemleri, ceset etrafında toplanma, ağıt benzeri sesler. Ölümün paylaşılan anlam kazanması grubun duygusal bütünleşmesini derinleştiriyor.',
  food_sharing_norm:'Avlanan ya da toplanan besinler tüm grup üyelerine sistematik biçimde dağıtılıyor; kimse komşusu aç kalırken yemiyor. Bu dayanışma normu hayatta kalma baskısından doğdu ve uzun vadeli karşılıklı bağımlılığı pekiştiriyor.',
  reciprocity_norm:'Bir iyilik ya da kaynak yardımının ileride karşılığının ödeneceği beklentisi grup içinde yerleşti. Karşılıklılık, anlık çıkarın ötesine geçen bir güven ağı örüyor ve işbirliğini zaman içinde sürdürülebilir kılıyor.',
  gender_roles:'Av, toplayıcılık, çocuk bakımı gibi görevler giderek belirli cinsiyetlerle ilişkilendirilmeye başlandı. Bu ayrım gözlem öğrenmesinden ve pratik verimlilik kaygısından doğdu; grubun iş bölümünü ve çocuk yetiştirme düzenini şekillendiriyor.',
  age_hierarchy:'Yaşlı bireylere özel saygı gösterilmesi yerleşmiş bir norm haline geldi; deneyimliler karar alma, anlaşmazlık çözme ve bilgi aktarımı süreçlerinde rehber rolü üstleniyor. Yaşa dayalı statü, kuşaklar arası bilgi devamlılığını güvence altına alıyor.',
  gift_exchange:'Özel durumlarda hediye verme ve alma pratiği yerleşti; hediyeler salt maddi değil sosyal bağ, statü ve ittifak ifadesi olarak anlam kazanıyor. Bu törensel değişim ağı yabancılarla dahi ilişki kurmayı mümkün kılıyor.',
  body_decoration:'Bireyler pigmentler, kemik parçaları, tüyler ve bitkisel boyalarla bedenlerini süslemeye başladı. Beden süslemesi; grup üyeliği, ritüel statüsü ve kimlik göstergesine dönüştü — estetik bilincin ve sembolik düşüncenin ilk filizi.',
  storytelling:'Yaşlılar ve deneyimliler geçmiş avları, felaketleri, atalar hakkındaki anlatıları genç kuşaklara aktarmaya başladı. Sözlü bellek grubun kolektif kimliğini ve tarihsel sürekliliğini inşa ediyor; bilgi artık tek bireyle ölmüyor.',
  music_drumming:'Taş, kemik ya da toprağı ritmik biçimde vurma pratiği bir araya toplanma ritüeli olarak ortaya çıktı. Ortak ritim grup üyelerini senkronize ediyor, kolektif duygu yoğunluğunu artırıyor ve uyumu görünür kılıyor.',
  dance_ritual:'Belirli koordineli beden hareketleri tören ya da özel anlarda icra edilmeye başlandı. Dans sözlü dilin aktaramadığı duyguları ve sembolleri taşıyor; grubun ruhsal deneyimini ve dayanışmasını ortak kılıyor.',
  naming_ceremony:'Yeni doğan bireyler için doğumun kolektif kutlandığı ve çocuğa isim verildiği törenler başladı. İsim vermek çocuğu grubun sosyal ağına kaydetmek ve topluluğun onun geleceğine ortak sahip çıkması anlamına geliyor.',
  marriage_ceremony:'Çiftlerin uzun süreli birlikteliğe geçişi artık grubun tanıklığında törensel bağlamda kutlanıyor. Evlilik töreni sosyal yükümlülükleri, çocukların babacılığını ve miras haklarını düzenleyen toplumsal bir sözleşmeye dönüştü.',
  seasonal_festival:'Hasat, kış dönümü ya da yağmur mevsimi gibi doğal döngülerle ilişkili periyodik kutlamalar ve toplanmalar yerleşti. Bu festivaller grubun çevre ile uyumunu pekiştiriyor, takvimsel belleği canlı tutuyor ve kolektif kimliği yeniliyor.',
  taboo_system:'Belirli davranışlar, nesneler ya da mekânlar kültürel olarak yasak statüsü kazandı; ihlal edenler güçlü sosyal baskıyla karşılaşıyor. Tabu sistemi grubun temel değerlerini, kaynak yönetimini ve akraba evliliğinin sınırlarını koruma altına alıyor.',
  trade_ceremony:'Başka gruplarla kaynak alışverişi artık belirlenmiş törensel kurallara göre gerçekleşiyor; ritüel güvensizliği azaltarak yabancılar arası işbirliğini ve barışçıl ilişkileri mümkün kılıyor.',
  written_myth:'Grubun köken hikayeleri, kahramanlık destanları ve kutsal anlatılar kalıcı semboller aracılığıyla yazıya döküldü. Bu kayıtlar nesiller arası bilgi ve kimlik aktarımında yaşayan bir kültürel bellek işlevi görüyor.',
  legal_code:'Grup içindeki kurallar, yasaklar ve ihlallere karşı yaptırımlar yazılı biçimde kodlandı. Yazılı hukuk lider değişiminden bağımsız kurumsal sürekliliği sağlıyor ve kişisel yoruma dayanan keyfi uygulamaların önüne geçiyor.',
};

export function processCultureTick(population, groups, discoveredTechs, simDay) {
  const events = [];
  for (const group of groups) {
    const members = population.filter(i => group.member_ids?.includes(i.id));
    if (members.length < 2) continue;
    const avgFoxp2 = members.reduce((s, m) => s + (m.language?.foxp2_expression ?? 0), 0) / members.length;
    const avgArt   = members.reduce((s, m) => s + (m.phenotype?.artistic_sense ?? 0), 0) / members.length;
    // Ö-4: Cultural transmission fidelity scales with consciousness.
    // Higher consciousness → faster and more faithful meme adoption.
    const avgConsciousness = members.reduce((s, m) => s + (m.mind?.consciousness ?? 0), 0) / members.length;
    const consciousnessMult = 0.5 + avgConsciousness * 2; // 0.5× at C=0, 1.5× at C=0.5

    if (!group.culture) group.culture = new Set();
    for (const [memeId, meme] of Object.entries(CULTURAL_MEMES)) {
      if (group.culture.has(memeId) || avgFoxp2 < meme.foxp2_min || members.length < meme.group_size_min || (meme.requires_tech?.some(t => !discoveredTechs.has(t)))) continue;
      if (Math.random() < avgArt * meme.spread_rate * 0.05 * consciousnessMult) {
        group.culture.add(memeId);
        group.internal_tension = Math.max(0, (group.internal_tension ?? 0.5) - 0.03);
        const groupLabel = group.name ?? `G-${(group.id ?? '').slice(-4).toUpperCase()}`;
        events.push({ type: 'cultural_meme_emerged', meme_id: memeId, group_id: group.id, day: simDay, importance: meme.stage >= 4 ? 'high' : 'low', description: `[${groupLabel}, ${members.length} üye, bilinç:${avgConsciousness.toFixed(2)}] ${MEME_DESC[memeId] ?? memeId}` });
      }
    }
    // Cultural diffusion: fidelity scales with receiving group's consciousness
    if (Math.random() < 0.005 * consciousnessMult) {
      const others = groups.filter(g => g.id !== group.id && g.culture?.size > 0);
      if (others.length > 0) {
        const src = others[Math.floor(Math.random() * others.length)];
        const novel = [...(src.culture ?? [])].find(m => !group.culture.has(m));
        if (novel) {
          group.culture.add(novel);
          const fromLabel = src.name ?? `G-${(src.id ?? '').slice(-4).toUpperCase()}`;
          const toLabel = group.name ?? `G-${(group.id ?? '').slice(-4).toUpperCase()}`;
          const memeLabel = MEME_DESC[novel] ?? novel;
          const shortDesc = (MEME_DESC[novel] ?? memeLabel).split('.')[0];
          events.push({ type: 'cultural_diffusion', meme_id: novel, from_group: src.id, to_group: group.id, day: simDay, importance: 'low', description: `"${memeLabel}" kültürel pratiği ${fromLabel} grubundan ${toLabel} grubuna yayıldı. ${shortDesc}.` });
        }
      }
    }
  }
  return events;
}

export function computeCulturalPrestige(group) { return Math.min((group.culture?.size ?? 0) * 0.05, 1.0); }
