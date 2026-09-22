/* Dodo Airways root test runner. No dependencies, vanilla Node.
   Run: node scripts/run-all.js   (exit 0 = all gates pass)
   Gates (must exit 0): all tests/*.test.js + scripts/repro-exploit.js
   Informational (always exit 0, output shown): balance, economy, skill-ceiling. */
"use strict";
const { spawnSync } = require("child_process");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const GATES = [
  "tests/audio.test.js",
  "tests/balance.test.js",
  "tests/boot.test.js",
  "tests/economy.test.js",
  "tests/feel.test.js",
  "tests/focus.test.js",
  "tests/fps.test.js",
  "tests/loop.test.js",
  "tests/touch.test.js",
  "tests/physics.test.js",
  "tests/ramp.test.js",
  "tests/save.test.js",
  "tests/shop.test.js",
  "tests/ui.test.js",
  "tests/world.test.js",
  "tests/sandbox.test.js",
  "tests/rewards.test.js",
  "tests/pickups.test.js",
  "scripts/repro-exploit.js"
];
const INFO = [
  "scripts/balance.js",
  "scripts/economy.js",
  "scripts/skill-ceiling.js"
];
let fail = 0;
// syntax gate: audio.js/main.js load in zero tests, so a typo there would
// only explode in browsers. --check is dependency-free and instant.
const CHECK = [
  "js/config.js", "js/gliders.js", "js/save.js", "js/audio.js", "js/physics.js",
  "js/world.js", "js/particles.js", "js/pickups.js", "js/game.js", "js/ui.js", "js/main.js"
];
for (const f of CHECK) {
  const r = spawnSync(process.execPath, ["--check", path.join(ROOT, f)], { encoding: "utf8" });
  const code = (r.status === null || r.status === undefined) ? 1 : r.status;
  if (code !== 0) {
    fail++;
    console.log("SYNTAX FAIL: " + f);
    if (r.stderr) process.stderr.write(r.stderr);
  }
}
console.log(fail === 0 ? "syntax: all " + CHECK.length + " sources parse" : "syntax: FAILURES");
function run(rel, gate) {
  console.log("\n=== " + rel + " ===");
  const r = spawnSync(process.execPath, [path.join(ROOT, rel)], { encoding: "utf8" });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  const code = (r.status === null || r.status === undefined) ? 1 : r.status;
  if (gate && code !== 0) {
    fail++;
    console.log("GATE FAILED: " + rel + " (exit " + code + ")");
  } else if (!gate) {
    console.log("(informational, exit " + code + ")");
  }
  return code;
}
GATES.forEach((f) => run(f, true));
INFO.forEach((f) => run(f, false));
console.log("\nRUN-ALL: " + (fail === 0 ? "ALL GATES PASS" : fail + " GATE(S) FAILED"));
process.exit(fail ? 1 : 0);
