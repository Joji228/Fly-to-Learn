/* Dodo Airways skill tests. No framework, no DOM.
   Run: node tests/skill.test.js   (exit 0 = all pass)
   Locks in the v1.0 flight-model goals:
     - piloting pays: holding the best-glide band beats pressing nothing,
       by more as gear (and flights) get bigger
     - "nose high and wait" (mushing) is no longer the best glide
     - pressing nothing still flies a clean glide (launch settle)
     - taps trim finely, holds still sweep fast
     - mush drag can never brake a glider into a hover
     - ground effect rewards skimming low */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "js");
function load(f) { eval.call(null, fs.readFileSync(path.join(DIR, f), "utf8")); }
global.window = {};
["config.js", "gliders.js", "physics.js", "world.js"].forEach(load);
const DA = global.window.DA, P = DA.Physics, W = DA.World;
const D = Math.PI / 180, dt = 1 / 60;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}
function params(g, up) {
  up = Object.assign({ ramp: 0, sled: 0, aero: 0 }, up || {});
  const G = DA.GLIDERS[g], a = up.aero;
  return { up, bare: g === 0, sinkBias: G.sink, control: G.control, drag: G.drag * (1 - 0.055 * a), turnK: G.turnK,
    comfort: G.comfort + a * 1.5, top: G.top + a * 2, stall: G.stall, thrust: 0, fuelMax: 0 };
}
function fly(p, policy) {
  W.setRampLevel(p.up.ramp);
  const ang = DA.launchAngleDeg(p.up.ramp) * D, spd = DA.launchSpeed(p.up.ramp, p.up.sled);
  const S = { x: 140, y: W.rampY(140) + 3, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, pitch: ang,
    pitchVel: 0, fuel: 0, fuelMax: 0, airTime: 0, speed: spd };
  for (let i = 0; i < 60 * 600; i++) {
    S.agl = S.y - Math.max(0, W.groundY(S.x));
    const inp = policy(S);
    P.launchSettle(S, inp, dt);
    P.stepFlight(S, inp, p, dt);
    if (S.y <= W.groundY(S.x)) break;
  }
  return S.x - 140;
}
const hold = (S, a) => ({ up: S.pitch < a - 0.015, down: S.pitch > a + 0.015, boost: false });
const hands = () => ({ up: false, down: false, boost: false });
const bandPilot = (S) => hold(S, (S.speed > P.BEST_GLIDE[0] + 1 ? 14 : 0) * D);
const noseHigh = (S) => hold(S, 20 * D);

// starter flights are ~15 s and launch-dominated, so the simple band pilot
// only has to never lose there; the gap grows with longer flights
const tiers = [["starter", {}, 1.02], ["mid", { ramp: 4, aero: 4, sled: 4 }, 1.15], ["max", { ramp: 8, aero: 8, sled: 8 }, 1.3]];
for (const [name, up, need] of tiers) {
  let worstGain = 9, worstHands = 9, mushBeats = 0;
  for (let g = 1; g < 6; g++) {
    const p = params(g, up);
    const h = fly(p, hands), b = fly(p, bandPilot), m = fly(p, noseHigh);
    worstGain = Math.min(worstGain, b / h);
    worstHands = Math.min(worstHands, h / b);
    if (m > h) mushBeats++;
  }
  ok(worstGain >= need, `1-${name}: best-glide pilot beats hands-off by >= ${Math.round((need - 1) * 100)}%`,
    `worst glider +${Math.round((worstGain - 1) * 100)}%`);
  ok(worstHands >= 0.45, `2-${name}: pressing nothing still glides (>= 45% of the pilot)`, `worst ${Math.round(worstHands * 100)}%`);
  ok(mushBeats === 0, `3-${name}: holding the nose high never beats hands-off`, mushBeats + " gliders");
}

// 4. taps trim finely, holds sweep fast (real time = sim x1.2 at 60 fps)
{
  const p = params(3, {});
  const run = (steps) => {
    const S = { x: 600, y: 200, vx: 30, vy: 0, pitch: 0, pitchVel: 0, fuel: 0, fuelMax: 0, airTime: 0, speed: 30 };
    for (let i = 0; i < steps; i++) P.stepFlight(S, { up: true }, p, dt);
    for (let i = 0; i < 20; i++) P.stepFlight(S, {}, p, dt);
    return S.pitch / D;
  };
  const tap = run(4), holdN = run(22);
  ok(tap < 5 && holdN > 25, "4: a 50 ms tap trims < 5 deg, a 300 ms hold sweeps > 25 deg",
    `tap ${tap.toFixed(1)} / hold ${holdN.toFixed(1)} deg`);
}

// 5. mush drag never hovers: nose-up at 5 m/s must fall freely
{
  const p = params(5, {});
  const S = { x: 600, y: 300, vx: 5, vy: 0, pitch: 40 * D, pitchVel: 0, fuel: 0, fuelMax: 0, airTime: 0, speed: 5 };
  for (let i = 0; i < 180; i++) P.stepFlight(S, { up: true }, p, dt);
  ok(S.vy < -15 && S.y < 270, "5: a slow nose-up glider falls, it never hovers", `vy=${S.vy.toFixed(1)} dy=${(S.y - 300).toFixed(0)}`);
}

// 6. ground effect: skimming low keeps more speed than the same glide high up
{
  const p = params(3, {});
  const glide = (agl) => {
    const S = { x: 600, y: 100, vx: 30, vy: -2, pitch: 0.02, pitchVel: 0, fuel: 0, fuelMax: 0, airTime: 0, speed: 30 };
    for (let i = 0; i < 120; i++) { S.agl = agl; P.stepFlight(S, {}, p, dt); }
    return S.speed;
  };
  const low = glide(1), high = glide(40);
  ok(low > high + 0.3, "6: ground effect trims drag near the surface", `low ${low.toFixed(2)} vs high ${high.toFixed(2)} m/s`);
}

console.log(`\nSKILL TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
