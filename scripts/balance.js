/* Dodo Airways balance sim — standardized per-glider flight table.
   Run: node scripts/balance.js
   Used for tuning: compare gliders numerically (distance/speed/control/
   airtime/glide angle) before finishing a balance pass. */
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

function flyGlider(gid, up) {
  up = up || { ramp: 0, sled: 0, aero: 0, fuel: 0 };
  const G = DA.GLIDERS[gid];
  const rk = DA.ROCKETS[0];
  const p = {
    control: G.control, drag: G.drag * (1 - 0.055 * (up.aero || 0)), turnK: G.turnK,
    comfort: G.comfort + (up.aero || 0) * 1.5, top: G.top + (up.aero || 0) * 2,
    stall: G.stall, thrust: 0, fuelMax: 0, sinkBias: G.sink, bare: gid === 0
  };
  void rk;
  const ang = DA.launchAngleDeg(up.ramp || 0) * D;
  const spd = DA.launchSpeed(up.ramp || 0, up.sled || 0);
  const S = { x: 140, y: DA.rampLipY(up.ramp || 0) + 3, vx: Math.cos(ang) * spd,
    vy: Math.sin(ang) * spd, pitch: ang, pitchVel: 0, fuel: 0, fuelMax: 0, airTime: 0, speed: spd };
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
  return { dist: Math.max(0, S.x), air: t, alt: maxAlt, top: maxSpd * 3.6, launch: spd * 3.6 };
}

console.log("glider | launch | distance | airtime | maxAlt | maxSpeed");
console.log("-------|--------|----------|---------|--------|----------");
const rows = [];
for (const g of DA.GLIDERS) {
  const r = flyGlider(g.id, { ramp: 0, sled: 0, aero: 0, fuel: 0 });
  rows.push({ g, r });
  console.log(
    (g.name + "                    ").slice(0, 20) + " | " +
    String(r.launch.toFixed(0) + "km/h").padStart(6) + " | " +
    String(r.dist.toFixed(0) + "m").padStart(8) + " | " +
    String(r.air.toFixed(1) + "s").padStart(7) + " | " +
    String(r.alt.toFixed(0) + "m").padStart(6) + " | " +
    String(r.top.toFixed(0) + "km/h").padStart(8)
  );
}
// regression flags: suspicious jumps a tuner should look at
console.log("--- warnings ---");
let warns = 0;
function warn(m) { warns++; console.log("WARN " + m); }
for (let i = 2; i < rows.length; i++) {
  if (rows[i].r.air > rows[i - 1].r.air * 1.7)
    warn(rows[i].g.name + " airtime " + rows[i].r.air.toFixed(1) + "s is >1.7x " +
      rows[i - 1].g.name + " (" + rows[i - 1].r.air.toFixed(1) + "s)");
  if (rows[i].r.dist <= rows[i - 1].r.dist)
    warn(rows[i].g.name + " distance " + rows[i].r.dist.toFixed(0) + "m did not beat " +
      rows[i - 1].g.name + " (" + rows[i - 1].r.dist.toFixed(0) + "m)");
}
for (let i = 2; i < rows.length; i++) {
  const a = rows[i - 1].g, b = rows[i].g;
  if (b.bars.ctrl < a.bars.ctrl)
    warn(b.name + " visible CONTROL bar (" + b.bars.ctrl + ") below " + a.name + " (" + a.bars.ctrl + ")");
  if (b.control < a.control)
    warn(b.name + " internal control (" + b.control + ") below " + a.name + " (" + a.control + ")");
  if (b.top <= a.top)
    warn(b.name + " top speed (" + b.top + ") not above " + a.name + " (" + a.top + ")");
}
if (rows[5].r.air > 45)
  warn("Black Swan airtime " + rows[5].r.air.toFixed(1) + "s exceeds ~45s budget");
if (!warns) console.log("(none — ladder looks healthy)");
