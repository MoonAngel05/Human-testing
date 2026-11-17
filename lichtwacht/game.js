'use strict';

/* =====================================================================
   LICHTWACHT – Tower-Defense-Prototyp
   Aufbau dieser Datei:
     1. Konfiguration & Datenbeschreibung (Wächter, Gegner)
     2. Spielzustand
     3. Wellen-System
     4. Update-Logik
     5. Eingabe
     6. Zeichnen
     7. UI / Overlay / Spielschleife
   ===================================================================== */

/* ---------- 1. KONFIGURATION ---------- */

const CONFIG = {
  cols: 9,
  rows: 5,
  cell: 100,            // Pixelgröße eines Feldes
  startGlut: 150,
  baseHealth: 5,        // Leben des Leuchtturms
  totalWaves: 8,
  firstWaveDelay: 15,   // Sekunden bis zur ersten Welle
  waveBreak: 12,        // Sekunden zwischen den Wellen
  skyGlutInterval: 9,   // alle x Sekunden fällt ein Funke vom Himmel
  skyGlutValue: 25,
  sparkLifetime: 8,
};

const WIDTH = CONFIG.cols * CONFIG.cell;
const HEIGHT = CONFIG.rows * CONFIG.cell;

// Wächter (Verteidigungseinheiten). Neue Einheit = neuer Eintrag hier.
const TOWER_TYPES = {
  leuchtkaefer: {
    name: 'Leuchtkäfer', info: 'Erzeugt Glut',
    kind: 'producer', cost: 50, hp: 100, recharge: 5,
    color: '#ffd166', produceEvery: 8, produceValue: 25,
  },
  funkenwerfer: {
    name: 'Funkenwerfer', info: 'Schießt Funken',
    kind: 'shooter', cost: 100, hp: 100, recharge: 5,
    color: '#ef6f4a', fireEvery: 1.4, damage: 20, projectileSpeed: 380,
    projectileColor: '#ffb347', slow: 0, slowDuration: 0,
  },
  frostlaterne: {
    name: 'Frostlaterne', info: 'Verlangsamt Gegner',
    kind: 'shooter', cost: 150, hp: 100, recharge: 7,
    color: '#7fd1f5', fireEvery: 1.6, damage: 12, projectileSpeed: 340,
    projectileColor: '#bdeaff', slow: 0.5, slowDuration: 3,
  },
  steinwaechter: {
    name: 'Steinwächter', info: 'Hält viel aus',
    kind: 'wall', cost: 50, hp: 550, recharge: 12,
    color: '#8d99ae',
  },
};

// Gegner. Neuer Gegner = neuer Eintrag hier.
const ENEMY_TYPES = {
  nebelkriecher:   { name: 'Nebelkriecher',   hp: 100, speed: 22, dps: 25, radius: 24, color: '#8d99ae' },
  schattenlaeufer: { name: 'Schattenläufer',  hp: 60,  speed: 44, dps: 20, radius: 19, color: '#7b2cbf' },
  dunkelkoloss:    { name: 'Dunkelkoloss',    hp: 450, speed: 15, dps: 50, radius: 32, color: '#343a40' },
};

/* ---------- 2. SPIELZUSTAND ---------- */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = WIDTH;
canvas.height = HEIGHT;

const ui = {
  glut: document.getElementById('glut'),
  wave: document.getElementById('wave'),
  waveTotal: document.getElementById('waveTotal'),
  base: document.getElementById('base'),
  cards: document.getElementById('cards'),
  pauseBtn: document.getElementById('pauseBtn'),
  overlay: document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlayTitle'),
  overlayText: document.getElementById('overlayText'),
  overlayBtn: document.getElementById('overlayBtn'),
};

let game;            // aktueller Spielzustand
let selected = null; // Schlüssel eines Wächters, 'shovel' oder null
let hoverCell = null;

function newGame(state) {
  game = {
    state: state,                 // 'menu' | 'running' | 'paused' | 'won' | 'lost'
    time: 0,
    glut: CONFIG.startGlut,
    baseHealth: CONFIG.baseHealth,
    baseFlash: 0,
    grid: Array.from({ length: CONFIG.rows }, () => Array(CONFIG.cols).fill(null)),
    towers: [],
    enemies: [],
    projectiles: [],
    sparks: [],
    floaters: [],
    cardCd: {},                   // Abklingzeit pro Wächter-Karte
    wave: 0,
    waveTimer: CONFIG.firstWaveDelay,
    spawnQueue: [],
    spawnTimer: 0,
    spawnInterval: 3,
    skyTimer: 4,
    banner: null,
  };
  selected = null;
  refreshCards();
}

/* ---------- 3. WELLEN-SYSTEM ---------- */

function startWave() {
  game.wave++;
  const n = game.wave;

  // Gegner-Pool: je höher die Welle, desto mehr schwere Typen
  const pool = ['nebelkriecher', 'nebelkriecher'];
  if (n >= 2) pool.push('schattenlaeufer');
  if (n >= 3) pool.push('schattenlaeufer');
  if (n >= 4) pool.push('dunkelkoloss');
  if (n >= 6) pool.push('dunkelkoloss');

  let count = 2 + n * 2;
  if (n === CONFIG.totalWaves) count += 4; // große Schlusswelle

  game.spawnQueue = [];
  for (let i = 0; i < count; i++) {
    game.spawnQueue.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  game.spawnInterval = Math.max(1.1, 3.6 - n * 0.3);
  game.spawnTimer = 0;
  game.waveTimer = CONFIG.waveBreak;

  showBanner(n === CONFIG.totalWaves ? 'Letzte Welle!' : 'Welle ' + n);
}

function spawnEnemy(typeKey) {
  const t = ENEMY_TYPES[typeKey];
  game.enemies.push({
    type: typeKey,
    row: Math.floor(Math.random() * CONFIG.rows),
    x: WIDTH + CONFIG.cell * 0.3,
    hp: t.hp, maxHp: t.hp,
    speed: t.speed, dps: t.dps, radius: t.radius,
    slowTimer: 0, hitFlash: 0, wob: Math.random() * 6,
    dead: false,
  });
}

function updateWaves(dt) {
  if (game.spawnQueue.length > 0) {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      spawnEnemy(game.spawnQueue.shift());
      game.spawnTimer = game.spawnInterval;
    }
    return;
  }
  if (game.wave < CONFIG.totalWaves) {
    // Sind alle Gegner besiegt, kommt die nächste Welle schneller
    if (game.enemies.length === 0) game.waveTimer = Math.min(game.waveTimer, 3);
    game.waveTimer -= dt;
    if (game.waveTimer <= 0) startWave();
  }
}

/* ---------- 4. UPDATE-LOGIK ---------- */

function cellCenter(row, col) {
  return { x: col * CONFIG.cell + CONFIG.cell / 2, y: row * CONFIG.cell + CONFIG.cell / 2 };
}

function showBanner(text) { game.banner = { text, t: 2.6 }; }

function addFloater(x, y, text) { game.floaters.push({ x, y, text, life: 1 }); }

function spawnSpark(x, y, value, falling) {
  game.sparks.push({
    x, y, value,
    targetY: falling ? 120 + Math.random() * 330 : y,
    life: CONFIG.sparkLifetime,
    phase: Math.random() * 6,
  });
}

function updateSky(dt) {
  game.skyTimer -= dt;
  if (game.skyTimer <= 0) {
    game.skyTimer = CONFIG.skyGlutInterval;
    spawnSpark(60 + Math.random() * (WIDTH - 120), -20, CONFIG.skyGlutValue, true);
  }
}

function updateSparks(dt) {
  for (const s of game.sparks) {
    if (s.y < s.targetY) s.y = Math.min(s.targetY, s.y + 60 * dt);
    else s.life -= dt;
  }
  game.sparks = game.sparks.filter(s => s.life > 0);
}

function updateTowers(dt) {
  for (const t of game.towers) {
    const def = TOWER_TYPES[t.type];
    const c = cellCenter(t.row, t.col);

    if (def.kind === 'producer') {
      t.timer -= dt;
      if (t.timer <= 0) {
        t.timer = def.produceEvery;
        spawnSpark(c.x + 20, c.y - 5, def.produceValue, false);
      }
    } else if (def.kind === 'shooter') {
      t.timer -= dt;
      const hasTarget = game.enemies.some(
        e => !e.dead && e.row === t.row && e.x > c.x - 10 && e.x < WIDTH + 10
      );
      if (hasTarget && t.timer <= 0) {
        t.timer = def.fireEvery;
        game.projectiles.push({
          row: t.row, x: c.x + 30, y: c.y - 6,
          speed: def.projectileSpeed, damage: def.damage,
          color: def.projectileColor, slow: def.slow, slowDuration: def.slowDuration,
          dead: false,
        });
      }
    }
  }
}

function updateProjectiles(dt) {
  for (const p of game.projectiles) {
    p.x += p.speed * dt;
    if (p.x > WIDTH + 30) { p.dead = true; continue; }
    for (const e of game.enemies) {
      if (e.dead || e.row !== p.row) continue;
      if (Math.abs(p.x - e.x) < e.radius) {
        e.hp -= p.damage;
        e.hitFlash = 0.1;
        if (p.slow > 0) e.slowTimer = p.slowDuration;
        p.dead = true;
        if (e.hp <= 0) e.dead = true;
        break;
      }
    }
  }
  game.projectiles = game.projectiles.filter(p => !p.dead);
}

function updateEnemies(dt) {
  for (const e of game.enemies) {
    if (e.dead) continue;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.slowTimer = Math.max(0, e.slowTimer - dt);

    // Welches Feld berührt die Vorderseite des Gegners?
    const col = Math.floor((e.x - e.radius) / CONFIG.cell);
    const tower = (col >= 0 && col < CONFIG.cols) ? game.grid[e.row][col] : null;

    if (tower) {
      // Gegner bleibt stehen und greift den Wächter an
      tower.hp -= e.dps * dt;
      if (tower.hp <= 0) {
        tower.dead = true;
        game.grid[tower.row][tower.col] = null;
      }
    } else {
      const factor = e.slowTimer > 0 ? 0.5 : 1;
      e.x -= e.speed * factor * dt;
      if (e.x < 0) {
        // Gegner erreicht den Leuchtturm
        e.dead = true;
        game.baseHealth--;
        game.baseFlash = 0.5;
        showBanner('Der Leuchtturm wurde getroffen!');
      }
    }
  }
  game.towers = game.towers.filter(t => !t.dead);
  game.enemies = game.enemies.filter(e => !e.dead);
}

function updateCardCooldowns(dt) {
  for (const key in game.cardCd) {
    game.cardCd[key] = Math.max(0, game.cardCd[key] - dt);
  }
}

function checkEnd() {
  if (game.baseHealth <= 0) {
    endGame('lost');
  } else if (game.wave >= CONFIG.totalWaves && game.spawnQueue.length === 0 && game.enemies.length === 0) {
    endGame('won');
  }
}

function update(dt) {
  game.time += dt;
  game.baseFlash = Math.max(0, game.baseFlash - dt);
  if (game.banner) { game.banner.t -= dt; if (game.banner.t <= 0) game.banner = null; }
  for (const f of game.floaters) { f.life -= dt; f.y -= 30 * dt; }
  game.floaters = game.floaters.filter(f => f.life > 0);

  updateWaves(dt);
  updateSky(dt);
  updateTowers(dt);
  updateProjectiles(dt);
  updateEnemies(dt);
  updateSparks(dt);
  updateCardCooldowns(dt);
  checkEnd();
}

/* ---------- 5. EINGABE ---------- */

function canvasPos(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - r.left) * canvas.width / r.width,
    y: (ev.clientY - r.top) * canvas.height / r.height,
  };
}

function cellAt(pos) {
  const col = Math.floor(pos.x / CONFIG.cell);
  const row = Math.floor(pos.y / CONFIG.cell);
  if (col < 0 || col >= CONFIG.cols || row < 0 || row >= CONFIG.rows) return null;
  return { row, col };
}

function tryPlaceTower(row, col) {
  const def = TOWER_TYPES[selected];
  if (game.grid[row][col]) return;
  if (game.glut < def.cost) { showBanner('Nicht genug Glut!'); return; }
  if ((game.cardCd[selected] || 0) > 0) return;

  game.glut -= def.cost;
  game.cardCd[selected] = def.recharge;
  const tower = {
    type: selected, row, col, hp: def.hp, maxHp: def.hp,
    timer: def.kind === 'producer' ? 3 : 0.5, dead: false,
  };
  game.grid[row][col] = tower;
  game.towers.push(tower);
}

function removeTower(row, col) {
  const t = game.grid[row][col];
  if (!t) return;
  t.dead = true;
  game.grid[row][col] = null;
  game.towers = game.towers.filter(x => !x.dead);
}

canvas.addEventListener('pointerdown', (ev) => {
  if (game.state !== 'running') return;
  const pos = canvasPos(ev);

  // 1) Funken einsammeln hat Vorrang
  for (let i = game.sparks.length - 1; i >= 0; i--) {
    const s = game.sparks[i];
    if (Math.hypot(pos.x - s.x, pos.y - s.y) < 28) {
      game.glut += s.value;
      addFloater(s.x, s.y, '+' + s.value);
      game.sparks.splice(i, 1);
      return;
    }
  }

  // 2) Wächter platzieren / entfernen
  const cell = cellAt(pos);
  if (!cell || !selected) return;
  if (selected === 'shovel') removeTower(cell.row, cell.col);
  else tryPlaceTower(cell.row, cell.col);
});

canvas.addEventListener('pointermove', (ev) => { hoverCell = cellAt(canvasPos(ev)); });
canvas.addEventListener('pointerleave', () => { hoverCell = null; });

window.addEventListener('keydown', (ev) => {
  const keys = Object.keys(TOWER_TYPES);
  if (ev.key >= '1' && ev.key <= String(keys.length)) selectCard(keys[Number(ev.key) - 1]);
  else if (ev.key === 's' || ev.key === 'S') selectCard('shovel');
  else if (ev.key === 'Escape') selectCard(null);
  else if (ev.key === 'p' || ev.key === 'P') togglePause();
});

/* ---------- 6. ZEICHNEN ---------- */

function drawBackground() {
  const cs = CONFIG.cell;
  for (let r = 0; r < CONFIG.rows; r++) {
    for (let c = 0; c < CONFIG.cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#2d4a3e' : '#274238';
      ctx.fillRect(c * cs, r * cs, cs, cs);
    }
  }
  // Hover-Markierung
  if (hoverCell && selected && game.state === 'running') {
    const occupied = !!game.grid[hoverCell.row][hoverCell.col];
    let color = 'rgba(255,255,255,0.18)';
    if (selected === 'shovel') color = occupied ? 'rgba(239,71,111,0.4)' : 'rgba(0,0,0,0)';
    else if (occupied) color = 'rgba(239,71,111,0.3)';
    ctx.fillStyle = color;
    ctx.fillRect(hoverCell.col * cs, hoverCell.row * cs, cs, cs);
  }
  // Leuchtturm-Zone am linken Rand
  const flash = game.baseFlash > 0;
  const grad = ctx.createLinearGradient(0, 0, 26, 0);
  grad.addColorStop(0, flash ? 'rgba(239,71,111,0.95)' : 'rgba(255,209,102,0.9)');
  grad.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 26, HEIGHT);
}

function drawHpBar(x, y, w, hp, maxHp) {
  if (hp >= maxHp) return;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - w / 2, y, w, 6);
  ctx.fillStyle = hp / maxHp > 0.4 ? '#80ed99' : '#ef476f';
  ctx.fillRect(x - w / 2, y, w * Math.max(0, hp / maxHp), 6);
}

function drawTower(t) {
  const def = TOWER_TYPES[t.type];
  const c = cellCenter(t.row, t.col);
  const bob = Math.sin(game.time * 3 + t.col) * 2;
  const x = c.x, y = c.y + bob;

  if (def.kind === 'producer') {
    ctx.fillStyle = 'rgba(255,209,102,0.25)';
    ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(x - 12, y - 16, 12, 6, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 12, y - 16, 12, 6, 0.6, 0, Math.PI * 2); ctx.fill();
  } else if (def.kind === 'shooter') {
    ctx.fillStyle = '#3d405b';
    ctx.fillRect(x - 6, y + 10, 12, 26);
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3d405b';
    ctx.fillRect(x + 12, y - 9, 26, 12); // Lauf zeigt nach rechts
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 4, y - 5, 5, 0, Math.PI * 2); ctx.fill();
  } else { // wall
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.roundRect(x - 28, y - 36, 56, 72, 12); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x - 14, y - 20, 28, 4);
    ctx.fillRect(x - 14, y - 4, 28, 4);
    ctx.fillRect(x - 14, y + 12, 28, 4);
  }
  drawHpBar(c.x, c.y + 40, 50, t.hp, t.maxHp);
}

function drawEnemy(e) {
  const def = ENEMY_TYPES[e.type];
  const c = e.row * CONFIG.cell + CONFIG.cell / 2;
  const y = c + Math.sin(game.time * 4 + e.wob) * 3;
  const r = e.radius;

  ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : def.color;
  ctx.beginPath(); ctx.ellipse(e.x, y, r, r * 1.15, 0, 0, Math.PI * 2); ctx.fill();
  if (e.slowTimer > 0) {
    ctx.strokeStyle = '#7fd1f5'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(e.x, y, r + 3, r * 1.15 + 3, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // Augen (Gegner schauen nach links)
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(e.x - r * 0.45, y - r * 0.3, r * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(e.x - r * 0.05, y - r * 0.3, r * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d00000';
  ctx.beginPath(); ctx.arc(e.x - r * 0.52, y - r * 0.3, r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(e.x - r * 0.12, y - r * 0.3, r * 0.1, 0, Math.PI * 2); ctx.fill();

  drawHpBar(e.x, y - r * 1.15 - 10, 44, e.hp, e.maxHp);
}

function drawSpark(s) {
  const pulse = 1 + Math.sin(game.time * 6 + s.phase) * 0.12;
  const blink = s.y >= s.targetY && s.life < 2 && Math.floor(game.time * 8) % 2 === 0;
  if (blink) return;
  const grad = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 26 * pulse);
  grad.addColorStop(0, 'rgba(255,240,170,1)');
  grad.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(s.x, s.y, 26 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, Math.PI * 2); ctx.fill();
}

function render() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  for (const t of game.towers) drawTower(t);
  for (const e of game.enemies) drawEnemy(e);
  for (const p of game.projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
  }
  for (const s of game.sparks) drawSpark(s);

  ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  for (const f of game.floaters) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = '#ffd166';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  if (game.banner) {
    ctx.globalAlpha = Math.min(1, game.banner.t);
    ctx.font = 'bold 40px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(game.banner.text, WIDTH / 2 + 2, 62);
    ctx.fillStyle = '#ffd166';
    ctx.fillText(game.banner.text, WIDTH / 2, 60);
    ctx.globalAlpha = 1;
  }
}

/* ---------- 7. UI, OVERLAY, SPIELSCHLEIFE ---------- */

function buildCards() {
  ui.cards.innerHTML = '';
  let i = 1;
  for (const key in TOWER_TYPES) {
    const def = TOWER_TYPES[key];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card';
    btn.dataset.key = key;
    btn.innerHTML =
      '<span class="swatch" style="background:' + def.color + '"></span>' +
      '<span><span class="name">' + i + ' · ' + def.name + '</span><br>' +
      '<span class="info">🔥 ' + def.cost + ' · ' + def.info + '</span></span>' +
      '<span class="cd"></span>';
    btn.addEventListener('click', () => selectCard(key));
    ui.cards.appendChild(btn);
    i++;
  }
  const shovel = document.createElement('button');
  shovel.type = 'button';
  shovel.className = 'card';
  shovel.dataset.key = 'shovel';
  shovel.innerHTML =
    '<span class="swatch shovel"></span>' +
    '<span><span class="name">S · Schaufel</span><br><span class="info">Wächter entfernen</span></span>';
  shovel.addEventListener('click', () => selectCard('shovel'));
  ui.cards.appendChild(shovel);
}

function selectCard(key) {
  selected = (selected === key) ? null : key;
  refreshCards();
}

function refreshCards() {
  for (const card of ui.cards.children) {
    card.classList.toggle('selected', card.dataset.key === selected);
  }
}

function updateHud() {
  ui.glut.textContent = Math.floor(game.glut);
  ui.wave.textContent = game.wave;
  ui.waveTotal.textContent = CONFIG.totalWaves;
  ui.base.textContent = '♥'.repeat(Math.max(0, game.baseHealth)) + '♡'.repeat(CONFIG.baseHealth - Math.max(0, game.baseHealth));
  ui.pauseBtn.textContent = game.state === 'paused' ? 'Weiter (P)' : 'Pause (P)';

  for (const card of ui.cards.children) {
    const key = card.dataset.key;
    const def = TOWER_TYPES[key];
    if (!def) continue;
    const cd = game.cardCd[key] || 0;
    card.classList.toggle('disabled', game.glut < def.cost || cd > 0);
    card.querySelector('.cd').style.height = (cd > 0 ? (cd / def.recharge) * 100 : 0) + '%';
  }
}

function showOverlay(title, text, btnText) {
  ui.overlayTitle.textContent = title;
  ui.overlayText.textContent = text;
  ui.overlayBtn.textContent = btnText;
  ui.overlay.classList.remove('hidden');
}

function hideOverlay() { ui.overlay.classList.add('hidden'); }

function endGame(result) {
  game.state = result;
  if (result === 'won') {
    showOverlay('Sieg!', 'Alle Wellen sind abgewehrt – der Leuchtturm strahlt weiter.', 'Nochmal spielen');
  } else {
    showOverlay('Game Over', 'Die Nebelgestalten haben den Leuchtturm erreicht. Dein Licht ist erloschen.', 'Erneut versuchen');
  }
}

function togglePause() {
  if (game.state === 'running') {
    game.state = 'paused';
    showOverlay('Pause', 'Das Spiel ist angehalten.', 'Weiter');
  } else if (game.state === 'paused') {
    game.state = 'running';
    hideOverlay();
  }
}

ui.pauseBtn.addEventListener('click', togglePause);

ui.overlayBtn.addEventListener('click', () => {
  if (game.state === 'paused') { togglePause(); return; }
  newGame('running'); // Start oder Neustart
  hideOverlay();
});

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05); // große Sprünge abfangen
  lastTime = now;
  if (game.state === 'running') update(dt);
  render();
  updateHud();
  requestAnimationFrame(frame);
}

// Start
buildCards();
newGame('menu');
showOverlay(
  'Lichtwacht',
  'Nebelgestalten ziehen von rechts heran und wollen den Leuchtturm löschen. ' +
  'Sammle Funken, stelle Wächter auf und halte acht Wellen durch.',
  'Spiel starten'
);
requestAnimationFrame(frame);
