/* Shared sim pilot for the tuning scripts (balance / economy / tests).
   Flies the way the game rewards a competent human:
     - boost at ~30 deg while the tank lasts (if a rocket is equipped)
     - then hold the best-glide band (~22 m/s) with gentle pitch changes
     - wingless: spend the flaps when falling fast
   Uses the real launch settle and ground-effect height, so sim flights
   match in-game flights. Pure Node, no DOM. */
"use strict";
const D = Math.PI / 180;

function input(S, P, hasRocket, bare) {
  const inp = { up: false, down: false, boost: false };
  if (hasRocket && S.fuel > 0.05) {
    const w = 30 * D;
    if (S.pitch < w - 0.02) inp.up = true; else if (S.pitch > w + 0.02) inp.down = true;
    inp.boost = true;
    return inp;
  }
  if (bare) { inp.up = S.vy < -12 && (S.flaps || 0) > 0 && !S.upHeld; return inp; }
  const target = (S.speed > P.BEST_GLIDE[0] + 1 ? 14 : 0) * D;
  if (S.pitch < target - 0.015) inp.up = true; else if (S.pitch > target + 0.015) inp.down = true;
  return inp;
}

/* Fly one flight. p = derived params, S = launch state, W = World (for
   terrain), PK = Pickups (optional: fish + gust rings). Returns stats in
   the same shape the game's rewards use. */
function fly(P, W, p, S, opts) {
  opts = opts || {};
  const dt = 1 / 60, hasRocket = p.thrust > 0, pk = opts.PK ? opts.PK.newRun() : null;
  let maxAlt = 0, maxSpd = 0, t = 0, boostUsed = false;
  for (let i = 0; i < 60 * 600; i++) {
    const gy = W ? W.groundY(S.x) : 0;
    S.agl = S.y - Math.max(0, gy);
    const inp = input(S, P, hasRocket, !!p.bare);
    P.launchSettle(S, inp, dt);
    const px = S.x;
    const r = P.stepFlight(S, inp, p, dt);
    if (r.boosting) boostUsed = true;
    if (pk) opts.PK.step(pk, S, px, dt);
    if (S.y > maxAlt) maxAlt = S.y;
    if (S.speed > maxSpd) maxSpd = S.speed;
    t += dt;
    if ((W ? S.y <= W.groundY(S.x) : S.y <= 0) && t > 0.5) break;
  }
  return { dist: Math.max(0, S.x - 140), maxAlt, maxSpeedKmh: maxSpd * 3.6, airTime: t,
    usedAllFuel: p.fuelMax > 0 && S.fuel <= 0, boostUsed, landing: null, water: false,
    fish: pk ? pk.fish : 0, rings: pk ? pk.rings : 0 };
}

module.exports = { input, fly };
