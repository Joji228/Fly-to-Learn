/* Save/load via localStorage.
   Shape: money, upgrades {ramp,sled,aero}, glider {owned[6],equipped},
   rocket {owned[3],equipped -1=none}, best, flights, objectivesDone,
   settings, totalEarned.
   Migrations (never wipe): legacy wings level -> glider ladder, legacy
   booster level -> rocket tier, legacy fuel levels -> modest cash refund. */
(function(){
"use strict";
/* Save format v2. Campaign and sandbox keep SEPARATE keys so each mode's
   progress survives independently. v1 -> v2 migration: best.dist moves to
   the launch-relative origin (minus the old 140 m lip offset). */
var KEY_CAMPAIGN = "dodoAirwaysSaveV1";
var KEY_SANDBOX = "dodoAirwaysSandboxV1";
var MODE_KEY = "dodoAirwaysModeV1";
var SAVE_VERSION = 2;
var LIP_OFFSET = 140; // pre-v2 best distances were measured from x=0
var NGL = 6, NRK = 3;

var currentMode = "campaign";
try{
  var m = localStorage.getItem(MODE_KEY);
  if(m === "sandbox") currentMode = "sandbox";
}catch(e){}
function getMode(){ return currentMode; }
function setMode(m){
  currentMode = (m === "sandbox") ? "sandbox" : "campaign";
  try{ localStorage.setItem(MODE_KEY, currentMode); }catch(e){}
}
function keyFor(mode){ return (mode || currentMode) === "sandbox" ? KEY_SANDBOX : KEY_CAMPAIGN; }

// legacy wings 0-8 (or old glider id 0-9) -> new glider id 0-5
function wingsToGlider(w){
  if(w <= 0) return 0;
  if(w === 1) return 1;
  if(w === 2) return 2;
  if(w === 3) return 2;
  if(w === 4) return 3;
  if(w === 5) return 3;
  if(w === 6) return 4;
  if(w === 7) return 4;
  return 5;
}
// legacy booster 0-8 -> rocket id (-1 = none)
function boosterToRocket(b){
  if(b <= 0) return -1;
  if(b <= 2) return 0;
  if(b <= 4) return 1;
  return 2;
}

function freshGlider(){
  var owned = [];
  for(var i=0;i<NGL;i++) owned.push(i === 0);
  return { owned:owned, equipped:0 };
}
function freshRocket(){
  return { owned:[false, false, false], equipped:-1 };
}

function defaults(){
  return {
    version: SAVE_VERSION,
    mode: currentMode,
    money: 0,
    upgrades: { ramp:0, sled:0, aero:0, fuel:0 },
    glider: freshGlider(),
    rocket: freshRocket(),
    best: { dist:0, alt:0, speedKmh:0, airTime:0 },
    flights: 0,
    objectivesDone: [],
    settings: { sfx:true, music:true, shake:true, particles:true },
    totalEarned: 0
  };
}

function num(v, lo, hi, fb){
  if(typeof v !== "number" || !isFinite(v)) return fb;
  v = Math.floor(v);
  if(v < lo) return lo;
  if(v > hi) return hi;
  return v;
}

function sanitizeGlider(g){
  var out = freshGlider();
  if(g && typeof g === "object" && Array.isArray(g.owned)){
    for(var i=0;i<NGL && i<g.owned.length;i++) out.owned[i] = !!g.owned[i];
  }
  out.owned[0] = true;
  var eq = num(g && g.equipped, 0, NGL-1, 0);
  if(!out.owned[eq]){
    eq = 0;
    for(var j=NGL-1;j>=0;j--) if(out.owned[j]){ eq = j; break; }
  }
  out.equipped = eq;
  return out;
}

function sanitizeRocket(r){
  var out = freshRocket();
  if(r && typeof r === "object" && Array.isArray(r.owned)){
    for(var i=0;i<NRK && i<r.owned.length;i++) out.owned[i] = !!r.owned[i];
  }
  var eq = (r && typeof r.equipped === "number" && isFinite(r.equipped)) ? Math.floor(r.equipped) : -1;
  if(eq < -1 || eq > NRK-1 || (eq >= 0 && !out.owned[eq])) eq = -1;
  if(eq === -1){
    for(var j=NRK-1;j>=0;j--) if(out.owned[j]){ eq = j; break; }
  }
  out.equipped = eq;
  return out;
}

function load(mode){
  var s = defaults();
  s.mode = (mode || currentMode);
  try{
    var raw = localStorage.getItem(keyFor(mode));
    if(!raw) return s;
    var d = JSON.parse(raw);
    if(d && typeof d === "object"){
      if(typeof d.money === "number" && isFinite(d.money)) s.money = Math.max(0, Math.floor(d.money));
      if(d.upgrades && typeof d.upgrades === "object"){
        // legacy 0-8 fuel track (always stored alongside a booster key) is NOT
        // the new 0-5 tank: it refunds as cash below, so never load it as a level
        var legacyFuel = (typeof d.upgrades.booster === "number" && typeof d.upgrades.fuel === "number");
        for(var k in s.upgrades){
          if(k === "fuel" && legacyFuel) continue;
          // per-track max comes from the shop def (fuel caps at 5); old saves default in
          var mx = (window.DA.UPGRADES && window.DA.UPGRADES[k]) ? window.DA.UPGRADES[k].max : 8;
          if(typeof d.upgrades[k] === "number") s.upgrades[k] = num(d.upgrades[k], 0, mx, 0);
        }
      }
      // --- glider: new shape, else old 10-glider shape, else legacy wings ---
      if(d.glider && Array.isArray(d.glider.owned) && d.glider.owned.length === NGL){
        s.glider = sanitizeGlider(d.glider);
      } else if(d.glider && Array.isArray(d.glider.owned) && d.glider.owned.length === 10){
        var gid = 0;
        for(var o=9;o>=0;o--) if(d.glider.owned[o]){ gid = wingsToGlider(o); break; }
        if(typeof d.glider.equipped === "number") gid = wingsToGlider(d.glider.equipped);
        for(var m=0;m<=gid;m++) s.glider.owned[m] = true;
        s.glider.equipped = gid;
      } else if(d.upgrades && typeof d.upgrades.wings === "number"){
        var gw = wingsToGlider(num(d.upgrades.wings, 0, 8, 0));
        for(var w=0;w<=gw;w++) s.glider.owned[w] = true;
        s.glider.equipped = gw;
      }
      // --- rocket: new shape, else legacy booster (+ fuel refund) ---
      if(d.rocket && Array.isArray(d.rocket.owned) && d.rocket.owned.length === NRK){
        s.rocket = sanitizeRocket(d.rocket);
      } else if(d.upgrades && typeof d.upgrades.booster === "number"){
        var rb = boosterToRocket(num(d.upgrades.booster, 0, 8, 0));
        if(rb >= 0){
          for(var q=0;q<=rb;q++) s.rocket.owned[q] = true;
          s.rocket.equipped = rb;
        }
        if(typeof d.upgrades.fuel === "number"){
          s.money += Math.min(2000, 250 * num(d.upgrades.fuel, 0, 8, 0)); // retired fuel tanks buy Dennis lunch
          s.upgrades.fuel = 0; // ...and never double-dip as new tank levels
        }
      }
      if(d.best && typeof d.best === "object"){
        ["dist","alt","speedKmh","airTime"].forEach(function(kk){
          if(typeof d.best[kk] === "number" && isFinite(d.best[kk])) s.best[kk] = Math.max(0, d.best[kk]);
        });
        // v1 -> v2: best distance moves to the launch-relative origin
        if(d.version !== SAVE_VERSION) s.best.dist = Math.max(0, s.best.dist - LIP_OFFSET);
      }
      if(typeof d.flights === "number" && isFinite(d.flights)) s.flights = Math.max(0, Math.floor(d.flights));
      if(Array.isArray(d.objectivesDone)) s.objectivesDone = d.objectivesDone.filter(function(x){ return typeof x === "string"; });
      if(d.settings && typeof d.settings === "object"){
        for(var j in s.settings){ if(typeof d.settings[j] === "boolean") s.settings[j] = d.settings[j]; }
      }
      if(typeof d.totalEarned === "number" && isFinite(d.totalEarned)) s.totalEarned = Math.max(0, Math.floor(d.totalEarned));
    }
  }catch(e){ /* corrupted save -> defaults */ }
  return s;
}

function save(s, mode){
  try{
    if(s && typeof s === "object"){ s.version = SAVE_VERSION; s.mode = (mode || currentMode); }
    localStorage.setItem(keyFor(mode), JSON.stringify(s));
  }catch(e){}
}
function reset(mode){
  try{ localStorage.removeItem(keyFor(mode)); }catch(e){}
}
/* Export / import the CURRENT mode's save as JSON (settings screen). */
function exportJSON(mode){
  try{ return localStorage.getItem(keyFor(mode)) || JSON.stringify(defaults()); }
  catch(e){ return JSON.stringify(defaults()); }
}
function importJSON(text, mode){
  var d = JSON.parse(text); // throws on invalid JSON: caller reports it
  if(!d || typeof d !== "object" || Array.isArray(d)) throw new Error("not a save file");
  try{ localStorage.setItem(keyFor(mode), JSON.stringify(d)); }catch(e){}
  return load(mode); // re-read through the full sanitize + migrate path
}

window.DA = window.DA || {};
window.DA.Save = { load:load, save:save, reset:reset, defaults:defaults,
  getMode:getMode, setMode:setMode, exportJSON:exportJSON, importJSON:importJSON,
  SAVE_VERSION:SAVE_VERSION };
})();
