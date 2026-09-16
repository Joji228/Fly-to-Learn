/* Dodo Airways landing-mastery + ramp-velocity reward tests. No framework.
   Run: node tests/rewards.test.js   (exit 0 = all pass)
   Locks in: ramp HUD uses true cubic derivative (starts at rest, ends at
   launch), smooth landings scale, streaks escalate, pure glide pays, water
   never earns style. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "js");
function load(f) {
  eval.call(null, fs.readFileSync(path.join(DIR, f), "utf8"));
}
function anyProxy() {
  return new Proxy(function () {}, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => 0;
      return anyProxy();
    },
    apply() { return anyProxy(); }
  });
}
const elStub = () => ({ classList: { add() {}, toggle() {} }, style: {}, addEventListener() {} });
global.window = { addEventListener() {}, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800 };
global.document = { getElementById: elStub, addEventListener() {}, hidden: false };
global.requestAnimationFrame = () => 0;
load("config.js");
load("gliders.js");
load("physics.js");
load("world.js");
load("game.js");
const DA = global.window.DA, Game = DA.Game;
DA.Audio = {
  ensure() {}, startWind() {}, stopWind() {}, stopBoost() {}, startBoost() {}, setWind() {},
  SFX: { launch() {}, stall() {}, milestone() {}, splash() {}, smooth() {}, impact() {}, record() {}, fuelEmpty() {}, recover() {} }
};
DA.UI = {
  enterPressed() {}, onRunStart() {}, showFlight() {}, onLaunch() {}, onRecord() {},
  toast() {}, floatText() {}, onBoostStart() {}, onFuelEmpty() {}, onStallRecover() {},
  onCrash() {}, showResults() {}, showMenu() {}, updateHUD() {}
};
DA.Save = { save() {} };

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}
function baseSave() {
  return {
    upgrades: { ramp: 0, sled: 0, aero: 0, fuel: 0 },
    glider: { equipped: 1 }, rocket: { equipped: 0 },
    settings: { particles: false, shake: false },
    best: { dist: 0, alt: 0, speedKmh: 0, airTime: 0 },
    money: 0, totalEarned: 0, flights: 0, objectivesDone: [],
    landingStreak: 0, bestStreak: 0
  };
}

// 1. ramp velocity: rest at start, launch at lip (true derivative, not f)
{
  let good = true, worst = 0;
  for (const ramp of [0, 4, 8]) {
    DA.World.setRampLevel(ramp);
    for (const sled of [0, 8]) {
      const launch = DA.launchSpeed(ramp, sled);
      const exit = DA.launchAngleDeg(ramp) * Math.PI / 180;
      const T = DA.rampRideTime(sled);
      const S = launch * Math.cos(exit) * T / DA.RAMP_TRACK_LEN;
      const slope = Math.tan(exit);
      const v0 = DA.rampVelocity(0, S, T, slope);
      const v1 = DA.rampVelocity(1, S, T, slope);
      if (Math.abs(v0.speed) > 1e-9) good = false;
      const d = Math.abs(v1.speed - launch);
      worst = Math.max(worst, d);
      if (d > 0.05) good = false;
    }
  }
  ok(good, "1: ramp HUD velocity rests at start, hits launch at lip", "worst " + worst.toFixed(4) + " m/s");
}

// 2. smooth landing scales with distance; water pays nothing
{
  Game.save = baseSave();
  Game.P = { fuelMax: 2 };
  Game.milestonesHit = {};
  Game.runStats = { dist: 1000, maxAlt: 30, maxSpeedKmh: 120, airTime: 20, usedAllFuel: false, boostUsed: true };
  Game.crashedInfo = { severity: "smooth", water: false };
  const rw = DA.calcRewards();
  ok(rw.landBonus === 25 + Math.min(125, Math.floor(1000 / 20)), "2a: long smooth pays more", "$" + rw.landBonus);
  Game.runStats.dist = 150;
  const rw2 = DA.calcRewards();
  ok(rw2.landBonus < rw.landBonus && rw2.landBonus >= 25, "2b: short smooth pays base", "$" + rw2.landBonus);
  Game.crashedInfo = { severity: "smooth", water: true };
  Game.runStats.dist = 1000;
  const rw3 = DA.calcRewards();
  ok(rw3.landBonus === 0 && rw3.streakBonus === 0, "2c: water earns no style");
}

// 3. streak escalates only for consecutive smooths
{
  Game.save = baseSave();
  Game.P = { fuelMax: 2 };
  Game.milestonesHit = {};
  Game.runStats = { dist: 500, maxAlt: 20, maxSpeedKmh: 100, airTime: 15, usedAllFuel: false, boostUsed: true };
  Game.crashedInfo = { severity: "smooth", water: false };
  Game.save.landingStreak = 3;
  const rw = DA.calcRewards();
  ok(rw.streakBonus === 30, "3a: streak x3 pays $30", "$" + rw.streakBonus);
  Game.save.landingStreak = 0;
  const rw2 = DA.calcRewards();
  ok(rw2.streakBonus === 0, "3b: no streak, no bonus");
}

// 4. pure glide needs a real tank, no boost, real distance
{
  Game.save = baseSave();
  Game.milestonesHit = {};
  Game.runStats = { dist: 400, maxAlt: 20, maxSpeedKmh: 100, airTime: 15, usedAllFuel: false, boostUsed: false };
  Game.crashedInfo = { severity: "rough", water: false };
  Game.P = { fuelMax: 2 };
  ok(DA.calcRewards().glideBonus === 50, "4a: pure glide pays");
  Game.runStats.boostUsed = true;
  ok(DA.calcRewards().glideBonus === 0, "4b: boosted flight pays nothing extra");
  Game.runStats.boostUsed = false;
  Game.P = { fuelMax: 0 };
  ok(DA.calcRewards().glideBonus === 0, "4c: no tank, no glide bonus (no freebies)");
}

console.log(`\nREWARDS TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
