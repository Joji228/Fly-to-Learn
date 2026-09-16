/* Dodo Airways focus tests. No framework; minimal DOM stubs.
   Run: node tests/focus.test.js   (exit 0 = all pass)
   Locks in: alt-tab / clicking another window NEVER force-pauses the
   flight (dual-monitor friendly). Backgrounding only releases held inputs
   and quiets audio; the sim keeps its phase and unpaused state. */
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
const winHandlers = {};
const docHandlers = {};
global.window = {
  addEventListener(t, f) { winHandlers[t] = f; },
  devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800
};
global.document = {
  getElementById: elStub, addEventListener(t, f) { docHandlers[t] = f; }, hidden: false
};
global.requestAnimationFrame = () => 0;
load("config.js");
load("gliders.js");
load("physics.js");
load("world.js");
load("game.js");
const DA = global.window.DA, Game = DA.Game;
let stopBoostCalls = 0;
DA.Audio = {
  ensure() {}, startWind() {}, stopWind() {}, setWind() {},
  stopBoost() { stopBoostCalls++; }, startBoost() {},
  SFX: { launch() {}, stall() {}, milestone() {}, splash() {}, smooth() {}, impact() {}, record() {} }
};
DA.UI = {
  enterPressed() {}, onRunStart() {}, showFlight() {}, onLaunch() {}, onRecord() {},
  toast() {}, floatText() {}, onBoostStart() {}, onCrash() {}, showResults() {},
  showMenu() {}, updateHUD() {}
};
DA.Save = { save() {} };
function freshSave() {
  return {
    upgrades: { ramp: 0, sled: 0, aero: 0, fuel: 0 },
    glider: { equipped: 1 }, rocket: { equipped: 0 },
    settings: { particles: false, shake: false },
    best: { dist: 0, alt: 0, speedKmh: 0, airTime: 0 },
    money: 0, totalEarned: 0, flights: 0, objectivesDone: []
  };
}

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}

Game.save = freshSave();
Game.particles = { clear() {}, spawn() {}, burst() {}, update() {} };
Game.canvas = { width: 0, height: 0, style: {}, getContext: () => anyProxy() };
DA.gameInit(Game.canvas, Game.save, Game.particles);
Game.W = 1280; Game.H = 800;
ok(typeof winHandlers.blur === "function", "1: blur handler bound");
ok(typeof docHandlers.visibilitychange === "function", "2: visibilitychange handler bound");

// mid-flight with held inputs, then alt-tab away (blur)
DA.startRun();
Game.phase = "fly";
Game.paused = false;
Game.input.up = true; Game.input.down = false; Game.input.boost = true;
winHandlers.blur();
ok(Game.input.up === false && Game.input.boost === false, "3: blur releases held inputs (no stuck booster)");
ok(Game.paused === false && Game.phase === "fly", "4: blur never force-pauses");
ok(stopBoostCalls >= 1, "5: blur quiets booster audio");

// hidden tab: same — release + quiet, never pause
Game.phase = "fly";
Game.paused = false;
Game.input.boost = true;
global.document.hidden = true;
docHandlers.visibilitychange();
ok(Game.input.boost === false, "6: hide releases held inputs");
ok(Game.paused === false && Game.phase === "fly", "7: hide never force-pauses");
global.document.hidden = false;

// ---- pause/resume respects the contextual BOOST button ----
const tbEl = { style: { display: "" }, classList: { add() {}, toggle() {} } };
const tcEl = { classList: { add() {}, toggle() {} }, style: {} };
const pauseEl = { classList: { add() {}, toggle() {} }, style: {} };
const _origGet = global.document.getElementById;
global.document.getElementById = (id) => {
  if (id === "tc-boost") return tbEl;
  if (id === "touch-controls") return tcEl;
  if (id === "screen-pause") return pauseEl;
  return _origGet(id);
};
Game.save = freshSave();
Game.save.rocket.equipped = -1;
Game.phase = "fly"; Game.paused = false;
DA.pauseGame(true);
ok(Game.paused === true, "8: pause engages mid-flight");
DA.pauseGame(false);
ok(tbEl.style.display === "none", "9: resume keeps BOOST hidden with no rocket");
Game.save.rocket.equipped = 0;
DA.pauseGame(true); DA.pauseGame(false);
ok(tbEl.style.display === "", "10: resume restores BOOST with a rocket");

console.log(`\nFOCUS TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
