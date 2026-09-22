# Fly-to-Learn

### ▶ [Play Dodo Airways in your browser](https://joji228.github.io/Fly-to-Learn/)

*Version 0.7: pause-menu fix (Settings → Cheats → Back no longer drops your flight), W/S and ↑/↓ steering, live BEST readout on record flights, crash toasts no longer cover the results buttons, save tools hidden mid-flight.*

*V0.1 audit: deterministic sim, honest flight model, polished shop.*

Dodo Airways is a tiny launch-and-upgrade browser game. Launch a stubborn dodo down a snowy ramp, manage pitch and booster fuel to fly farther, earn cash, buy upgrades, repeat.

**Play:** [joji228.github.io/Fly-to-Learn](https://joji228.github.io/Fly-to-Learn/). To run it locally, open `index.html` in a browser (or run `python -m http.server` and go to `http://localhost:8000`).

**Controls:** `A`/`W`/`◀`/`▲` nose up · `D`/`S`/`▶`/`▼` nose down · `SPACE` booster once a rocket is owned · `P`/`ESC` pause. Touch buttons appear on mobile.

**Modes:** Campaign (progression) and Sandbox (all gear + funds, separate save) via the Mode button. Sandbox progress never touches campaign.

**Skill play:** smooth landings scale with distance, consecutive smooths build a streak bonus, rocket flights without boosting earn a pure-glide bonus. Downrange islands (Palm Isle, Floe Berg, Gull Rock, City Isle) are the landing targets. Nitro Mix makes every rocket punch harder.

**Tests:** `node scripts/run-all.js` runs every regression test plus the exploit gate (no dependencies). Individual suites live in `tests/`, tuning sims in `scripts/`.

HTML + CSS + vanilla JS + Canvas. No dependencies, progress saves to localStorage.
