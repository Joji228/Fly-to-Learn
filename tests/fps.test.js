/* Dodo Airways fixed-step determinism tests. No framework; minimal DOM stubs.
   Run: node tests/fps.test.js   (exit 0 = all pass)
   Locks in: identical scripted input schedules produce (near-)identical
   flights at 20/30/60/120 FPS through the REAL game loop + accumulator.
   Small boundary tolerance only: inputs are sampled per fixed slice, so a
   schedule edge can fall on either side of one slice at different rates. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "js");
function load(f) {
  eval.call(null, fs.readFileSync(path.join(DIR, f), "utf8"));
}

// ---- browser stubs (render runs against a no-op canvas proxy) ----
function anyProxy() {
  return new Proxy(function () {}, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => 0;
      return anyProxy();
    },
    apply() { return anyProxy(); }
  });
}
const elStub = () => ({ classList: { add() {}, toggle() {} }, style: {} });
global.window = { addEventListener() {}, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800 };
global.document = { getElementById: elStub, addEventListener() {}, hidden: false };
global.requestAnimationFrame = () => 0;

load("config.js");
load("gliders.js");
load("physics.js");
load("world.js");
load("game.js");
const DA = global.window.DA, Game = DA.Game;

// deterministic silences: particles off (no Math.random branches in update),
// audio/UI/save/particles replaced by no-ops.
DA.Audio = {
  ensure() {}, startWind() {}, stopWind() {}, stopBoost() {}, startBoost() {}, setWind() {},
  SFX: { launch() {}, stall() {}, milestone() {}, splash() {}, smooth() {}, impact() {}, record() {} }
};
DA.UI = {
  enterPressed() {}, onRunStart() {}, showFlight() {}, onLaunch() {}, onRecord() {},
  toast() {}, floatText() {}, onBoostStart() {}, onCrash() {}, showResults() {},
  showMenu() {}, updateHUD() {}
};
DA.Save = { save() {} };
const stubParticles = () => ({ clear() {}, spawn() {}, burst() {}, update() {} });

function freshSave() {
  return {
    upgrades: { ramp: 0, sled: 0, aero: 0, fuel: 0 },
    glider: { equipped: 1 }, rocket: { equipped: 0 },
    settings: { particles: false, shake: false },
    best: { dist: 0, alt: 0, speedKmh: 0, airTime: 0 },
    money: 0, totalEarned: 0, flights: 0, objectivesDone: []
  };
}

function simTime() {
  if (Game.phase === "ramp") return Game.rampT;
  return Game.rampDur + Game.S.airTime;
}

// scripted pilot, keyed on SIM time (same schedule at every frame rate)
function schedule() {
  const st = simTime();
  Game.input.up = st > 0.5 && st < 2.5;
  Game.input.down = false;
  Game.input.boost = st > 1.0 && st < 3.0;
}

function runFlight(frameDtMs) {
  Game.save = freshSave();
  Game.particles = stubParticles();
  Game.canvas = { width: 0, height: 0, style: {} };
  Game.g = anyProxy();
  Game.W = 1280; Game.H = 800;
  Game.acc = 0; Game.lastT = 0; Game.zoom = 1;
  DA.startRun();
  let t = 0;
  for (let i = 0; i < 40 * 120 + 100; i++) {
    t += frameDtMs;
    schedule();
    DA.gameLoop(t);
    if (Game.phase === "results") break;
  }
  return { dist: Game.runStats.dist, air: Game.runStats.airTime, phase: Game.phase };
}

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}

const r60 = runFlight(1000 / 60);
ok(r60.phase === "results", "baseline 60 FPS flight completes", `dist=${r60.dist.toFixed(1)}m air=${r60.air.toFixed(2)}s`);
for (const fps of [20, 25, 30, 120]) {
  const r = runFlight(1000 / fps);
  const dDist = Math.abs(r.dist - r60.dist) / Math.max(1, r60.dist);
  const dAir = Math.abs(r.air - r60.air) / Math.max(0.5, r60.air);
  ok(r.phase === "results" && dDist < 0.05 && dAir < 0.05,
    `${fps} FPS matches 60 FPS within 5%`,
    `dist=${r.dist.toFixed(1)}m (${(100 * dDist).toFixed(1)}%) air=${r.air.toFixed(2)}s (${(100 * dAir).toFixed(1)}%)`);
}

console.log(`\nFPS TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
