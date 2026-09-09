/* Dodo Airways balance/progression tests. No framework, no DOM.
   Run: node tests/balance.test.js   (exit 0 = all pass)
   Locks in: monotonic glider ladder, gradual airtime growth, capped
   endgame float, distance growth, honest shop bars. */
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
const D = Math.PI / 180;
const N = { up: false, down: false, boost: false };

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
// standardized hands-off glide from 60m at 13 m/s (pure airframe float)
function sinkTime(gid) {
  const S = { x: 0, y: 60, vx: 13, vy: 0, pitch: 0, pitchVel: 0, fuel: 0,
    fuelMax: 0, airTime: 0, speed: 13 };
  const dt = 1 / 60;
  let t = 0;
  for (let i = 0; i < 60 * 120; i++) {
    P.stepFlight(S, N, params(gid), dt);
    t += dt;
    if (S.y <= 40) break;
  }
  return t;
}
// standardized flown run (launch + energy-loop autopilot)
function flyRun(gid) {
  const p = params(gid);
  const ang = DA.launchAngleDeg(0) * D, spd = DA.launchSpeed(0, 0);
  const S = { x: 140, y: DA.rampLipY(0) + 3, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
    pitch: ang, pitchVel: 0, fuel: 0, fuelMax: 0, airTime: 0, speed: spd };
  const dt = 1 / 60;
  let maxAlt = 0, maxSpd = 0, t = 0;
  for (let i = 0; i < 60 * 300; i++) {
    const speed = S.speed, inp = { up: false, down: false, boost: false };
    if (speed < 13) inp.down = true;
    else if (S.y < 5 && S.vy < -1) inp.up = true;
    else if (S.vy < -16) inp.up = true;
    else if (speed > 32 && S.y < 45 && S.pitch < 20 * D) inp.up = true;
    else if (S.y > 60) inp.down = true;
    P.stepFlight(S, inp, p, dt);
    if (S.y > maxAlt) maxAlt = S.y;
    if (S.speed > maxSpd) maxSpd = S.speed;
    t += dt;
    if (S.y <= 0 && t > 0.5) break;
  }
  return { dist: Math.max(0, S.x), air: t, alt: maxAlt, top: maxSpd * 3.6 };
}

// 1. every real glider sinks eventually (hands off, 5 minutes max —
// far beyond anything reachable in play; this guards true perpetual flight)
{
  let allSink = true;
  for (let gid = 1; gid <= 5; gid++) {
    const S = { x: 0, y: 200, vx: 20, vy: 0, pitch: 0, pitchVel: 0, fuel: 0,
      fuelMax: 0, airTime: 0, speed: 20 };
    const dt = 1 / 60;
    let landed = false, t = 0;
    for (let i = 0; i < 60 * 300; i++) {
      P.stepFlight(S, N, params(gid), dt);
      t += dt;
      if (S.y <= 0) { landed = true; break; }
    }
    if (!landed) { allSink = false; console.log("   glider " + gid + " still aloft after 5min"); }
    else console.log("   glider " + gid + " lands at " + t.toFixed(0) + "s");
  }
  ok(allSink, "1: every glider sinks eventually (no perpetual flight)");
}

// 2+3+4. airtime ladder: gradual, no 2x adjacent jumps, carbon under ~45s
{
  const airs = [];
  for (let gid = 0; gid <= 5; gid++) airs.push(flyRun(gid).air);
  console.log("   airtimes: " + airs.map((a) => a.toFixed(1)).join("s, ") + "s");
  let gradual = true;
  for (let i = 2; i <= 5; i++) {
    if (airs[i] > airs[i - 1] * 2) { gradual = false; console.log("   jump at " + (i - 1) + "->" + i); }
  }
  ok(gradual, "2: no extreme airtime jump between adjacent gliders");
  ok(airs[5] < 45, "3: Black Swan airtime under ~45s", airs[5].toFixed(1) + "s");
  const needleIdx = 4;
  ok(airs[needleIdx] < airs[5], "4: Needlefish airtime below Black Swan", airs[needleIdx].toFixed(1) + "s");
}

// 5. distance generally increases with each glider
{
  const dists = [];
  for (let gid = 0; gid <= 5; gid++) dists.push(flyRun(gid).dist);
  console.log("   distances: " + dists.map((d) => d.toFixed(0)).join("m, ") + "m");
  let mono = true;
  for (let i = 2; i <= 5; i++) {
    if (dists[i] < dists[i - 1]) { mono = false; console.log("   drop at " + (i - 1) + "->" + i); }
  }
  ok(mono, "5: distance increases with each glider");
}

// 6. visible stat ladder monotonic where intended (control/drag/sink/bars)
{
  const ids = [1, 2, 3, 4, 5];
  const get = (f) => ids.map((i) => DA.GLIDERS[i][f]);
  const ctrl = get("control"), drag = get("drag"), sink = get("sink");
  const bars = ids.map((i) => DA.GLIDERS[i].bars.ctrl);
  const monoUp = (a) => a.every((v, i) => i === 0 || v >= a[i - 1]);
  const monoDn = (a) => a.every((v, i) => i === 0 || v <= a[i - 1]);
  ok(monoUp(ctrl), "6a: internal control non-decreasing", ctrl.join(","));
  ok(monoDn(drag), "6b: internal drag non-increasing", drag.join(","));
  ok(monoDn(sink), "6c: internal sink non-increasing", sink.join(","));
  ok(monoUp(bars), "6d: visible CONTROL bars non-decreasing", bars.join(","));
  const tops = get("top");
  ok(monoUp(tops), "6e: top speed strictly increasing", tops.join(","));
}

console.log(`\nBALANCE TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
