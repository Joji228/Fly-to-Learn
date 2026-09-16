/* Dodo Airways sandbox + landing-streak save tests. No framework.
   Run: node tests/sandbox.test.js   (exit 0 = all pass)
   Locks in: fresh sandbox = all gear + funds (experimentation), campaign
   stays grindy, keys independent, streak fields backward compatible. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "js");
function load(f) {
  eval.call(null, fs.readFileSync(path.join(DIR, f), "utf8"));
}
const store = {};
global.window = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
load("config.js");
load("save.js");
const DA = global.window.DA;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}
function clear() { for (const k in store) delete store[k]; }

// 1. fresh campaign is still a grind start
{
  clear();
  DA.Save.setMode("campaign");
  const s = DA.Save.load();
  ok(s.money === 0 && s.glider.equipped === 0 && s.rocket.equipped === -1 &&
    s.glider.owned.filter(Boolean).length === 1,
    "1: campaign starts bare (grind preserved)");
}

// 2. fresh sandbox is all-access
{
  clear();
  DA.Save.setMode("sandbox");
  const s = DA.Save.load();
  ok(s.glider.owned.every(Boolean) && s.rocket.owned.every(Boolean) && s.money >= 50000,
    "2: sandbox fresh owns all gear with funds", "money=$" + s.money);
}

// 3. sandbox unlock never touches campaign
{
  clear();
  DA.Save.setMode("campaign");
  const c = DA.Save.load(); c.money = 111; DA.Save.save(c);
  DA.Save.setMode("sandbox");
  let b = DA.Save.load();
  b.money = 0;
  b.glider.owned = [true, false, false, false, false, false];
  DA.Save.save(b);
  b = DA.Save.load();
  DA.Save.sandboxUnlock(b); DA.Save.save(b);
  DA.Save.setMode("campaign");
  const c2 = DA.Save.load();
  ok(c2.money === 111 && c2.glider.owned.filter(Boolean).length === 1,
    "3: sandbox unlock leaves campaign alone");
  DA.Save.setMode("sandbox");
  const b2 = DA.Save.load();
  ok(b2.glider.owned.every(Boolean) && b2.money >= 50000,
    "3b: existing sandbox upgrades to all-access");
}

// 4. streak fields default + persist (backward compatible)
{
  clear();
  DA.Save.setMode("campaign");
  global.localStorage.setItem("dodoAirwaysSaveV1", JSON.stringify({ money: 50 }));
  const s = DA.Save.load();
  ok(s.landingStreak === 0 && s.bestStreak === 0, "4: old saves get zero streaks");
  s.landingStreak = 2; s.bestStreak = 5; DA.Save.save(s);
  const s2 = DA.Save.load();
  ok(s2.landingStreak === 2 && s2.bestStreak === 5, "4b: streaks round-trip");
}

// 5. new skill objectives check the right things
{
  const O = {};
  DA.OBJECTIVES.forEach((o) => { O[o.id] = o; });
  ok(O.smooth && O.smooth.check({ landing: "smooth", water: false }), "5a: smooth landing objective");
  ok(O.smooth && !O.smooth.check({ landing: "rough", water: false }), "5b: rough is not smooth");
  ok(O.smooth && !O.smooth.check({ landing: "smooth", water: true }), "5c: water is not style");
  ok(O.glide500 && O.glide500.check({ dist: 600, boostUsed: false }), "5d: pure glide 500m");
  ok(O.glide500 && !O.glide500.check({ dist: 600, boostUsed: true }), "5e: boosted flight is not pure");
  ok(O.streak3 && O.streak3.check({}, { bestStreak: 3 }), "5f: streak3 reads save");
  ok(O.streak3 && !O.streak3.check({}, { bestStreak: 2 }), "5g: streak2 is not enough");
  ok(O.smooth800 && O.smooth800.check({ landing: "smooth", water: false, dist: 900 }), "5h: long smooth");
}

// 6. max workshop helper caps every track
{
  clear();
  DA.Save.setMode("sandbox");
  const s = DA.Save.load();
  DA.Save.sandboxMaxWorkshop(s);
  ok(s.upgrades.ramp === 8 && s.upgrades.sled === 8 && s.upgrades.aero === 8 && s.upgrades.fuel === 5,
    "6: sandbox maxes workshop", JSON.stringify(s.upgrades));
  DA.Save.setMode("campaign");
}

console.log(`\nSANDBOX TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
