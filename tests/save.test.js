/* Dodo Airways save tests. No framework; localStorage stubbed.
   Run: node tests/save.test.js   (exit 0 = all pass)
   Locks in: v2 defaults, never-wipe migrations, launch-origin best
   migration, separate campaign/sandbox keys, export/import round-trip. */
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

// 1. fresh defaults are v2 campaign saves
{
  clear();
  DA.Save.setMode("campaign");
  const s = DA.Save.load();
  ok(s.version === 2 && s.mode === "campaign" && s.money === 0 &&
    s.glider.equipped === 0 && s.rocket.equipped === -1, "1: fresh defaults are v2 campaign");
}

// 2. never wipe: legacy wings/booster migrate to equipment, fuel refunds
{
  clear();
  DA.Save.setMode("campaign");
  global.localStorage.setItem("dodoAirwaysSaveV1", JSON.stringify({
    money: 100, upgrades: { ramp: 2, sled: 1, aero: 0, fuel: 0, wings: 5, booster: 3 },
    best: { dist: 500, alt: 50, speedKmh: 120, airTime: 10 }, flights: 7,
    objectivesDone: ["d250"], settings: { sfx: true, music: false, shake: true, particles: true },
    totalEarned: 1000
  }));
  const s = DA.Save.load();
  ok(s.glider.equipped === 3 && s.rocket.equipped === 1 && s.upgrades.ramp === 2 &&
    s.flights === 7 && s.money >= 100, "2: legacy wings/booster migrate, progress kept",
    `glider=${s.glider.equipped} rocket=${s.rocket.equipped} money=${s.money}`);
}

// 3. v1 best.dist migrates to the launch-relative origin (-140 m)
{
  clear();
  DA.Save.setMode("campaign");
  global.localStorage.setItem("dodoAirwaysSaveV1", JSON.stringify({
    best: { dist: 1000, alt: 50, speedKmh: 120, airTime: 10 }
  }));
  const s = DA.Save.load();
  ok(Math.abs(s.best.dist - 860) < 1e-9, "3: v1 best distance re-based to launch origin", s.best.dist + "m");
}

// 4. campaign and sandbox progress live in separate keys (sandbox fresh is
// all-access by design, campaign stays grindy)
{
  clear();
  DA.Save.setMode("campaign");
  const c = DA.Save.load(); c.money = 111; DA.Save.save(c);
  DA.Save.setMode("sandbox");
  const b0 = DA.Save.load();
  const separate = b0.money !== 111 && b0.glider.owned.every(Boolean);
  b0.money = 222; DA.Save.save(b0);
  DA.Save.setMode("campaign");
  const c2 = DA.Save.load();
  ok(separate && c2.money === 111, "4: campaign/sandbox saves are independent",
    `campaign=$${c2.money} sandbox-all-access=${separate}`);
  DA.Save.setMode("campaign");
}

// 5. export/import round-trip preserves progress (through sanitize path)
{
  clear();
  DA.Save.setMode("campaign");
  const s = DA.Save.load();
  s.money = 777; s.flights = 3; DA.Save.save(s);
  const blob = DA.Save.exportJSON();
  clear();
  const back = DA.Save.importJSON(blob);
  ok(back.money === 777 && back.flights === 3, "5: export/import round-trips progress");
}

// 6. corrupted saves fall back to defaults (never crash, never wipe blindly)
{
  clear();
  DA.Save.setMode("campaign");
  global.localStorage.setItem("dodoAirwaysSaveV1", "{not json!!");
  const s = DA.Save.load();
  ok(s.money === 0 && s.glider.equipped === 0, "6: corrupted save falls back to defaults");
  try { DA.Save.importJSON("{not json!!"); ok(false, "7: invalid import throws"); }
  catch (e) { ok(true, "7: invalid import throws"); }
}

// 8. persistence probe reports honestly
{
  ok(DA.Save.stored() === true, "8a: probe passes when storage works");
  const realSet = global.localStorage.setItem;
  global.localStorage.setItem = () => { throw new Error("denied"); };
  ok(DA.Save.stored() === false, "8b: probe fails when storage blocked");
  global.localStorage.setItem = realSet;
}

// 9. export/import still work when the browser refuses storage (the boot
//    toast sends exactly these players to Export): export serializes the
//    live save, import sanitizes straight from the file
{
  clear();
  DA.Save.setMode("campaign");
  const realGet = global.localStorage.getItem, realSet = global.localStorage.setItem;
  global.localStorage.getItem = () => { throw new Error("denied"); };
  global.localStorage.setItem = () => { throw new Error("denied"); };
  const live = DA.Save.load();
  live.money = 4321; live.flights = 9; live.glider.owned[1] = true; live.glider.equipped = 1;
  const out = JSON.parse(DA.Save.exportJSON(live));
  ok(out.money === 4321 && out.flights === 9 && out.version === 2, "9a: export writes the live save without storage");
  const back = DA.Save.importJSON(JSON.stringify(out));
  ok(back.money === 4321 && back.flights === 9 && back.glider.equipped === 1,
    "9b: import loads the file without storage", `$${back.money}`);
  const junk = DA.Save.importJSON(JSON.stringify({ version: 2, money: 1e15, objectivesDone: ["d250", "<img>"] }));
  ok(junk.money === 999999999 && junk.objectivesDone.join() === "d250", "9c: storage-free import still sanitizes");
  global.localStorage.getItem = realGet; global.localStorage.setItem = realSet;
}

console.log(`\nSAVE TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
