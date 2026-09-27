/* Dodo Airways landing / contact tests. No framework; minimal DOM stubs.
   Run: node tests/landing.test.js   (exit 0 = all pass)
   Locks in: S.y is the sled contact point (it rides the drawn ramp deck
   and rests on the ground after a crash), a landing rollout stops at the
   waterline instead of skating across the sea, and landing objectives
   judge the touchdown point, not where the rollout ended. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "js");
function load(f) {
  eval.call(null, fs.readFileSync(path.join(DIR, f), "utf8"));
}
function anyProxy() {
  return new Proxy(function () {}, {
    get(t, k) { if (k === Symbol.toPrimitive) return () => 0; return anyProxy(); },
    apply() { return anyProxy(); }
  });
}
const elStub = () => ({ classList: { add() {}, toggle() {} }, style: {}, addEventListener() {} });
global.window = { addEventListener() {}, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800 };
global.document = { getElementById: elStub, addEventListener() {}, hidden: false };
global.requestAnimationFrame = () => 0;
["config.js", "gliders.js", "physics.js", "world.js", "game.js"].forEach(load);
const DA = global.window.DA, Game = DA.Game, W = DA.World;
DA.Audio = {
  ensure() {}, startWind() {}, stopWind() {}, stopBoost() {}, startBoost() {}, setWind() {},
  SFX: { launch() {}, stall() {}, milestone() {}, splash() {}, smooth() {}, impact() {}, record() {}, whoosh() {} }
};
let results = null;
DA.UI = {
  enterPressed() {}, onRunStart() {}, showFlight() {}, onLaunch() {}, onRecord() {}, toast() {}, floatText() {},
  onBoostStart() {}, onCrash() {}, showResults(r) { results = r; }, showMenu() {}, updateHUD() {}
};
DA.Save = { save() {} };
const particles = { clear() {}, spawn() {}, burst() {}, update() {} };

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}
function freshSave() {
  return {
    upgrades: { ramp: 0, sled: 0, aero: 0, fuel: 0, nitro: 0 },
    glider: { equipped: 3, owned: [true, true, true, true, false, false] }, rocket: { equipped: -1, owned: [false, false, false] },
    settings: { particles: false, shake: false }, best: { dist: 0, alt: 0, speedKmh: 0, airTime: 0 },
    money: 0, totalEarned: 0, flights: 0, objectivesDone: [], landingStreak: 0, bestStreak: 0
  };
}
let t = 0;
function setup() {
  Game.save = freshSave(); Game.particles = particles;
  Game.canvas = { width: 0, height: 0, style: {}, getContext: () => anyProxy() }; Game.g = anyProxy();
  Game.W = 1280; Game.H = 800; Game.acc = 0; Game.lastT = 0; Game.zoom = 1; t = 0; results = null;
  DA.startRun();
}
function step(n) { for (let i = 0; i < n; i++) { t += 1000 / 60; DA.gameLoop(t); } }

// 1. the sled rides the drawn deck (track + 2 m) and leaves the lip at the release height
{
  setup();
  step(20);
  const onDeck = Math.abs(Game.S.y - (W.rampY(Game.S.x) + 2)) < 1e-6;
  while (Game.phase === "ramp") step(1);
  ok(onDeck && Math.abs(Game.S.y - (W.rampY(Game.S.x) + 3)) < 0.6, "1: sled rides the deck, launches at lip + 3 m",
    `launch y=${Game.S.y.toFixed(2)} lip=${W.rampY(Game.S.x).toFixed(2)}`);
}

// 2. a smooth landing just before an island's far beach stops at the waterline
function landAt(x, vx) {
  setup();
  while (Game.phase === "ramp") step(1);
  Game.S.x = x; Game.S.y = W.groundY(x) + 0.05; Game.S.vx = vx; Game.S.vy = -1.5; Game.S.pitch = 0.02;
  Game.S.speed = Math.hypot(vx, 1.5);
  for (let i = 0; i < 120 && Game.phase === "fly"; i++) step(1);
  const touch = Game.runStats.touchDist, sev = Game.crashedInfo && Game.crashedInfo.severity;
  let maxX = Game.S.x;
  while (Game.phase === "crashed") { step(1); maxX = Math.max(maxX, Game.S.x); }
  return { touch, sev, maxX, wet: !!(Game.crashedInfo && Game.crashedInfo.wet) };
}
{
  const palm = W.ISLANDS[0];
  let dryEnd = palm.x0; for (let x = palm.x0; x <= palm.x1; x += 0.25) if (!W.isWater(x)) dryEnd = x;
  const r = landAt(dryEnd - 4, 26);
  ok(r.sev === "smooth" && r.maxX <= dryEnd + 0.6 && r.wet, "2: rollout stops at the island's waterline",
    `${r.sev}, stopped at ${r.maxX.toFixed(1)} (dry until ${dryEnd.toFixed(1)})`);
  ok(Math.abs(r.touch - (dryEnd - 4 - DA.LAUNCH_X)) < 3, "3: touchdown distance recorded", r.touch.toFixed(1) + " m");
}

// 4. the same at the mainland shore: never slide onto the sea
{
  const r = landAt(490, 26);
  ok(r.maxX <= 500.6, "4: rollout stops at the shoreline", "stopped at " + r.maxX.toFixed(1));
}

// 5. an island objective judges the touchdown, even if the rollout ends past the window
{
  const O = DA.OBJECTIVES.find((o) => o.id === "palm");
  const s = { landing: "smooth", water: false, dist: 1215, touchDist: 1195 };
  ok(O.check(s) && !O.check({ landing: "smooth", water: false, dist: 1195, touchDist: 1215 }),
    "5: Palm Isle objective uses the touchdown point");
}

console.log(`\nLANDING TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
