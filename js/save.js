/* Save/load via localStorage. Gliders are equipment (owned + equipped);
   old saves with upgrades.wings (0-8) migrate to the matching glider. */
(function(){
"use strict";
var KEY = "dodoAirwaysSaveV1";

// old wings level -> glider id (keeps the player's progression tier)
function wingsToGlider(w){
  if(w <= 0) return 0;
  if(w === 1) return 1;
  if(w === 2) return 2;
  if(w === 3) return 3;
  if(w === 4) return 4;
  if(w === 5) return 5;
  if(w === 6) return 6;
  if(w === 7) return 7;
  return 8;
}

function freshGlider(){
  var owned = [];
  for(var i=0;i<10;i++) owned.push(i === 0);
  return { owned:owned, equipped:0 };
}

function defaults(){
  return {
    money: 0,
    upgrades: { ramp:0, sled:0, aero:0, booster:0, fuel:0 },
    glider: freshGlider(),
    best: { dist:0, alt:0, speedKmh:0, airTime:0 },
    flights: 0,
    objectivesDone: [],
    settings: { sfx:true, music:true, shake:true, particles:true },
    totalEarned: 0
  };
}

function sanitizeGlider(g){
  var out = freshGlider();
  if(!g || typeof g !== "object") return out;
  if(Array.isArray(g.owned)){
    for(var i=0;i<10;i++) out.owned[i] = !!g.owned[i];
  }
  out.owned[0] = true; // Bare Dodo is always yours
  var eq = (typeof g.equipped === "number") ? Math.floor(g.equipped) : 0;
  if(eq < 0 || eq > 9 || !out.owned[eq]) eq = 0;
  // equip the best owned if the saved pick is invalid
  if(eq === 0){
    for(var j=9;j>=0;j--) if(out.owned[j]){ eq = j; break; }
  }
  out.equipped = eq;
  return out;
}

function load(){
  var s = defaults();
  try{
    var raw = localStorage.getItem(KEY);
    if(!raw) return s;
    var d = JSON.parse(raw);
    if(typeof d.money === "number" && isFinite(d.money)) s.money = Math.max(0, Math.floor(d.money));
    if(d.upgrades) for(var k in s.upgrades){ if(typeof d.upgrades[k]==="number") s.upgrades[k]=Math.max(0,Math.min(8,Math.floor(d.upgrades[k]))); }
    // new glider equipment, else migrate legacy wings level
    if(d.glider){ s.glider = sanitizeGlider(d.glider); }
    else if(d.upgrades && typeof d.upgrades.wings === "number"){
      var gid = wingsToGlider(Math.max(0, Math.min(8, Math.floor(d.upgrades.wings))));
      for(var m=0;m<=gid;m++) s.glider.owned[m] = true; // grant everything up to tier
      s.glider.equipped = gid;
    }
    if(d.best){ ["dist","alt","speedKmh","airTime"].forEach(function(k){ if(typeof d.best[k]==="number" && isFinite(d.best[k])) s.best[k]=Math.max(0,d.best[k]); }); }
    if(typeof d.flights==="number" && isFinite(d.flights)) s.flights=Math.max(0,Math.floor(d.flights));
    if(Array.isArray(d.objectivesDone)) s.objectivesDone=d.objectivesDone.filter(function(x){return typeof x==="string";});
    if(d.settings) for(var j in s.settings){ if(typeof d.settings[j]==="boolean") s.settings[j]=d.settings[j]; }
    if(typeof d.totalEarned==="number" && isFinite(d.totalEarned)) s.totalEarned=Math.max(0,Math.floor(d.totalEarned));
  }catch(e){ /* corrupted save -> defaults */ }
  return s;
}

function save(s){
  try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){}
}
function reset(){
  try{ localStorage.removeItem(KEY); }catch(e){}
}

window.DA = window.DA || {};
window.DA.Save = { load:load, save:save, reset:reset, defaults:defaults };
})();
