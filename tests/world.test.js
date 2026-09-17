/* Dodo Airways world terrain tests. No framework.
   Run: node tests/world.test.js   (exit 0 = all pass)
   Locks in: home snowfield bounds, downrange island contracts (landable,
   gentle, surf-separated), open-ocean water, terrain continuity (no
   cliffs), and a headless drawScene smoke pass over surf/islands/city. */
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
global.window = {};
load("config.js");
load("gliders.js");
load("world.js");
const DA = global.window.DA, W = DA.World;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}

// 1. home snowfield: ramp + snow are land, surf starts past x=500
{
  let good = true;
  for (let x = -60; x <= 500; x += 20) if (W.isWater(x)) good = false;
  for (const x of [501, 700, 1000, 1100]) if (!W.isWater(x)) good = false;
  ok(good, "1: snow strip is land, open water starts past x=500");
}

// 2. every island has dry land inside, water at its doorstep
{
  let good = true, info = [];
  for (const isl of W.ISLANDS) {
    const mid = (isl.x0 + isl.x1) / 2;
    const h = W.groundY(mid);
    const dryMid = !W.isWater(mid) && h > 2;
    const wetOut = W.isWater(isl.x0 - 5) && W.isWater(isl.x1 + 5);
    info.push(`${isl.x0}-${isl.x1}:h=${h.toFixed(1)}`);
    if (!dryMid || !wetOut) good = false;
  }
  ok(good && W.ISLANDS.length === 4, "2: four isles with dry hearts, wet doorsteps", info.join(" | "));
}

// 3. island slopes stay gentle (a flared touchdown can grease them).
// (Sampling starts past the launch lip: the ramp track meets low terrain
// at x=140 by design — flights leave the lip airborne, never land on it.)
{
  let worst = 0, at = 0;
  for (let x = 145; x < 4300; x += 2) {
    const s = Math.abs(W.groundY(x + 2) - W.groundY(x)) / 2;
    if (s > worst) { worst = s; at = x; }
  }
  ok(worst < 0.3, "3: max terrain slope stays gentle", `worst ${worst.toFixed(3)} at x=${at}`);
}

// 4. no cliffs on the landing grounds (continuity for crash/rollout)
{
  let worst = 0, at = 0;
  for (let x = 145; x < 4300; x += 2) {
    const j = Math.abs(W.groundY(x + 2) - W.groundY(x));
    if (j > worst) { worst = j; at = x; }
  }
  ok(worst < 1.5, "4: terrain is cliff-free", `worst step ${worst.toFixed(2)}m at x=${at}`);
}

// 5. far ocean stays water (no accidental continents)
{
  let good = true;
  for (const x of [5000, 8000, 12000, 20000]) if (!W.isWater(x)) good = false;
  ok(good, "5: far ocean is water");
}

// 6. headless renderer smoke: surf, isle, city isle all draw without errors
{
  let good = true;
  try {
    const g = anyProxy();
    for (const cx of [300, 1250, 2075, 3875]) {
      W.drawScene(g, 1280, 800, { x: cx - 200, y: 0 }, 1,
        { x: cx, y: 30, vx: 20, vy: 0, pitch: 0, glider: 2, rocket: 0 },
        { particles: { list: [] }, playerScale: 1 });
    }
  } catch (e) { good = false; console.log("   draw error: " + (e && e.message)); }
  ok(good, "6: drawScene survives surf/isle/city-isle passes");
}

console.log(`\nWORLD TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
