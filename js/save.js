/* Save/load via localStorage */
(function(){
"use strict";
var KEY = "dodoAirwaysSaveV1";

function defaults(){
  return {
    money: 0,
    upgrades: { ramp:0, sled:0, wings:0, aero:0, booster:0, fuel:0 },
    best: { dist:0, alt:0, speedKmh:0, airTime:0 },
    flights: 0,
    objectivesDone: [],
    settings: { sfx:true, music:true, shake:true, particles:true },
    totalEarned: 0
  };
}

function load(){
  var s = defaults();
  try{
    var raw = localStorage.getItem(KEY);
    if(!raw) return s;
    var d = JSON.parse(raw);
    if(typeof d.money === "number") s.money = d.money;
    if(d.upgrades) for(var k in s.upgrades){ if(typeof d.upgrades[k]==="number") s.upgrades[k]=Math.max(0,Math.min(8,Math.floor(d.upgrades[k]))); }
    if(d.best){ ["dist","alt","speedKmh","airTime"].forEach(function(k){ if(typeof d.best[k]==="number") s.best[k]=d.best[k]; }); }
    if(typeof d.flights==="number") s.flights=d.flights;
    if(Array.isArray(d.objectivesDone)) s.objectivesDone=d.objectivesDone.filter(function(x){return typeof x==="string";});
    if(d.settings) for(var j in s.settings){ if(typeof d.settings[j]==="boolean") s.settings[j]=d.settings[j]; }
    if(typeof d.totalEarned==="number") s.totalEarned=d.totalEarned;
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
