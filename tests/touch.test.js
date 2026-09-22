/* Dodo Airways touch-input tests. No framework.
   Run: node tests/touch.test.js   (exit 0 = all pass)
   Locks in: the touch buttons bind through the REAL gameInit, pointer
   press/release (and cancel) drive the flight inputs with no stuck
   booster, and touch steering/boost actually move the sim. */
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
function mkBtn() {
  const handlers = {};
  return {
    handlers,
    classList: { add() {}, toggle() {} }, style: {},
    addEventListener(t, f) { handlers[t] = f; }
  };
}
const els = { "tc-up": mkBtn(), "tc-down": mkBtn(), "tc-boost": mkBtn() };
const elStub = () => ({ classList: { add() {}, toggle() {} }, style: {}, addEventListener() {} });
global.window = {
  addEventListener() {}, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800
};
global.document = {
  getElementById: (id) => els[id] || elStub(),
  addEventListener() {}, hidden: false
};
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
function freshSave() {
  return {
    upgrades: { ramp: 0, sled: 0, aero: 0, fuel: 0, nitro: 0 },
    glider: { equipped: 1 }, rocket: { equipped: 0 },
    settings: { particles: false, shake: false },
    best: { dist: 0, alt: 0, speedKmh: 0, airTime: 0 },
    money: 0, totalEarned: 0, flights: 0, objectivesDone: [],
    landingStreak: 0, bestStreak: 0
  };
}

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}
const ev = () => ({ preventDefault() {} });

Game.save = freshSave();
Game.particles = { clear() {}, spawn() {}, burst() {}, update() {} };
Game.canvas = { width: 0, height: 0, style: {}, getContext: () => anyProxy() };
DA.gameInit(Game.canvas, Game.save, Game.particles);

// 1-2. all three buttons bound press + release paths
for (const id of ["tc-up", "tc-down", "tc-boost"]) {
  const h = els[id].handlers;
  ok(typeof h.pointerdown === "function" && typeof h.pointerup === "function" &&
    typeof h.pointercancel === "function",
    `bindings present on ${id}`);
}

// 3. press/release drives inputs (up)
DA.startRun();
els["tc-up"].handlers.pointerdown(ev());
ok(Game.input.up === true, "3: NOSE UP press steers up");
els["tc-up"].handlers.pointerup(ev());
ok(Game.input.up === false, "4: NOSE UP release stops");

// 5. cancel clears a held boost (no stuck booster when the OS kills the touch)
els["tc-boost"].handlers.pointerdown(ev());
ok(Game.input.boost === true, "5: BOOST press arms booster");
els["tc-boost"].handlers.pointercancel(ev());
ok(Game.input.boost === false, "6: BOOST cancel disarms (no stuck booster)");

// 7. touch steering moves the real sim: hold NOSE DOWN through flight
{
  Game.save = freshSave();
  Game.particles = { clear() {}, spawn() {}, burst() {}, update() {} };
  DA.startRun();
  let t = 0;
  for (let i = 0; i < 200; i++) { t += 1000 / 60; DA.gameLoop(t); } // ramp + launch
  ok(Game.phase === "fly", "7a: flight underway");
  const p0 = Game.S.pitch, s0 = Game.S.speed;
  els["tc-down"].handlers.pointerdown(ev());
  for (let i = 0; i < 60; i++) { t += 1000 / 60; DA.gameLoop(t); }
  els["tc-down"].handlers.pointerup(ev());
  ok(Game.S.pitch < p0 && Game.S.speed > s0, "7b: touch dive lowers nose, builds speed",
    `pitch ${(p0 * 57.3).toFixed(0)}°→${(Game.S.pitch * 57.3).toFixed(0)}° spd ${s0.toFixed(0)}→${Game.S.speed.toFixed(0)}`);
}

// 8. touch boost burns real fuel
{
  Game.save = freshSave();
  Game.particles = { clear() {}, spawn() {}, burst() {}, update() {} };
  DA.startRun();
  let t = 0;
  for (let i = 0; i < 200; i++) { t += 1000 / 60; DA.gameLoop(t); }
  const f0 = Game.S.fuel;
  els["tc-boost"].handlers.pointerdown(ev());
  for (let i = 0; i < 30; i++) { t += 1000 / 60; DA.gameLoop(t); }
  els["tc-boost"].handlers.pointerup(ev());
  ok(Game.S.fuel < f0, "8: touch boost burns fuel", `${f0.toFixed(2)}s→${Game.S.fuel.toFixed(2)}s`);
}

console.log(`\nTOUCH TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
