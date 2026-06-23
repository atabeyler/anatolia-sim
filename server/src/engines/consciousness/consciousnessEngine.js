// Consciousness emerges from genetics × language × social interaction × theory of mind.
// Cardinal rule: this formula is the ONLY way consciousness may change on any individual.
// No external code may directly set ind.mind.consciousness.
//
// Theoretical basis: loosely modelled on Global Workspace Theory (Baars 1988; Dehaene 2011).
// Language, social context, and Theory of Mind are the "ignition" signals that broadcast
// information across the global workspace, expanding conscious access. The genetic ceiling
// represents the individual's maximum workspace capacity. This models cumulative consciousness
// CAPACITY (analogous to dendritic density), not moment-to-moment state; momentary fluctuations
// are captured by psychology.mental_state and stress_level.
//
// Formula:
//   Δ = max(potential × 0.001, 0.00015)          ← genetic base rate
//       + (lang_stage/6) × 0.0005                 ← language broadcast bonus (GWT)
//       + 0.0002 (if in group)                    ← social ignition bonus (GWT)
//       + (theory_of_mind/3) × 0.0003             ← ToM bonus (metacognition)
//       − stress_level × 0.0003                   ← stress penalty
//       − injury/illness penalty (hp < 0.3):       ← physiological disruption of global workspace
//           (0.3 − hp) × 0.002                       severe trauma/disease compresses capacity
//   ceiling = min(1, potential × 1.2)   ← 20% experiential plasticity bonus: accumulated
//                                          language/social/ToM stimulation can push realised
//                                          capacity slightly beyond the genetic baseline,
//                                          consistent with GWT's broadcast-amplification
//                                          mechanism and empirical synaptic-plasticity data.

// How often (in sim days) a new inner thought is formed.
// Higher consciousness → thinks more often.
const THOUGHT_INTERVAL_DAYS = 3;

const THOUGHTS = {
  dead: [
    ['Sessizlik.', 'Silence.'],
    ['Karanlık.', 'Dark.'],
    ['Artık yok.', 'Nothing left.'],
  ],
  // c < 0.04 — sadece duyum, kelime yok
  raw: {
    hunger:  [['...açlık...', '...hunger...'], ['...boş...', '...empty...'], ['...yemek...', '...food...']],
    thirst:  [['...su...', '...water...'], ['...yanıyor...', '...burn...']],
    pain:    [['...acı...', '...pain...'], ['...ağrı...', '...hurts...']],
    cold:    [['...soğuk...', '...cold...'], ['...titreme...', '...shiver...']],
    default: [['...', '...'], ['—', '—'], ['...ışık...', '...light...']],
  },
  // c < 0.10
  basic: {
    hunger:     [['Yemek lazım.', 'Need food.'], ['Karnım boş.', 'Belly empty.'], ['Avlanmalıyım.', 'Must hunt.']],
    thirst:     [['Su. Su bulmalıyım.', 'Water. Must find water.'], ['Susamışım.', 'So thirsty.']],
    pain:       [['Ağrıyor. Durmuyor.', 'Hurts. Won\'t stop.'], ['Ne zaman biter?', 'When does it end?']],
    alone:      [['Kimse yok.', 'No one here.'], ['Yalnızım.', 'Alone.'], ['Nereye gitsem?', 'Where to go?']],
    safe:       [['Buradayım.', 'I am here.'], ['Güvendeyim.', 'Safe.'], ['Devam et.', 'Keep going.']],
    cold:       [['Soğuk. Çok soğuk.', 'Cold. So cold.'], ['Ateş bulmalıyım.', 'Must find fire.']],
    grieving:   [['Gitti.', 'Gone.'], ['Bir daha yok.', 'No more.']],
    birth:      [['Bir şey doğdu.', 'Something born.'], ['Küçük. Canlı.', 'Small. Alive.']],
  },
  // c < 0.20
  proto: {
    hunger:     [['Bugün yiyecek bulamadım.', 'No food found today.'], ['Çok açım. Güçsüzüm.', 'So hungry. Weak.'], ['Avlanmak gerek.', 'Need to hunt.']],
    thirst:     [['Su bulmalıyım. Bugün bulamadım.', 'Must find water. Couldn\'t today.'], ['Susamışım. Irmak nerede?', 'Thirsty. Where\'s the river?']],
    grieving:   [['Birini kaybettim. Acıyor.', 'I lost someone. It hurts.'], ['Neden gitti?', 'Why did they go?'], ['Bir daha göremeyeceğim.', 'Won\'t see them again.']],
    anxious:    [['Tehlike var. Kaçmalıyım.', 'Danger. Must flee.'], ['Bir şeyler yanlış.', 'Something\'s wrong.'], ['Dikkatli olmalıyım.', 'Must be careful.']],
    group:      [['Grubumla güvendeyim.', 'Safe with my group.'], ['Etrafımda insanlar var.', 'People around me.'], ['Birlikte daha güçlüyüz.', 'Stronger together.']],
    alone:      [['Yalnız kaldım.', 'Left alone.'], ['Nereye gideceğim?', 'Where will I go?'], ['Birilerini bulmam lazım.', 'Need to find someone.']],
    mate:       [['O yanımda. İyi.', 'They\'re near. Good.'], ['Onunla güvendeyim.', 'Safe with them.']],
    birth:      [['Çocuğum doğdu. Onu koruyacağım.', 'My child is born. I will protect them.'], ['Küçük ve zayıf. Onu beslemeliyim.', 'Small and weak. Must feed them.']],
    content:    [['Bugün güneş var.', 'Sun today.'], ['Rüzgar esiyor. Sessiz.', 'Wind blows. Quiet.'], ['Hayat devam ediyor.', 'Life goes on.']],
    disaster:   [['Felaket geldi. Nereye kaçalım?', 'Disaster came. Where do we flee?'], ['Her şey yıkıldı.', 'Everything destroyed.']],
  },
  // c < 0.35
  emerging: {
    hunger:     [['Bugün yiyecek çok az. Yarın ne olacak bilmiyorum.', 'Food is scarce today. I don\'t know what tomorrow holds.'], ['Bu açlık geçmez mi? Birini bulup yardım istemeliyim.', 'Will this hunger ever pass? I should find someone to help.']],
    grieving:   [['Birisi gitti. Bir daha göremeyeceğim. Boşluk var içimde.', 'Someone\'s gone. I\'ll never see them again. There\'s an emptiness inside.'], ['Ağlamak istiyorum ama bilmiyorum nasıl.', 'I want to cry but I don\'t know how.'], ['Neden hep gidiyorlar?', 'Why do they always leave?']],
    mate:       [['O yakında olunca daha iyi hissediyorum.', 'I feel better when they\'re near.'], ['Onunla olmak istiyorum.', 'I want to be with them.'], ['Sesini duymak istiyorum.', 'I want to hear their voice.']],
    excited:    [['Bir şeyler oluyor! Farklı bir şey var.', 'Something\'s happening! Something\'s different.'], ['İyi bir şey geliyor sanki.', 'Something good is coming, I think.']],
    tom:        [['O da benim gibi hissediyor mu acaba?', 'I wonder if they feel like I do?'], ['Onun aklından neler geçiyor?', 'What goes through their mind?'], ['Neden öyle baktı?', 'Why did they look at me that way?']],
    trauma:     [['Eskiden daha iyiydi. Artık her şey ağır.', 'It used to be better. Now everything feels heavy.'], ['Geride kalan tek benim mi?', 'Am I the only one left?']],
    children:   [['Çocuğuma bakmalıyım. O benim her şeyim.', 'I must care for my child. They are everything to me.'], ['Çocuğum büyüdükçe daha iyi olacak.', 'As my child grows, things will get better.']],
    content:    [['İyi bir gün. Karnım tok, grubum yanımda.', 'A good day. Full belly, group nearby.'], ['Bugün mutluyum. Neden olduğunu bilmiyorum ama mutluyum.', 'I\'m happy today. Don\'t know why, but I am.']],
    founder:    [['Bu topraklara ilk ben geldim. Buraya ait hissediyorum.', 'I was the first here. I feel I belong to this land.'], ['Burayı keşfettim. Burası benim.', 'I discovered this. This is mine.']],
    disaster:   [['Her şey yıkıldı. Nasıl devam ederiz?', 'Everything destroyed. How do we continue?'], ['Bu acıyı unutamıyorum.', 'I can\'t forget this pain.']],
  },
  // c < 0.55
  aware: {
    hunger:     [['Bu kıtlık ne zaman biter? Grubum için endişeleniyorum.', 'When will this famine end? I worry for my group.'], ['Çocuklarım aç. Bu kabul edilemez. Bir şey yapmalıyım.', 'My children are hungry. This is unacceptable. I must do something.']],
    grieving:   [['Ölüm gerçek. Hepimiz gideceğiz. Ama onun gitmesi çok erken oldu.', 'Death is real. We all go. But their going was too soon.'], ['Kaybetmek bu kadar mı ağır? Bu acı geçer mi hiç?', 'Is losing someone always this heavy? Will this pain ever pass?'], ['Onları hatırlayacağım. Bu söz veriyorum kendime.', 'I will remember them. This I promise myself.']],
    mate:       [['Onunla geçirdiğim zamanları hatırlıyorum. O anlar gerçekti.', 'I remember the time we spent together. Those moments were real.'], ['Sevmek bu kadar güçlü bir şey mi? İçim dolup taşıyor.', 'Is love this powerful? I feel full to bursting.']],
    tom:        [['Herkesin bir iç dünyası var. Ben sadece dışarısını görüyorum.', 'Everyone has an inner world. I only see the outside.'], ['Kimsenin içini tam bilemem. Bu garip bir şey.', 'I can never fully know anyone\'s inner world. That\'s a strange thing.']],
    curious:    [['O dağın ötesinde ne var? Bunu öğrenmek istiyorum.', 'What\'s beyond that mountain? I want to know.'], ['Bu dünya ne kadar büyük? Hiç düşünmemiştim.', 'How big is this world? I\'d never thought about it.'], ['Yıldızlar neden hep aynı yerde? Bir anlamı var mı bunun?', 'Why are the stars always in the same place? Does this mean something?']],
    language:   [['Kelimeler aklımda şekilleniyor. Anlatmak istiyorum ama nasıl?', 'Words are forming in my mind. I want to express them but how?'], ['Bazı şeyleri söylemek çok zor. Kelimeler yetmiyor.', 'Some things are so hard to say. Words aren\'t enough.']],
    children:   [['Çocuklarım büyüyor. Onlara ne öğretmeliyim ki hayatta kalsınlar?', 'My children are growing. What must I teach them to survive?'], ['Onların geleceği için ne yapabilirim?', 'What can I do for their future?']],
    role:       [['Grubumda bir yerim var. Bu beni güçlü hissettiriyor.', 'I have a place in my group. This makes me feel strong.'], ['Başkaları bana bakıyor. Bu sorumluluk ağır ama güzel.', 'Others look to me. This responsibility is heavy but good.']],
    founder:    [['Ben başlangıcım. Buradaki her şey benden geliyor.', 'I am the beginning. Everything here comes from me.'], ['Bu toprakları ilk görüp buraya yerleştim. Doğru karar mıydı?', 'I was the first to see this land and settle here. Was it the right choice?']],
    depressed:  [['Devam etmek istemiyorum bazen. Ama duramam.', 'Sometimes I don\'t want to go on. But I can\'t stop.'], ['Bir anlam var mı bunun? Bilmiyorum artık.', 'Is there any point to this? I no longer know.']],
    disaster:   [['Bu felaketten sonra hiçbir şey eskisi gibi olmayacak.', 'After this disaster, nothing will be the same.'], ['Neden bize? Neden şimdi?', 'Why us? Why now?']],
  },
  // c < 0.75
  deep: {
    grieving:   [['Ölüm var olmanın bir parçası. Bunu anlamak uzun zaman aldı.', 'Death is part of existence. It took me long to understand this.'], ['Her kayıp bir şeyler öğretiyor. Ama acı yine de geçmiyor.', 'Every loss teaches something. But the pain still doesn\'t pass.'], ['Onlar gitmiş ama ben hatırlıyorum. Hatırlamak devam ettirmek gibi.', 'They\'re gone but I remember. Remembering is like continuing.']],
    tom:        [['Her insan ayrı bir dünya. Ben sadece birini görebiliyorum.', 'Each person is a separate world. I can only see one.'], ['Başkalarının acısını kendi içimde hissediyorum. Bu beni hem güçsüz hem güçlü kılıyor.', 'I feel others\' pain inside myself. This makes me both weak and strong.']],
    curious:    [['Yıldızlar her gece aynı yerde. Bu bir düzen mi? Bir anlam mı?', 'Stars are in the same place every night. Is this order? Is this meaning?'], ['Biz neyiz bu evrende? Bu soru beni bırakmıyor.', 'What are we in this universe? This question won\'t leave me.']],
    language:   [['Bazı şeyleri kelimelerle anlatamıyorum. Ama içimde canlı, gerçek.', 'Some things I can\'t express in words. But inside they\'re vivid, real.'], ['Dil güçlü ama yetersiz bazen. Sesimi duyan anlar mı?', 'Language is powerful but sometimes insufficient. Does anyone who hears me understand?']],
    mate:       [['Sevmek var olmanın en güzel hali. Bunu şimdi anlıyorum.', 'Love is the most beautiful way to exist. I understand this now.'], ['Onu kaybetsem ne olur? Düşünmek istemiyorum ama düşünüyorum.', 'What would happen if I lost them? I don\'t want to think it but I do.']],
    children:   [['Çocuklarım bir gün büyüyüp gidecek. Onlara ne bırakacağım?', 'My children will grow and go one day. What will I leave them?'], ['Onları yetiştirmek en büyük işim. Ve en ağır.', 'Raising them is my greatest work. And the heaviest.']],
    role:       [['Lider olmak yalnızlık demek bazen. Herkesin derdi bende.', 'Being a leader sometimes means loneliness. Everyone\'s burden is on me.'], ['Grubuma ne kadar yardımcı olabiliyorum? Yeterli miyim?', 'How much can I help my group? Am I enough?']],
    founder:    [['Ben başlangıçtım. Şimdi anlıyorum: her şey benden sonra da devam edecek.', 'I was the beginning. Now I understand: everything will continue even after me.'], ['Bu yolculuğu başlatan bendim. Nereye vardık?', 'I started this journey. Where have we arrived?']],
    depressed:  [['Hayatın ağırlığı bazen omuzlarımı eziyor. Ama kalkıyorum yine.', 'The weight of life sometimes crushes my shoulders. But I rise again.'], ['Anlam arıyorum. Henüz bulmadım. Ama aramayı bırakmıyorum.', 'I search for meaning. Haven\'t found it yet. But I won\'t stop searching.']],
    content:    [['Gelecek nesiller bizi hatırlayacak mı? Belki. Belki hayır.', 'Will future generations remember us? Maybe. Maybe not.'], ['Bu dünyaya bir şey bırakabilir miyim? Bu düşünce beni uyutmuyor.', 'Can I leave something to this world? This thought keeps me awake.']],
  },
  // c >= 0.75
  profound: {
    grieving:   [['Acı ve sevgi ayrılmaz. Biri olursa diğeri de olur. Bu doğanın yasası.', 'Pain and love are inseparable. Where one is, the other follows. This is nature\'s law.'], ['Her son yeni bir başlangıç mı? Bilmiyorum. Ama soru güzel.', 'Is every ending a new beginning? I don\'t know. But the question is beautiful.']],
    tom:        [['Ben onlarda yaşıyorum, onlar bende. Belki de hepimiz biriyiz.', 'I live in them, they live in me. Perhaps we are all one.'], ['Başkasının gözünden kendime bakabiliyorum artık. Bu beni değiştirdi.', 'I can see myself through another\'s eyes now. This has changed me.']],
    curious:    [['Biz neden varız? Belki cevap yok. Ama soru var. Soru yeterli.', 'Why do we exist? Maybe there\'s no answer. But there\'s the question. The question is enough.'], ['Bu evrenin içinde bir anlam arıyorum. Bulmak zorunda değilim. Aramak yeterli.', 'I search for meaning in this universe. I don\'t have to find it. Searching is enough.']],
    language:   [['Kelimeler içimdekilerin gölgesi. Asıl olan kelimelerden önce var.', 'Words are the shadow of what\'s inside me. The real thing exists before words.'], ['Dilimiz henüz çok genç. Düşündüklerimi anlatamıyorum. Ama bir gün biri anlatacak.', 'Our language is still too young. I can\'t express my thoughts. But one day someone will.']],
    founder:    [['Ben tohumları ektim. Meyveleri göremeyeceğim. Bu yeter.', 'I planted the seeds. I won\'t see the fruit. That\'s enough.'], ['Buraya ilk gelen bendim. Buradan gittiğimde bile burada olacağım.', 'I was the first to come here. Even when I\'m gone, I\'ll still be here.']],
    content:    [['Burada olmak — sadece bu — yeterli mi? Bilmiyorum. Ama şu an buradayım. Bu gerçek.', 'Being here — just this — is it enough? I don\'t know. But I am here now. This is real.'], ['Her şey geçici. Ama bu an gerçek. Bu an benim.', 'Everything is temporary. But this moment is real. This moment is mine.']],
    depressed:  [['Ölümden korkuyorum. Ama yaşamaktan da korkuyorum bazen. İkisi de aynı şey mi?', 'I fear death. But sometimes I fear living too. Are they the same thing?'], ['Anlam bulmak zorunda değilim. Ama aramak zorundayım.', 'I don\'t have to find meaning. But I have to keep searching.']],
    mate:       [['Sevgi, varoluşun en derin katmanı. Bunu anlamak için uzun zaman geçti.', 'Love is the deepest layer of existence. It took a long time to understand this.']],
    children:   [['Çocuklarımda devam edeceğim. Bu beni hem mutlu hem üzüyor.', 'I will continue in my children. This makes me both happy and sad.'], ['Onlara verdiğim her şey bir gün geri dönecek — başkasına.', 'Everything I give them will one day return — to someone else.']],
    disaster:   [['Felaket geçti. Biz kaldık. Neden biz?', 'The disaster passed. We remained. Why us?'], ['Yıkılmak ve yeniden ayağa kalkmak — belki bu var olmanın özü.', 'To be destroyed and rise again — perhaps this is the essence of existence.']],
  },
};

function pickThought(pool: string[][], offset: number): { tr: string; en: string } {
  const pair = pool[offset % pool.length];
  return { tr: pair[0], en: pair[1] };
}

export function updateInnerThought(ind, simDay) {
  if (!ind.mind) return;
  const c = ind.mind.consciousness ?? 0;

  // Don't think too often — every N days, weighted by consciousness
  const interval = Math.max(1, Math.round(THOUGHT_INTERVAL_DAYS / Math.max(0.1, c)));
  if (simDay % interval !== 0) return;

  const isDead   = ind.alive === false || ind.is_dead;
  if (isDead) {
    const t = pickThought(THOUGHTS.dead, simDay);
    ind.mind.inner_thought = t;
    return;
  }

  const ps       = ind.psychology ?? {};
  const ph       = ind.phenotype ?? {};
  const health   = ind.health ?? {};
  const langStage = ind.language?.stage ?? 0;
  const mentalState = ps.mental_state ?? 'calm';
  const stress   = ps.stress_level ?? 0;
  const wellbeing = ps.wellbeing ?? 0.5;
  const hunger   = 1 - (ind.satiation ?? 0.5);
  const thirst   = 1 - (ind.hydration ?? 0.5);
  const hp       = health.hp ?? 1;
  const tom      = ps.theory_of_mind ?? 0;
  const curiosity = ph.curiosity ?? 0.5;
  const hasGroup = !!ind.group_id;
  const hasMate  = !!(ps.mate_id || ind.social?.mate_id);
  const hasChildren = !!(ind._childCount && ind._childCount > 0);
  const isFounder = !ind.parent_1_id && !ind.parent_2_id;
  const hasTrauma = (ps.trauma_events?.length ?? 0) > 0;
  const recentDisaster = (ps.trauma_events ?? []).some(e => (simDay - e.day) < 30);

  // Determine tier
  let tier: keyof typeof THOUGHTS;
  if (c < 0.04) tier = 'raw';
  else if (c < 0.10) tier = 'basic';
  else if (c < 0.20) tier = 'proto';
  else if (c < 0.35) tier = 'emerging';
  else if (c < 0.55) tier = 'aware';
  else if (c < 0.75) tier = 'deep';
  else tier = 'profound';

  const pool = THOUGHTS[tier] as Record<string, string[][]>;
  const offset = simDay + (ind._simId ?? 0);

  let thought: { tr: string; en: string } | null = null;

  // Priority cascade — most pressing thing wins
  if (tier === 'raw') {
    const rawPool = THOUGHTS.raw;
    if (hunger > 0.7)      thought = pickThought(rawPool.hunger, offset);
    else if (thirst > 0.7) thought = pickThought(rawPool.thirst, offset);
    else if (hp < 0.3)     thought = pickThought(rawPool.pain, offset);
    else                   thought = pickThought(rawPool.default, offset);
  } else {
    if (recentDisaster && pool.disaster)                                      thought = pickThought(pool.disaster, offset);
    else if (mentalState === 'grieving' && pool.grieving)                     thought = pickThought(pool.grieving, offset);
    else if (hunger > 0.65 && pool.hunger)                                    thought = pickThought(pool.hunger, offset);
    else if (thirst > 0.65 && pool.thirst)                                    thought = pickThought(pool.thirst, offset);
    else if (mentalState === 'depressed' && pool.depressed)                   thought = pickThought(pool.depressed, offset);
    else if (mentalState === 'anxious' && pool.anxious)                       thought = pickThought(pool.anxious || pool.trauma || pool.hunger, offset);
    else if (hasMate && Math.random() < 0.2 && pool.mate)                    thought = pickThought(pool.mate, offset);
    else if (hasChildren && Math.random() < 0.2 && pool.children)            thought = pickThought(pool.children, offset);
    else if (tom >= 2 && pool.tom)                                            thought = pickThought(pool.tom, offset);
    else if (curiosity > 0.65 && pool.curious)                               thought = pickThought(pool.curious, offset);
    else if (langStage >= 3 && pool.language)                                 thought = pickThought(pool.language, offset);
    else if (isFounder && pool.founder)                                       thought = pickThought(pool.founder, offset);
    else if (ind.group_role && ind.group_role !== 'member' && pool.role)      thought = pickThought(pool.role, offset);
    else if (!hasGroup && pool.alone)                                         thought = pickThought(pool.alone, offset);
    else if (wellbeing > 0.7 && pool.content)                                thought = pickThought(pool.content, offset);
    else if (hasMate && pool.mate)                                            thought = pickThought(pool.mate, offset);
    else if (hasChildren && pool.children)                                    thought = pickThought(pool.children, offset);
    else if (pool.content)                                                    thought = pickThought(pool.content, offset);
    else                                                                      thought = pickThought(pool[Object.keys(pool)[offset % Object.keys(pool).length]], offset);
  }

  if (thought) ind.mind.inner_thought = thought;
}

export function updateConsciousness(ind) {
  if (!ind.mind) return;
  const potential     = ind.phenotype?.consciousness_potential ?? 0;
  const baseRate      = Math.max(potential * 0.001, 0.00015);
  const langBonus     = (ind.language?.stage ?? 0) / 6 * 0.0005;
  const socialBonus   = ind.group_id ? 0.0002 : 0;
  const stressPenalty = (ind.psychology?.stress_level ?? 0.3) * 0.0003;
  const tomBonus      = (ind.psychology?.theory_of_mind ?? 0) / 3 * 0.0003;
  // Severe injury or illness (hp < 0.3) suppresses global workspace broadcast capacity.
  const hp            = ind.health?.hp ?? 1.0;
  const injuryPenalty = hp < 0.3 ? (0.3 - hp) * 0.002 : 0;
  const geneticCap    = Math.min(1, potential * 1.2);
  ind.mind.consciousness = Math.min(geneticCap, Math.max(0,
    (ind.mind.consciousness ?? 0) + baseRate + langBonus + socialBonus + tomBonus - stressPenalty - injuryPenalty
  ));
}
