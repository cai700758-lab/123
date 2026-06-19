const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const environmentImage = new Image();
environmentImage.src = "assets/environment-2_5d-v2.png";
const playerSprite = new Image();
playerSprite.src = "assets/player-peashooter-2_5d.png";

const ui = {
  stage: document.getElementById("stageValue"),
  kills: document.getElementById("killValue"),
  coins: document.getElementById("coinValue"),
  healthText: document.getElementById("healthText"),
  healthBar: document.getElementById("healthBar"),
  distance: document.getElementById("distanceText"),
  start: document.getElementById("startScreen"),
  difficulty: document.getElementById("difficultyScreen"),
  choice: document.getElementById("choiceScreen"),
  talent: document.getElementById("talentScreen"),
  rest: document.getElementById("restScreen"),
  restCoins: document.getElementById("restCoinValue"),
  activeTalentCount: document.getElementById("activeTalentCount"),
  activeTalentList: document.getElementById("activeTalentList"),
  refreshShop: document.getElementById("refreshShopButton"),
  refreshCost: document.getElementById("refreshCostValue"),
  bossHud: document.getElementById("bossHud"),
  bossName: document.querySelector(".boss-name strong"),
  bossHealthBar: document.getElementById("bossHealthBar"),
  bossHealthText: document.getElementById("bossHealthText"),
  wave: document.getElementById("waveScreen"),
  waveKicker: document.getElementById("waveKicker"),
  waveTitle: document.getElementById("waveTitle"),
  waveSubtitle: document.getElementById("waveSubtitle"),
  restArrival: document.getElementById("restArrivalScreen"),
  pause: document.getElementById("pauseScreen"),
  pauseButton: document.getElementById("pauseButton"),
  resumeButton: document.getElementById("resumeButton"),
  pauseRestartButton: document.getElementById("pauseRestartButton"),
  pauseTalentCount: document.getElementById("pauseTalentCount"),
  pauseTalentList: document.getElementById("pauseTalentList"),
  end: document.getElementById("endScreen"),
  resultKicker: document.getElementById("resultKicker"),
  resultTitle: document.getElementById("resultTitle"),
  resultDistance: document.getElementById("resultDistance"),
  resultKills: document.getElementById("resultKills"),
  resultDamage: document.getElementById("resultDamage")
};

const game = {
  state: "menu",
  difficulty: "normal",
  time: 0,
  lastTime: 0,
  distance: 0,
  totalDistance: 2500,
  speed: 115,
  stage: 1,
  kills: 0,
  coins: 0,
  shake: 0,
  spawnTimer: 0,
  obstacleTimer: 0,
  plantOrbTimer: 0,
  regenNextDistance: 100,
  wallnutGuardTimer: 18,
  choiceAt: 190,
  nextChoice: 190,
  restAt: 500,
  nextRest: 500,
  enemyHealthMultiplier: 1,
  restTier: 0,
  shopRefreshCount: 0,
  transitionTimer: 0,
  pendingRest: false,
  paused: false,
  pausedState: null,
  freezeTimer: 0,
  keys: {},
  pointerActive: false,
  player: null,
  enemies: [],
  bullets: [],
  enemyBullets: [],
  obstacles: [],
  healthPacks: [],
  plantOrbs: [],
  potatoMines: [],
  activeTalentIds: new Set(),
  collectedPlantOrbTypes: new Set(),
  talentTriggers: {},
  boss: null,
  bowlingBalls: [],
  carWarnings: [],
  bossLasers: [],
  bossShockwaves: [],
  particles: [],
  coinDrops: [],
  texts: []
};

const ROAD_LANES = [-0.62, 0, 0.62];

const DIFFICULTIES = {
  easy: {
    label: "\u7b80\u5355",
    shopGrowthMultiplier: 1.25,
    shopPriceMultiplier: 1,
    enemySpeedMultiplier: 1,
    pickupFrequency: 1,
    obstacles: false,
    iceBlocks: false,
    playerDamageMultiplier: 1.2,
    playerFireRateMultiplier: 1.2,
    boss: {
      type: "gargantuar",
      name: "\u5de8\u4eba\u50f5\u5c38",
      health: 600000,
      fixedLane: true,
      switchDamage: 100000,
      attacks: ["shockwave", "throwImps"],
      attackDelay: [3.2, 4.4]
    }
  },
  normal: {
    label: "\u666e\u901a",
    shopGrowthMultiplier: 1.35,
    shopPriceMultiplier: 1,
    enemySpeedMultiplier: 1,
    pickupFrequency: 1,
    obstacles: true,
    iceBlocks: false,
    playerDamageMultiplier: 1,
    playerFireRateMultiplier: 1,
    boss: {
      type: "doctor",
      name: "\u50f5\u738b\u535a\u58eb",
      health: 800000,
      fixedLane: false,
      attacks: ["bowling", "car", "summon"],
      attackDelay: [3.8, 5.6]
    }
  },
  hard: {
    label: "\u56f0\u96be",
    shopGrowthMultiplier: 1.35,
    shopPriceMultiplier: 1.2,
    enemySpeedMultiplier: 1.1,
    pickupFrequency: 0.7,
    obstacles: true,
    iceBlocks: true,
    playerDamageMultiplier: 1,
    playerFireRateMultiplier: 1,
    boss: {
      type: "superDoctor",
      name: "\u8d85\u7ea7\u50f5\u738b\u535a\u58eb",
      health: 1000000,
      fixedLane: true,
      switchDamage: 50000,
      attacks: ["footballRush", "laserVolley", "roadblocks", "peaStorm", "massSummon"],
      attackDelay: [3.1, 4.2]
    }
  }
};

function getDifficultyConfig() {
  return DIFFICULTIES[game.difficulty] ?? DIFFICULTIES.normal;
}

function setDifficulty(difficultyId) {
  if (!DIFFICULTIES[difficultyId]) return;
  game.difficulty = difficultyId;
  document.querySelectorAll(".difficulty-option").forEach(button => {
    button.classList.toggle("active", button.dataset.difficulty === difficultyId);
  });
}

function openDifficultyScreen() {
  if (game.state !== "menu") return;
  ui.start.classList.remove("visible");
  ui.difficulty.classList.add("visible");
}

function chooseDifficulty(difficultyId) {
  setDifficulty(difficultyId);
  ui.difficulty.classList.remove("visible");
  resetGame();
}

function randomUpgradeMultiplier() {
  return (13 + Math.floor(Math.random() * 7)) / 10;
}

function createUpgradePool() {
  const damageMultiplier = randomUpgradeMultiplier();
  const fireMultiplier = randomUpgradeMultiplier();

  return [
    {
      icon: "×",
      title: `攻击伤害 ×${damageMultiplier.toFixed(1)}`,
      desc: `当前攻击伤害乘以 ${damageMultiplier.toFixed(1)} 倍。`,
      tag: "火力强化",
      apply: p => p.damage *= damageMultiplier
    },
    {
      icon: "»",
      title: `攻击频率 ×${fireMultiplier.toFixed(1)}`,
      desc: `每秒攻击次数提升至 ${fireMultiplier.toFixed(1)} 倍。`,
      tag: "射速强化",
      apply: p => p.fireRate /= fireMultiplier
    },
    {
      icon: "↔",
      title: "弹道增宽",
      desc: "横向额外发射一颗豌豆，扩大弹幕覆盖范围。",
      tag: "横向弹道",
      apply: p => p.horizontalProjectiles = Math.min(6, p.horizontalProjectiles + 1)
    },
    {
      icon: "↕",
      title: "双重射击",
      desc: "纵向额外发射一颗豌豆，形成前后连续弹幕。",
      tag: "纵向弹道",
      apply: p => p.longitudinalProjectiles = Math.min(5, p.longitudinalProjectiles + 1)
    },
    {
      icon: "♥",
      title: "生命上限 +40",
      desc: "生命上限提高 40，并立刻恢复 40 点生命。",
      tag: "生存强化",
      apply: p => {
        p.maxHealth += 40;
        p.health = Math.min(p.maxHealth, p.health + 40);
      }
    },
    {
      icon: "✦",
      title: "暴击率 +15%",
      desc: "暴击率增加 15%，暴击伤害倍率提高 0.5。",
      tag: "幸运强化",
      apply: p => {
        p.crit = Math.min(0.6, p.crit + 0.15);
        p.critDamage += 0.5;
      }
    },
    {
      icon: "↯",
      title: "穿透 +1",
      desc: "每颗豌豆可以额外穿透一个目标。",
      tag: "穿透强化",
      apply: p => p.pierce += 1
    }
  ];
}

const TALENTS = [
  { id: "sunflowerBlessing", icon: "金", title: "向日葵祝福", desc: "所有金币获取提高 25%。", tag: "经济", category: "economy", cost: 46 },
  { id: "starterSavings", icon: "袋", title: "开局储蓄", desc: "立刻获得 80 金币。", tag: "经济", category: "economy", cost: 42, apply: () => addCoins(80, false) },
  { id: "shopRegular", icon: "折", title: "商店熟客", desc: "休息处商品价格降低 15%。", tag: "商店", category: "shop", cost: 55, rare: true },
  { id: "bargain", icon: "刷", title: "讨价还价", desc: "每个休息处第一次刷新免费。", tag: "商店", category: "shop", cost: 48 },
  { id: "interest", icon: "息", title: "利滚利", desc: "进入休息处时，获得当前金币 12% 的利息。", tag: "经济", category: "economy", cost: 54, rare: true },
  { id: "frugalism", icon: "返", title: "节俭主义", desc: "购买商品后返还 15% 花费。", tag: "商店", category: "shop", cost: 50 },
  { id: "sunReserve", icon: "阳", title: "阳光储备", desc: "每过一波，获得 30 金币。", tag: "经济", category: "economy", cost: 44 },
  { id: "plantSense", icon: "球", title: "植物感应", desc: "悬浮球出现间隔缩短 42%。", tag: "悬浮球", category: "orb", cost: 45 },
  { id: "orbAmplifier", icon: "增", title: "球体增幅", desc: "所有悬浮球效果提高 35%。", tag: "悬浮球", category: "orb", cost: 58, rare: true },
  { id: "doubleTrigger", icon: "双", title: "双倍触发", desc: "拾取悬浮球时有 22% 概率触发两次。", tag: "悬浮球", category: "orb", cost: 60, rare: true },
  { id: "plantCollector", icon: "藏", title: "植物收藏家", desc: "每拾取一种新的植物球，永久获得小幅属性。", tag: "悬浮球", category: "orb", cost: 55, rare: true },
  { id: "supplyExpert", icon: "货", title: "补给专家", desc: "休息处额外出现 1 个商品。", tag: "商店", category: "shop", cost: 56, rare: true },
  { id: "medicalChannel", icon: "医", title: "医疗通道", desc: "进入休息处时恢复 30% 最大生命。", tag: "生存", category: "survival", cost: 47 },
  { id: "premiumShelf", icon: "高", title: "高级货架", desc: "商店更容易刷出稀有天赋。", tag: "商店", category: "shop", cost: 52 },
  { id: "coupon", icon: "券", title: "折扣券", desc: "每个休息处第一件商品半价。", tag: "商店", category: "shop", cost: 50 },
  { id: "stableProcurement", icon: "稳", title: "稳定采购", desc: "商店必定出现 1 个生存类天赋。", tag: "商店", category: "shop", cost: 42 },
  { id: "fireProcurement", icon: "火", title: "火力采购", desc: "商店必定出现 1 个战斗辅助类天赋。", tag: "商店", category: "shop", cost: 42 },
  { id: "plantSupplier", icon: "植", title: "植物供应商", desc: "商店更容易出现悬浮球相关天赋。", tag: "商店", category: "shop", cost: 45 },
  { id: "restRecovery", icon: "养", title: "疗养休息", desc: "离开休息处后短暂无敌。", tag: "休息", category: "survival", cost: 44 },
  { id: "departureSupply", icon: "行", title: "临行补给", desc: "离开休息处时获得一个随机临时增益。", tag: "休息", category: "survival", cost: 46 },
  { id: "hardShell", icon: "壳", title: "坚硬外壳", desc: "立刻获得 1 层坚果护盾。", tag: "生存", category: "survival", cost: 36, apply: p => { p.shield = Math.min(getMaxShield(), p.shield + 1); } },
  { id: "regenRoots", icon: "根", title: "再生根须", desc: "每前进 100 米恢复 6 点生命。", tag: "生存", category: "survival", cost: 45, apply: () => { game.regenNextDistance = Math.floor(game.distance / 100) * 100 + 100; } },
  { id: "firstAidBag", icon: "包", title: "急救背包", desc: "血包治疗量提高 60%。", tag: "生存", category: "survival", cost: 40 },
  { id: "lastStandShield", icon: "绝", title: "绝境护盾", desc: "生命首次低于 30% 时，获得短暂无敌。", tag: "生存", category: "survival", cost: 52, rare: true },
  { id: "antiCollision", icon: "障", title: "防撞训练", desc: "障碍物伤害降低 40%。", tag: "生存", category: "survival", cost: 38 },
  { id: "antiBullet", icon: "弹", title: "抗弹叶片", desc: "远程僵尸子弹伤害降低 35%。", tag: "生存", category: "survival", cost: 38 },
  { id: "wallnutGuardian", icon: "坚", title: "小坚果守护", desc: "每隔一段时间自动生成 1 层护盾。", tag: "生存", category: "survival", cost: 56, rare: true, apply: () => { game.wallnutGuardTimer = 10; } },
  { id: "damageCap", icon: "限", title: "破甲抗性", desc: "单次受到的伤害不会超过最大生命的 25%。", tag: "生存", category: "survival", cost: 48 },
  { id: "steadyStart", icon: "启", title: "稳健开局", desc: "获得后 300 米受到伤害降低 50%。", tag: "生存", category: "survival", cost: 34, apply: () => { game.talentTriggers.steadyStartUntil = game.distance + 300; } },
  { id: "epicDoubleDamage", title: "毁灭豌豆", desc: "攻击伤害翻倍。", tag: "史诗火力", category: "combat", rarity: "epic", apply: p => { p.damage *= 2; } },
  { id: "epicDoubleFireRate", title: "机关炮根系", desc: "攻击速度翻倍。", tag: "史诗火力", category: "combat", rarity: "epic", apply: p => { p.fireRate /= 2; } },
  { id: "epicDoubleSpread", title: "横扫弹幕", desc: "横向攻击弹道数量翻倍。", tag: "史诗火力", category: "combat", rarity: "epic", apply: p => { p.horizontalProjectiles = Math.min(12, Math.max(2, p.horizontalProjectiles * 2)); } },
  { id: "epicFullPierce", title: "贯穿一线", desc: "豌豆射手攻击可以穿透一整行僵尸。", tag: "史诗火力", category: "combat", rarity: "epic", apply: p => { p.pierce = Math.max(p.pierce, 999); } },
  { id: "epicGiantPeas", title: "巨型豌豆", desc: "豌豆子弹变得巨大，半径翻倍。", tag: "史诗火力", category: "combat", rarity: "epic", apply: p => { p.bulletSize *= 2; } },
  { id: "epicKillGrowth", title: "越杀越强", desc: "每击杀 10 个僵尸，攻击伤害乘以 1.1 倍。", tag: "史诗成长", category: "combat", rarity: "epic", apply: () => { game.talentTriggers.killGrowthMilestone = Math.floor(game.kills / 10); } },
  { id: "coinPouch", title: "零钱袋", desc: "每击杀 15 个僵尸，额外获得 10 金币。", tag: "经济", category: "economy", apply: () => { game.talentTriggers.coinPouchMilestone = Math.floor(game.kills / 15); } },
  { id: "smallInsurance", title: "小额保险", desc: "每次受到伤害后获得 10 金币。", tag: "经济", category: "economy" },
  { id: "starterMine", title: "地雷预备", desc: "每波开始时，在玩家前方生成 1 个低伤害土豆地雷。", tag: "悬浮球", category: "orb" },
  { id: "obstacleRecycle", title: "障碍回收", desc: "成功躲过障碍物后获得 8 金币。", tag: "经济", category: "economy" },
  { id: "sunflowerWarmth", title: "向日葵余温", desc: "拾取向日葵球后，额外恢复 5 点生命。", tag: "悬浮球", category: "orb" },
  { id: "forcedListing", title: "强制上架", desc: "每个休息处至少出现 1 个稀有或史诗天赋。", tag: "商店", category: "shop", rare: true },
  { id: "plantResonance", title: "植物共鸣", desc: "拾取悬浮球后，8 秒内下一次悬浮球效果 +50%。", tag: "悬浮球", category: "orb", rare: true },
  { id: "dangerConversion", title: "危险转化", desc: "生命低于 40% 时，金币获取 +40%，悬浮球出现率 +25%。", tag: "生存", category: "survival", rare: true },
  { id: "epicSunWindfall", title: "阳光暴富", desc: "所有金币获取翻倍，但商店商品价格 +30%。", tag: "史诗经济", category: "economy", rarity: "epic" },
  { id: "epicBlackCard", title: "黑卡会员", desc: "每个休息处第一件商品免费，但刷新价格翻倍。", tag: "史诗商店", category: "shop", rarity: "epic" },
  { id: "epicPlantArmy", title: "植物军团", desc: "每次拾取豌豆射手球，同时生成 2 个临时豌豆射手辅助攻击。", tag: "史诗悬浮球", category: "combat", rarity: "epic" },
  { id: "epicPotatoMinefield", title: "土豆雷阵", desc: "每波开始时，在三条路线各生成 1 个土豆地雷。", tag: "史诗悬浮球", category: "orb", rarity: "epic" },
  { id: "epicWallnutFortress", title: "坚果壁垒", desc: "护盾上限提高到 6 层，护盾存在时受到伤害降低 20%。", tag: "史诗生存", category: "survival", rarity: "epic" },
  { id: "epicOverloadGrowth", title: "超载成长", desc: "每获得 1 个天赋，攻击伤害和最大生命各 +6%。", tag: "史诗成长", category: "combat", rarity: "epic" }
];

function shuffleList(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function hasTalent(id) {
  return game.activeTalentIds.has(id);
}

function addCoins(amount, boosted = true) {
  let multiplier = 1;
  if (boosted && hasTalent("sunflowerBlessing")) multiplier *= 1.25;
  if (boosted && hasTalent("epicSunWindfall")) multiplier *= 2;
  if (boosted
    && hasTalent("dangerConversion")
    && game.player
    && game.player.health <= game.player.maxHealth * 0.4) {
    multiplier *= 1.4;
  }
  game.coins += Math.max(0, Math.round(amount * multiplier));
}

function healPlayer(amount) {
  const p = game.player;
  if (!p) return 0;
  const healed = Math.min(amount, p.maxHealth - p.health);
  p.health = Math.min(p.maxHealth, p.health + amount);
  return healed;
}

function getOrbEffectMultiplier() {
  return hasTalent("orbAmplifier") ? 1.35 : 1;
}

function getPlantOrbDelay() {
  const base = 6.5 + Math.random() * 4.5;
  let multiplier = hasTalent("plantSense") ? 0.58 : 1;
  if (hasTalent("dangerConversion")
    && game.player
    && game.player.health <= game.player.maxHealth * 0.4) {
    multiplier *= 0.75;
  }
  return base * multiplier / getDifficultyConfig().pickupFrequency;
}

function getMaxShield() {
  return hasTalent("epicWallnutFortress") ? 6 : 3;
}

function getAvailableTalents() {
  return TALENTS.filter(talent => !hasTalent(talent.id));
}

function getTalentById(id) {
  return TALENTS.find(talent => talent.id === id);
}

function pickTalents(count, source = "generic") {
  const picked = [];
  const available = getAvailableTalents();

  function addWhere(predicate) {
    const item = shuffleList(available).find(talent => !picked.includes(talent) && predicate(talent));
    if (item) picked.push(item);
  }

  if (source === "shop") {
    if (hasTalent("stableProcurement")) addWhere(talent => talent.category === "survival");
    if (hasTalent("fireProcurement")) addWhere(talent => talent.category === "combat" || talent.category === "orb" || talent.id === "departureSupply");
    if (hasTalent("plantSupplier") && Math.random() < 0.7) addWhere(talent => talent.category === "orb");
    if (hasTalent("forcedListing")) addWhere(talent => talent.rare || talent.rarity === "epic");
    if (hasTalent("premiumShelf")) addWhere(talent => talent.rare || talent.rarity === "epic");
  }

  for (const talent of shuffleList(available)) {
    if (picked.length >= count) break;
    if (!picked.includes(talent)) picked.push(talent);
  }

  return picked.slice(0, count);
}

function getTalentIcon(talent) {
  if (talent.tag === "休息") return "~";
  if (talent.category === "combat") return "^";
  if (talent.category === "economy") return "$";
  if (talent.category === "shop") return "%";
  if (talent.category === "orb") return "*";
  if (talent.category === "survival") return "+";
  return "?";
}

function renderTalentCard(card, talent, priceText = "") {
  card._talent = talent;
  card.classList.toggle("rare-talent", Boolean(talent.rare));
  card.classList.toggle("epic-talent", talent.rarity === "epic");
  card.innerHTML = `
    <span class="choice-icon talent-icon talent-icon-${talent.category}">${getTalentIcon(talent)}</span>
    <strong>${talent.title}</strong>
    <small>${talent.desc}</small>
    <span class="choice-tag">${talent.tag}</span>
    ${priceText}
  `;
}

function renderTalentSummary(listElement, countElement) {
  if (!listElement || !countElement) return;
  const talents = [...game.activeTalentIds].map(getTalentById).filter(Boolean);
  countElement.textContent = talents.length;

  if (talents.length === 0) {
    listElement.innerHTML = `<div class="active-talent-empty">暂无天赋</div>`;
    return;
  }

  listElement.innerHTML = talents.map(talent => `
    <div class="active-talent-item${talent.rare ? " rare" : ""}${talent.rarity === "epic" ? " epic" : ""}">
      <span class="active-talent-icon talent-icon-${talent.category}">${getTalentIcon(talent)}</span>
      <div>
        <strong>${talent.title}${talent.rarity === "epic" ? " · 史诗" : talent.rare ? " · 稀有" : ""}</strong>
        <small>${talent.desc}</small>
      </div>
    </div>
  `).join("");
}

function renderActiveTalents() {
  renderTalentSummary(ui.activeTalentList, ui.activeTalentCount);
}

function renderPauseTalents() {
  renderTalentSummary(ui.pauseTalentList, ui.pauseTalentCount);
}

function applyOverloadGrowth() {
  const p = game.player;
  if (!p) return;
  const oldMaxHealth = p.maxHealth;
  p.damage *= 1.06;
  p.maxHealth = Math.round(p.maxHealth * 1.06);
  p.health = Math.min(p.maxHealth, p.health + (p.maxHealth - oldMaxHealth));
}

function acquireTalent(talent) {
  if (!talent || hasTalent(talent.id)) return false;
  game.activeTalentIds.add(talent.id);
  if (talent.apply) talent.apply(game.player);
  if (hasTalent("epicOverloadGrowth")) applyOverloadGrowth();
  floatingText(talent.title, game.player?.x ?? 0, 0.72, "#b8ff45", 17);
  renderActiveTalents();
  updateUI();
  return true;
}

function openTalentChoice() {
  game.state = "talent";
  const pool = pickTalents(3, "start");
  document.querySelectorAll(".talent-card").forEach((card, index) => {
    const talent = pool[index];
    card.disabled = !talent;
    if (talent) renderTalentCard(card, talent);
  });
  ui.talent.classList.add("visible");
}

function chooseStartTalent(card) {
  if (game.state !== "talent" || !card._talent) return;
  acquireTalent(card._talent);
  ui.talent.classList.remove("visible");
  startWaveIntro(1);
}

function getShopItemCount() {
  return hasTalent("supplyExpert") ? 4 : 3;
}

function getTalentShopCost(talent, index) {
  if (hasTalent("epicBlackCard") && index === 0 && !game.talentTriggers.blackCardUsedThisRest) return 0;
  const minCost = talent.rarity === "epic" ? 75 : talent.rare ? 55 : 35;
  const maxCost = talent.rarity === "epic" ? 85 : talent.rare ? 65 : 45;
  const baseCost = minCost + Math.floor(Math.random() * (maxCost - minCost + 1));
  const difficulty = getDifficultyConfig();
  const restMultiplier = Math.pow(difficulty.shopGrowthMultiplier, Math.max(0, game.restTier - 1));
  let cost = baseCost * restMultiplier * difficulty.shopPriceMultiplier;
  if (hasTalent("epicSunWindfall")) cost *= 1.3;
  if (hasTalent("shopRegular")) cost *= 0.85;
  if (hasTalent("coupon") && index === 0) cost *= 0.5;
  return Math.max(1, Math.round(cost));
}

function applyDepartureSupply() {
  const p = game.player;
  if (!p) return;
  const roll = Math.floor(Math.random() * 4);
  if (roll === 0) {
    p.peaBoostTimer = Math.max(p.peaBoostTimer, 6);
    floatingText("临时火力", p.x, 0.76, "#b8ff45", 17);
  } else if (roll === 1) {
    p.shield = Math.min(getMaxShield(), p.shield + 1);
    floatingText("临时护盾", p.x, 0.76, "#e0ad70", 17);
  } else if (roll === 2) {
    addCoins(18);
    floatingText("+18 金币", p.x, 0.76, "#ffd84f", 17);
  } else {
    const healed = healPlayer(22);
    floatingText(healed > 0 ? `+${healed} HP` : "生命已满", p.x, 0.76, "#83ff72", 17);
  }
}

function canPauseGame() {
  return ["playing", "boss", "wave", "restArrival"].includes(game.state) && game.player;
}

function openPauseMenu() {
  if (game.paused || !canPauseGame()) return;
  game.paused = true;
  game.pausedState = game.state;
  game.pointerActive = false;
  game.keys = {};
  renderPauseTalents();
  ui.pause.classList.add("visible");
}

function closePauseMenu() {
  if (!game.paused) return;
  game.paused = false;
  game.pausedState = null;
  ui.pause.classList.remove("visible");
  game.lastTime = performance.now();
}

function resetGame() {
  const difficulty = getDifficultyConfig();
  game.state = "talent";
  game.paused = false;
  game.pausedState = null;
  game.time = 0;
  game.distance = 0;
  game.speed = 115;
  game.stage = 1;
  game.kills = 0;
  game.coins = 0;
  game.shake = 0;
  game.spawnTimer = 0;
  game.obstacleTimer = 0;
  game.plantOrbTimer = 0;
  game.regenNextDistance = 100;
  game.wallnutGuardTimer = 18;
  game.nextChoice = game.choiceAt;
  game.nextRest = game.restAt;
  game.enemyHealthMultiplier = 1;
  game.restTier = 0;
  game.shopRefreshCount = 0;
  game.transitionTimer = 0;
  game.pendingRest = false;
  game.freezeTimer = 0;
  game.enemies = [];
  game.bullets = [];
  game.enemyBullets = [];
  game.obstacles = [];
  game.healthPacks = [];
  game.plantOrbs = [];
  game.potatoMines = [];
  game.activeTalentIds = new Set();
  game.collectedPlantOrbTypes = new Set();
  game.talentTriggers = {};
  game.boss = null;
  game.bowlingBalls = [];
  game.carWarnings = [];
  game.bossLasers = [];
  game.bossShockwaves = [];
  game.particles = [];
  game.coinDrops = [];
  game.texts = [];
  game.player = {
    x: 0,
    health: 100,
    maxHealth: 100,
    damage: 20 * difficulty.playerDamageMultiplier,
    fireRate: 0.46 / difficulty.playerFireRateMultiplier,
    fireTimer: 0,
    moveSpeed: 2.25,
    horizontalProjectiles: 1,
    longitudinalProjectiles: 1,
    bulletSize: 15,
    crit: 0.05,
    critDamage: 2.5,
    pierce: 0,
    invulnerable: 0,
    damageFlash: 0,
    freezeTimer: 0,
    peaBoostTimer: 0,
    peaArmyTimer: 0,
    shield: 0
  };
  ui.start.classList.remove("visible");
  ui.start.style.visibility = "hidden";
  ui.start.style.opacity = "0";
  ui.start.style.pointerEvents = "none";
  ui.end.classList.remove("visible");
  ui.difficulty.classList.remove("visible");
  ui.choice.classList.remove("visible");
  ui.talent.classList.remove("visible");
  ui.rest.classList.remove("visible");
  ui.pause.classList.remove("visible");
  ui.wave.classList.remove("visible");
  ui.restArrival.classList.remove("visible");
  ui.bossHud.classList.remove("visible");
  openTalentChoice();
  updateUI();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  canvas.logicalWidth = rect.width;
  canvas.logicalHeight = rect.height;
}

function roadPoint(laneX, depth) {
  const w = canvas.logicalWidth;
  const h = canvas.logicalHeight;
  const horizon = h * 0.4;
  const t = Math.max(0, Math.min(1, depth));
  const curve = Math.sin(game.distance * 0.004 + t * 2.2) * w * 0.025 * t;
  const halfWidth = w * (0.08 + t * 0.43);
  return {
    x: w / 2 + curve + laneX * halfWidth,
    y: horizon + t * (h - horizon),
    scale: 0.18 + t * 1.05
  };
}

function getStageHealthMultiplier(stage = game.stage) {
  return Math.pow(2.5, Math.max(0, stage - 1));
}

const ENEMY_COIN_REWARDS = {
  imp: 3,
  normal: 3,
  runner: 5,
  bucket: 7,
  peaZombie: 5,
  football: 8,
  screen: 8,
  elite: 15
};

function getEnemyCoinReward(type) {
  return ENEMY_COIN_REWARDS[type] ?? ENEMY_COIN_REWARDS.normal;
}

function chooseEnemyType() {
  const typeRoll = Math.random();
  if (game.stage >= 2 && typeRoll < 0.18) return "imp";
  if (game.stage >= 3 && typeRoll < 0.30) return "screen";
  if (game.stage >= 4 && typeRoll < 0.42) return "peaZombie";
  if (game.stage >= 5 && typeRoll < 0.52) return "football";
  if (typeRoll > 0.82) return "bucket";
  if (typeRoll > 0.67) return "runner";
  return "normal";
}

function getEnemyStats(type) {
  game.enemyHealthMultiplier = getStageHealthMultiplier();
  const baseHealth = 35 + game.stage * 10;
  let health = baseHealth * game.enemyHealthMultiplier;
  let speed = 0.07 + Math.random() * 0.024 + game.stage * 0.002;
  let radius = 24;

  if (type === "imp") {
    speed *= 2;
    radius = 17;
  } else if (type === "screen") {
    health *= 4;
    speed *= 0.78;
    radius = 30;
  } else if (type === "peaZombie") {
    radius = 25;
  } else if (type === "football") {
    health *= 3;
    speed *= 2;
    radius = 29;
  } else if (type === "bucket") {
    health *= 3;
    speed *= 0.78;
    radius = 28;
  } else if (type === "runner") {
    health *= 2;
    radius = 21;
  }

  speed *= getDifficultyConfig().enemySpeedMultiplier;
  return { health, speed, radius };
}

function spawnEnemy(forcedType = null, options = {}) {
  const type = forcedType ?? chooseEnemyType();
  const stats = getEnemyStats(type);
  const depth = options.depth ?? 0.02;

  game.enemies.push({
    x: options.x ?? (-0.78 + Math.random() * 1.56),
    depth,
    health: stats.health,
    maxHealth: stats.health,
    speed: options.speed ?? stats.speed,
    radius: stats.radius,
    type,
    fireTimer: type === "peaZombie" ? 1.2 : 0,
    hitFlash: 0,
    wobble: Math.random() * Math.PI * 2
  });
}

function spawnObstacle(type = "roadblock", options = {}) {
  const positions = ROAD_LANES;
  game.obstacles.push({
    type,
    x: options.x ?? positions[Math.floor(Math.random() * positions.length)],
    depth: options.depth ?? 0.02,
    speed: options.speed ?? 0.13,
    hit: false
  });
}

function spawnHealthPack() {
  const positions = ROAD_LANES;
  game.healthPacks.push({
    x: positions[Math.floor(Math.random() * positions.length)],
    depth: 0.02,
    speed: 0.13,
    remove: false,
    bob: Math.random() * Math.PI * 2
  });
}

const PLANT_ORB_TYPES = ["peashooter", "potato", "sunflower", "wallnut"];

const PLANT_ORB_INFO = {
  peashooter: { color: "#8ee948", glow: "rgba(130,255,75,.8)" },
  potato: { color: "#b87940", glow: "rgba(255,173,78,.75)" },
  sunflower: { color: "#ffd447", glow: "rgba(255,214,71,.8)" },
  wallnut: { color: "#c28b4d", glow: "rgba(255,190,104,.75)" }
};

function spawnPlantOrb() {
  const positions = ROAD_LANES;
  const type = PLANT_ORB_TYPES[Math.floor(Math.random() * PLANT_ORB_TYPES.length)];
  game.plantOrbs.push({
    type,
    x: positions[Math.floor(Math.random() * positions.length)],
    depth: 0.02,
    speed: 0.125,
    bob: Math.random() * Math.PI * 2,
    spin: Math.random() * Math.PI * 2,
    remove: false
  });
}

function spawnPotatoMine(x, depth, damage, radiusX = 0.32, radiusDepth = 0.18) {
  game.potatoMines.push({
    x,
    depth,
    age: 0,
    damage,
    radiusX,
    radiusDepth,
    remove: false,
    armed: false
  });
}

function applyPlantOrbEffect(orb, effectMultiplier = getOrbEffectMultiplier()) {
  const p = game.player;
  if (!p) return;
  const multiplier = effectMultiplier;

  if (orb.type === "peashooter") {
    const duration = 8 * multiplier;
    p.peaBoostTimer = Math.max(p.peaBoostTimer, duration);
    if (hasTalent("epicPlantArmy")) p.peaArmyTimer = Math.max(p.peaArmyTimer, duration);
    floatingText(`Peashooter +${Math.round(duration)}s`, p.x, 0.76, "#b8ff45", 17);
    burst(p.x, 0.82, "#b8ff45", 18, 0.06);
  } else if (orb.type === "potato") {
    spawnPotatoMine(p.x, 0.68, 180 * getStageHealthMultiplier() * multiplier);
    floatingText("Potato Mine", p.x, 0.76, "#ffbd58", 17);
    burst(p.x, 0.82, "#ffbd58", 14, 0.05);
  } else if (orb.type === "sunflower") {
    const bonus = Math.round((12 + game.stage * 3) * multiplier);
    addCoins(bonus);
    if (hasTalent("sunflowerWarmth")) {
      const healed = healPlayer(Math.round(5 * multiplier));
      if (healed > 0) floatingText(`+${healed} HP`, p.x, 0.7, "#83ff72", 15);
    }
    floatingText(`+${bonus} Coins`, p.x, 0.76, "#ffd84f", 17);
    burst(p.x, 0.82, "#ffe06b", 18, 0.055);
  } else if (orb.type === "wallnut") {
    p.shield = Math.min(getMaxShield(), p.shield + Math.max(1, Math.round(multiplier)));
    floatingText(`Shield ${p.shield}`, p.x, 0.76, "#e0ad70", 17);
    burst(p.x, 0.82, "#e0ad70", 16, 0.05);
  }
}

function collectPlantOrb(orb) {
  let multiplier = getOrbEffectMultiplier();
  const resonanceActive = hasTalent("plantResonance")
    && (game.talentTriggers.plantResonanceUntil ?? 0) > game.time;
  if (resonanceActive) {
    multiplier *= 1.5;
    game.talentTriggers.plantResonanceUntil = 0;
    floatingText("植物共鸣", game.player.x, 0.7, "#bff8ff", 16);
  }

  applyPlantOrbEffect(orb, multiplier);
  if (hasTalent("doubleTrigger") && Math.random() < 0.22) applyPlantOrbEffect(orb, multiplier);

  if (hasTalent("plantCollector") && !game.collectedPlantOrbTypes.has(orb.type)) {
    const p = game.player;
    game.collectedPlantOrbTypes.add(orb.type);
    p.damage *= 1.04;
    p.maxHealth += 5;
    p.health = Math.min(p.maxHealth, p.health + 5);
    floatingText("收藏加成", p.x, 0.7, "#d6ff73", 16);
  }

  if (hasTalent("plantResonance")) game.talentTriggers.plantResonanceUntil = game.time + 8;
}

function explodePotatoMine(mine) {
  if (mine.remove) return;
  mine.remove = true;
  floatingText("BOOM", mine.x, mine.depth, "#ffbd58", 22);
  burst(mine.x, mine.depth, "#ffbd58", 34, 0.1);

  for (const enemy of game.enemies) {
    if (enemy.dead) continue;
    const dx = Math.abs(enemy.x - mine.x);
    const depthDistance = Math.abs(enemy.depth - mine.depth);
    if (dx <= mine.radiusX && depthDistance <= mine.radiusDepth) {
      enemy.health -= mine.damage;
      enemy.hitFlash = 1;
      floatingText(`-${Math.round(mine.damage)}`, enemy.x, enemy.depth, "#ffefad", 16);
      if (enemy.health <= 0) {
        enemy.dead = true;
        registerEnemyKill(enemy);
        burst(enemy.x, enemy.depth, "#ff9858", 14, 0.07);
      }
    }
  }
}

function registerEnemyKill(enemy) {
  game.kills++;
  spawnCoinDrops(enemy);

  if (hasTalent("epicKillGrowth")) {
    const milestone = Math.floor(game.kills / 10);
    const previous = game.talentTriggers.killGrowthMilestone ?? 0;
    if (milestone > previous) {
      const stacks = milestone - previous;
      game.player.damage *= Math.pow(1.1, stacks);
      game.talentTriggers.killGrowthMilestone = milestone;
      floatingText(`伤害 x${Math.pow(1.1, stacks).toFixed(1)}`, game.player.x, 0.72, "#d9a7ff", 17);
    }
  }

  if (hasTalent("coinPouch")) {
    const milestone = Math.floor(game.kills / 15);
    const previous = game.talentTriggers.coinPouchMilestone ?? 0;
    if (milestone > previous) {
      addCoins(10);
      game.talentTriggers.coinPouchMilestone = milestone;
      floatingText("+10 金币", game.player.x, 0.72, "#ffd84f", 16);
    }
  }
}

function shoot() {
  const p = game.player;
  const spread = 0.13;
  for (let row = 0; row < p.longitudinalProjectiles; row++) {
    for (let column = 0; column < p.horizontalProjectiles; column++) {
      const offset = (column - (p.horizontalProjectiles - 1) / 2) * spread;
      game.bullets.push({
        x: p.x + offset * 0.3,
        depth: 0.84 + row * 0.055,
        vx: offset,
        speed: 1.55,
        radius: p.bulletSize,
        damage: p.damage,
        pierce: p.pierce,
        hit: new Set(),
        color: "#b8ff45",
        glow: "#9dff3c"
      });
    }
  }
  if (p.peaBoostTimer > 0) {
    for (const side of [-1, 1]) {
      game.bullets.push({
        x: p.x + side * 0.18,
        depth: 0.82,
        vx: side * 0.05,
        speed: 1.45,
        radius: p.bulletSize * 0.78,
        damage: p.damage * 0.55,
        pierce: 0,
        hit: new Set(),
        color: "#d8ff66",
        glow: "#e5ff82"
      });
    }
  }
  if (p.peaArmyTimer > 0) {
    for (const side of [-1, 1]) {
      game.bullets.push({
        x: p.x + side * 0.31,
        depth: 0.8,
        vx: side * 0.08,
        speed: 1.5,
        radius: p.bulletSize * 0.92,
        damage: p.damage * 0.8,
        pierce: p.pierce,
        hit: new Set(),
        color: "#caff6a",
        glow: "#f0ff8c"
      });
    }
  }
  burst(p.x, 0.84, "#b8ff45", 4, 0.018);
}

function shootEnemyPea(enemy) {
  game.enemyBullets.push({
    x: enemy.x,
    depth: enemy.depth,
    speed: 0.48,
    damage: 10,
    removed: false,
    pulse: Math.random() * Math.PI * 2
  });
}

function burst(x, depth, color, count, force = 0.035) {
  for (let i = 0; i < count; i++) {
    game.particles.push({
      x,
      depth,
      vx: (Math.random() - 0.5) * force,
      vy: (Math.random() - 0.5) * force,
      life: 0.35 + Math.random() * 0.35,
      maxLife: 0.7,
      color,
      size: 2 + Math.random() * 5
    });
  }
}

function floatingText(text, x, depth, color = "#f8ffe9", size = 15) {
  game.texts.push({ text, x, depth, color, size, life: 0.8 });
}

function spawnCoinDrops(enemy) {
  const reward = getEnemyCoinReward(enemy.type);
  const dropCount = Math.min(6, reward);
  const point = roadPoint(enemy.x, enemy.depth);
  let remainingValue = reward;

  for (let i = 0; i < dropCount; i++) {
    const slotsLeft = dropCount - i;
    const value = Math.ceil(remainingValue / slotsLeft);
    remainingValue -= value;
    game.coinDrops.push({
      x: point.x,
      y: point.y - 20,
      vx: (i - (dropCount - 1) / 2) * 38 + (Math.random() - 0.5) * 22,
      vy: -105 - Math.random() * 55,
      value,
      age: 0,
      scatterTime: 0.48 + Math.random() * 0.12,
      flyTime: 0.52,
      flyStartX: null,
      flyStartY: null,
      collected: false,
      spin: Math.random() * Math.PI * 2
    });
  }
}

function startWaveIntro(stage) {
  game.state = "wave";
  game.stage = stage;
  if (stage > 1 && hasTalent("sunReserve")) {
    addCoins(30);
    floatingText("+30 金币", game.player?.x ?? 0, 0.7, "#ffd84f", 17);
  }
  game.transitionTimer = 2;
  game.spawnTimer = 0;
  game.obstacleTimer = 0;
  game.plantOrbTimer = 0;
  game.enemies = [];
  game.bullets = [];
  game.enemyBullets = [];
  game.obstacles = [];
  game.healthPacks = [];
  game.plantOrbs = [];
  game.potatoMines = [];
  if (hasTalent("starterMine") && game.player) {
    spawnPotatoMine(game.player.x, 0.68, 70 * getStageHealthMultiplier(), 0.24, 0.14);
  }
  if (hasTalent("epicPotatoMinefield")) {
    for (const lane of [-0.62, 0, 0.62]) {
      spawnPotatoMine(lane, 0.62, 130 * getStageHealthMultiplier(), 0.28, 0.16);
    }
  }
  ui.waveKicker.textContent = `WAVE ${stage}`;
  ui.waveTitle.textContent = `第 ${stage} 波`;
  ui.waveSubtitle.textContent = stage === 5 ? "最终尸潮" : "僵尸来袭";
  ui.wave.classList.add("visible");
}

function startRestArrival() {
  game.state = "restArrival";
  game.transitionTimer = 1.35;
  game.pendingRest = true;
  game.enemies = [];
  game.bullets = [];
  game.enemyBullets = [];
  game.obstacles = [];
  game.healthPacks = [];
  game.plantOrbs = [];
  game.potatoMines = [];
  ui.restArrival.classList.add("visible");
}

function startBossBattle() {
  const difficulty = getDifficultyConfig();
  const bossConfig = difficulty.boss;
  game.state = "boss";
  game.distance = game.totalDistance;
  game.enemies = [];
  game.bullets = [];
  game.enemyBullets = [];
  game.obstacles = [];
  game.healthPacks = [];
  game.plantOrbs = [];
  game.potatoMines = [];
  game.bowlingBalls = [];
  game.carWarnings = [];
  game.bossLasers = [];
  game.bossShockwaves = [];
  game.boss = {
    x: 0,
    depth: 0.2,
    type: bossConfig.type,
    name: bossConfig.name,
    health: bossConfig.health,
    maxHealth: bossConfig.health,
    fixedLane: bossConfig.fixedLane,
    switchDamage: bossConfig.switchDamage ?? 0,
    nextSwitchHealth: bossConfig.switchDamage ? bossConfig.health - bossConfig.switchDamage : 0,
    direction: 1,
    moveSpeed: bossConfig.fixedLane ? 0 : 0.34,
    attackTimer: 2.2,
    hitFlash: 0,
    attackName: "",
    laserVolley: null
  };
  if (ui.bossName) ui.bossName.textContent = bossConfig.name;
  ui.bossHud.classList.add("visible");
  floatingText("僵王博士出现！", 0, 0.48, "#ffcf55", 24);
  updateUI();
}

function randomLane(except = null) {
  const lanes = except === null ? ROAD_LANES : ROAD_LANES.filter(lane => lane !== except);
  return lanes[Math.floor(Math.random() * lanes.length)];
}

function switchBossLane() {
  if (!game.boss) return;
  game.boss.x = randomLane(game.boss.x);
  game.boss.hitFlash = 1;
  floatingText("Switch", game.boss.x, game.boss.depth, "#ffef7a", 18);
  burst(game.boss.x, game.boss.depth, "#ffef7a", 22, 0.08);
}

function scheduleNextBossAttack() {
  const delays = getDifficultyConfig().boss.attackDelay;
  game.boss.attackTimer = delays[0] + Math.random() * (delays[1] - delays[0]);
}

function spawnBossLaserWave() {
  for (const lane of shuffleList([...ROAD_LANES]).slice(0, 2)) {
    game.bossLasers.push({
      x: lane,
      timer: 0.5,
      impactTimer: 0.22,
      impacted: false,
      removed: false,
      damage: 20
    });
  }
}

function spawnBossShockwave() {
  game.bossShockwaves.push({
    x: game.boss.x,
    timer: 0.45,
    impactTimer: 0.28,
    impacted: false,
    removed: false,
    damage: 20
  });
}

function spawnBossRoadblocks() {
  for (let i = 0; i < 4; i++) {
    spawnObstacle("roadblock", {
      x: randomLane(),
      depth: 0.18 + Math.random() * 0.5,
      speed: 0.055 + Math.random() * 0.025
    });
  }
}

function useBossAttack() {
  const attacks = getDifficultyConfig().boss.attacks;
  const attack = attacks[Math.floor(Math.random() * attacks.length)];
  game.boss.attackName = attack;

  if (attack === "bowling") {
    const lanes = shuffleList([...ROAD_LANES]).slice(0, 2);
    for (const lane of lanes) {
      game.bowlingBalls.push({ x: lane, depth: 0.2, speed: 0.38, damage: 20, removed: false, spin: 0 });
    }
    floatingText("双路保龄球！", game.boss.x, 0.32, "#ffb45d", 18);
  } else if (attack === "car") {
    const lane = randomLane();
    game.carWarnings.push({ x: lane, timer: 1, impactTimer: 0, impacted: false, removed: false });
    floatingText("车辆坠落预警！", lane, 0.68, "#ff6655", 18);
  } else if (attack === "summon") {
    for (let i = 0; i < 10; i++) {
      spawnEnemy();
      const enemy = game.enemies[game.enemies.length - 1];
      enemy.depth = -0.14 - i * 0.045;
      enemy.x = [-0.7, -0.35, 0, 0.35, 0.7][i % 5] + (Math.random() - 0.5) * 0.08;
    }
    floatingText("僵尸军团！", game.boss.x, 0.32, "#d9ff72", 18);
  } else if (attack === "footballRush") {
    for (const lane of ROAD_LANES) {
      for (let i = 0; i < 2; i++) spawnEnemy("football", { x: lane, depth: -0.14 - i * 0.18 });
    }
    floatingText("Football Rush", game.boss.x, 0.32, "#ffcf55", 18);
  } else if (attack === "laserVolley") {
    game.boss.laserVolley = { remaining: 3, timer: 0 };
    floatingText("Laser Volley", game.boss.x, 0.32, "#ff5a73", 18);
  } else if (attack === "roadblocks") {
    spawnBossRoadblocks();
    floatingText("Roadblocks", game.boss.x, 0.32, "#ffb45d", 18);
  } else if (attack === "peaStorm") {
    for (let i = 0; i < 10; i++) {
      game.enemyBullets.push({
        x: -0.78 + Math.random() * 1.56,
        depth: 0.12 + Math.random() * 0.18,
        speed: 0.42 + Math.random() * 0.22,
        damage: 10,
        removed: false,
        pulse: Math.random() * Math.PI * 2
      });
    }
    floatingText("Pea Storm", game.boss.x, 0.32, "#b8ff45", 18);
  } else if (attack === "massSummon") {
    for (let i = 0; i < 20; i++) {
      spawnEnemy(null, { x: -0.78 + Math.random() * 1.56, depth: -0.12 - i * 0.04 });
    }
    floatingText("Mass Summon", game.boss.x, 0.32, "#d9ff72", 18);
  } else if (attack === "shockwave") {
    spawnBossShockwave();
    floatingText("Shockwave", game.boss.x, 0.32, "#ffcf55", 18);
  } else if (attack === "throwImps") {
    for (let i = 0; i < 5; i++) {
      spawnEnemy("imp", { x: randomLane() + (Math.random() - 0.5) * 0.12, depth: -0.1 - i * 0.09 });
    }
    floatingText("Throw Imps", game.boss.x, 0.32, "#d9ff72", 18);
  }

  scheduleNextBossAttack();
}

function updateBoss(dt) {
  const boss = game.boss;
  if (!boss) return;
  boss.hitFlash = Math.max(0, boss.hitFlash - dt * 5);
  if (!boss.fixedLane) {
    boss.x += boss.direction * boss.moveSpeed * dt;
    if (boss.x >= 0.68) {
      boss.x = 0.68;
      boss.direction = -1;
    } else if (boss.x <= -0.68) {
      boss.x = -0.68;
      boss.direction = 1;
    }
  }

  if (boss.laserVolley) {
    boss.laserVolley.timer -= dt;
    if (boss.laserVolley.timer <= 0 && boss.laserVolley.remaining > 0) {
      spawnBossLaserWave();
      boss.laserVolley.remaining--;
      boss.laserVolley.timer = 0.72;
    }
    if (boss.laserVolley.remaining <= 0 && boss.laserVolley.timer <= 0) {
      boss.laserVolley = null;
    }
  }

  boss.attackTimer -= dt;
  if (boss.attackTimer <= 0) useBossAttack();

  for (const bullet of game.bullets) {
    if (bullet.depth < -0.1) continue;
    if (Math.abs(bullet.depth - boss.depth) < 0.07 && Math.abs(bullet.x - boss.x) < 0.2) {
      const critical = Math.random() < game.player.crit;
      const damage = Math.round(bullet.damage * (critical ? game.player.critDamage : 1));
      boss.health -= damage;
      boss.hitFlash = 1;
      bullet.depth = -1;
      floatingText(critical ? `暴击 ${damage}!` : `-${damage}`, boss.x, boss.depth, critical ? "#fff266" : "#ffffff", critical ? 15 : 14);
      burst(boss.x, boss.depth, "#b8ff45", 7);
      while (boss.switchDamage > 0 && boss.health > 0 && boss.health <= boss.nextSwitchHealth) {
        switchBossLane();
        boss.nextSwitchHealth -= boss.switchDamage;
      }
      if (boss.health <= 0) {
        boss.health = 0;
        ui.bossHud.classList.remove("visible");
        burst(boss.x, boss.depth, "#ffb447", 45, 0.11);
        endGame(true);
        return;
      }
    }
  }

  for (const ball of game.bowlingBalls) {
    ball.depth += ball.speed * dt;
    ball.spin += dt * 9;
    if (ball.depth >= 0.84) {
      if (Math.abs(ball.x - game.player.x) < 0.2) damagePlayer(ball.damage);
      ball.removed = true;
    }
  }

  for (const warning of game.carWarnings) {
    if (!warning.impacted) {
      warning.timer -= dt;
      if (warning.timer <= 0) {
        warning.impacted = true;
        warning.impactTimer = 0.42;
        if (Math.abs(warning.x - game.player.x) < 0.22) damagePlayer(35);
        burst(warning.x, 0.82, "#ff8d4c", 28, 0.1);
      }
    } else {
      warning.impactTimer -= dt;
      if (warning.impactTimer <= 0) warning.removed = true;
    }
  }

  for (const laser of game.bossLasers) {
    if (!laser.impacted) {
      laser.timer -= dt;
      if (laser.timer <= 0) {
        laser.impacted = true;
        if (Math.abs(laser.x - game.player.x) < 0.22) damagePlayer(laser.damage, "laser");
        burst(laser.x, 0.82, "#ff4d6d", 32, 0.12);
      }
    } else {
      laser.impactTimer -= dt;
      if (laser.impactTimer <= 0) laser.removed = true;
    }
  }

  for (const shockwave of game.bossShockwaves) {
    if (!shockwave.impacted) {
      shockwave.timer -= dt;
      if (shockwave.timer <= 0) {
        shockwave.impacted = true;
        if (Math.abs(shockwave.x - game.player.x) < 0.24) damagePlayer(shockwave.damage, "shockwave");
        burst(shockwave.x, 0.82, "#ffcf55", 26, 0.1);
      }
    } else {
      shockwave.impactTimer -= dt;
      if (shockwave.impactTimer <= 0) shockwave.removed = true;
    }
  }

  game.bowlingBalls = game.bowlingBalls.filter(ball => !ball.removed);
  game.carWarnings = game.carWarnings.filter(warning => !warning.removed);
  game.bossLasers = game.bossLasers.filter(laser => !laser.removed);
  game.bossShockwaves = game.bossShockwaves.filter(shockwave => !shockwave.removed);
}

function update(dt) {
  if (game.paused) {
    updateUI();
    return;
  }

  if (game.state === "wave" || game.state === "restArrival") {
    game.time += dt;
    game.transitionTimer -= dt;
    if (game.transitionTimer <= 0) {
      if (game.state === "wave") {
        ui.wave.classList.remove("visible");
        game.state = "playing";
      } else {
        ui.restArrival.classList.remove("visible");
        game.pendingRest = false;
        openRestStop();
      }
    }
    updateUI();
    return;
  }

  if (game.state !== "playing" && game.state !== "boss") return;

  const p = game.player;
  game.time += dt;
  if (game.state === "playing") game.distance += game.speed * dt / 10;
  game.stage = Math.min(5, Math.floor(game.distance / 500) + 1);
  game.speed = 115 + game.stage * 8;
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  p.damageFlash = Math.max(0, p.damageFlash - dt * 2.6);
  p.freezeTimer = Math.max(0, p.freezeTimer - dt);
  p.peaBoostTimer = Math.max(0, p.peaBoostTimer - dt);
  p.peaArmyTimer = Math.max(0, p.peaArmyTimer - dt);
  game.shake = Math.max(0, game.shake - dt * 12);

  if (hasTalent("regenRoots") && game.state === "playing") {
    while (game.distance >= game.regenNextDistance) {
      const healed = healPlayer(6);
      if (healed > 0) floatingText(`+${healed} HP`, p.x, 0.76, "#83ff72", 14);
      game.regenNextDistance += 100;
    }
  }

  if (hasTalent("wallnutGuardian")) {
    game.wallnutGuardTimer -= dt;
    if (game.wallnutGuardTimer <= 0) {
      if (p.shield < getMaxShield()) {
        p.shield++;
        floatingText(`Shield ${p.shield}`, p.x, 0.76, "#e0ad70", 16);
      }
      game.wallnutGuardTimer = 18;
    }
  }

  const direction = (game.keys.ArrowRight || game.keys.KeyD ? 1 : 0)
    - (game.keys.ArrowLeft || game.keys.KeyA ? 1 : 0);
  p.x = Math.max(-0.91, Math.min(0.91, p.x + direction * p.moveSpeed * dt));

  p.fireTimer -= dt;
  if (p.fireTimer <= 0 && p.freezeTimer <= 0) {
    shoot();
    p.fireTimer = p.fireRate;
  }

  game.spawnTimer -= dt;
  if (game.state === "playing" && game.spawnTimer <= 0) {
    spawnEnemy();
    if (game.stage >= 3 && Math.random() > 0.65) spawnEnemy();
    const earlyGameSpawnScale = game.stage === 1 ? 2 : 1;
    game.spawnTimer = Math.max(0.3, 0.9 - game.stage * 0.08)
      * (0.7 + Math.random() * 0.65)
      * earlyGameSpawnScale;
  }

  game.obstacleTimer -= dt;
  if (game.state === "playing" && game.obstacleTimer <= 0) {
    const difficulty = getDifficultyConfig();
    if (Math.random() < 0.12 * difficulty.pickupFrequency) {
      spawnHealthPack();
    } else if (difficulty.obstacles) {
      const type = difficulty.iceBlocks && Math.random() < 0.32 ? "ice" : "roadblock";
      spawnObstacle(type);
    }
    game.obstacleTimer = 3.2 + Math.random() * 2.8;
  }

  game.plantOrbTimer -= dt;
  if (game.state === "playing" && game.plantOrbTimer <= 0) {
    spawnPlantOrb();
    game.plantOrbTimer = getPlantOrbDelay();
  }

  for (const bullet of game.bullets) {
    bullet.depth -= bullet.speed * dt;
    bullet.x += bullet.vx * dt;
  }

  if (game.state === "boss") updateBoss(dt);

  for (const mine of game.potatoMines) {
    mine.age += dt;
    if (mine.age >= 0.25) mine.armed = true;
  }

  for (const enemy of game.enemies) {
    if (enemy.dead) continue;
    enemy.depth += enemy.speed * dt;
    enemy.wobble += dt * 7;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 5);
    if (enemy.type === "peaZombie" && enemy.depth > 0.05 && enemy.depth < 0.78) {
      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0) {
        shootEnemyPea(enemy);
        enemy.fireTimer = 2;
      }
    }

    for (const bullet of game.bullets) {
      if (bullet.hit.has(enemy) || bullet.depth < -0.1) continue;
      const dx = bullet.x - enemy.x;
      const depthHit = Math.abs(bullet.depth - enemy.depth);
      const enemyHitBonus = Math.max(0, (enemy.radius - 17) * 0.003);
      const hitWidth = 0.12 + bullet.radius * 0.004 + enemyHitBonus;
      if (depthHit < 0.075 && Math.abs(dx) < hitWidth) {
        const critical = Math.random() < p.crit;
        const damage = Math.round(bullet.damage * (critical ? p.critDamage : 1));
        enemy.health -= damage;
        enemy.hitFlash = 1;
        bullet.hit.add(enemy);
        floatingText(critical ? `暴击 ${damage}!` : `-${damage}`, enemy.x, enemy.depth, critical ? "#fff266" : "#ffffff", critical ? 15 : 14);
        burst(enemy.x, enemy.depth, "#b8ff45", 5);
        if (bullet.pierce > 0) bullet.pierce--;
        else bullet.depth = -1;

        if (enemy.health <= 0) {
          enemy.dead = true;
          registerEnemyKill(enemy);
          burst(enemy.x, enemy.depth, "#78b56c", 18, 0.07);
        }
      }
    }

    for (const mine of game.potatoMines) {
      if (mine.remove || !mine.armed || enemy.dead) continue;
      if (Math.abs(enemy.x - mine.x) < 0.2 && Math.abs(enemy.depth - mine.depth) < 0.08) {
        explodePotatoMine(mine);
      }
    }

    if (enemy.depth >= 0.87 && !enemy.dead) {
      if (Math.abs(enemy.x - p.x) < 0.18) {
        damagePlayer(enemy.type === "bucket" ? 24 : 14);
        burst(enemy.x, 0.88, "#ff6958", 16, 0.08);
      }
      enemy.dead = true;
    }
  }

  for (const bullet of game.enemyBullets) {
    bullet.depth += bullet.speed * dt;
    bullet.pulse += dt * 9;
    if (bullet.depth >= 0.84) {
      if (Math.abs(bullet.x - p.x) < 0.19) {
        damagePlayer(bullet.damage, "enemyBullet");
        burst(p.x, 0.84, "#ff7a38", 12, 0.055);
      }
      bullet.removed = true;
    }
  }

  for (const obstacle of game.obstacles) {
    obstacle.depth += obstacle.speed * dt;
    if (!obstacle.hit && obstacle.depth >= 0.84) {
      if (Math.abs(obstacle.x - p.x) < 0.2) {
        if (obstacle.type === "ice") {
          p.freezeTimer = Math.max(p.freezeTimer, 1);
          p.fireTimer = Math.max(p.fireTimer, 1);
          p.damageFlash = Math.max(p.damageFlash, 0.35);
          floatingText("Frozen", p.x, 0.76, "#bff5ff", 18);
          burst(p.x, 0.84, "#9be8ff", 20, 0.06);
        } else {
          damagePlayer(20, "obstacle");
        }
      } else if (hasTalent("obstacleRecycle")) {
        addCoins(8);
        floatingText("+8 金币", p.x, 0.72, "#ffd84f", 13);
      }
      obstacle.hit = true;
      obstacle.remove = true;
    }
  }

  for (const pack of game.healthPacks) {
    pack.depth += pack.speed * dt;
    pack.bob += dt * 5;
    if (pack.depth >= 0.84) {
      if (Math.abs(pack.x - p.x) < 0.2) {
        const healAmount = hasTalent("firstAidBag") ? 32 : 20;
        const healed = healPlayer(healAmount);
        floatingText(healed > 0 ? `+${healed} HP` : "生命已满", p.x, 0.76, "#83ff72", 18);
        burst(p.x, 0.82, "#eaffdf", 12, 0.05);
      }
      pack.remove = true;
    }
  }

  for (const orb of game.plantOrbs) {
    orb.depth += orb.speed * dt;
    orb.bob += dt * 5;
    orb.spin += dt * 4;
    if (orb.depth >= 0.84) {
      if (Math.abs(orb.x - p.x) < 0.22) collectPlantOrb(orb);
      orb.remove = true;
    }
  }

  for (const particle of game.particles) {
    particle.x += particle.vx * dt * 10;
    particle.depth += particle.vy * dt * 10;
    particle.life -= dt;
  }

  for (const coin of game.coinDrops) {
    coin.age += dt;
    coin.spin += dt * 10;

    if (coin.age <= coin.scatterTime) {
      coin.x += coin.vx * dt;
      coin.y += coin.vy * dt;
      coin.vy += 260 * dt;
    } else {
      if (coin.flyStartX === null) {
        coin.flyStartX = coin.x;
        coin.flyStartY = coin.y;
      }
      const flyProgress = Math.min(1, (coin.age - coin.scatterTime) / coin.flyTime);
      const eased = 1 - Math.pow(1 - flyProgress, 3);
      const targetX = canvas.logicalWidth - 45;
      const targetY = 16;
      coin.x = coin.flyStartX + (targetX - coin.flyStartX) * eased;
      coin.y = coin.flyStartY + (targetY - coin.flyStartY) * eased
        - Math.sin(flyProgress * Math.PI) * 35;

      if (flyProgress >= 1 && !coin.collected) {
        coin.collected = true;
        addCoins(coin.value);
      }
    }
  }

  for (const text of game.texts) {
    text.depth -= dt * 0.08;
    text.life -= dt;
  }

  game.bullets = game.bullets.filter(b => b.depth > -0.16);
  game.enemyBullets = game.enemyBullets.filter(b => !b.removed);
  game.enemies = game.enemies.filter(e => !e.dead);
  game.obstacles = game.obstacles.filter(o => !o.remove);
  game.healthPacks = game.healthPacks.filter(pack => !pack.remove);
  game.plantOrbs = game.plantOrbs.filter(orb => !orb.remove);
  game.potatoMines = game.potatoMines.filter(mine => !mine.remove);
  game.particles = game.particles.filter(particle => particle.life > 0);
  game.coinDrops = game.coinDrops.filter(coin => !coin.collected);
  game.texts = game.texts.filter(text => text.life > 0);

  if (game.state === "playing" && game.distance >= game.nextRest && game.distance < game.totalDistance) {
    game.nextRest += game.restAt;
    startRestArrival();
    updateUI();
    return;
  }

  if (game.state === "playing" && game.distance >= game.nextChoice && game.distance < game.totalDistance - 60) {
    game.nextChoice += game.choiceAt;
    openChoice();
  }

  if (game.state === "playing" && game.distance >= game.totalDistance) startBossBattle();
  updateUI();
}

function damagePlayer(amount, source = "generic") {
  const p = game.player;
  if (p.invulnerable > 0) return;
  if (p.shield > 0) {
    p.shield--;
    p.invulnerable = 0.35;
    p.damageFlash = 0.45;
    burst(p.x, 0.84, "#e0ad70", 18, 0.065);
    floatingText(p.shield > 0 ? `Shield ${p.shield}` : "Shield Break", p.x, 0.76, "#e0ad70", 18);
    return;
  }
  let finalDamage = amount;
  if (source === "obstacle" && hasTalent("antiCollision")) finalDamage *= 0.6;
  if (source === "enemyBullet" && hasTalent("antiBullet")) finalDamage *= 0.65;
  if (hasTalent("steadyStart") && game.distance <= (game.talentTriggers.steadyStartUntil ?? 0)) finalDamage *= 0.5;
  if (hasTalent("damageCap")) finalDamage = Math.min(finalDamage, p.maxHealth * 0.25);
  finalDamage = Math.max(1, Math.round(finalDamage));

  p.health -= finalDamage;
  p.invulnerable = 0.7;
  p.damageFlash = 1;
  document.querySelector(".health-panel").classList.add("damaged");
  game.shake = 0;
  floatingText(`-${finalDamage} HP`, p.x, 0.78, "#ff6b5b", 20);
  if (hasTalent("smallInsurance")) addCoins(10);

  if (hasTalent("lastStandShield")
    && !game.talentTriggers.lastStandShield
    && p.health <= p.maxHealth * 0.3) {
    game.talentTriggers.lastStandShield = true;
    p.health = Math.max(1, p.health);
    p.invulnerable = 2.4;
    p.shield = Math.min(getMaxShield(), p.shield + 1);
    floatingText("绝境护盾", p.x, 0.7, "#e0ad70", 20);
  }

  if (p.health <= 0) {
    p.health = 0;
    endGame(false);
  }
}

function openChoice() {
  game.state = "choice";
  const pool = createUpgradePool().sort(() => Math.random() - 0.5).slice(0, 2);
  document.querySelectorAll("#choiceScreen .choice-card").forEach((card, index) => {
    const item = pool[index];
    card._upgrade = item;
    card.innerHTML = `
      <span class="choice-icon">${item.icon}</span>
      <strong>${item.title}</strong>
      <small>${item.desc}</small>
      <span class="choice-tag">${item.tag}</span>
    `;
  });
  ui.choice.classList.add("visible");
}

function chooseUpgrade(card) {
  if (game.state !== "choice") return;
  card._upgrade.apply(game.player);
  ui.choice.classList.remove("visible");
  game.state = "playing";
  floatingText(card._upgrade.title, game.player.x, 0.7, "#b8ff45", 17);
  updateUI();
}

function openRestStop() {
  game.state = "rest";
  game.enemies = [];
  game.bullets = [];
  game.enemyBullets = [];
  game.obstacles = [];
  game.healthPacks = [];
  game.plantOrbs = [];
  game.potatoMines = [];

  for (const coin of game.coinDrops) addCoins(coin.value);
  game.coinDrops = [];

  game.restTier = Math.max(1, Math.round(game.distance / 500));
  game.shopRefreshCount = 0;
  game.talentTriggers.blackCardUsedThisRest = false;

  if (hasTalent("interest")) {
    const interest = Math.floor(game.coins * 0.12);
    if (interest > 0) {
      addCoins(interest, false);
      floatingText(`利息 +${interest}`, game.player.x, 0.7, "#ffd84f", 17);
    }
  }

  if (hasTalent("medicalChannel")) {
    const healed = healPlayer(Math.round(game.player.maxHealth * 0.3));
    if (healed > 0) floatingText(`+${healed} HP`, game.player.x, 0.76, "#83ff72", 17);
  }

  rollShopItems();
  renderActiveTalents();
  updateShopState();
  ui.rest.classList.add("visible");
}

function rollShopItems() {
  const itemCount = getShopItemCount();
  const shopPool = pickTalents(itemCount, "shop");
  document.querySelectorAll(".shop-card").forEach((card, index) => {
    if (index >= itemCount) {
      card.hidden = true;
      card._talent = null;
      card._cost = 0;
      card.classList.remove("rare-talent");
      card.classList.remove("epic-talent");
      return;
    }
    card.hidden = false;
    const item = shopPool[index];
    const cost = item ? getTalentShopCost(item, index) : 0;
    card._talent = item;
    card._cost = cost;
    card._shopIndex = index;
    card.disabled = !item;
    card.classList.remove("bought");
    card.classList.remove("rare-talent");
    card.classList.remove("epic-talent");
    if (item) renderTalentCard(card, item, `<span class="shop-price">金币 ${cost}</span>`);
    else card.innerHTML = "";
  });
}

function getShopRefreshCost() {
  if (hasTalent("bargain") && game.shopRefreshCount === 0) return 0;
  let cost = (game.shopRefreshCount + 1) * 10;
  if (hasTalent("epicBlackCard")) cost *= 2;
  return cost;
}

function updateShopState() {
  ui.restCoins.textContent = game.coins;
  const refreshCost = getShopRefreshCost();
  ui.refreshCost.textContent = refreshCost;
  ui.refreshShop.disabled = game.coins < refreshCost;
  document.querySelectorAll(".shop-card").forEach(card => {
    if (!card.hidden && !card.classList.contains("bought")) {
      card.disabled = !card._talent || game.coins < card._cost;
    }
  });
  updateUI();
}

function buyShopUpgrade(card) {
  if (game.state !== "rest" || card.disabled || card.classList.contains("bought")) return;
  const usedBlackCard = hasTalent("epicBlackCard")
    && card._shopIndex === 0
    && !game.talentTriggers.blackCardUsedThisRest;
  game.coins -= card._cost;
  acquireTalent(card._talent);
  if (usedBlackCard) game.talentTriggers.blackCardUsedThisRest = true;
  if (hasTalent("frugalism")) addCoins(Math.ceil(card._cost * 0.15), false);
  card.classList.add("bought");
  card.disabled = true;
  card.querySelector(".shop-price").textContent = "已购买";
  updateShopState();
}

function refreshShop() {
  if (game.state !== "rest") return;
  const cost = getShopRefreshCost();
  if (game.coins < cost) return;
  game.coins -= cost;
  game.shopRefreshCount++;
  rollShopItems();
  updateShopState();
}

function leaveRestStop() {
  if (game.state !== "rest") return;
  game.enemyHealthMultiplier = getStageHealthMultiplier();
  if (hasTalent("restRecovery")) {
    game.player.invulnerable = Math.max(game.player.invulnerable, 3);
    floatingText("短暂无敌", game.player.x, 0.76, "#e0ad70", 17);
  }
  if (hasTalent("departureSupply")) applyDepartureSupply();
  ui.rest.classList.remove("visible");
  startWaveIntro(game.stage);
}

function endGame(victory) {
  if (game.state === "ended") return;
  game.state = "ended";
  ui.bossHud.classList.remove("visible");
  ui.resultKicker.textContent = victory ? "突围成功" : "本次突围结束";
  ui.resultTitle.textContent = victory ? "僵尸防线已击穿！" : "Build 还差一点火候";
  ui.resultDistance.textContent = `${Math.floor(Math.min(game.distance, game.totalDistance))}m`;
  ui.resultKills.textContent = game.kills;
  ui.resultDamage.textContent = game.player.damage;
  ui.end.classList.add("visible");
}

function updateUI() {
  const p = game.player;
  if (!p) return;
  ui.stage.textContent = game.stage;
  ui.kills.textContent = game.kills;
  ui.coins.textContent = game.coins;
  ui.healthText.textContent = `${Math.ceil(p.health)} / ${p.maxHealth}`;
  ui.healthBar.style.width = `${Math.max(0, p.health / p.maxHealth * 100)}%`;
  document.querySelector(".health-panel").classList.toggle("damaged", p.damageFlash > 0);
  ui.pauseButton.hidden = !canPauseGame() && !game.paused;
  ui.distance.textContent = game.state === "boss"
    ? "BOSS"
    : `${Math.max(0, Math.ceil(game.totalDistance - game.distance))}m`;
  if (game.boss) {
    ui.bossHealthText.textContent = `${Math.ceil(game.boss.health)} / ${game.boss.maxHealth}`;
    ui.bossHealthBar.style.width = `${Math.max(0, game.boss.health / game.boss.maxHealth * 100)}%`;
  }
}

function drawBackground(w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#3d9eda");
  sky.addColorStop(0.34, "#a9e5ee");
  sky.addColorStop(0.345, "#72b445");
  sky.addColorStop(1, "#28672f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const horizon = h * 0.4;
  ctx.save();
  ctx.shadowColor = "rgba(255,239,129,.75)";
  ctx.shadowBlur = 34;
  ctx.fillStyle = "#fff1a0";
  ctx.beginPath();
  ctx.arc(w * 0.79, h * 0.1, h * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,.72)";
  for (let i = 0; i < 5; i++) {
    const cloudX = ((i * 0.24 + 0.08 - game.distance * 0.00003) % 1.2) * w;
    const cloudY = h * (0.08 + (i % 3) * 0.045);
    ctx.beginPath();
    ctx.arc(cloudX, cloudY, 18, 0, Math.PI * 2);
    ctx.arc(cloudX + 20, cloudY - 6, 24, 0, Math.PI * 2);
    ctx.arc(cloudX + 44, cloudY + 1, 17, 0, Math.PI * 2);
    ctx.fill();
  }

  const mountainSets = [
    { base: horizon + 5, colorA: "#609c55", colorB: "#477e4b", height: 80, step: 150 },
    { base: horizon + 22, colorA: "#3f783d", colorB: "#2f6438", height: 58, step: 105 }
  ];
  for (const set of mountainSets) {
    for (let x = -set.step; x < w + set.step; x += set.step) {
      const peakX = x + set.step * 0.52;
      const peakY = set.base - set.height * (0.72 + Math.sin(x * 0.017) * 0.22);
      ctx.fillStyle = set.colorA;
      ctx.beginPath();
      ctx.moveTo(x, set.base);
      ctx.lineTo(peakX, peakY);
      ctx.lineTo(peakX, set.base);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = set.colorB;
      ctx.beginPath();
      ctx.moveTo(peakX, peakY);
      ctx.lineTo(x + set.step, set.base);
      ctx.lineTo(peakX, set.base);
      ctx.closePath();
      ctx.fill();
    }
  }

  for (let i = 0; i < 18; i++) {
    const x = (i / 17) * w;
    const treeH = 22 + (i % 4) * 7;
    ctx.fillStyle = "#274f2b";
    ctx.beginPath();
    ctx.moveTo(x, horizon - treeH);
    ctx.lineTo(x - treeH * 0.55, horizon + 3);
    ctx.lineTo(x + treeH * 0.2, horizon + 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#367138";
    ctx.beginPath();
    ctx.moveTo(x, horizon - treeH);
    ctx.lineTo(x + treeH * 0.65, horizon + 3);
    ctx.lineTo(x + treeH * 0.2, horizon + 3);
    ctx.closePath();
    ctx.fill();
  }

  if (environmentImage.complete && environmentImage.naturalWidth) {
    const canvasRatio = w / h;
    let sourceY = environmentImage.naturalHeight * 0.14;
    let sourceHeight = environmentImage.naturalHeight * 0.86;
    let sourceWidth = sourceHeight * canvasRatio;
    if (sourceWidth > environmentImage.naturalWidth) {
      sourceWidth = environmentImage.naturalWidth;
      sourceHeight = sourceWidth / canvasRatio;
      sourceY = environmentImage.naturalHeight - sourceHeight;
    }
    const sourceX = (environmentImage.naturalWidth - sourceWidth) / 2;
    ctx.drawImage(
      environmentImage,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, w, h
    );
  }

  const farLeft = roadPoint(-1, 0);
  const farRight = roadPoint(1, 0);
  const nearLeft = roadPoint(-1, 1);
  const nearRight = roadPoint(1, 1);
  ctx.save();
  ctx.shadowColor = "rgba(30,44,20,.5)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  ctx.beginPath();
  ctx.moveTo(farLeft.x, farLeft.y);
  ctx.lineTo(farRight.x, farRight.y);
  ctx.lineTo(nearRight.x, nearRight.y);
  ctx.lineTo(nearLeft.x, nearLeft.y);
  ctx.closePath();
  const roadGradient = ctx.createLinearGradient(0, horizon, 0, h);
  roadGradient.addColorStop(0, "#a89b75");
  roadGradient.addColorStop(1, "#65583d");
  ctx.fillStyle = roadGradient;
  ctx.fill();
  ctx.restore();

  const leftShoulderOuter = roadPoint(-1.1, 1);
  const rightShoulderOuter = roadPoint(1.1, 1);
  ctx.fillStyle = "#86794f";
  ctx.beginPath();
  ctx.moveTo(farLeft.x - 3, farLeft.y);
  ctx.lineTo(farLeft.x, farLeft.y);
  ctx.lineTo(nearLeft.x, nearLeft.y);
  ctx.lineTo(leftShoulderOuter.x, leftShoulderOuter.y);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(farRight.x + 3, farRight.y);
  ctx.lineTo(farRight.x, farRight.y);
  ctx.lineTo(nearRight.x, nearRight.y);
  ctx.lineTo(rightShoulderOuter.x, rightShoulderOuter.y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#f2dfa1";
  ctx.lineWidth = 4;
  ctx.shadowColor = "rgba(255,243,169,.35)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(farLeft.x, farLeft.y);
  ctx.lineTo(nearLeft.x, nearLeft.y);
  ctx.moveTo(farRight.x, farRight.y);
  ctx.lineTo(nearRight.x, nearRight.y);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const roadScroll = game.distance * 0.014;
  const offset = roadScroll % 0.16;
  for (let d = -offset; d < 1; d += 0.16) {
    const d2 = Math.min(1, d + 0.075);
    if (d < 0) continue;
    for (const lane of [-0.333, 0.333]) {
      const a = roadPoint(lane, d);
      const b = roadPoint(lane, d2);
      ctx.strokeStyle = "rgba(244,229,151,.92)";
      ctx.lineWidth = 2 + d * 7;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  if (!environmentImage.complete || !environmentImage.naturalWidth) for (let i = 0; i < 12; i++) {
    const d = ((i / 12 + game.distance * 0.0008) % 1);
    for (const side of [-1.12, 1.12]) {
      const point = roadPoint(side, d);
      const bushSize = 5 + d * 18;
      ctx.fillStyle = i % 2 ? "#27662e" : "#3d8233";
      ctx.beginPath();
      ctx.moveTo(point.x, point.y - bushSize);
      ctx.lineTo(point.x - bushSize, point.y + bushSize * 0.65);
      ctx.lineTo(point.x + bushSize * 0.2, point.y + bushSize * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = i % 2 ? "#38813a" : "#59a63e";
      ctx.beginPath();
      ctx.moveTo(point.x, point.y - bushSize);
      ctx.lineTo(point.x + bushSize, point.y + bushSize * 0.65);
      ctx.lineTo(point.x + bushSize * 0.2, point.y + bushSize * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f6db48";
      ctx.beginPath();
      ctx.arc(point.x + d * 7, point.y - d * 10, 1 + d * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawEnemy(enemy) {
  const point = roadPoint(enemy.x, enemy.depth);
  const s = point.scale;
  const bob = Math.sin(enemy.wobble) * 4 * s;
  ctx.save();
  ctx.translate(point.x, point.y + bob);
  ctx.scale(s, s);
  if (enemy.type === "imp") {
    ctx.translate(0, 5);
    ctx.scale(0.72, 0.72);
  }
  ctx.shadowColor = enemy.hitFlash > 0 ? "#f7ffb7" : "rgba(186,255,131,.58)";
  ctx.shadowBlur = 10;

  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.beginPath();
  ctx.ellipse(0, 8, 29, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#253326";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, -3);
  ctx.lineTo(-11 + Math.sin(enemy.wobble) * 4, 18);
  ctx.moveTo(8, -3);
  ctx.lineTo(13 - Math.sin(enemy.wobble) * 4, 18);
  ctx.stroke();

  const jacket = ctx.createLinearGradient(-20, -40, 20, 0);
  jacket.addColorStop(0, "#8a6144");
  jacket.addColorStop(0.52, "#68422f");
  jacket.addColorStop(1, "#452c24");
  ctx.fillStyle = jacket;
  ctx.beginPath();
  ctx.moveTo(-18, -42);
  ctx.quadraticCurveTo(-27, -24, -19, 2);
  ctx.lineTo(17, 2);
  ctx.quadraticCurveTo(27, -23, 17, -41);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3f2e26";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#a33e32";
  ctx.beginPath();
  ctx.moveTo(-21, -21);
  ctx.lineTo(21, -17);
  ctx.lineTo(17, -5);
  ctx.lineTo(-20, -9);
  ctx.closePath();
  ctx.fill();

  const skin = ctx.createRadialGradient(-10, -65, 3, 0, -52, 30);
  skin.addColorStop(0, "#d4e59a");
  skin.addColorStop(0.45, "#91b66e");
  skin.addColorStop(1, "#5c7d55");
  ctx.strokeStyle = "#344b35";
  ctx.lineWidth = 4.5;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-17, -71);
  ctx.quadraticCurveTo(-30, -56, -18, -36);
  ctx.quadraticCurveTo(-3, -27, 19, -39);
  ctx.quadraticCurveTo(30, -53, 17, -70);
  ctx.quadraticCurveTo(0, -82, -17, -71);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fffce1";
  ctx.strokeStyle = "#40503b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(-9, -60, 8, 10, -0.15, 0, Math.PI * 2);
  ctx.ellipse(9, -59, 9, 11, 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#22291f";
  ctx.beginPath();
  ctx.arc(-7, -58, 3, 0, Math.PI * 2);
  ctx.arc(7, -57, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#26352b";
  ctx.beginPath();
  ctx.moveTo(-15, -44);
  ctx.quadraticCurveTo(0, -30, 17, -44);
  ctx.quadraticCurveTo(1, -37, -15, -44);
  ctx.fill();
  ctx.fillStyle = "#fff4c8";
  for (let tooth = -9; tooth <= 9; tooth += 6) {
    ctx.save();
    ctx.translate(tooth, -42 + Math.abs(tooth) * 0.08);
    ctx.rotate(tooth * 0.018);
    ctx.fillRect(-2.5, 0, 5, 7);
    ctx.restore();
  }

  if (enemy.type === "normal") {
    ctx.strokeStyle = "#33251f";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-14, -73);
    ctx.quadraticCurveTo(-18, -83, -23, -87);
    ctx.moveTo(-6, -76);
    ctx.quadraticCurveTo(-8, -88, -4, -94);
    ctx.moveTo(3, -77);
    ctx.quadraticCurveTo(5, -89, 12, -93);
    ctx.moveTo(11, -74);
    ctx.quadraticCurveTo(17, -83, 23, -84);
    ctx.stroke();
  }

  if (enemy.type === "imp") {
    ctx.fillStyle = "#5b3528";
    ctx.strokeStyle = "#302019";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-16, -75);
    ctx.quadraticCurveTo(-7, -91, 0, -76);
    ctx.quadraticCurveTo(8, -94, 17, -73);
    ctx.quadraticCurveTo(2, -82, -16, -75);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f0b234";
    ctx.beginPath();
    ctx.moveTo(-15, -33);
    ctx.lineTo(17, -31);
    ctx.lineTo(12, -6);
    ctx.lineTo(-13, -7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#77451f";
    ctx.stroke();
  } else if (enemy.type === "peaZombie") {
    const peaHead = ctx.createRadialGradient(-8, -78, 2, 2, -66, 27);
    peaHead.addColorStop(0, "#c2ef64");
    peaHead.addColorStop(0.55, "#69bd3d");
    peaHead.addColorStop(1, "#327c32");
    ctx.fillStyle = peaHead;
    ctx.strokeStyle = "#24582b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -69, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#59ad38";
    ctx.beginPath();
    ctx.ellipse(20, -69, 23, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1d602d";
    ctx.beginPath();
    ctx.arc(35, -69, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#438f32";
    ctx.beginPath();
    ctx.ellipse(-14, -91, 7, 17, -0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (enemy.type === "bucket") {
    const bucket = ctx.createLinearGradient(-20, -80, 20, -52);
    bucket.addColorStop(0, "#ecf1ea");
    bucket.addColorStop(0.35, "#a7b4b0");
    bucket.addColorStop(1, "#65716e");
    ctx.fillStyle = bucket;
    ctx.beginPath();
    ctx.moveTo(-22, -79);
    ctx.lineTo(20, -76);
    ctx.lineTo(17, -52);
    ctx.lineTo(-19, -54);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#5c6965";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.fillRect(-14, -74, 5, 17);
  } else if (enemy.type === "runner") {
    const cone = ctx.createLinearGradient(-15, -85, 15, -52);
    cone.addColorStop(0, "#ffcf55");
    cone.addColorStop(0.45, "#f17e2f");
    cone.addColorStop(1, "#b34825");
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(0, -84);
    ctx.lineTo(-18, -52);
    ctx.lineTo(18, -52);
    ctx.closePath();
    ctx.fill();
  }

  if (enemy.type === "screen") {
    ctx.save();
    ctx.translate(-3, -20);
    ctx.rotate(-0.07);
    ctx.fillStyle = "rgba(151,169,164,.22)";
    ctx.strokeStyle = "#53645f";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(-29, -52, 58, 65, 4);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(205,220,214,.82)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let line = -64; line <= 52; line += 11) {
      ctx.moveTo(-29, line);
      ctx.lineTo(29, line + 58);
      ctx.moveTo(-29, line + 58);
      ctx.lineTo(29, line);
    }
    ctx.stroke();

    ctx.strokeStyle = "#758681";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-29, -20);
    ctx.lineTo(29, -20);
    ctx.moveTo(0, -52);
    ctx.lineTo(0, 13);
    ctx.stroke();
    ctx.restore();
  }

  if (enemy.type === "football") {
    ctx.fillStyle = "#a92f2a";
    ctx.strokeStyle = "#4b2020";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, -68, 28, Math.PI * 0.92, Math.PI * 2.08);
    ctx.lineTo(22, -49);
    ctx.quadraticCurveTo(0, -40, -22, -50);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f2d7b0";
    ctx.fillRect(-5, -93, 10, 19);
    ctx.strokeRect(-5, -93, 10, 19);

    ctx.strokeStyle = "#d8dde0";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-23, -63);
    ctx.lineTo(23, -57);
    ctx.moveTo(-17, -55);
    ctx.lineTo(20, -50);
    ctx.stroke();

    ctx.fillStyle = "#b3342d";
    ctx.strokeStyle = "#4c2521";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(-23, -29, 18, 13, -0.25, 0, Math.PI * 2);
    ctx.ellipse(23, -29, 18, 13, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f1e7d4";
    ctx.font = "900 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("5", 0, -15);
  }

  ctx.fillStyle = "rgba(0,0,0,.5)";
  ctx.fillRect(-24, -91, 48, 7);
  ctx.fillStyle = "#f26339";
  ctx.fillRect(-22, -89, 44 * Math.max(0, enemy.health / enemy.maxHealth), 3);
  if (enemy.hitFlash > 0) {
    ctx.globalAlpha = enemy.hitFlash * 0.22;
    ctx.fillStyle = "#efffc2";
    ctx.beginPath();
    ctx.ellipse(0, -43, 31, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawPlayerShieldLocal(p) {
  if (!p.shield) return;
  ctx.save();
  ctx.globalAlpha = 0.45 + Math.sin(game.time * 7) * 0.08;
  ctx.strokeStyle = "#f2c178";
  ctx.fillStyle = "rgba(242,193,120,.08)";
  ctx.shadowColor = "rgba(255,205,128,.72)";
  ctx.shadowBlur = 18;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(0, -48, 48 + p.shield * 5, 74 + p.shield * 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  if (!game.player) return;
  const p = game.player;
  const point = roadPoint(p.x, 0.88);
  const runBob = Math.sin(game.time * 8) * 3;
  const moveDirection = (game.keys.ArrowRight || game.keys.KeyD ? 1 : 0)
    - (game.keys.ArrowLeft || game.keys.KeyA ? 1 : 0);

  if (playerSprite.complete && playerSprite.naturalWidth) {
    ctx.save();
    const hurtOffset = Math.sin(game.time * 34) * p.damageFlash * 5;
    ctx.translate(point.x + hurtOffset, point.y + runBob + p.damageFlash * 4);
    if (p.invulnerable > 0) ctx.globalAlpha = 0.72;

    ctx.fillStyle = "rgba(20,42,18,.34)";
    ctx.filter = "blur(4px)";
    ctx.beginPath();
    ctx.ellipse(0, 14, 42, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = "none";

    ctx.rotate(moveDirection * 0.045 - p.damageFlash * 0.08);
    const spriteHeight = Math.min(168, canvas.logicalHeight * 0.23);
    const spriteWidth = spriteHeight * 0.78;
    const sourceX = playerSprite.naturalWidth * 0.14;
    const sourceY = playerSprite.naturalHeight * 0.035;
    const sourceWidth = playerSprite.naturalWidth * 0.72;
    const sourceHeight = playerSprite.naturalHeight * 0.9;
    ctx.shadowColor = p.damageFlash > 0
      ? `rgba(255,67,47,${0.35 + p.damageFlash * 0.45})`
      : "rgba(184,255,75,.42)";
    ctx.shadowBlur = 14 + p.damageFlash * 12;
    ctx.drawImage(
      playerSprite,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      -spriteWidth * 0.5,
      -spriteHeight + 20,
      spriteWidth,
      spriteHeight
    );
    drawPlayerShieldLocal(p);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(
    point.x + Math.sin(game.time * 34) * p.damageFlash * 5,
    point.y + p.damageFlash * 4
  );
  if (p.invulnerable > 0) ctx.globalAlpha = 0.72;
  ctx.shadowColor = "rgba(190,255,83,.72)";
  ctx.shadowBlur = 15;
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.beginPath();
  ctx.ellipse(0, 12, 36, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#27672b";
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(-17, 23);
  ctx.moveTo(8, 0);
  ctx.lineTo(19, 23);
  ctx.stroke();

  ctx.strokeStyle = "#204d23";
  ctx.lineWidth = 4;
  const body = ctx.createRadialGradient(-10, -28, 4, 3, -12, 37);
  body.addColorStop(0, "#9be34f");
  body.addColorStop(0.48, "#55b93c");
  body.addColorStop(1, "#278235");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -15, 27, 37, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const head = ctx.createRadialGradient(-10, -64, 3, 2, -50, 30);
  head.addColorStop(0, "#c6f36b");
  head.addColorStop(0.5, "#7dd34a");
  head.addColorStop(1, "#3b9d38");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(0, -51, 27, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const snout = ctx.createLinearGradient(5, -65, 45, -50);
  snout.addColorStop(0, "#7bd14a");
  snout.addColorStop(0.6, "#49aa3c");
  snout.addColorStop(1, "#287a35");
  ctx.fillStyle = snout;
  ctx.beginPath();
  ctx.ellipse(22, -53, 25, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1d6531";
  ctx.beginPath();
  ctx.arc(38, -53, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#164a26";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#efffe3";
  ctx.strokeStyle = "#214e27";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(-9, -57, 7, 9, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#18321b";
  ctx.beginPath();
  ctx.arc(-6, -56, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.32)";
  ctx.beginPath();
  ctx.ellipse(-8, -68, 8, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2d872f";
  ctx.strokeStyle = "#1d5d28";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(-19, -82, 8, 18, -0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#91ed59";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-18, -20);
  ctx.lineTo(-34, -32);
  ctx.moveTo(18, -20);
  ctx.lineTo(30, -34);
  ctx.stroke();
  drawPlayerShieldLocal(p);
  ctx.restore();
}

function drawObstacle(obstacle) {
  const point = roadPoint(obstacle.x, obstacle.depth);
  const s = point.scale;
  ctx.save();
  ctx.translate(point.x, point.y - 3 * s);
  ctx.scale(s, s);

  ctx.fillStyle = "rgba(0,0,0,.32)";
  ctx.beginPath();
  ctx.ellipse(0, 5, 40, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  if (obstacle.type === "ice") {
    ctx.shadowColor = "rgba(155,232,255,.75)";
    ctx.shadowBlur = 16;
    const ice = ctx.createLinearGradient(-34, -42, 34, 10);
    ice.addColorStop(0, "#eefcff");
    ice.addColorStop(0.45, "#9be8ff");
    ice.addColorStop(1, "#4c9bc6");
    ctx.fillStyle = ice;
    ctx.strokeStyle = "#d8fbff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-32, -12);
    ctx.lineTo(-18, -43);
    ctx.lineTo(16, -49);
    ctx.lineTo(36, -18);
    ctx.lineTo(23, 8);
    ctx.lineTo(-22, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,.72)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-13, -33);
    ctx.lineTo(8, 3);
    ctx.moveTo(13, -38);
    ctx.lineTo(24, -12);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.shadowColor = "rgba(255,113,35,.55)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = obstacle.hit ? "#76544b" : "#e6a62f";
  ctx.strokeStyle = "#492a18";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(-38, -18, 76, 22, 5);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-34, -14, 68, 14, 3);
  ctx.clip();
  ctx.strokeStyle = "#33251d";
  ctx.lineWidth = 8;
  for (let stripe = -52; stripe < 52; stripe += 18) {
    ctx.beginPath();
    ctx.moveTo(stripe, 2);
    ctx.lineTo(stripe + 17, -18);
    ctx.stroke();
  }
  ctx.restore();

  ctx.shadowColor = "rgba(230,241,238,.5)";
  ctx.shadowBlur = 7;
  for (const spikeX of [-27, -9, 9, 27]) {
    const metal = ctx.createLinearGradient(spikeX - 7, -47, spikeX + 7, -16);
    metal.addColorStop(0, "#f4fff9");
    metal.addColorStop(0.45, "#9da9a5");
    metal.addColorStop(1, "#4d5855");
    ctx.fillStyle = metal;
    ctx.strokeStyle = "#39423f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(spikeX, -49);
    ctx.lineTo(spikeX - 9, -17);
    ctx.lineTo(spikeX + 9, -17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ff5a35";
  ctx.beginPath();
  ctx.arc(-31, -7, 3, 0, Math.PI * 2);
  ctx.arc(31, -7, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlantOrb(orb) {
  const point = roadPoint(orb.x, orb.depth);
  const info = PLANT_ORB_INFO[orb.type];
  const s = point.scale;
  const bob = Math.sin(orb.bob) * 7 * s;
  ctx.save();
  ctx.translate(point.x, point.y - 28 * s + bob);
  ctx.scale(s, s);
  ctx.rotate(Math.sin(orb.spin) * 0.08);

  ctx.shadowColor = info.glow;
  ctx.shadowBlur = 18;
  const shell = ctx.createRadialGradient(-11, -13, 3, 0, 0, 34);
  shell.addColorStop(0, "rgba(255,255,255,.86)");
  shell.addColorStop(0.34, info.color);
  shell.addColorStop(1, "rgba(67,89,48,.92)");
  ctx.fillStyle = shell;
  ctx.strokeStyle = "#2b4228";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 31, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,.46)";
  ctx.beginPath();
  ctx.ellipse(-10, -13, 9, 5, -0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.scale(0.72, 0.72);
  if (orb.type === "peashooter") {
    ctx.fillStyle = "#63c543";
    ctx.strokeStyle = "#245d2f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(-5, -1, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(15, -1, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1f622c";
    ctx.beginPath();
    ctx.arc(26, -1, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (orb.type === "potato") {
    ctx.fillStyle = "#9b6737";
    ctx.strokeStyle = "#5f3d25";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 22, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#302117";
    ctx.beginPath();
    ctx.arc(-6, -5, 2.5, 0, Math.PI * 2);
    ctx.arc(7, -5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (orb.type === "sunflower") {
    ctx.fillStyle = "#ffd447";
    ctx.strokeStyle = "#925b21";
    ctx.lineWidth = 3;
    for (let i = 0; i < 10; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 5);
      ctx.beginPath();
      ctx.ellipse(0, -18, 6, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = "#8a5127";
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#b98245";
    ctx.strokeStyle = "#5c3b22";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 23, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,229,178,.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -15);
    ctx.quadraticCurveTo(4, -6, -5, 14);
    ctx.moveTo(7, -14);
    ctx.quadraticCurveTo(-4, -1, 6, 15);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,.52)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 38 + Math.sin(orb.spin * 2) * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPotatoMine(mine) {
  const point = roadPoint(mine.x, mine.depth);
  const s = point.scale;
  ctx.save();
  ctx.translate(point.x, point.y - 7 * s);
  ctx.scale(s, s);

  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath();
  ctx.ellipse(0, 15, 31, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = mine.armed ? "rgba(255,171,69,.7)" : "rgba(255,231,168,.45)";
  ctx.shadowBlur = mine.armed ? 13 : 6;
  ctx.fillStyle = "#986038";
  ctx.strokeStyle = "#59351f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, -3, 28, 22, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#2b1d14";
  ctx.beginPath();
  ctx.arc(-9, -8, 3, 0, Math.PI * 2);
  ctx.arc(8, -8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffdd70";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.quadraticCurveTo(10, -38, 19, -28);
  ctx.stroke();
  ctx.restore();
}

function drawHealthPack(pack) {
  const point = roadPoint(pack.x, pack.depth);
  const s = point.scale;
  const bob = Math.sin(pack.bob) * 5 * s;
  ctx.save();
  ctx.translate(point.x, point.y - 12 * s + bob);
  ctx.scale(s, s);
  ctx.shadowColor = "rgba(135,255,112,.8)";
  ctx.shadowBlur = 15;
  ctx.fillStyle = "#f5f0df";
  ctx.strokeStyle = "#63372d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-24, -28, 48, 36, 7);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#e94d3d";
  ctx.fillRect(-6, -22, 12, 24);
  ctx.fillRect(-15, -15, 30, 10);

  ctx.fillStyle = "#8a5735";
  ctx.beginPath();
  ctx.roundRect(-12, -37, 24, 10, 4);
  ctx.fill();
  ctx.restore();
}

function drawGargantuarBoss(boss) {
  const point = roadPoint(boss.x, boss.depth);
  const s = point.scale * 1.75;
  ctx.save();
  ctx.translate(point.x, point.y + Math.sin(game.time * 2.5) * 2);
  ctx.scale(s, s);
  ctx.shadowColor = boss.hitFlash > 0 ? "#ffffc6" : "rgba(134,255,126,.55)";
  ctx.shadowBlur = 18;

  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.beginPath();
  ctx.ellipse(0, 28, 72, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#273326";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-18, -4);
  ctx.lineTo(-28, 30);
  ctx.moveTo(18, -4);
  ctx.lineTo(30, 30);
  ctx.stroke();

  const body = ctx.createLinearGradient(-42, -82, 42, 20);
  body.addColorStop(0, "#9e7650");
  body.addColorStop(0.55, "#674532");
  body.addColorStop(1, "#3f2a24");
  ctx.fillStyle = body;
  ctx.strokeStyle = "#2b241f";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-35, -82);
  ctx.quadraticCurveTo(-54, -35, -34, 18);
  ctx.lineTo(34, 18);
  ctx.quadraticCurveTo(54, -36, 34, -82);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#463227";
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(-37, -58);
  ctx.lineTo(-64, -20);
  ctx.moveTo(37, -58);
  ctx.lineTo(66, -22);
  ctx.stroke();

  const skin = ctx.createRadialGradient(-12, -111, 4, 0, -96, 48);
  skin.addColorStop(0, "#d5e996");
  skin.addColorStop(0.48, "#86aa68");
  skin.addColorStop(1, "#4f704f");
  ctx.fillStyle = skin;
  ctx.strokeStyle = "#304334";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(0, -98, 36, 42, 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff5d2";
  ctx.beginPath();
  ctx.ellipse(-13, -106, 10, 13, -0.1, 0, Math.PI * 2);
  ctx.ellipse(13, -105, 10, 13, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1f261f";
  ctx.beginPath();
  ctx.arc(-11, -103, 3.5, 0, Math.PI * 2);
  ctx.arc(11, -102, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#232f27";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-18, -83);
  ctx.quadraticCurveTo(0, -70, 20, -84);
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,.52)";
  ctx.fillRect(-38, -148, 76, 8);
  ctx.fillStyle = "#f26339";
  ctx.fillRect(-36, -146, 72 * Math.max(0, boss.health / boss.maxHealth), 4);
  ctx.restore();
}

function drawBoss() {
  const boss = game.boss;
  if (!boss || boss.health <= 0) return;
  if (boss.type === "gargantuar") {
    drawGargantuarBoss(boss);
    return;
  }
  const point = roadPoint(boss.x, boss.depth);
  const s = point.scale * (boss.type === "superDoctor" ? 1.52 : 1.35);
  ctx.save();
  ctx.translate(point.x, point.y + Math.sin(game.time * 3) * 3);
  ctx.scale(s, s);
  const isSuperDoctor = boss.type === "superDoctor";
  ctx.shadowColor = boss.hitFlash > 0 ? "#ffffc6" : (isSuperDoctor ? "rgba(218,89,255,.62)" : "rgba(255,101,63,.55)");
  ctx.shadowBlur = 18;

  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 66, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isSuperDoctor ? "#6f3198" : "#8e322d";
  ctx.strokeStyle = "#3c2624";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(-57, -30, 114, 55, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isSuperDoctor ? "#a94ccd" : "#c94c38";
  ctx.beginPath();
  ctx.roundRect(-42, -54, 84, 48, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#34464a";
  ctx.beginPath();
  ctx.arc(-51, 17, 17, 0, Math.PI * 2);
  ctx.arc(51, 17, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#b9d8cf";
  ctx.beginPath();
  ctx.ellipse(0, -65, 28, 31, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#40584f";
  ctx.stroke();

  ctx.fillStyle = "#f6f1d5";
  ctx.beginPath();
  ctx.ellipse(-10, -70, 8, 10, 0, 0, Math.PI * 2);
  ctx.ellipse(10, -69, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#232b29";
  ctx.beginPath();
  ctx.arc(-8, -68, 3, 0, Math.PI * 2);
  ctx.arc(8, -67, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#27332f";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-15, -53);
  ctx.quadraticCurveTo(0, -42, 16, -54);
  ctx.stroke();

  ctx.fillStyle = isSuperDoctor ? "#4d216d" : "#6d2527";
  ctx.beginPath();
  ctx.moveTo(-30, -93);
  ctx.quadraticCurveTo(0, -116, 30, -93);
  ctx.lineTo(23, -82);
  ctx.quadraticCurveTo(0, -97, -23, -82);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isSuperDoctor ? "#ff5fd1" : "#ffcf4e";
  ctx.beginPath();
  ctx.arc(0, -18, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBowlingBall(ball) {
  const point = roadPoint(ball.x, ball.depth);
  const r = 7 + point.scale * 18;
  ctx.save();
  ctx.translate(point.x, point.y - r);
  ctx.rotate(ball.spin);
  ctx.shadowColor = "rgba(124,67,255,.65)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#6545a5";
  ctx.strokeStyle = "#302050";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#211735";
  for (const [x, y] of [[-4, -5], [4, -5], [0, 3]]) {
    ctx.beginPath();
    ctx.arc(x * point.scale, y * point.scale, Math.max(2, r * .1), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCarWarning(warning) {
  const point = roadPoint(warning.x, 0.82);
  const pulse = 0.75 + Math.sin(game.time * 14) * 0.2;
  ctx.save();
  ctx.translate(point.x, point.y);
  if (!warning.impacted) {
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "rgba(255,54,38,.32)";
    ctx.strokeStyle = "#ff4f3d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 72, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff0cf";
    ctx.font = "900 17px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("危险", 0, 6);
  } else {
    const slam = Math.max(0, warning.impactTimer / 0.42);
    ctx.translate(0, -18 - slam * 100);
    ctx.fillStyle = "#d84535";
    ctx.strokeStyle = "#482722";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(-48, -28, 96, 45, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#9cd7e5";
    ctx.fillRect(-27, -20, 54, 20);
    ctx.fillStyle = "#263336";
    ctx.beginPath();
    ctx.arc(-30, 17, 13, 0, Math.PI * 2);
    ctx.arc(30, 17, 13, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBossLaser(laser) {
  const top = roadPoint(laser.x, 0.18);
  const bottom = roadPoint(laser.x, 0.86);
  const alpha = laser.impacted ? 0.88 : 0.32 + Math.sin(game.time * 18) * 0.16;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = laser.impacted ? "#ff355f" : "#ff8aa1";
  ctx.lineWidth = laser.impacted ? 30 : 12;
  ctx.lineCap = "round";
  ctx.shadowColor = "#ff355f";
  ctx.shadowBlur = laser.impacted ? 22 : 12;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.stroke();
  if (!laser.impacted) {
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "#fff0d2";
    ctx.font = "900 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("!", bottom.x, bottom.y - 18);
  }
  ctx.restore();
}

function drawBossShockwave(shockwave) {
  const point = roadPoint(shockwave.x, 0.82);
  const pulse = shockwave.impacted ? 1.2 : 0.85 + Math.sin(game.time * 14) * 0.12;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.scale(pulse, pulse);
  ctx.globalAlpha = shockwave.impacted ? 0.75 : 0.38;
  ctx.fillStyle = "rgba(255,207,85,.28)";
  ctx.strokeStyle = "#ffcf55";
  ctx.lineWidth = 5;
  ctx.shadowColor = "rgba(255,207,85,.7)";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.ellipse(0, 0, 76, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBullet(bullet) {
  const point = roadPoint(bullet.x, bullet.depth);
  const r = Math.max(2, bullet.radius * point.scale);
  ctx.fillStyle = bullet.color ?? "#b8ff45";
  ctx.shadowColor = bullet.glow ?? "#9dff3c";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawEnemyBullet(bullet) {
  const point = roadPoint(bullet.x, bullet.depth);
  const r = Math.max(7, 16 * point.scale);
  const pulse = 1 + Math.sin(bullet.pulse) * 0.08;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.scale(pulse, pulse);

  ctx.strokeStyle = "rgba(255,104,35,.42)";
  ctx.lineWidth = Math.max(4, r * .48);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -r * .3);
  ctx.lineTo(0, -r * 2.2);
  ctx.stroke();

  ctx.shadowColor = "#ff5b2e";
  ctx.shadowBlur = 18;
  const dangerPea = ctx.createRadialGradient(-r * .28, -r * .32, 1, 0, 0, r);
  dangerPea.addColorStop(0, "#fff27a");
  dangerPea.addColorStop(.38, "#ffad32");
  dangerPea.addColorStop(.72, "#f0572c");
  dangerPea.addColorStop(1, "#9e2726");
  ctx.fillStyle = dangerPea;
  ctx.strokeStyle = "#682326";
  ctx.lineWidth = Math.max(2.5, 3.5 * point.scale);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,211,.82)";
  ctx.beginPath();
  ctx.arc(-r * .3, -r * .34, r * .24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  for (const particle of game.particles) {
    const point = roadPoint(particle.x, particle.depth);
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, particle.size * point.scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const text of game.texts) {
    const point = roadPoint(text.x, text.depth);
    ctx.globalAlpha = Math.min(1, text.life * 2);
    ctx.fillStyle = text.color;
    ctx.font = `900 ${text.size}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,.65)";
    ctx.lineWidth = 4;
    ctx.strokeText(text.text, point.x, point.y);
    ctx.fillText(text.text, point.x, point.y);
  }
  ctx.globalAlpha = 1;
}

function drawCoinDrops() {
  for (const coin of game.coinDrops) {
    const squash = 0.35 + Math.abs(Math.cos(coin.spin)) * 0.65;
    ctx.save();
    ctx.translate(coin.x, coin.y);
    ctx.scale(squash, 1);
    ctx.shadowColor = "rgba(255,213,48,.75)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ffd83d";
    ctx.strokeStyle = "#9b6015";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff29a";
    ctx.beginPath();
    ctx.ellipse(-2.5, -3, 2.5, 4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function draw() {
  const w = canvas.logicalWidth || 1;
  const h = canvas.logicalHeight || 1;
  ctx.save();
  drawBackground(w, h);

  const drawables = [
    ...game.obstacles.map(item => ({ depth: item.depth, draw: () => drawObstacle(item) })),
    ...game.healthPacks.map(item => ({ depth: item.depth, draw: () => drawHealthPack(item) })),
    ...game.plantOrbs.map(item => ({ depth: item.depth, draw: () => drawPlantOrb(item) })),
    ...game.potatoMines.map(item => ({ depth: item.depth, draw: () => drawPotatoMine(item) })),
    ...game.bowlingBalls.map(item => ({ depth: item.depth, draw: () => drawBowlingBall(item) })),
    ...game.enemies.map(item => ({ depth: item.depth, draw: () => drawEnemy(item) })),
    ...game.bullets.map(item => ({ depth: item.depth, draw: () => drawBullet(item) })),
    ...game.enemyBullets.map(item => ({ depth: item.depth, draw: () => drawEnemyBullet(item) }))
  ].sort((a, b) => a.depth - b.depth);

  for (const item of drawables) item.draw();
  drawBoss();
  for (const warning of game.carWarnings) drawCarWarning(warning);
  for (const laser of game.bossLasers) drawBossLaser(laser);
  for (const shockwave of game.bossShockwaves) drawBossShockwave(shockwave);
  drawPlayer();
  drawParticles();
  drawCoinDrops();

  const atmosphere = ctx.createLinearGradient(0, 0, 0, h);
  atmosphere.addColorStop(0, "rgba(130,220,255,.10)");
  atmosphere.addColorStop(0.42, "rgba(255,244,180,.035)");
  atmosphere.addColorStop(1, "rgba(24,48,22,.08)");
  ctx.fillStyle = atmosphere;
  ctx.fillRect(0, 0, w, h);

  const sunlight = ctx.createRadialGradient(w * .82, h * .05, 0, w * .82, h * .05, h * .7);
  sunlight.addColorStop(0, "rgba(255,245,174,.19)");
  sunlight.addColorStop(.35, "rgba(255,232,154,.05)");
  sunlight.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sunlight;
  ctx.fillRect(0, 0, w, h);

  if (game.player?.damageFlash > 0) {
    const hurtStrength = game.player.damageFlash;
    const hurtVignette = ctx.createRadialGradient(
      w / 2, h * .55, h * .18,
      w / 2, h * .55, h * .72
    );
    hurtVignette.addColorStop(0, "rgba(255,50,35,0)");
    hurtVignette.addColorStop(.68, `rgba(255,48,32,${hurtStrength * .06})`);
    hurtVignette.addColorStop(1, `rgba(185,18,14,${hurtStrength * .42})`);
    ctx.fillStyle = hurtVignette;
    ctx.fillRect(0, 0, w, h);
  }

  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * .15, w / 2, h / 2, h * .8);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(5,24,12,.2)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function loop(timestamp) {
  const dt = Math.min(0.033, (timestamp - game.lastTime) / 1000 || 0);
  game.lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function pointerMove(event) {
  if (game.paused || !game.pointerActive || (game.state !== "playing" && game.state !== "boss")) return;
  const rect = canvas.getBoundingClientRect();
  game.player.x = Math.max(-0.91, Math.min(0.91, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", event => {
  if (event.code === "Escape" || event.code === "KeyP") {
    if (game.paused) closePauseMenu();
    else openPauseMenu();
    event.preventDefault();
    return;
  }
  game.keys[event.code] = true;
  if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
});
window.addEventListener("keyup", event => game.keys[event.code] = false);
canvas.addEventListener("pointerdown", event => {
  game.pointerActive = true;
  canvas.setPointerCapture(event.pointerId);
  pointerMove(event);
});
canvas.addEventListener("pointermove", pointerMove);
canvas.addEventListener("pointerup", () => game.pointerActive = false);
canvas.addEventListener("pointercancel", () => game.pointerActive = false);
document.getElementById("pauseButton").addEventListener("click", openPauseMenu);
document.getElementById("resumeButton").addEventListener("click", closePauseMenu);
document.getElementById("pauseRestartButton").addEventListener("click", resetGame);
document.querySelectorAll(".difficulty-option").forEach(button => {
  button.addEventListener("click", () => chooseDifficulty(button.dataset.difficulty));
});
document.getElementById("startButton").addEventListener("click", openDifficultyScreen);
document.getElementById("restartButton").addEventListener("click", resetGame);
document.querySelectorAll("#choiceScreen .choice-card").forEach(card => {
  card.addEventListener("click", () => chooseUpgrade(card));
});
document.querySelectorAll(".talent-card").forEach(card => {
  card.addEventListener("click", () => chooseStartTalent(card));
});
document.querySelectorAll(".shop-card").forEach(card => {
  card.addEventListener("click", () => buyShopUpgrade(card));
});
document.getElementById("leaveRestButton").addEventListener("click", leaveRestStop);
document.getElementById("refreshShopButton").addEventListener("click", refreshShop);

resizeCanvas();
requestAnimationFrame(loop);
