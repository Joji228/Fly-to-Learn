/* Dodo Airways economy tests. No framework; minimal DOM stub.
   Run: node tests/economy.test.js   (exit 0 = all pass)
   Locks in: reward formula golden values, reachable objective tiers,
   geographic milestone mapping, and shop summary/savings-goal text. */
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
const DA = global.window.DA;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}

// 1. reward formula golden values (locks the multipliers)
{
  const r = DA.Physics.econReward({ dist: 1000, maxAlt: 100, maxSpeedKmh: 150, airTime: 20 });
  ok(r.dist === 450 && r.alt === 60 && r.speed === 150 && r.time === 120 && r.total === 780,
    "1: reward formula golden values", JSON.stringify(r));
}

// 2. paper-class first flight earns on the order of a Paper Dart (keeps money meaningful)
{
  // lip-relative paper stock flight ≈ 350m / 39m / 128km/h / 17s
  const r = DA.Physics.econReward({ dist: 350, maxAlt: 39, maxSpeedKmh: 128, airTime: 17 });
  ok(r.total >= 200 && r.total <= 600, "2: starter flight earns starter-scale cash", "$" + r.total);
}

// 3. objective tiers are sorted, lip-relative, top is an honest stretch (<=4km honest max)
{
  const ds = DA.OBJECTIVES.filter((o) => o.id[0] === "d").map((o) => parseInt(o.id.slice(1), 10));
  const sorted = ds.every((v, i) => i === 0 || v > ds[i - 1]);
  ok(sorted && ds[ds.length - 1] <= 4000 && ds[0] <= 300, "3: distance objectives tier sanely",
    ds.join("/") + "m");
}

// 4. milestones sorted, lip-relative, each over real scenery (water at 500+)
{
  const ds = DA.MILESTONES.map((m) => m.d);
  const sorted = ds.every((v, i) => i === 0 || v >= ds[i - 1]);
  const maxGeo = ds[ds.length - 1] + 140;
  ok(sorted && maxGeo <= 4000, "4: milestones fit honest flight range", "top geo x=" + maxGeo + "m");
}

// 5. shop summaries + savings goal share one wallet number
{
  const s = {
    money: 500,
    upgrades: { ramp: 1, sled: 0, aero: 0, fuel: 0 },
    glider: { owned: [true, true, false, false, false, false], equipped: 1 },
    rocket: { owned: [true, false, false], equipped: 0 }
  };
  const t = DA.UI.testShopText(s);
  const goalOk = t.goal && t.goal.price === 700 && t.goal.pct === Math.floor(100 * 500 / 700);
  ok(goalOk, "5a: savings goal = next buy, one wallet number", JSON.stringify(t.goal));
  ok(t.glider.indexOf("1/5") >= 0 && t.glider.indexOf("Paper Dart") >= 0 &&
    t.rocket.indexOf("Puddle-Jumper") >= 0 && t.track.indexOf("Lv 1/") >= 0,
    "5b: section summaries name owned/equipped", t.glider + " | " + t.rocket + " | " + t.track);
  const maxed = {
    money: 0, upgrades: { ramp: 8, sled: 8, aero: 8, fuel: 5 },
    glider: { owned: [true, true, true, true, true, true], equipped: 5 },
    rocket: { owned: [true, true, true], equipped: 2 }
  };
  const t2 = DA.UI.testShopText(maxed);
  ok(t2.goal === null && t2.glider.indexOf("maxed") >= 0, "5c: maxed save has no goal");
}

console.log(`\nECONOMY TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
