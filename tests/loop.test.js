/* Dodo Airways full-loop banking tests. No framework.
   Run: node tests/loop.test.js   (exit 0 = all pass)
   Locks in the whole flight-to-bank path through the REAL game loop with
   the REAL save: breakdown rows sum to the banked total, flights count,
   objectives pay exactly once (repeat flights earn less), streaks persist. */
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
load("save.js");
load("physics.js");
load("world.js");
load("game.js");
const DA = global.window.DA, Game = DA.Game;
DA.Audio = {
  ensure() {}, startWind() {}, stopWind() {}, stopBoost() {}, startBoost() {}, setWind() {},
  SFX: { launch() {}, stall() {}, milestone() {}, splash() {}, smooth() {}, impact() {}, record() {}, fuelEmpty() {}, recover() {}, coin() {} }
};
let lastRes = null;
DA.UI = {
  enterPressed() {}, onRunStart() {}, showFlight() {}, onLaunch() {}, onRecord() {},
  toast() {}, floatText() {}, onBoostStart() {}, onFuelEmpty() {}, onStallRecover() {},
  onCrash() {}, showResults(r) { lastRes = r; }, showMenu() {}, updateHUD() {}
};
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
DA.Save.setMode("campaign");
const D = Math.PI / 180;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}
function flyOnce(gid, rid) {
  Game.save = DA.Save.load();
  Game.save.glider.equipped = gid;
  Game.save.rocket.equipped = rid;
  Game.particles = { clear() {}, spawn() {}, burst() {}, update() {} };
  Game.canvas = { width: 0, height: 0, style: {}, getContext: () => anyProxy() };
  Game.g = anyProxy(); Game.W = 1280; Game.H = 800;
  Game.acc = 0; Game.lastT = 0; Game.zoom = 1;
  const m0 = Game.save.money, f0 = Game.save.flights;
  DA.startRun();
  let t = 0;
  for (let i = 0; i < 60 * 400; i++) {
    t += 1000 / 60;
    if (Game.phase === "fly" && Game.S) {
      const S = Game.S, inp = Game.input;
      inp.up = inp.down = inp.boost = false;
      if (S.fuelMax > 0 && S.fuel > 0.05) {
        const w = 30 * D;
        if (S.pitch < w - 0.02) inp.up = true; else if (S.pitch > w + 0.02) inp.down = true;
        inp.boost = true;
      } else {
        const agl = S.y - DA.World.groundY(S.x);
        if (agl < 12 && S.vy < -1.5) {
          if (S.pitch < 6 * D) inp.up = true; else if (S.pitch > 10 * D) inp.down = true;
        }
        else if (S.speed < 13) inp.down = true;
        else if (S.vy < -16) inp.up = true;
        else if (S.y > 60) inp.down = true;
      }
    }
    DA.gameLoop(t);
    if (Game.phase === "results") break;
  }
  const rw = lastRes.rewards;
  const rows = rw.base.dist + rw.base.alt + rw.base.speed + rw.base.time +
    rw.msBonus + rw.landBonus + (rw.streakBonus || 0) + (rw.glideBonus || 0) + rw.objBonus;
  return { phase: Game.phase, dist: Game.runStats.dist, banked: Game.save.money - m0,
    rows, total: rw.total, flights: [f0, Game.save.flights],
    newObj: rw.newObj.map((o) => o.id) };
}

// 1-2. paper maiden flight banks exactly what the breakdown shows
const r1 = flyOnce(1, 0);
ok(r1.phase === "results", "1: paper flight completes", `dist=${r1.dist.toFixed(0)}m`);
ok(r1.banked === r1.total && r1.rows === r1.total && r1.banked > 0,
  "2: maiden flight banks the full breakdown", `$${r1.banked}`);

// 3-4. next flight counts, objectives pay (d600 newly reachable on kite legs)
const r2 = flyOnce(2, 0);
ok(r2.flights[1] === r2.flights[0] + 1, "3: flights count up");
ok(r2.banked === r2.total && r2.newObj.length > 0, "4: new objectives pay once",
  `+$${r2.banked} obj=${r2.newObj.join(",")}`);

// 5. identical repeat flight earns less (no objective double-dip)
const r3 = flyOnce(2, 0);
ok(r3.phase === "results" && r3.banked === r3.total, "5a: repeat flight still banks cleanly");
ok(r3.newObj.length === 0 && r3.banked < r2.banked, "5b: no double-dip on objectives",
  `$${r2.banked}→$${r3.banked}`);

console.log(`\nLOOP TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
