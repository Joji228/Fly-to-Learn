/* Dodo Airways UI navigation tests. No framework; element registry stub.
   Run: node tests/ui.test.js   (exit 0 = all pass)
   Locks in: ESC backs out exactly one screen level (sub-screens return,
   shop returns to menu, results/menu ignore it). */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "js");
function load(f) {
  eval.call(null, fs.readFileSync(path.join(DIR, f), "utf8"));
}
function mkEl(id) {
  const ctx = new Proxy(function () {}, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => 0;
      return ctx;
    },
    apply() { return ctx; }
  });
  return {
    id, children: [], style: {}, textContent: "", innerHTML: "", value: "",
    checked: false, disabled: false, width: 300, height: 150,
    _hidden: true,
    classList: {
      add(c) { if (c === "hidden") this._h = true; },
      remove(c) { if (c === "hidden") this._h = false; },
      toggle(c, f) { if (c === "hidden") this._h = (f === undefined) ? !this._h : !!f; },
      contains(c) { return c === "hidden" ? !!this._h : false; },
      _h: true
    },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {}, getContext() { return ctx; }, click() {}
  };
}
// classList methods need `this` = the classList object holding _h
function wire(el) {
  const cl = el.classList;
  ["add", "remove", "toggle", "contains"].forEach((k) => {
    const fn = cl[k];
    cl[k] = function (...a) { return fn.apply(cl, a); };
  });
  return el;
}
const els = {};
global.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const _store = {};
global.localStorage = {
  getItem: (k) => (k in _store ? _store[k] : null),
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; }
};
global.document = {
  getElementById: (id) => els[id] || (els[id] = wire(mkEl(id))),
  createElement: (t) => wire(mkEl(t)),
  createElementNS: () => null,
  addEventListener() {}, body: wire(mkEl("body"))
};
load("config.js");
load("gliders.js");
load("physics.js");
load("world.js");
load("save.js");
load("ui.js");
const DA = global.window.DA;
DA.Audio = {
  ensure() {}, setEnabled() {}, startMusic() {},
  SFX: { click() {}, denied() {}, purchase() {}, equip() {} }
};
DA.Game = { phase: "menu", save: null, particles: { enabled: true } };

const save = {
  money: 500, upgrades: { ramp: 1, sled: 0, aero: 0, fuel: 0 },
  glider: { owned: [true, true, false, false, false, false], equipped: 1 },
  rocket: { owned: [true, false, false], equipped: 0 },
  best: { dist: 0, alt: 0, speedKmh: 0, airTime: 0 }, flights: 0,
  objectivesDone: [], settings: { sfx: true, music: true, shake: true, particles: true },
  totalEarned: 0
};
DA.UI.init(save);

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}
const vis = (id) => !els[id].classList.contains("hidden");
function showOnly(id) {
  ["screen-menu", "screen-shop", "screen-results", "screen-stats", "screen-settings", "screen-cheats", "screen-pause"]
    .forEach((s) => document.getElementById(s).classList.toggle("hidden", s !== id));
}

// 1. settings -> ESC returns to menu (default subReturn)
showOnly("screen-settings");
DA.UI.escapePressed();
ok(vis("screen-menu") && !vis("screen-settings"), "1: ESC leaves settings for menu");

// 2. shop -> ESC returns to menu
showOnly("screen-shop");
DA.UI.escapePressed();
ok(vis("screen-menu") && !vis("screen-shop"), "2: ESC leaves shop for menu");

// 3. results -> ESC ignored (auto-flow owns results)
showOnly("screen-results");
DA.UI.escapePressed();
ok(vis("screen-results"), "3: ESC ignores results screen");

// 4. menu -> ESC ignored (nowhere to go)
showOnly("screen-menu");
DA.UI.escapePressed();
ok(vis("screen-menu"), "4: ESC ignores menu");

// 5. repeated ESC is stable and side-effect free
showOnly("screen-settings");
DA.UI.escapePressed();
DA.UI.escapePressed();
ok(vis("screen-menu") && !vis("screen-settings"), "5: double ESC stays on menu");

console.log(`\nUI TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
