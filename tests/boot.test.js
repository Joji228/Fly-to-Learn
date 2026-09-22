/* Dodo Airways boot integration tests. No framework; functional DOM stub.
   Run: node tests/boot.test.js   (exit 0 = all pass)
   Boots the REAL modules the way main.js does (save -> particles ->
   gameInit -> UI.init -> showMenu), then LAUNCHES a real flight, flies it
   to results, opens the shop, and pauses/resumes — catching wiring faults
   between modules that unit suites stub away. */
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
function mkEl(tag) {
  const el = {
    tag, children: [], style: {}, _attrs: {}, _handlers: {},
    textContent: "", innerHTML: "", value: "", checked: false,
    disabled: false, width: 300, height: 150, files: [], offsetWidth: 100,
    classList: {
      add(c) { el._cls[c] = true; }, remove(c) { delete el._cls[c]; },
      toggle(c, f) {
        if (f === undefined) { if (el._cls[c]) delete el._cls[c]; else el._cls[c] = true; }
        else if (f) el._cls[c] = true; else delete el._cls[c];
      },
      contains(c) { return !!el._cls[c]; }
    },
    _cls: {},
    appendChild(c) { el.children.push(c); return c; },
    remove() {}, click() { if (typeof el.onclick === "function") el.onclick(); },
    addEventListener(t, f) { (el._handlers[t] = el._handlers[t] || []).push(f); },
    setAttribute(k, v) { el._attrs[k] = v; },
    getAttribute(k) { return el._attrs[k]; },
    getContext() { return anyProxy(); }
  };
  return el;
}
const els = {};
function byId(id) {
  if (!els[id]) els[id] = mkEl("#" + id);
  return els[id];
}
function mkNS() { return { setAttribute() {}, textContent: "" }; }
global.window = {
  addEventListener() {}, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800,
  matchMedia: () => ({ matches: false })
};
global.document = {
  getElementById: byId,
  createElement: (t) => mkEl(t),
  createElementNS: () => mkNS(),
  addEventListener() {}, body: mkEl("body"), activeElement: null
};
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
global.requestAnimationFrame = () => 0;
load("config.js");
load("gliders.js");
load("save.js");
load("particles.js");
load("audio.js");
load("physics.js");
load("world.js");
load("game.js");
load("ui.js");
const DA = global.window.DA, Game = DA.Game;
DA.Audio = {
  ensure() {}, setEnabled() {}, startMusic() {}, stopMusic() {},
  startWind() {}, stopWind() {}, stopBoost() {}, startBoost() {}, setWind() {},
  SFX: { click() {}, denied() {}, purchase() {}, equip() {}, launch() {}, whoosh() {},
    ignite() {}, stall() {}, milestone() {}, splash() {}, smooth() {}, impact() {},
    record() {}, fuelEmpty() {}, recover() {}, coin() {} }
};

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}
const vis = (id) => !byId(id).classList.contains("hidden");
function step(t, n) {
  for (let i = 0; i < n; i++) { t.t += 1000 / 60; DA.gameLoop(t.t); }
  return t.t;
}
try {
  // 1-2. boot path exactly like main.js
  const save = DA.Save.load();
  const particles = new DA.Particles();
  particles.enabled = save.settings.particles;
  DA.gameInit(byId("game"), save, particles);
  Game.save = save; Game.particles = particles;
  DA.UI.init(save);
  DA.UI.showMenu();
  Game.lastT = 0;
  ok(vis("screen-menu") && !vis("hud"), "1: boot lands on menu, HUD hidden");
  ok(byId("glider-grid").children.length >= 6, "2: shop pre-renders hangar cards",
    byId("glider-grid").children.length + " nodes");

  // 3-5. LAUNCH a real flight and fly it to results on autopilot
  byId("btn-fly").click();
  let t = { t: 0 };
  const D = Math.PI / 180;
  for (let i = 0; i < 60 * 400 && Game.phase !== "results"; i++) {
    t.t += 1000 / 60;
    if (Game.phase === "fly" && Game.S) {
      const S = Game.S, inp = Game.input;
      inp.up = inp.down = inp.boost = false;
      if (S.fuelMax > 0 && S.fuel > 0.05) {
        const w = 30 * D;
        if (S.pitch < w - 0.02) inp.up = true; else if (S.pitch > w + 0.02) inp.down = true;
        inp.boost = true;
      } else if (S.speed < 13) inp.down = true;
      else if (S.vy < -16) inp.up = true;
      else if (S.y > 60) inp.down = true;
    }
    DA.gameLoop(t.t);
  }
  ok(Game.phase === "results", "3: maiden flight reaches results", `dist=${Game.runStats.dist.toFixed(0)}m`);
  ok(vis("screen-results"), "4: results screen shows");
  ok(Game.save.money > 0 && Game.save.flights === 1, "5: maiden flight banks",
    `$${Game.save.money} flights=${Game.save.flights}`);
  ok(byId("results-breakdown").children.length >= 4, "6: breakdown rows render",
    byId("results-breakdown").children.length + " rows");

  // 7-8. shop opens with real cards; pause overlay toggles mid-flight
  DA.UI.showShop();
  ok(vis("screen-shop") && byId("rocket-grid").children.length >= 4, "7: shop opens with rocket cards");
  byId("btn-shop-fly").click(); // launch from shop
  step({ t: t.t }, 30);
  DA.pauseGame(true);
  ok(Game.paused && vis("screen-pause"), "8a: pause overlay shows mid-flight");
  DA.pauseGame(false);
  ok(!Game.paused && !vis("screen-pause"), "8b: resume hides it");
} catch (e) {
  ok(false, "boot integration threw", (e && e.stack || e).toString().split("\n").slice(0, 3).join(" | "));
}

console.log(`\nBOOT TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
