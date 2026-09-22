/* Dodo Airways audio smoke tests. No framework; fake AudioContext.
   Run: node tests/audio.test.js   (exit 0 = all pass)
   audio.js loads in zero other suites, so a typo here would only explode
   in browsers. This executes every SFX, the wind layers, the booster,
   the music loop and the enable toggles against a stub context. */
"use strict";
const fs = require("fs");
const path = require("path");
function param(v) {
  return { value: v, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} };
}
function node() {
  return { connect() {}, disconnect() {}, start() {}, stop() {},
    gain: param(0), frequency: param(440), Q: param(1) };
}
global.window = {
  AudioContext: function () {
    return {
      state: "running", sampleRate: 44100, currentTime: 0, destination: {},
      resume() {}, createGain: () => node(), createOscillator: () => node(),
      createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
      createBufferSource: () => ({ buffer: null, loop: false, connect() {}, start() {}, stop() {} }),
      createBiquadFilter: () => node()
    };
  }
};
eval.call(null, fs.readFileSync(path.join(__dirname, "..", "js", "audio.js"), "utf8"));
const A = global.window.DA.Audio;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log("ok  " + m + (extra ? "  [" + extra + "]" : "")); }
  else { fail++; console.log("FAIL " + m + (extra ? "  [" + extra + "]" : "")); }
}
function runs(name, fn) {
  try { fn(); ok(true, name); }
  catch (e) { ok(false, name, (e && e.message) || "threw"); }
}
runs("ensure builds a context", () => A.ensure());
Object.keys(A.SFX).forEach((k) => runs("SFX." + k, () => A.SFX[k](2)));
runs("wind layers cycle", () => { A.startWind(); A.setWind(30, true); A.setWind(5, false); A.stopWind(); });
runs("booster cycle + double-stop", () => { A.startBoost(0.7); A.startBoost(0.3); A.stopBoost(); A.stopBoost(); });
runs("disable silences", () => A.setEnabled(false, false));
runs("re-enable restarts", () => A.setEnabled(true, true));
runs("music loop cycles", () => { A.startMusic(); A.stopMusic(); });

console.log(`\nAUDIO TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
