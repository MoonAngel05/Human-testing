# Spielhalle

Eine kleine Sammlung von Browser-Spielen (HTML, CSS, JavaScript, keine Frameworks).
Die Startseite `index.html` lässt dich zwischen den Spielen wählen.

| Spiel | Beschreibung |
| --- | --- |
| Reflex Arena | Vier Minispiele: Reaction Test, Click Challenge, Number Memory, Aim Trainer |
| Lichtwacht | Tower Defense mit fünf Bahnen, vier Wächtern, drei Gegnertypen und acht Wellen |

## Projektstruktur

```
spielhalle/
├── index.html        Startseite mit Spielauswahl
├── hub.css           Stil der Startseite
├── README.md
├── reflex-arena/
│   ├── index.html
│   ├── style.css
│   └── script.js
└── lichtwacht/
    ├── index.html
    ├── style.css
    ├── game.js
    └── assets/       Platz für spätere Grafiken und Sounds
        ├── enemies/
        ├── towers/
        ├── backgrounds/
        └── sounds/
```

Jedes Spiel liegt in einem eigenen Ordner, damit sich Dateinamen und Stile nicht in die Quere kommen.
Beide Spiele haben oben einen Link „← Spielauswahl“ zurück zur Startseite.

## Lichtwacht – Steuerung

| Aktion | Bedienung |
| --- | --- |
| Wächter wählen | Klick auf Karte oder Taste 1–4 |
| Wächter platzieren | Klick auf ein freies Feld |
| Glut einsammeln | Auf leuchtende Funken klicken |
| Wächter entfernen | Taste S (Schaufel), dann Klick |
| Auswahl aufheben | Esc |
| Pause | Taste P |

Erweitern: neue Wächter in `TOWER_TYPES`, neue Gegner in `ENEMY_TYPES` und `startWave()`, Balancing in `CONFIG` (alles in `lichtwacht/game.js`).

## Lokal spielen

`index.html` im Hauptordner im Browser öffnen.

## Auf GitHub veröffentlichen

1. Auf github.com ein neues Repository `spielhalle` anlegen (Public).
2. Im Projektordner:
   ```
   git init
   git add .
   git commit -m "Spielhalle mit Reflex Arena und Lichtwacht"
   git branch -M main
   git remote add origin https://github.com/DEIN-NAME/spielhalle.git
   git push -u origin main
   ```
3. Im Repository: Settings → Pages → Source: "Deploy from a branch" → Branch `main`, Ordner `/ (root)` → Save.
4. Nach etwa einer Minute ist die Spielhalle erreichbar unter `https://DEIN-NAME.github.io/spielhalle/`.
