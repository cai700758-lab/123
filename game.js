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
  choice: document.getElementById("choiceScreen"),
  rest: document.getElementById("restScreen"),
  restCoins: document.getElementById("restCoinValue"),
  refreshShop: document.getElementById("refreshShopButton"),
  refreshCost: document.getElementById("refreshCostValue"),
  bossHud: document.getElementById("bossHud"),
  bossHealthBar: document.getElementById("bossHealthBar"),
  bossHealthText: document.getElementById("bossHealthText"),
  end: document.getElementById("endScreen"),
  resultKicker: document.getElementById("resultKicker"),
  resultTitle: document.getElementById("resultTitle"),
  resultDistance: document.getElementById("resultDistance"),
  resultKills: document.getElementById("resultKills"),
  resultDamage: document.getElementById("resultDamage")
};

const game = {
  state: "menu",
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
  choiceAt: 190,
  nextChoice: 190,
  restAt: 500,
  nextRest: 500,
  enemyHealthMultiplier: 1,
  restTier: 0,
  shopRefreshCount: 0,
  keys: {},
  pointerActive: false,
  player: null,
  enemies: [],
  bullets: [],
  enemyBullets: [],
  obstacles: [],
  healthPacks: [],
  boss: null,
  bowlingBalls: [],
  carWarnings: [],
  particles: [],
  coinDrops: [],
  texts: []
};

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
      icon: "◎",
      title: "豌豆尺寸 +50%",
      desc: "豌豆尺寸增大 50%，更容易命中目标。",
      tag: "弹体强化",
      apply: p => p.bulletSize = Math.min(24, p.bulletSize * 1.5)
    },
    {
      icon: "✦",
      title: "暴击率 +15%",
      desc: "暴击率增加 15%，暴击造成 2.5 倍伤害。",
      tag: "幸运强化",
      apply: p => p.crit = Math.min(0.6, p.crit + 0.15)
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

function resetGame() {
  game.state = "playing";
  game.time = 0;
  game.distance = 0;
  game.speed = 115;
  game.stage = 1;
  game.kills = 0;
  game.coins = 0;
  game.shake = 0;
  game.spawnTimer = 0.35;
  game.obstacleTimer = 3;
  game.nextChoice = game.choiceAt;
  game.nextRest = game.restAt;
  game.enemyHealthMultiplier = 1;
  game.restTier = 0;
  game.shopRefreshCount = 0;
  game.enemies = [];
  game.bullets = [];
  game.enemyBullets = [];
  game.obstacles = [];
  game.healthPacks = [];
  game.boss = null;
  game.bowlingBalls = [];
  game.carWarnings = [];
  game.particles = [];
  game.coinDrops = [];
  game.texts = [];
  game.player = {
    x: 0,
    health: 100,
    maxHealth: 100,
    damage: 20,
    fireRate: 0.46,
    fireTimer: 0,
    moveSpeed: 2.25,
    horizontalProjectiles: 1,
    longitudinalProjectiles: 1,
    bulletSize: 9,
    crit: 0.05,
    pierce: 0,
    invulnerable: 0
  };
  ui.start.classList.remove("visible");
  ui.start.style.visibility = "hidden";
  ui.start.style.opacity = "0";
  ui.start.style.pointerEvents = "none";
  ui.end.classList.remove("visible");
  ui.choice.classList.remove("visible");
  ui.rest.classList.remove("visible");
  ui.bossHud.classList.remove("visible");
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

function getStageCoinMultiplier(stage = game.stage) {
  return Math.pow(1.5, Math.max(0, stage - 1));
}

function spawnEnemy() {
  const depth = -0.04 - Math.random() * 0.12;
  const typeRoll = Math.random();
  game.enemyHealthMultiplier = getStageHealthMultiplier();
  const baseHealth = 35 + game.stage * 10;
  let health = baseHealth * game.enemyHealthMultiplier;
  let coinHealthValue = baseHealth * getStageCoinMultiplier();
  let speed = 0.07 + Math.random() * 0.024 + game.stage * 0.002;
  let radius = 24;
  let type = "normal";

  if (game.stage >= 2 && typeRoll < 0.18) {
    type = "imp";
    speed *= 2;
    radius = 17;
  } else if (game.stage >= 3 && typeRoll < 0.30) {
    type = "screen";
    health *= 4;
    coinHealthValue *= 4;
    speed *= 0.78;
    radius = 30;
  } else if (game.stage >= 4 && typeRoll < 0.42) {
    type = "peaZombie";
    radius = 25;
  } else if (game.stage >= 5 && typeRoll < 0.52) {
    type = "football";
    health *= 3;
    coinHealthValue *= 3;
    speed *= 2;
    radius = 29;
  } else if (typeRoll > 0.82) {
    type = "bucket";
    health *= 3;
    coinHealthValue *= 3;
    speed *= 0.78;
    radius = 28;
  } else if (typeRoll > 0.67) {
    type = "runner";
    health *= 2;
    coinHealthValue *= 2;
    radius = 21;
  }

  game.enemies.push({
    x: -0.78 + Math.random() * 1.56,
    depth,
    health,
    maxHealth: health,
    coinHealthValue,
    speed,
    radius,
    type,
    fireTimer: type === "peaZombie" ? 1.2 : 0,
    hitFlash: 0,
    wobble: Math.random() * Math.PI * 2
  });
}

function spawnObstacle() {
  const positions = [-0.62, 0, 0.62];
  game.obstacles.push({
    x: positions[Math.floor(Math.random() * positions.length)],
    depth: -0.08,
    speed: 0.13,
    hit: false
  });
}

function spawnHealthPack() {
  const positions = [-0.62, 0, 0.62];
  game.healthPacks.push({
    x: positions[Math.floor(Math.random() * positions.length)],
    depth: -0.08,
    speed: 0.13,
    remove: false,
    bob: Math.random() * Math.PI * 2
  });
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
        hit: new Set()
      });
    }
  }
  burst(p.x, 0.84, "#b8ff45", 4, 0.018);
}

function shootEnemyPea(enemy) {
  game.enemyBullets.push({
    x: enemy.x,
    targetX: game.player.x,
    depth: enemy.depth,
    speed: 0.48,
    damage: 10,
    removed: false
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
  const rewardHealthValue = enemy.coinHealthValue ?? enemy.maxHealth;
  const reward = Math.max(1, Math.round(rewardHealthValue / 20));
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

function startBossBattle() {
  game.state = "boss";
  game.distance = game.totalDistance;
  game.enemies = [];
  game.bullets = [];
  game.enemyBullets = [];
  game.obstacles = [];
  game.healthPacks = [];
  game.bowlingBalls = [];
  game.carWarnings = [];
  game.boss = {
    x: 0,
    depth: 0.2,
    health: 2000000,
    maxHealth: 2000000,
    direction: 1,
    moveSpeed: 0.34,
    attackTimer: 2.2,
    hitFlash: 0,
    attackName: ""
  };
  ui.bossHud.classList.add("visible");
  floatingText("僵王博士出现！", 0, 0.48, "#ffcf55", 24);
  updateUI();
}

function useBossAttack() {
  const attacks = ["bowling", "car", "summon"];
  const attack = attacks[Math.floor(Math.random() * attacks.length)];
  game.boss.attackName = attack;

  if (attack === "bowling") {
    const lanes = [-0.62, 0, 0.62].sort(() => Math.random() - 0.5).slice(0, 2);
    for (const lane of lanes) {
      game.bowlingBalls.push({ x: lane, depth: 0.2, speed: 0.38, damage: 20, removed: false, spin: 0 });
    }
    floatingText("双路保龄球！", game.boss.x, 0.32, "#ffb45d", 18);
  } else if (attack === "car") {
    const lanes = [-0.62, 0, 0.62];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    game.carWarnings.push({ x: lane, timer: 1, impactTimer: 0, impacted: false, removed: false });
    floatingText("车辆坠落预警！", lane, 0.68, "#ff6655", 18);
  } else {
    for (let i = 0; i < 10; i++) {
      spawnEnemy();
      const enemy = game.enemies[game.enemies.length - 1];
      enemy.depth = -0.14 - i * 0.045;
      enemy.x = [-0.7, -0.35, 0, 0.35, 0.7][i % 5] + (Math.random() - 0.5) * 0.08;
    }
    floatingText("僵尸军团！", game.boss.x, 0.32, "#d9ff72", 18);
  }

  game.boss.attackTimer = 3.8 + Math.random() * 1.8;
}

function updateBoss(dt) {
  const boss = game.boss;
  if (!boss) return;
  boss.hitFlash = Math.max(0, boss.hitFlash - dt * 5);
  boss.x += boss.direction * boss.moveSpeed * dt;
  if (boss.x >= 0.68) {
    boss.x = 0.68;
    boss.direction = -1;
  } else if (boss.x <= -0.68) {
    boss.x = -0.68;
    boss.direction = 1;
  }

  boss.attackTimer -= dt;
  if (boss.attackTimer <= 0) useBossAttack();

  for (const bullet of game.bullets) {
    if (bullet.depth < -0.1) continue;
    if (Math.abs(bullet.depth - boss.depth) < 0.07 && Math.abs(bullet.x - boss.x) < 0.2) {
      const critical = Math.random() < game.player.crit;
      const damage = Math.round(bullet.damage * (critical ? 2.5 : 1));
      boss.health -= damage;
      boss.hitFlash = 1;
      bullet.depth = -1;
      floatingText(critical ? `暴击 ${damage}!` : `-${damage}`, boss.x, boss.depth, critical ? "#fff266" : "#ffffff", critical ? 20 : 14);
      burst(boss.x, boss.depth, "#b8ff45", 7);
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

  game.bowlingBalls = game.bowlingBalls.filter(ball => !ball.removed);
  game.carWarnings = game.carWarnings.filter(warning => !warning.removed);
}

function update(dt) {
  if (game.state !== "playing" && game.state !== "boss") return;

  const p = game.player;
  game.time += dt;
  if (game.state === "playing") game.distance += game.speed * dt / 10;
  game.stage = Math.min(5, Math.floor(game.distance / 500) + 1);
  game.speed = 115 + game.stage * 8;
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  game.shake = Math.max(0, game.shake - dt * 12);

  const direction = (game.keys.ArrowRight || game.keys.KeyD ? 1 : 0)
    - (game.keys.ArrowLeft || game.keys.KeyA ? 1 : 0);
  p.x = Math.max(-0.91, Math.min(0.91, p.x + direction * p.moveSpeed * dt));

  p.fireTimer -= dt;
  if (p.fireTimer <= 0) {
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
    if (Math.random() < 0.12) spawnHealthPack();
    else spawnObstacle();
    game.obstacleTimer = 3.2 + Math.random() * 2.8;
  }

  for (const bullet of game.bullets) {
    bullet.depth -= bullet.speed * dt;
    bullet.x += bullet.vx * dt;
  }

  if (game.state === "boss") updateBoss(dt);

  for (const enemy of game.enemies) {
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
      const hitWidth = 0.08 + bullet.radius * 0.0025;
      if (depthHit < 0.055 && Math.abs(dx) < hitWidth) {
        const critical = Math.random() < p.crit;
        const damage = Math.round(bullet.damage * (critical ? 2.5 : 1));
        enemy.health -= damage;
        enemy.hitFlash = 1;
        bullet.hit.add(enemy);
        floatingText(critical ? `暴击 ${damage}!` : `-${damage}`, enemy.x, enemy.depth, critical ? "#fff266" : "#ffffff", critical ? 20 : 14);
        burst(enemy.x, enemy.depth, "#b8ff45", 5);
        if (bullet.pierce > 0) bullet.pierce--;
        else bullet.depth = -1;

        if (enemy.health <= 0) {
          enemy.dead = true;
          game.kills++;
          spawnCoinDrops(enemy);
          burst(enemy.x, enemy.depth, "#78b56c", 18, 0.07);
        }
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
    bullet.x += (bullet.targetX - bullet.x) * Math.min(1, dt * 2.2);
    if (bullet.depth >= 0.84) {
      if (Math.abs(bullet.x - p.x) < 0.16) {
        damagePlayer(bullet.damage);
        burst(p.x, 0.84, "#8bcf3f", 9, 0.045);
      }
      bullet.removed = true;
    }
  }

  for (const obstacle of game.obstacles) {
    obstacle.depth += obstacle.speed * dt;
    if (!obstacle.hit && obstacle.depth >= 0.84) {
      if (Math.abs(obstacle.x - p.x) < 0.2) damagePlayer(20);
      obstacle.hit = true;
      obstacle.remove = true;
    }
  }

  for (const pack of game.healthPacks) {
    pack.depth += pack.speed * dt;
    pack.bob += dt * 5;
    if (pack.depth >= 0.84) {
      if (Math.abs(pack.x - p.x) < 0.2) {
        const healed = Math.min(20, p.maxHealth - p.health);
        p.health = Math.min(p.maxHealth, p.health + 20);
        floatingText(healed > 0 ? `+${healed} HP` : "生命已满", p.x, 0.76, "#83ff72", 18);
        burst(p.x, 0.82, "#eaffdf", 12, 0.05);
      }
      pack.remove = true;
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
        game.coins += coin.value;
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
  game.particles = game.particles.filter(particle => particle.life > 0);
  game.coinDrops = game.coinDrops.filter(coin => !coin.collected);
  game.texts = game.texts.filter(text => text.life > 0);

  if (game.state === "playing" && game.distance >= game.nextRest && game.distance < game.totalDistance) {
    game.nextRest += game.restAt;
    openRestStop();
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

function damagePlayer(amount) {
  const p = game.player;
  if (p.invulnerable > 0) return;
  p.health -= amount;
  p.invulnerable = 0.7;
  game.shake = 0;
  floatingText(`-${amount} HP`, p.x, 0.78, "#ff6b5b", 20);
  if (p.health <= 0) {
    p.health = 0;
    endGame(false);
  }
}

function openChoice() {
  game.state = "choice";
  const pool = createUpgradePool().sort(() => Math.random() - 0.5).slice(0, 2);
  document.querySelectorAll(".choice-card").forEach((card, index) => {
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

  for (const coin of game.coinDrops) game.coins += coin.value;
  game.coinDrops = [];

  game.restTier = Math.max(1, Math.round(game.distance / 500));
  game.shopRefreshCount = 0;
  rollShopItems();
  updateShopState();
  ui.rest.classList.add("visible");
}

function rollShopItems() {
  const shopPool = createUpgradePool().sort(() => Math.random() - 0.5).slice(0, 3);
  document.querySelectorAll(".shop-card").forEach((card, index) => {
    const item = shopPool[index];
    const baseCost = 30 + Math.floor(Math.random() * 21);
    const restMultiplier = Math.pow(3, Math.max(0, game.restTier - 1));
    const cost = baseCost * restMultiplier;
    card._upgrade = item;
    card._cost = cost;
    card.disabled = false;
    card.classList.remove("bought");
    card.innerHTML = `
      <span class="choice-icon">${item.icon}</span>
      <strong>${item.title}</strong>
      <small>${item.desc}</small>
      <span class="shop-price">金币 ${cost}</span>
    `;
  });
}

function getShopRefreshCost() {
  const restMultiplier = Math.pow(3, Math.max(0, game.restTier - 1));
  return (game.shopRefreshCount + 1) * 10 * restMultiplier;
}

function updateShopState() {
  ui.restCoins.textContent = game.coins;
  const refreshCost = getShopRefreshCost();
  ui.refreshCost.textContent = refreshCost;
  ui.refreshShop.disabled = game.coins < refreshCost;
  document.querySelectorAll(".shop-card").forEach(card => {
    if (!card.classList.contains("bought")) card.disabled = game.coins < card._cost;
  });
  updateUI();
}

function buyShopUpgrade(card) {
  if (game.state !== "rest" || card.disabled || card.classList.contains("bought")) return;
  game.coins -= card._cost;
  card._upgrade.apply(game.player);
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
  game.spawnTimer = 1.2;
  game.obstacleTimer = 2.5;
  ui.rest.classList.remove("visible");
  game.state = "playing";
  floatingText(`僵尸生命 ×${game.enemyHealthMultiplier.toFixed(2)}`, game.player.x, 0.55, "#ffcf55", 17);
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

function drawPlayer() {
  if (!game.player) return;
  const p = game.player;
  const point = roadPoint(p.x, 0.88);
  const runBob = Math.sin(game.time * 8) * 3;
  const moveDirection = (game.keys.ArrowRight || game.keys.KeyD ? 1 : 0)
    - (game.keys.ArrowLeft || game.keys.KeyA ? 1 : 0);

  if (playerSprite.complete && playerSprite.naturalWidth) {
    ctx.save();
    ctx.translate(point.x, point.y + runBob);
    if (p.invulnerable > 0) ctx.globalAlpha = 0.72;

    ctx.fillStyle = "rgba(20,42,18,.34)";
    ctx.filter = "blur(4px)";
    ctx.beginPath();
    ctx.ellipse(0, 14, 42, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = "none";

    ctx.rotate(moveDirection * 0.045);
    const spriteHeight = Math.min(168, canvas.logicalHeight * 0.23);
    const spriteWidth = spriteHeight * 0.78;
    const sourceX = playerSprite.naturalWidth * 0.14;
    const sourceY = playerSprite.naturalHeight * 0.035;
    const sourceWidth = playerSprite.naturalWidth * 0.72;
    const sourceHeight = playerSprite.naturalHeight * 0.9;
    ctx.shadowColor = "rgba(184,255,75,.42)";
    ctx.shadowBlur = 14;
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
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(point.x, point.y);
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
  ctx.restore();
}

function drawObstacle(obstacle) {
  const point = roadPoint(obstacle.x, obstacle.depth);
  const s = point.scale;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.scale(s, s);
  ctx.fillStyle = obstacle.hit ? "#76544b" : "#c88936";
  ctx.beginPath();
  ctx.roundRect(-30, -30, 60, 30, 4);
  ctx.fill();
  ctx.fillStyle = "#5b341c";
  for (let i = -20; i <= 20; i += 20) {
    ctx.fillRect(i - 4, -30, 8, 30);
  }
  ctx.strokeStyle = "#4b2b18";
  ctx.lineWidth = 5;
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

function drawBoss() {
  const boss = game.boss;
  if (!boss || boss.health <= 0) return;
  const point = roadPoint(boss.x, boss.depth);
  const s = point.scale * 1.35;
  ctx.save();
  ctx.translate(point.x, point.y + Math.sin(game.time * 3) * 3);
  ctx.scale(s, s);
  ctx.shadowColor = boss.hitFlash > 0 ? "#ffffc6" : "rgba(255,101,63,.55)";
  ctx.shadowBlur = 18;

  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 66, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8e322d";
  ctx.strokeStyle = "#3c2624";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(-57, -30, 114, 55, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#c94c38";
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

  ctx.fillStyle = "#6d2527";
  ctx.beginPath();
  ctx.moveTo(-30, -93);
  ctx.quadraticCurveTo(0, -116, 30, -93);
  ctx.lineTo(23, -82);
  ctx.quadraticCurveTo(0, -97, -23, -82);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffcf4e";
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

function drawBullet(bullet) {
  const point = roadPoint(bullet.x, bullet.depth);
  const r = Math.max(2, bullet.radius * point.scale);
  ctx.fillStyle = "#b8ff45";
  ctx.shadowColor = "#9dff3c";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawEnemyBullet(bullet) {
  const point = roadPoint(bullet.x, bullet.depth);
  const r = Math.max(3, 8 * point.scale);
  ctx.save();
  ctx.shadowColor = "#e6b92f";
  ctx.shadowBlur = 9;
  ctx.fillStyle = "#9fcf35";
  ctx.strokeStyle = "#665d20";
  ctx.lineWidth = Math.max(1.5, 2.5 * point.scale);
  ctx.beginPath();
  ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,247,134,.7)";
  ctx.beginPath();
  ctx.arc(point.x - r * 0.28, point.y - r * 0.3, r * 0.25, 0, Math.PI * 2);
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
    ...game.bowlingBalls.map(item => ({ depth: item.depth, draw: () => drawBowlingBall(item) })),
    ...game.enemies.map(item => ({ depth: item.depth, draw: () => drawEnemy(item) })),
    ...game.bullets.map(item => ({ depth: item.depth, draw: () => drawBullet(item) })),
    ...game.enemyBullets.map(item => ({ depth: item.depth, draw: () => drawEnemyBullet(item) }))
  ].sort((a, b) => a.depth - b.depth);

  for (const item of drawables) item.draw();
  drawBoss();
  for (const warning of game.carWarnings) drawCarWarning(warning);
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
  if (!game.pointerActive || (game.state !== "playing" && game.state !== "boss")) return;
  const rect = canvas.getBoundingClientRect();
  game.player.x = Math.max(-0.91, Math.min(0.91, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", event => {
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
document.getElementById("startButton").addEventListener("click", resetGame);
document.getElementById("restartButton").addEventListener("click", resetGame);
document.querySelectorAll(".choice-card").forEach(card => {
  card.addEventListener("click", () => chooseUpgrade(card));
});
document.querySelectorAll(".shop-card").forEach(card => {
  card.addEventListener("click", () => buyShopUpgrade(card));
});
document.getElementById("leaveRestButton").addEventListener("click", leaveRestStop);
document.getElementById("refreshShopButton").addEventListener("click", refreshShop);

resizeCanvas();
requestAnimationFrame(loop);
