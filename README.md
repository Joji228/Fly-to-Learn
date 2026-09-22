# Fly-to-Learn

*Version 0.6 — HUD/menu polish: cached HUD writes, honest master mute, fuel dim without booster, crash-grade pill, menu version tag.*

*V0.1 audit: deterministic sim, honest flight model, polished shop.*

Dodo Airways — a tiny launch-and-upgrade browser game. Launch a stubborn dodo down a snowy ramp, manage pitch and booster fuel to fly farther, earn cash, buy upgrades, repeat.

**Play:** open `index.html` in a browser (or `python -m http.server`, then `http://localhost:8000`).

**Controls:** `A`/`◀` nose up · `D`/`▶` nose down · `SPACE` booster once a rocket is owned (touch buttons on mobile).

**Modes:** Campaign (progression) and Sandbox (all gear + funds, separate save) via the Mode button. Sandbox progress never touches campaign.

**Skill play:** smooth landings scale with distance, consecutive smooths build a streak bonus, rocket flights without boosting earn a pure-glide bonus. Downrange islands (Palm Isle, Floe Berg, Gull Rock, City Isle) are the landing targets. Nitro Mix makes every rocket punch harder.

**Tests:** `node scripts/run-all.js` runs every regression test plus the exploit gate (no dependencies). Individual suites live in `tests/`, tuning sims in `scripts/`.

HTML + CSS + vanilla JS + Canvas. No dependencies, progress saves to localStorage.
