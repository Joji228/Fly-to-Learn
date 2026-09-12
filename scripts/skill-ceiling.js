/* Dodo Airways skill-ceiling probe — what does SKILLED play achieve?
   Run: node scripts/skill-ceiling.js
   A skilled pilot with max gear: boosts at 30deg, then actively manages
   the best-glide band (gentle pitch toward 26-32 m/s, dives to recover
   below 24, never yanks). Measures the honest human ceiling the d3500
   objective is tuned against. */
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

const G = DA.GLIDERS[5], R = DA.ROCKETS[2];
const up = { ramp: 8, sled: 8, aero: 8, fuel: 5 };
const p = {
  control: G.control, drag: G.drag * (1 - 0.055 * 8), turnK: G.turnK,
  comfort: G.comfort + 8 * 1.5, top: G.top + 8 * 2, stall: G.stall,
  thrust: R.thrust, fuelMax: R.burn * DA.fuelMult(5), sinkBias: G.sink, bare: false
};
const ang = DA.launchAngleDeg(8) * D, spd = DA.launchSpeed(8, 8);
const S = {
  x: 140, y: DA.rampLipY(8) + 3, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
  pitch: ang, pitchVel: 0, fuel: p.fuelMax, fuelMax: p.fuelMax, airTime: 0, speed: spd
};
let t = 0, apex = 0;
for (let i = 0; i < 60 * 1200; i++) {
  const inp = { up: false, down: false, boost: false };
  if (S.fuel > 0.05) {
    const w = 30 * D;
    if (S.pitch < w - 0.02) inp.up = true; else if (S.pitch > w + 0.02) inp.down = true;
    inp.boost = true;
  } else if (S.speed < 24) {
    inp.down = true; // earned speed back: dive first, always
  } else if (S.speed > 33) {
    inp.up = true; // too fast: ease the nose up, bank altitude
  } else if (S.vy < -3) {
    inp.up = true; // gentle correction only
  }
  P.stepFlight(S, inp, p, dt);
  t += dt;
  if (S.y > apex) apex = S.y;
  if (S.y <= 0 && t > 0.5) break;
}
console.log("skill ceiling: t=" + t.toFixed(0) + "s dist=" + ((S.x - 140) / 1000).toFixed(2) +
  "km apex=" + apex.toFixed(0) + "m landed=" + (S.y <= 0));
