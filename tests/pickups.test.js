/* Dodo Airways pickups tests. No framework, no DOM.
   Run: node tests/pickups.test.js   (exit 0 = all pass)
   Locks in: the fish/ring course sits above the terrain and inside honest
   flight range, pickups pay exactly once per flight, the gust-ring kick is
   a fixed +RING_KICK along the path, and total ring energy is finite. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "js");
function load(f) {
  eval.call(null, fs.readFileSync(path.join(DIR, f), "utf8"));
}
global.window = {};
load("config.js");
load("gliders.js");
load("physics.js");
load("world.js");
load("pickups.js");
const DA = global.window.DA, PK = DA.Pickups, W = DA.World;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}

const C = PK.getCourse();
ok(C.rings.length >= 15 && C.rings.length <= 30, "1: ring count sane", C.rings.length + " rings");
ok(C.fish.length >= 100, "2: plenty of fish", C.fish.length + " fish");

const lowFish = C.fish.filter((f) => f.y - Math.max(0, W.groundY(f.x)) < 2.5);
ok(lowFish.length === 0, "3: every fish floats clear of the ground", lowFish.length + " too low");
const lowRing = C.rings.filter((r) => r.y - PK.RING_HALF - Math.max(0, W.groundY(r.x)) < 3);
ok(lowRing.length === 0, "4: every ring clears the ground", lowRing.length + " too low");

const maxX = Math.max(...C.fish.map((f) => f.x), ...C.rings.map((r) => r.x));
ok(maxX < 4400, "5: course ends inside honest flight range", "last item x=" + maxX.toFixed(0));
ok(C.fish.every((f) => f.x > 150), "6: no fish on the ramp");

// 7: flying straight through a fish collects it once, and never again
{
  const st = PK.newRun();
  const f = C.fish[0];
  const S = { x: f.x - 1, y: f.y, vx: 30, vy: 0, speed: 30 };
  let ev = PK.step(st, S, f.x - 2, 1 / 60);
  const first = ev.fish;
  ev = PK.step(st, S, f.x - 2, 1 / 60);
  ok(first >= 1 && ev.fish === 0 && st.fish === first, "7: fish pays exactly once", `first=${first} again=${ev.fish}`);
}

// 8: a ring adds exactly RING_KICK along the velocity, direction preserved
{
  const st = PK.newRun();
  const R = C.rings[0];
  const S = { x: R.x + 0.2, y: R.y, vx: 24, vy: -7, speed: 25 };
  const sp0 = Math.hypot(S.vx, S.vy), ang0 = Math.atan2(S.vy, S.vx);
  const ev = PK.step(st, S, R.x - 0.3, 1 / 60);
  const sp1 = Math.hypot(S.vx, S.vy), ang1 = Math.atan2(S.vy, S.vx);
  ok(ev.ring && Math.abs(sp1 - sp0 - PK.RING_KICK) < 1e-9 && Math.abs(ang1 - ang0) < 1e-9,
    "8: ring kick is +RING_KICK along the path", `+${(sp1 - sp0).toFixed(2)} m/s`);
  const again = PK.step(st, { x: R.x + 0.2, y: R.y, vx: 24, vy: -7 }, R.x - 0.3, 1 / 60);
  ok(!again.ring, "9: a ring pays once per flight");
}

// 10: missing the hoop vertically gives nothing
{
  const st = PK.newRun();
  const R = C.rings[1];
  const S = { x: R.x + 0.2, y: R.y + PK.RING_HALF + 3, vx: 30, vy: 0 };
  ok(!PK.step(st, S, R.x - 0.3, 1 / 60).ring, "10: flying over a ring does not trigger it");
}

// 11: total ring energy is finite (bounded by ring count x kick)
ok(C.rings.length * PK.RING_KICK < 250, "11: total ring energy bounded",
  (C.rings.length * PK.RING_KICK) + " m/s across the whole course");

// 12: a fresh run starts clean
{
  const st = PK.newRun();
  ok(st.fish === 0 && st.rings === 0 && st.fishGot.every((v) => !v), "12: newRun starts with nothing collected");
}

console.log(`\nPICKUPS TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
