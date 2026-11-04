const games = {
  reaction: {
    title: "Reaction Test",
    category: "REAKTION",
    description: "Warte, bis das Feld grün wird – und klicke dann so schnell du kannst.",
    icon: "⚡",
    color: "#9b82ff"
  },
  click: {
    title: "Click Challenge",
    category: "AUSDAUER",
    description: "Wie oft schaffst du es, innerhalb von 10 Sekunden zu klicken?",
    icon: "◉",
    color: "#55ddc7"
  },
  memory: {
    title: "Number Memory",
    category: "GEDÄCHTNIS",
    description: "Merk dir die Zahlenfolge und gib sie richtig ein. Jede Runde wird länger.",
    icon: "▦",
    color: "#ffbd69"
  },
  aim: {
    title: "Aim Trainer",
    category: "GENAUIGKEIT",
    description: "Triff den Kreis so oft wie möglich, bevor die 15 Sekunden vorbei sind.",
    icon: "◎",
    color: "#ff7297"
  }
};

const storageKey = "reflexArenaSave";
const defaultState = {
  username: "",
  scores: { reaction: 0, click: 0, memory: 0, aim: 0 },
  records: { reaction: null, click: null, memory: null, aim: null }
};

let state = loadState();
let currentGame = null;
let timers = [];
let runFinished = false;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved) {
      return {
        ...defaultState,
        ...saved,
        scores: { ...defaultState.scores, ...saved.scores },
        records: { ...defaultState.records, ...saved.records }
      };
    }
  } catch (error) {
    console.warn("Spielstand konnte nicht geladen werden.", error);
  }
  return structuredClone(defaultState);
}

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.warn("Spielstand konnte nicht gespeichert werden.", error);
  }
}

function totalPoints() {
  return Object.values(state.scores).reduce((sum, score) => sum + score, 0);
}

function levelInfo() {
  const total = totalPoints();
  const level = Math.floor(total / 500) + 1;
  return { level, current: total % 500, total };
}

function updateDashboard() {
  const info = levelInfo();
  const names = ["Neuling", "Aufsteiger", "Reflex-Profi", "Arena-Legende"];
  const name = names[Math.min(info.level - 1, names.length - 1)];

  document.getElementById("header-score").textContent = info.total;
  document.getElementById("level-number").textContent = String(info.level).padStart(2, "0");
  document.getElementById("level-name").textContent = name;
  document.getElementById("level-total").textContent = `${info.total} Punkte`;
  document.getElementById("level-progress-text").textContent = `${info.current} / 500 XP`;
  document.getElementById("level-progress").style.width = `${(info.current / 500) * 100}%`;
  document.getElementById("profile-level").textContent = info.level;
  document.getElementById("profile-total").textContent = info.total;
  document.getElementById("username").value = state.username;

  renderCards("home-game-cards");
  renderCards("all-game-cards");
  renderRecords();
}

function renderCards(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  Object.entries(games).forEach(([id, game]) => {
    const best = state.records[id];
    const button = document.createElement("button");
    button.className = "game-card";
    button.type = "button";
    button.innerHTML = `
      <span class="game-icon" style="color:${game.color};background:${game.color}20">${game.icon}</span>
      <h3>${game.title}</h3>
      <p>${game.description}</p>
      <div class="card-record">${best ? `Rekord: ${best.label}` : "Noch kein Rekord"}</div>
    `;
    button.addEventListener("click", () => openGame(id));
    container.appendChild(button);
  });
}

function renderRecords() {
  const container = document.getElementById("profile-records");
  container.innerHTML = "";

  Object.entries(games).forEach(([id, game]) => {
    const record = state.records[id];
    const row = document.createElement("div");
    row.className = "record-row";
    row.innerHTML = `
      <div>
        <div class="record-name">${game.icon} &nbsp; ${game.title}</div>
        <div class="record-subtitle">Gesamtpunkte: ${state.scores[id]}</div>
      </div>
      <div class="record-value">${record ? record.label : "Noch keiner"}</div>
    `;
    container.appendChild(row);
  });
}

function showPage(pageName) {
  document.querySelectorAll(".page").forEach(page => page.classList.add("hidden"));
  document.getElementById(`${pageName}-page`).classList.remove("hidden");
  document.querySelectorAll(".nav-button").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });
  if (pageName === "games") {
    document.getElementById("game-selection").classList.remove("hidden");
    document.getElementById("game-view").classList.add("hidden");
  }
}

function addNavigationEvents() {
  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      showPage(button.dataset.page);
    });
  });
}

function clearTimers() {
  timers.forEach(timer => {
    clearTimeout(timer);
    clearInterval(timer);
  });
  timers = [];
}

function openGame(gameId) {
  clearTimers();
  currentGame = gameId;
  runFinished = false;
  showPage("games");
  document.getElementById("game-selection").classList.add("hidden");
  document.getElementById("game-view").classList.remove("hidden");

  const game = games[gameId];
  document.getElementById("game-title").textContent = game.title;
  document.getElementById("game-category").textContent = game.category;
  document.getElementById("game-instructions").textContent = game.description;
  updateGameBest();
  showStartScreen();
}

function updateGameBest() {
  const record = state.records[currentGame];
  document.getElementById("game-best").textContent = record ? record.label : "Noch keiner";
}

function showStartScreen() {
  document.getElementById("game-area").innerHTML = `
    <div>
      <p class="game-message">Bereit? Deine Ergebnisse werden nach dem Spiel gespeichert.</p>
      <button id="start-game" class="button button-primary">Spiel starten</button>
    </div>
  `;
  document.getElementById("start-game").addEventListener("click", startGame);
}

function startGame() {
  clearTimers();
  runFinished = false;

  if (currentGame === "reaction") startReaction();
  if (currentGame === "click") startClickChallenge();
  if (currentGame === "memory") startMemory();
  if (currentGame === "aim") startAim();
}

function finishGame(points, performance, label) {
  if (runFinished) return;
  runFinished = true;
  clearTimers();

  state.scores[currentGame] += points;
  const oldRecord = state.records[currentGame];
  if (!oldRecord || performance > oldRecord.value) {
    state.records[currentGame] = { value: performance, label };
  }

  saveState();
  updateDashboard();
  updateGameBest();

  document.getElementById("game-area").innerHTML = `
    <div>
      <p class="eyebrow">RUNDE BEENDET</p>
      <h2>${label}</h2>
      <p class="game-message">Du hast ${points} Punkte verdient. Gesamt in diesem Spiel: ${state.scores[currentGame]} Punkte.</p>
      <button id="play-again" class="button button-primary">Nochmal spielen</button>
    </div>
  `;
  document.getElementById("play-again").addEventListener("click", startGame);
}

/* Spiel 1: Reaction Test */
function startReaction() {
  const area = document.getElementById("game-area");
  area.innerHTML = `<div id="reaction-box" class="reaction-box waiting"><p>Klicke noch nicht!</p></div>`;
  const box = document.getElementById("reaction-box");
  let ready = false;
  let startTime = 0;

  box.addEventListener("click", () => {
    if (!ready) {
      finishGame(0, -1, "Zu früh geklickt – 0 Punkte");
      return;
    }
    const milliseconds = Date.now() - startTime;
    const points = Math.max(0, Math.round(1000 - milliseconds));
    finishGame(points, -milliseconds, `${milliseconds} ms · ${points} Punkte`);
  });

  const delay = 1500 + Math.random() * 3500;
  timers.push(setTimeout(() => {
    if (runFinished) return;
    ready = true;
    startTime = Date.now();
    box.classList.remove("waiting");
    box.classList.add("ready");
    box.innerHTML = "<p>JETZT KLICKEN!</p>";
  }, delay));
}

/* Spiel 2: Click Challenge */
function startClickChallenge() {
  let clicks = 0;
  let seconds = 10;
  const area = document.getElementById("game-area");

  area.innerHTML = `
    <div>
      <div id="click-timer" class="timer">10 Sekunden</div>
      <h2 id="click-count">0 Klicks</h2>
      <button id="click-button" class="button button-primary">KLICK!</button>
    </div>
  `;

  document.getElementById("click-button").addEventListener("click", () => {
    if (runFinished) return;
    clicks++;
    document.getElementById("click-count").textContent = `${clicks} Klicks`;
  });

  timers.push(setInterval(() => {
    seconds--;
    document.getElementById("click-timer").textContent = `${seconds} Sekunden`;
    if (seconds <= 0) {
      finishGame(clicks, clicks, `${clicks} Klicks · ${clicks} Punkte`);
    }
  }, 1000));
}

/* Spiel 3: Number Memory */
function startMemory() {
  let sequence = "";
  let earnedPoints = 0;
  let round = 0;
  nextMemoryRound();

  function nextMemoryRound() {
    if (runFinished) return;
    round++;
    sequence += Math.floor(Math.random() * 10);
    const area = document.getElementById("game-area");
    area.innerHTML = `
      <div>
        <p class="game-message">Runde ${round} · Merke dir die Folge</p>
        <div id="memory-number" class="game-number">${sequence}</div>
      </div>
    `;

    timers.push(setTimeout(() => {
      if (runFinished) return;
      area.innerHTML = `
        <div>
          <p class="game-message">Gib die Zahlenfolge ein</p>
          <form id="memory-form">
            <input id="memory-input" class="game-input" inputmode="numeric" autocomplete="off" aria-label="Zahlenfolge">
            <br><button class="button button-primary" type="submit">Prüfen</button>
          </form>
        </div>
      `;
      const input = document.getElementById("memory-input");
      input.focus();
      document.getElementById("memory-form").addEventListener("submit", event => {
        event.preventDefault();
        if (input.value.trim() === sequence) {
          earnedPoints += round * 10;
          nextMemoryRound();
        } else {
          finishGame(earnedPoints, round - 1, `${round - 1} Runden geschafft · ${earnedPoints} Punkte`);
        }
      });
    }, Math.min(2800, 900 + round * 130)));
  }
}

/* Spiel 4: Aim Trainer */
function startAim() {
  let hits = 0;
  let seconds = 15;
  const area = document.getElementById("game-area");
  area.innerHTML = `
    <div style="width:100%">
      <div id="aim-timer" class="timer">15 Sekunden</div>
      <p id="aim-score" class="game-message">Treffer: 0</p>
      <div id="aim-area" class="aim-area"><button id="aim-target" class="aim-target" aria-label="Ziel treffen"></button></div>
    </div>
  `;

  const playArea = document.getElementById("aim-area");
  const target = document.getElementById("aim-target");

  function moveTarget() {
    const maxX = Math.max(0, playArea.clientWidth - target.offsetWidth);
    const maxY = Math.max(0, playArea.clientHeight - target.offsetHeight);
    target.style.left = `${Math.random() * maxX}px`;
    target.style.top = `${Math.random() * maxY}px`;
  }

  target.addEventListener("click", () => {
    if (runFinished) return;
    hits++;
    document.getElementById("aim-score").textContent = `Treffer: ${hits}`;
    moveTarget();
  });
  moveTarget();

  timers.push(setInterval(() => {
    seconds--;
    document.getElementById("aim-timer").textContent = `${seconds} Sekunden`;
    if (seconds <= 0) {
      const points = hits * 5;
      finishGame(points, hits, `${hits} Treffer · ${points} Punkte`);
    }
  }, 1000));
}

document.getElementById("back-to-games").addEventListener("click", () => {
  clearTimers();
  currentGame = null;
  showPage("games");
});

document.getElementById("username").addEventListener("input", event => {
  state.username = event.target.value.trim();
  saveState();
});

addNavigationEvents();
updateDashboard();
showPage("home");
