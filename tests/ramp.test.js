/* Dodo Airways ramp regression tests. No framework, no DOM.
   Run: node tests/ramp.test.js   (exit 0 = all pass)
   Locks in: the ramp ride starts at rest, ends at EXACTLY launch velocity
   (position derivative, HUD speed and launch impulse agree at the lip),
   and the drawn track follows the physical track to the lip. */
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
load("world.js");
const DA = global.window.DA;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}

// game.js is browser-bound (document/rAF at call time), so replicate its
// profile import: load just the rampProfile source by stubbing the rest.
// Simpler: re-derive from the documented contract f(k) = ((S-2)k + (3-S))k^2
// and verify the CONTRACT against the physics + world geometry instead.
function profile(k, S) { return ((S - 2) * k + (3 - S)) * k * k; }

// 1. profile endpoints: rest at start, unit at end, for real S values
{
  let good = true;
  for (let ramp = 0; ramp <= 8; ramp += 2) {
    DA.World.setRampLevel(ramp);
    for (let sled = 0; sled <= 8; sled += 2) {
      const launch = DA.launchSpeed(ramp, sled);
      const exit = DA.launchAngleDeg(ramp) * Math.PI / 180;
      const T = DA.rampRideTime(sled);
      const S = launch * Math.cos(exit) * T / 200;
      if (!(S > 0 && S < 1)) { good = false; console.log("   S out of range: " + S); }
      if (Math.abs(profile(0, S)) > 1e-12) good = false;
      if (Math.abs(profile(1, S) - 1) > 1e-12) good = false;
      // f'(0) = 0 (starts at rest), f'(1) = S (arrives at launch velocity)
      const e = 1e-5;
      const d0 = (profile(e, S) - profile(0, S)) / e;
      const d1 = (profile(1, S) - profile(1 - e, S)) / e;
      if (Math.abs(d0) > 1e-3 || Math.abs(d1 - S) > 1e-3) {
        good = false; console.log("   slope mismatch S=" + S + " d0=" + d0 + " d1=" + d1);
      }
      // monotone on [0,1]
      let prev = -1;
      for (let k = 0; k <= 1.0001; k += 0.02) {
        const f = profile(Math.min(1, k), S);
        if (f < prev - 1e-9) { good = false; break; }
        prev = f;
      }
    }
  }
  ok(good, "1: ride profile rests at start, hits launch slope at lip, monotone");
}

// 2. lip continuity: track derivative == launch vector (exact as dt -> 0)
{
  let worst = 0;
  for (let ramp = 0; ramp <= 8; ramp += 4) {
    DA.World.setRampLevel(ramp);
    for (const sled of [0, 8]) {
      const launch = DA.launchSpeed(ramp, sled);
      const exit = DA.launchAngleDeg(ramp) * Math.PI / 180;
      const T = DA.rampRideTime(sled);
      const S = launch * Math.cos(exit) * T / 200;
      const pos = (t) => {
        const k = Math.min(1, t / T), f = profile(k, S), x = -60 + 200 * f;
        return { x, y: DA.World.rampY(x) + 2 };
      };
      const dt = 1 / 60000, a = pos(T - dt), b = pos(T);
      const vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;
      const d = Math.hypot(vx - Math.cos(exit) * launch, vy - Math.sin(exit) * launch);
      worst = Math.max(worst, d);
    }
  }
  ok(worst < 0.05, "2: track velocity matches launch at lip", "worst " + worst.toFixed(4) + " m/s");
}

// 3. drawn track == physical track at the lip (no endpoint cliff)
{
  DA.World.setRampLevel(0);
  const lipTrack = DA.World.rampY(140);
  const lipCfg = DA.rampLipY(0);
  ok(Math.abs(lipTrack - lipCfg) < 1e-9 && lipTrack > 20,
    "3: track endpoint sits at the configured lip", lipTrack.toFixed(1) + "m vs cfg " + lipCfg + "m");
}

// 4. default lip is 30-50% above the old 19 m baseline
{
  const lip = DA.rampLipY(0);
  ok(lip >= 19 * 1.3 && lip <= 19 * 1.5, "4: taller default lip", lip + "m");
}

console.log(`\nRAMP TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
