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
  },
  stroop: {
    title: "Stroop-Test",
    category: "KONZENTRATION",
    description: "Wähle die tatsächliche Schriftfarbe – nicht das gelesene Wort.",
    icon: "🎨",
    color: "#f472b6"
  },
  numbers: {
    title: "Zahlenreihen",
    category: "LOGIK",
    description: "Erkenne das Muster und ergänze die nächste Zahl.",
    icon: "∑",
    color: "#60a5fa"
  },
  colors: {
    title: "Farbgedächtnis",
    category: "GEDÄCHTNIS",
    description: "Merke dir die Farbsequenz und wiederhole sie in der richtigen Reihenfolge.",
    icon: "▦",
    color: "#fbbf24"
  },
  visual: {
    title: "Fehler finden",
    category: "WAHRNEHMUNG",
    description: "Finde das eine andere Symbol im Feld – so schnell du kannst.",
    icon: "⌕",
    color: "#34d399"
  },
  impulse: {
    title: "Impulskontrolle",
    category: "SELBSTKONTROLLE",
    description: "Klicke nur bei Grün. Bei Rot musst du deinen Impuls kontrollieren.",
    icon: "✋",
    color: "#fb923c"
  }
};

const storageKey = "reflexArenaSave";
const defaultState = {
  username: "",
  scores: { reaction: 0, click: 0, memory: 0, aim: 0, stroop: 0, numbers: 0, colors: 0, visual: 0, impulse: 0 },
  records: { reaction: null, click: null, memory: null, aim: null, stroop: null, numbers: null, colors: null, visual: null, impulse: null }
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
  if (currentGame === "stroop") startStroop();
  if (currentGame === "numbers") startNumbers();
  if (currentGame === "colors") startColors();
  if (currentGame === "visual") startVisualSearch();
  if (currentGame === "impulse") startImpulse();
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


/* Spiel 5: Stroop-Test */
function startStroop() {
  const colors = [
    { name: "ROT", value: "#ff5d73" },
    { name: "BLAU", value: "#60a5fa" },
    { name: "GRÜN", value: "#34d399" },
    { name: "GELB", value: "#fbbf24" }
  ];
  let round = 0;
  let correct = 0;
  let locked = false;
  const totalRounds = 15;

  function nextRound() {
    if (runFinished) return;
    if (round >= totalRounds) {
      finishGame(correct * 10, correct, `${correct} von ${totalRounds} richtig · ${correct * 10} Punkte`);
      return;
    }
    round++;
    const word = colors[Math.floor(Math.random() * colors.length)];
    let ink = colors[Math.floor(Math.random() * colors.length)];
    while (ink.name === word.name) ink = colors[Math.floor(Math.random() * colors.length)];
    const options = [...colors].sort(() => Math.random() - 0.5);
    const area = document.getElementById("game-area");
    area.innerHTML = `
      <div class="challenge-content">
        <p class="game-message">Runde ${round} / ${totalRounds} · Welche Farbe hat die Schrift?</p>
        <div class="stroop-word" style="color:${ink.value}">${word.name}</div>
        <div class="choice-grid">${options.map(c => `<button class="button button-secondary choice-button" data-color="${c.name}">${c.name}</button>`).join("")}</div>
        <p class="game-message">Richtig: ${correct}</p>
      </div>`;
    area.querySelectorAll("[data-color]").forEach(button => {
      button.addEventListener("click", () => {
        if (locked || runFinished) return;
        locked = true;
        if (button.dataset.color === ink.name) correct++;
        setTimeout(() => { locked = false; nextRound(); }, 250);
      });
    });
  }
  nextRound();
}

/* Spiel 6: Zahlenreihen – ohne Kopfrechnen-Challenge */
function startNumbers() {
  const patterns = [
    { start: 2, step: 2 },
    { start: 3, step: 3 },
    { start: 5, step: 5 },
    { start: 1, step: 3 },
    { start: 10, step: -1 },
    { start: 2, step: 4 }
  ];
  let round = 0;
  let points = 0;
  function nextRound() {
    if (runFinished) return;
    if (round >= 8) {
      finishGame(points, points, `${points / 10} von 8 Reihen richtig · ${points} Punkte`);
      return;
    }
    round++;
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    const sequence = Array.from({ length: 5 }, (_, i) => pattern.start + pattern.step * i);
    const answer = sequence[4] + pattern.step;
    const area = document.getElementById("game-area");
    area.innerHTML = `
      <div class="challenge-content">
        <p class="game-message">Reihe ${round} / 8 · Welche Zahl fehlt?</p>
        <div class="number-sequence">${sequence.slice(0, 4).join("　")}　<strong>?</strong></div>
        <form id="number-form">
          <input id="number-answer" class="game-input" type="number" inputmode="numeric" placeholder="Nächste Zahl" required>
          <button class="button button-primary" type="submit">Antwort prüfen</button>
        </form>
        <p class="game-message">Punkte: ${points}</p>
      </div>`;
    const input = document.getElementById("number-answer");
    input.focus();
    document.getElementById("number-form").addEventListener("submit", event => {
      event.preventDefault();
      if (Number(input.value) === answer) points += 10;
      nextRound();
    });
  }
  nextRound();
}

/* Spiel 7: Farbgedächtnis */
function startColors() {
  const palette = ["red", "blue", "green", "yellow"];
  const sequence = [];
  let round = 0;
  let accepting = false;
  let userIndex = 0;
  const area = document.getElementById("game-area");

  function renderBoard(message) {
    area.innerHTML = `
      <div class="challenge-content">
        <p class="game-message">${message}</p>
        <div class="color-board">
          ${palette.map(color => `<button class="color-pad pad-${color}" data-pad="${color}" aria-label="${color}"></button>`).join("")}
        </div>
        <p class="game-message">Länge der Sequenz: ${sequence.length}</p>
      </div>`;
    area.querySelectorAll("[data-pad]").forEach(button => {
      button.addEventListener("click", () => {
        if (!accepting || runFinished) return;
        const chosen = button.dataset.pad;
        if (chosen !== sequence[userIndex]) {
          finishGame(round * 10, round, `${round} Runden geschafft · ${round * 10} Punkte`);
          return;
        }
        userIndex++;
        if (userIndex === sequence.length) {
          accepting = false;
          round++;
          timers.push(setTimeout(showNext, 650));
        }
      });
    });
  }
  function showNext() {
    if (runFinished) return;
    sequence.push(palette[Math.floor(Math.random() * palette.length)]);
    userIndex = 0;
    accepting = false;
    renderBoard(`Runde ${round + 1}: Schau dir die Farben an …`);
    const pads = [...area.querySelectorAll("[data-pad]")];
    sequence.forEach((color, index) => {
      timers.push(setTimeout(() => {
        pads.forEach(p => p.classList.remove("lit"));
        const pad = area.querySelector(`[data-pad="${color}"]`);
        if (pad) pad.classList.add("lit");
        timers.push(setTimeout(() => pad && pad.classList.remove("lit"), 330));
      }, 650 + index * 650));
    });
    timers.push(setTimeout(() => {
      if (runFinished) return;
      accepting = true;
      renderBoard(`Jetzt nachspielen – Runde ${round + 1}`);
    }, 650 + sequence.length * 650));
  }
  showNext();
}

/* Spiel 8: Fehler finden */
function startVisualSearch() {
  let hits = 0;
  let seconds = 30;
  const area = document.getElementById("game-area");
  const symbols = ["●", "○"];
  function newGrid() {
    if (runFinished) return;
    const odd = Math.random() < 0.5 ? "●" : "○";
    const common = odd === "●" ? "○" : "●";
    const oddIndex = Math.floor(Math.random() * 36);
    area.innerHTML = `
      <div class="challenge-content">
        <div id="visual-timer" class="timer">${seconds} Sekunden</div>
        <p id="visual-score" class="game-message">Gefunden: ${hits}</p>
        <div class="visual-grid">
          ${Array.from({length: 36}, (_, i) => `<button class="visual-cell" data-index="${i}" aria-label="Symbol ${i + 1}">${i === oddIndex ? odd : common}</button>`).join("")}
        </div>
      </div>`;
    area.querySelectorAll(".visual-cell").forEach(button => {
      button.addEventListener("click", () => {
        if (runFinished) return;
        if (Number(button.dataset.index) === oddIndex) {
          hits++;
          newGrid();
        } else {
          button.classList.add("wrong");
          timers.push(setTimeout(() => button.classList.remove("wrong"), 300));
        }
      });
    });
  }
  newGrid();
  timers.push(setInterval(() => {
    seconds--;
    const timer = document.getElementById("visual-timer");
    if (timer) timer.textContent = `${seconds} Sekunden`;
    if (seconds <= 0) finishGame(hits * 5, hits, `${hits} Symbole gefunden · ${hits * 5} Punkte`);
  }, 1000));
}

/* Spiel 9: Impulskontrolle */
function startImpulse() {
  let trial = 0;
  let score = 0;
  let falseStarts = 0;
  let active = false;
  let shouldClick = false;
  const total = 12;
  const area = document.getElementById("game-area");

  function nextTrial() {
    if (runFinished) return;
    if (trial >= total) {
      finishGame(Math.max(0, score * 10 - falseStarts * 5), score - falseStarts,
        `${score} richtige Reaktionen · ${falseStarts} Fehlklicks`);
      return;
    }
    trial++;
    shouldClick = Math.random() > 0.4;
    active = false;
    area.innerHTML = `
      <div class="challenge-content">
        <p class="game-message">Durchgang ${trial} / ${total}</p>
        <div id="impulse-signal" class="impulse-signal ${shouldClick ? "signal-wait" : "signal-stop"}">${shouldClick ? "WARTEN …" : "NICHT KLICKEN"}</div>
        <button id="impulse-button" class="button button-primary" ${shouldClick ? "" : "disabled"}>JETZT KLICKEN</button>
        <p class="game-message">Richtige Reaktionen: ${score} · Fehlklicks: ${falseStarts}</p>
      </div>`;
    const button = document.getElementById("impulse-button");
    button.addEventListener("click", () => {
      if (runFinished) return;
      if (!active || !shouldClick) {
        falseStarts++;
        nextTrial();
        return;
      }
      score++;
      nextTrial();
    });
    if (shouldClick) {
      const delay = 900 + Math.random() * 1700;
      timers.push(setTimeout(() => {
        if (runFinished) return;
        active = true;
        const signal = document.getElementById("impulse-signal");
        if (signal) {
          signal.textContent = "GRÜN – KLICKEN!";
          signal.classList.remove("signal-wait");
          signal.classList.add("signal-go");
        }
        button.disabled = false;
      }, delay));
      button.disabled = true;
      timers.push(setTimeout(() => {
        if (runFinished || !active) return;
        falseStarts++;
        nextTrial();
      }, delay + 1200));
    } else {
      button.disabled = false;
      button.textContent = "NICHT KLICKEN";
      timers.push(setTimeout(nextTrial, 1300));
    }
  }
  nextTrial();
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
