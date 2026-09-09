/* Dodo Airways progression sim — full campaign playthrough by a bot.
   Run: node scripts/economy.js
   Uses the REAL physics, REAL shop ranking, REAL rewards/objectives/
   milestones to measure flights-per-unlock from fresh save to endgame.
   Tune econReward/objective values until pacing feels right:
   early gear every 1-3 flights, mid every 4-8, late every 8-15. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "js");
function load(f) {
  eval.call(null, fs.readFileSync(path.join(DIR, f), "utf8"));
}
global.window = {};
global.document = {
  getElementById: function () {
    return {
      classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return true; } },
      style: {}, textContent: "", innerHTML: "", appendChild: function () {}, addEventListener: function () {}
    };
  },
  createElement: function () {
    return {
      classList: { add: function () {}, remove: function () {}, toggle: function () {} },
      style: {}, textContent: "", innerHTML: "", appendChild: function () {}, addEventListener: function () {}
    };
  },
  addEventListener: function () {}
};
load("config.js");
load("gliders.js");
load("physics.js");
load("ui.js");
const DA = global.window.DA, P = DA.Physics;
const D = Math.PI / 180;

// flown flight with current gear: boost at 30deg while fuel, then the
// standard energy-loop autopilot (same family as balance.js)
function flyGear(gid, rid, up) {
  const G = DA.GLIDERS[gid];
  const R = rid >= 0 ? DA.ROCKETS[rid] : null;
  const p = {
    control: G.control, drag: G.drag * (1 - 0.055 * (up.aero || 0)), turnK: G.turnK,
    comfort: G.comfort + (up.aero || 0) * 1.5, top: G.top + (up.aero || 0) * 2,
    stall: G.stall, thrust: R ? R.thrust : 0,
    fuelMax: R ? R.burn * DA.fuelMult(up.fuel || 0) : 0,
    sinkBias: G.sink, bare: gid === 0
  };
  const ang = DA.launchAngleDeg(up.ramp || 0) * D, spd = DA.launchSpeed(up.ramp || 0, up.sled || 0);
  const S = {
    x: 140, y: DA.rampLipY(up.ramp || 0) + 3, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
    pitch: ang, pitchVel: 0, fuel: p.fuelMax, fuelMax: p.fuelMax, airTime: 0, speed: spd
  };
  const dt = 1 / 60;
  let maxAlt = 0, maxSpd = 0, t = 0, usedAllFuel = false;
  for (let i = 0; i < 60 * 600; i++) {
    const inp = { up: false, down: false, boost: false };
    if (S.fuel > 0.05 && R) {
      const w = 30 * D;
      if (S.pitch < w - 0.02) inp.up = true; else if (S.pitch > w + 0.02) inp.down = true;
      inp.boost = true;
    } else {
      const speed = S.speed;
      if (speed < 13) inp.down = true;
      else if (S.y < 5 && S.vy < -1) inp.up = true;
      else if (S.vy < -16) inp.up = true;
      else if (speed > 32 && S.y < 45 && S.pitch < 20 * D) inp.up = true;
      else if (S.y > 60) inp.down = true;
    }
    P.stepFlight(S, inp, p, dt);
    if (S.y > maxAlt) maxAlt = S.y;
    if (S.speed > maxSpd) maxSpd = S.speed;
    t += dt;
    if (S.y <= 0 && t > 0.5) break;
  }
  if (p.fuelMax > 0 && S.fuel <= 0) usedAllFuel = true;
  // lip-relative distance, like the game HUD
  return { dist: Math.max(0, S.x - 140), maxAlt, maxSpeedKmh: maxSpd * 3.6, airTime: t, usedAllFuel };
}

function freshSave() {
  return {
    money: 0, upgrades: { ramp: 0, sled: 0, aero: 0, fuel: 0 },
    glider: { owned: [true, false, false, false, false, false], equipped: 0 },
    rocket: { owned: [false, false, false], equipped: -1 },
    best: { dist: 0, alt: 0, speedKmh: 0, airTime: 0 },
    flights: 0, objectivesDone: [], totalEarned: 0
  };
}

function rewardsFor(save, st, msHit) {
  const base = P.econReward({ dist: st.dist, maxAlt: st.maxAlt, maxSpeedKmh: st.maxSpeedKmh, airTime: st.airTime });
  let msBonus = 0;
  DA.MILESTONES.forEach(function (m) {
    if (m.d > 0 && st.dist >= m.d && !msHit[m.d]) { msHit[m.d] = true; msBonus += Math.round(m.d / 50); }
  });
  const newObj = [];
  DA.OBJECTIVES.forEach(function (o) {
    if (save.objectivesDone.indexOf(o.id) < 0 && o.check(st)) newObj.push(o);
  });
  const objBonus = newObj.reduce(function (a, o) { return a + o.bonus; }, 0);
  return { base, msBonus, newObj, objBonus, total: base.total + msBonus + objBonus };
}

function priceOfCand(c) {
  if (c.type === "glider") return DA.GLIDERS[c.id].price;
  if (c.type === "rocket") return DA.ROCKETS[c.id].price;
  return DA.priceOf(c.id, 0); // placeholder, replaced below
}

const save = freshSave();
const msHit = {};
const log = [];
let flights = 0;
const MAX_FLIGHTS = 400;
while (flights < MAX_FLIGHTS) {
  const st = flyGear(save.glider.equipped, save.rocket.equipped, save.upgrades);
  const rw = rewardsFor(save, st, msHit);
  save.money += rw.total;
  save.totalEarned += rw.total;
  save.flights += 1;
  flights += 1;
  rw.newObj.forEach(function (o) { save.objectivesDone.push(o.id); });
  save.best.dist = Math.max(save.best.dist, st.dist);
  // buy highest-priority affordable, one per flight (bot shops after each)
  const cands = DA.UI.testRank(save);
  const buy = cands.filter(function (c) { return c.price <= save.money; })[0];
  if (buy) {
    save.money -= buy.price;
    if (buy.type === "glider") { save.glider.owned[buy.id] = true; save.glider.equipped = buy.id; }
    else if (buy.type === "rocket") { save.rocket.owned[buy.id] = true; save.rocket.equipped = buy.id; }
    else save.upgrades[buy.id] += 1;
    log.push("f" + flights + ": bought " + buy.label + " ($" + buy.price + ") after flight " +
      st.dist.toFixed(0) + "m/+" + rw.total + "$");
  }
  const maxed = DA.UI.testRank(save).length === 0;
  if (maxed && save.money > 50000) break;
  if (maxed) { log.push("f" + flights + ": MAXED, wallet $" + save.money); break; }
}
console.log("progression: " + flights + " flights to " +
  (DA.UI.testRank(save).length === 0 ? "MAXED" : "f" + flights + " (" + DA.UI.testRank(save)[0].label + " next)") +
  ", earned $" + save.totalEarned + ", wallet $" + save.money);
console.log("--- purchases ---");
log.forEach(function (l) { console.log(l); });
