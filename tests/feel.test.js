/* Dodo Airways feel battery. No framework, no DOM.
   Run: node tests/feel.test.js   (exit 0 = all pass)
   Scripted-input maneuver battery locking the tuned flight feel:
   launch numbers, powered climb, per-glider glide angles, porpoise
   termination, mid-tier climb, high-altitude sink. Thresholds encode the
   post-tuning spec with margin; see the tuning report for before/after. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "js");
function load(f) {
  eval.call(null, fs.readFileSync(path.join(DIR, f), "utf8"));
}
global.window = {};
load("config.js");
load("gliders.js");
load("physics.js");
const DA = global.window.DA, P = DA.Physics;
const D = Math.PI / 180, dt = 1 / 60;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}
function params(gid, o) {
  const G = DA.GLIDERS[gid];
  return Object.assign({
    control: G.control, drag: G.drag, turnK: G.turnK, comfort: G.comfort,
    top: G.top, stall: G.stall, thrust: 0, fuelMax: 0, sinkBias: G.sink, bare: gid === 0
  }, o || {});
}
function toPitch(t) {
  return (s) => {
    const p = s.pitch / D;
    if (Math.abs(p - t) < 1.5) return { up: false, down: false, boost: false };
    return t > p ? { up: true, down: false, boost: false } : { up: false, down: true, boost: false };
  };
}

// F1. starter launch: 36 m/s (~130 km/h), lip 26 m, exit 9 deg
{
  ok(DA.launchSpeed(0, 0) === 36, "F1a: starter launch 36 m/s", DA.launchSpeed(0, 0) + " m/s");
  ok(DA.launchAngleDeg(0) === 9, "F1b: starter exit 9 deg");
  ok(DA.rampLipY(0) === 26, "F1c: starter lip 26 m");
}

// F2. powered climb preserved: 25 m/s at 35 deg + Sardine thrust gains a lot, fast
{
  const S = { x: 0, y: 100, vx: 25, vy: 0, pitch: 0, pitchVel: 0, fuel: 99, fuelMax: 99, airTime: 0, speed: 25 };
  for (let i = 0; i < 120; i++) {
    const tp = toPitch(35)(S);
    P.stepFlight(S, { up: tp.up, down: tp.down, boost: true }, params(1, { thrust: 60, fuelMax: 99 }), dt);
  }
  ok(S.y - 100 > 20 && S.speed > 30, "F2: powered 35deg climb gains fast", `dy=${(S.y - 100).toFixed(0)}m spd=${S.speed.toFixed(0)}m/s`);
}

// F5. nose 0 at healthy speed: trajectory in the -3..-7.5 deg band, per glider
{
  let band = true;
  const got = [];
  for (let gid = 1; gid <= 5; gid++) {
    const S = { x: 0, y: 80, vx: 30, vy: 0, pitch: 0, pitchVel: 0, fuel: 0, fuelMax: 0, airTime: 0, speed: 30 };
    for (let i = 0; i < 480; i++) {
      P.stepFlight(S, { up: S.pitch < -0.005, down: S.pitch > 0.005, boost: false }, params(gid), dt);
      if (S.y <= 0) break;
    }
    const path = Math.atan2(S.vy, S.vx) / D;
    got.push(path.toFixed(1));
    if (!(S.y > 0 && path < -3.0 && path > -7.5)) band = false;
  }
  ok(band, "F5: level nose settles into -3..-7.5 deg glide", got.join(" / ") + " deg");
}

// F6. paper porpoise terminates quickly (active minimal play, stock gear)
{
  const ang = DA.launchAngleDeg(0) * D, spd = DA.launchSpeed(0, 0);
  const S = {
    x: 140, y: DA.rampLipY(0) + 3, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
    pitch: ang, pitchVel: 0, fuel: 0, fuelMax: 0, airTime: 0, speed: spd
  };
  let t = 0;
  for (let i = 0; i < 60 * 120; i++) {
    const inp = { up: false, down: false, boost: false };
    if (S.vy < -4) inp.up = true; else if (S.vy > 2) inp.down = true;
    P.stepFlight(S, inp, params(1), dt);
    t += dt;
    if (S.y <= 0 && t > 0.5) break;
  }
  ok(S.y <= 0 && t > 5 && t < 60, "F6: paper porpoise lands in band", `${t.toFixed(1)}s/${(S.x - 140).toFixed(0)}m`);
}

// F7. mid-tier climb works: Needlefish + Sardine + lvl-2 kit banks 150m+
{
  const G = DA.GLIDERS[4];
  const p = {
    control: G.control, drag: G.drag * (1 - 0.055 * 2), turnK: G.turnK,
    comfort: G.comfort + 3, top: G.top + 4, stall: G.stall,
    thrust: 60, fuelMax: 2.0 * DA.fuelMult(2), sinkBias: G.sink, bare: false
  };
  const ang = DA.launchAngleDeg(2) * D, spd = DA.launchSpeed(2, 2);
  const S = {
    x: 140, y: DA.rampLipY(2) + 3, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
    pitch: ang, pitchVel: 0, fuel: p.fuelMax, fuelMax: p.fuelMax, airTime: 0, speed: spd
  };
  let t = 0, apex = 0;
  for (let i = 0; i < 60 * 120; i++) {
    const inp = { up: false, down: false, boost: false };
    if (S.fuel > 0.05) {
      const w = 30 * D;
      if (S.pitch < w - 0.02) inp.up = true; else if (S.pitch > w + 0.02) inp.down = true;
      inp.boost = true;
    }
    P.stepFlight(S, inp, p, dt);
    t += dt;
    if (S.y > apex) apex = S.y;
    if (S.y <= 0 && t > 0.5) break;
  }
  ok(apex > 150 && t > 15 && t < 90, "F7: mid-tier boost climbs and lands in band", `apex=${apex.toFixed(0)}m t=${t.toFixed(0)}s`);
}

// F8. high-altitude hands-off sinks decisively (no hover, even for carbon)
{
  const S = { x: 0, y: 300, vx: 25, vy: 0, pitch: 0, pitchVel: 0, fuel: 0, fuelMax: 0, airTime: 0, speed: 25 };
  for (let i = 0; i < 600; i++) P.stepFlight(S, { up: false, down: false, boost: false }, params(5), dt);
  ok(S.y - 300 < -10, "F8: carbon hands-off from 300m sinks, never hovers", `dy=${(S.y - 300).toFixed(0)}m`);
}

console.log(`\nFEEL TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
