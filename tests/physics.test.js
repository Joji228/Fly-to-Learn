/* Dodo Airways deterministic physics tests. No framework, no DOM.
   Run: node tests/physics.test.js   (exit 0 = all pass)
   These lock in the arcade flight feel so future passes can verify
   behavior instead of re-tuning blindly. Thresholds encode the spec:
   fast dives, honest sink, preserved climbs, no hovering, no free energy. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "js");
function load(f) {
  const code = fs.readFileSync(path.join(DIR, f), "utf8");
  eval.call(null, code);
}
global.window = {};
load("config.js");
load("gliders.js");
load("physics.js");
const DA = global.window.DA, P = DA.Physics;
const D = Math.PI / 180;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}
function params(gid) {
  const G = DA.GLIDERS[gid];
  return { control: G.control, drag: G.drag, turnK: G.turnK, comfort: G.comfort,
    top: G.top, stall: G.stall, thrust: 0, fuelMax: 0, sinkBias: G.sink, bare: gid === 0 };
}
const PAPER = params(1), BARE = Object.assign(params(0), { bare: true });
function mk(y, vms, pitchDeg) {
  return { x: 0, y, vx: vms, vy: 0, pitch: (pitchDeg || 0) * D, pitchVel: 0,
    fuel: 0, fuelMax: 0, airTime: 0, speed: vms };
}
function toPitch(t) {
  return (s) => {
    const p = s.pitch / D;
    if (Math.abs(p - t) < 1.5) return { up: false, down: false, boost: false };
    return t > p ? { up: true, down: false, boost: false } : { up: false, down: true, boost: false };
  };
}
function step(S, p, inp, secs) {
  const dt = 1 / 60, n = Math.round(secs / dt);
  let stalledEver = false, minVy = 1e9, maxY = S.y;
  for (let i = 0; i < n; i++) {
    const r = P.stepFlight(S, typeof inp === "function" ? inp(S) : inp, p, dt);
    if (r.stalled) stalledEver = true;
    if (S.vy < minVy) minVy = S.vy;
    if (S.y > maxY) maxY = S.y;
    if (!isFinite(S.x + S.y + S.vx + S.vy)) return { broken: true };
  }
  return { stalledEver, minVy, maxY };
}
const N = { up: false, down: false, boost: false };

// 1. Bare Dodo falls quickly and cannot sustain glide
{
  const S = mk(150, 25, 0);
  const r = step(S, BARE, N, 1.5);
  ok(!r.broken && S.vy < -10, "1: bare falls fast, no glide", `vy=${S.vy.toFixed(1)}`);
}
// 2. Paper Dart level flight gradually sinks (never hovers, never climbs free)
{
  const S = mk(150, 25, 0);
  const r = step(S, PAPER, N, 2.0);
  ok(!r.broken && S.y < 150 - 2 && S.y > 150 - 25, "2: paper level flight sinks gradually", `dy=${(S.y - 150).toFixed(1)}`);
}
// 3. Black Swan level flight also sinks eventually
{
  const S = mk(150, 25, 0);
  const p = params(5);
  const r = step(S, p, N, 3.0);
  ok(!r.broken && S.y < 150 - 1, "3: carbon level flight still sinks", `dy=${(S.y - 150).toFixed(1)} spd=${S.speed.toFixed(1)}`);
}
// 4. 110km/h -25deg dive: big speed gain + altitude loss
{
  const S = mk(100, 30.6, 0);
  step(S, PAPER, toPitch(-25), 1.0);
  ok(S.speed - 30.6 > 6 && (100 - S.y) > 12, "4: dive converts to speed", `dspd=${(S.speed - 30.6).toFixed(1)} dy=${(S.y - 100).toFixed(1)}`);
}
// 5. 140km/h +25deg pull-up: altitude rises, speed drops (climb preserved)
{
  const S = mk(100, 38.9, 0);
  step(S, PAPER, toPitch(25), 1.0);
  ok((S.y - 100) > 8 && S.speed < 38.9 - 2, "5: pull-up climbs, costs speed", `dy=${(S.y - 100).toFixed(1)} dspd=${(S.speed - 38.9).toFixed(1)}`);
}
// 6. Low-speed nose-up: stall + downward recovery
{
  const S = mk(120, 11, 0);
  const r = step(S, PAPER, toPitch(40), 1.0);
  ok(r.stalledEver, "6a: slow steep climb stalls");
  step(S, PAPER, toPitch(-25), 1.5);
  ok(S.speed > 16, "6b: nose-down recovers speed", `spd=${S.speed.toFixed(1)}`);
}
// 7. Dive -> pull-up cycle: total energy DECAYS (no perpetual porpoising)
{
  function cycleEnergy() {
    const S = mk(200, 34, -6, -10 * D);
    const e = () => P.GRAVITY * S.y + 0.5 * S.speed * S.speed;
    const e0 = e(), dt = 1 / 60;
    let phase = 0;
    for (let i = 0; i < 8 / dt; i++) {
      const va = Math.atan2(S.vy, S.vx) / D, p = S.pitch / D;
      let inp = N;
      if (phase === 0) { // pull to +12 lead
        if (p < va + 10 && p < 28) inp = { up: true, down: false, boost: false };
        else if (p > va + 14) inp = { up: false, down: true, boost: false };
        if (S.vy < 2 && p > 5) phase = 1;
      } else if (phase === 1) { // level out, glide
        if (p < va + 1) inp = { up: true, down: false, boost: false };
        else if (p > va + 5) inp = { up: false, down: true, boost: false };
        if (S.vy < -6) phase = 2;
      } else { // dive to -12 lead, then back to pull
        if (p > va - 10) inp = { up: false, down: true, boost: false };
        if (S.vy > -2 && S.speed > 30) phase = 0;
      }
      P.stepFlight(S, inp, PAPER, dt);
      if (S.y <= 0) break; // crashed: energy counted at impact
      if (!isFinite(S.x + S.y)) return { broken: true };
    }
    return { ret: e() / e0 };
  }
  const c = cycleEnergy();
  ok(!c.broken && c.ret < 0.95, "7: dive/pull cycles decay energy", c.broken ? "BROKEN" : `retained=${(100 * c.ret).toFixed(0)}%`);
}
// 8. Rocket thrust acts along pitch (differential: boosted step minus
// identical unboosted step). Must dominate along the nose; a few degrees of
// skew are fine (the faster boosted plane tracks the sink target slightly
// better — correct behavior, not thrust error). Magnitude must match too.
{
  const p = Object.assign(params(1), { thrust: 85, fuelMax: 99 });
  let dirOk = true, worst = 0;
  for (const deg of [-25, 0, 25]) {
    const a = deg * D;
    function fresh(){
      return { x: 0, y: 200, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, pitch: a,
        pitchVel: 0, fuel: 99, fuelMax: 99, airTime: 0, speed: 30 };
    }
    const A = fresh(), B = fresh();
    P.stepFlight(A, { up: false, down: false, boost: true }, p, 1 / 60);
    P.stepFlight(B, { up: false, down: false, boost: false }, p, 1 / 60);
    const dx = A.vx - B.vx, dy = A.vy - B.vy;
    const got = Math.atan2(dy, dx);
    let d = Math.abs(got - a);
    if (d > Math.PI) d = 2 * Math.PI - d;
    worst = Math.max(worst, d);
    const mag = Math.hypot(dx, dy), expect = 85 / 60;
    if (d > 0.12 || Math.abs(mag - expect) > 0.15) dirOk = false;
  }
  ok(dirOk, "8: booster pushes along the nose", `worst ${(worst * 180 / Math.PI).toFixed(2)}deg off`);
}
// 9. No rocket: fuel objective cannot trigger (fuel stays unavailable)
{
  const p = Object.assign(params(1), { thrust: 0, fuelMax: 0 });
  const S = { x: 0, y: 100, vx: 25, vy: 0, pitch: 0, pitchVel: 0, fuel: 0, fuelMax: 0, airTime: 0, speed: 25 };
  const r = P.stepFlight(S, { up: false, down: false, boost: true }, p, 1 / 60);
  ok(r.boosting === false && S.fuel === 0, "9: no rocket means no boost, no fuel burn");
}
// 10. Redline: brief overshoot OK, sustained runaway impossible
{
  function diveTop(gid) {
    const G = DA.GLIDERS[gid];
    const p = { control: G.control, drag: G.drag, turnK: G.turnK, comfort: G.comfort, top: G.top,
      stall: G.stall, thrust: 0, fuelMax: 0, sinkBias: G.sink, bare: gid === 0 };
    const S = { x: 0, y: 500, vx: 25, vy: 0, pitch: 0, pitchVel: 0, fuel: 0, fuelMax: 0, airTime: 0, speed: 25 };
    const dt = 1 / 60;
    let top = 0;
    for (let i = 0; i < 6 / dt; i++) {
      P.stepFlight(S, S.pitch < -55 * D ? N : { up: false, down: true, boost: false }, p, dt);
      top = Math.max(top, S.speed);
      if (S.y <= 0) break;
    }
    return top;
  }
  const paper = diveTop(1), needle = diveTop(4);
  ok(paper < DA.GLIDERS[1].top * 1.25, "10a: paper dive capped near redline", `${(paper * 3.6).toFixed(0)}km/h vs cap ${(DA.GLIDERS[1].top * 3.6).toFixed(0)}`);
  ok(needle > paper + 8, "10b: needle redline much higher", `${(needle * 3.6).toFixed(0)} vs ${(paper * 3.6).toFixed(0)}`);
}

console.log(`\nPHYSICS TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
