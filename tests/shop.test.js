/* Dodo Airways shop recommendation tests. No framework; minimal DOM stub.
   Run: node tests/shop.test.js   (exit 0 = all pass)
   Verifies the progression-aware hot-pick: first glider > first rocket >
   next tiers > fuel-only-with-rocket > workshop, never fuel without one. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "js");
function load(f) {
  eval.call(null, fs.readFileSync(path.join(DIR, f), "utf8"));
}
global.window = {};
global.document = {
  getElementById: function() {
    return { classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){ return true; } },
      style: {}, textContent: "", innerHTML: "", appendChild: function(){}, addEventListener: function(){} };
  },
  createElement: function() {
    return { classList: { add: function(){}, remove: function(){}, toggle: function(){} },
      style: {}, textContent: "", innerHTML: "", appendChild: function(){}, addEventListener: function(){} };
  },
  addEventListener: function(){}
};
load("config.js");
load("gliders.js");
load("ui.js");
const DA = global.window.DA;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}
function mkSave(o) {
  o = o || {};
  return {
    money: o.money || 0,
    upgrades: Object.assign({ ramp: 0, sled: 0, aero: 0, fuel: 0 }, o.upgrades),
    glider: { owned: o.gOwned || [true, false, false, false, false, false], equipped: o.gEq || 0 },
    rocket: { owned: o.rOwned || [false, false, false], equipped: (o.rEq === undefined ? -1 : o.rEq) }
  };
}
function top(s) {
  const r = DA.UI.testRank(mkSave(s));
  return r.length ? r[0] : null;
}
function hasFuel(s) {
  return DA.UI.testRank(mkSave(s)).some((c) => c.type === "track" && c.id === "fuel");
}

// CASE A: fresh save -> first real glider (Paper), never bare/nothing
{
  const t = top({ money: 0 });
  ok(t && t.type === "glider" && t.id === 1, "A: fresh save recommends Paper Dart", t && (t.type + ":" + t.id));
}
// CASE B: own Paper, no rocket -> first rocket
{
  const t = top({ money: 0, gOwned: [true, true, false, false, false, false], gEq: 1 });
  ok(t && t.type === "rocket" && t.id === 0, "B: paper-no-rocket recommends Puddle-Jumper", t && (t.type + ":" + t.id));
}
// CASE C: no rocket -> fuel is NEVER recommended
{
  ok(!hasFuel({ money: 99999 }), "C1: fresh rich save never offered fuel");
  ok(!hasFuel({ money: 99999, gOwned: [true, true, true, false, false, false], gEq: 2 }), "C2: kite, no rocket: still no fuel");
}
// CASE D: early rocket owned -> fuel becomes a valid recommendation
{
  const r = DA.UI.testRank(mkSave({ money: 99999, gOwned: [true, true, false, false, false, false], gEq: 1, rOwned: [true, false, false], rEq: 0 }));
  ok(r.some((c) => c.type === "track" && c.id === "fuel"), "D: rocket owner is offered fuel");
}
// CASE E: late game prefers next-tier gear over cheap workshop bits
{
  const t = top({ money: 99999, gOwned: [true, true, true, false, false, false], gEq: 2,
    rOwned: [true, false, false], rEq: 0, upgrades: { ramp: 8, sled: 8, aero: 8, fuel: 2 } });
  ok(t && ((t.type === "glider" && t.id === 3) || (t.type === "rocket" && t.id === 1)),
    "E: late game prefers next glider/rocket tier", t && (t.type + ":" + t.id));
}
// CASE F: fully maxed -> empty recommendation list (nothing to push)
{
  const r = DA.UI.testRank(mkSave({ money: 999999,
    gOwned: [true, true, true, true, true, true], gEq: 5,
    rOwned: [true, true, true], rEq: 2,
    upgrades: { ramp: 8, sled: 8, aero: 8, fuel: 5 } }));
  ok(r.length === 0, "F: maxed save recommends nothing", r.length + " cands");
}

console.log(`\nSHOP TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
