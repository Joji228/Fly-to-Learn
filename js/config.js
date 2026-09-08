/* Dodo Airways — all tunables, upgrades, objectives, milestones. No external assets. */
(function(){
"use strict";

var UPGRADES = {
  ramp: {
    name: "Launch Ramp", icon: "🚀",
    blurb: "Bigger ramp, hotter launch. More starting speed + better launch angle.",
    max: 8, base: 80, growth: 2.05,
    desc: function(l){ return "Launch " + launchSpeed(l).toFixed(0) + " m/s @ " + launchAngleDeg(l).toFixed(0) + "°"; },
    next: function(l){ return l>=8 ? "MAXED — orbital dodo" : "→ " + launchSpeed(l+1).toFixed(0) + " m/s @ " + launchAngleDeg(l+1).toFixed(0) + "°"; }
  },
  sled: {
    name: "Waddle Sled", icon: "🛷",
    blurb: "Greased runners + rocket shopping cart energy. Faster ramp + bonus launch speed.",
    max: 8, base: 60, growth: 2.0,
    desc: function(l){ return "Ramp accel x" + sledMult(l).toFixed(2) + " • +" + (l*1.2).toFixed(1) + " m/s"; },
    next: function(l){ return l>=8 ? "MAXED — frictionless nonsense" : "→ accel x" + sledMult(l+1).toFixed(2) + " • +" + ((l+1)*1.2).toFixed(1) + " m/s"; }
  },
  wings: {
    name: "Wings (cardboard→titanium)", icon: "🪽",
    blurb: "More lift, floatier glide, gentler sink. The single best way to stay up.",
    max: 8, base: 100, growth: 2.15,
    desc: function(l){ return "Lift " + Math.round(liftCoef(l)*1000) + " • sink x" + sinkMult(l).toFixed(2); },
    next: function(l){ return l>=8 ? "MAXED — basically an albatross" : "→ lift " + Math.round(liftCoef(l+1)*1000) + " • sink x" + sinkMult(l+1).toFixed(2); }
  },
  aero: {
    name: "Aerodynamics", icon: "💨",
    blurb: "Pointier helmet, slicker belly. Keeps speed instead of donating it to the wind.",
    max: 8, base: 100, growth: 2.1,
    desc: function(l){ return "Drag " + (dragCoef(l)*1000).toFixed(1); },
    next: function(l){ return l>=8 ? "MAXED — soap-bar dodo" : "→ drag " + (dragCoef(l+1)*1000).toFixed(1); }
  },
  booster: {
    name: "Sardine Booster", icon: "🔥",
    blurb: "Hold SPACE for thrust along your nose. Stronger push per level.",
    max: 8, base: 120, growth: 2.2,
    desc: function(l){ return l===0 ? "Weak cough (" + boosterThrust(0).toFixed(0) + " m/s²)" : "Thrust " + boosterThrust(l).toFixed(0) + " m/s²"; },
    next: function(l){ return l>=8 ? "MAXED — illegal in 12 countries" : "→ thrust " + boosterThrust(l+1).toFixed(0) + " m/s²"; }
  },
  fuel: {
    name: "Fuel Tank (fish oil)", icon: "🛢️",
    blurb: "Longer burn time for the booster. Fly now, smell later.",
    max: 8, base: 80, growth: 2.0,
    desc: function(l){ return fuelTime(l).toFixed(1) + "s of boost"; },
    next: function(l){ return l>=8 ? "MAXED — mobile ocean" : "→ " + fuelTime(l+1).toFixed(1) + "s of boost"; }
  }
};

function priceOf(key, level){ // level = current level, price for next
  var u = UPGRADES[key];
  return Math.round(u.base * Math.pow(u.growth, level) / 5) * 5;
}
function launchSpeed(rampLvl, sledLvl){
  if (rampLvl === undefined) return 0;
  var r = (rampLvl === undefined) ? 0 : rampLvl;
  var s = sledLvl || 0;
  return 20 + r * 5.0 + s * 1.6;
}
function launchAngleDeg(rampLvl){ return 9 + (rampLvl||0) * 1.5; }
function sledMult(l){ return 1 + l * 0.28; }
function liftCoef(l){ return 0.028 + l * 0.006; }
function sinkMult(l){ return Math.max(0.5, 1 - l * 0.06); }
function dragCoef(l){ return Math.max(0.0009, 0.0072 - l * 0.00079); }
function boosterThrust(l){ return 16 + l * 13; }
function fuelTime(l){ return 2.5 + l * 1.5; }

var OBJECTIVES = [
  { id:"d300",   text:"Reach 300 m",            bonus:50,   check:function(s){ return s.dist>=300; } },
  { id:"d800",   text:"Reach 800 m",            bonus:140,  check:function(s){ return s.dist>=800; } },
  { id:"d2000",  text:"Reach 2,000 m",          bonus:350,  check:function(s){ return s.dist>=2000; } },
  { id:"d5000",  text:"Reach 5,000 m",          bonus:900,  check:function(s){ return s.dist>=5000; } },
  { id:"d8000",  text:"Reach 8,000 m",          bonus:2200, check:function(s){ return s.dist>=8000; } },
  { id:"d15000", text:"Reach 15,000 m. Absurd.",bonus:6000, check:function(s){ return s.dist>=15000; } },
  { id:"a40",    text:"Climb above 40 m",       bonus:60,   check:function(s){ return s.maxAlt>=40; } },
  { id:"a100",   text:"Climb above 100 m",      bonus:200,  check:function(s){ return s.maxAlt>=100; } },
  { id:"a200",   text:"Climb above 200 m",      bonus:600,  check:function(s){ return s.maxAlt>=200; } },
  { id:"s100",   text:"Hit 100 km/h",           bonus:80,   check:function(s){ return s.maxSpeedKmh>=100; } },
  { id:"s160",   text:"Hit 160 km/h",           bonus:300,  check:function(s){ return s.maxSpeedKmh>=160; } },
  { id:"s230",   text:"Hit 230 km/h. Screaming.",bonus:900, check:function(s){ return s.maxSpeedKmh>=230; } },
  { id:"t10",    text:"Stay airborne 10 s",     bonus:70,   check:function(s){ return s.airTime>=10; } },
  { id:"t20",    text:"Stay airborne 20 s",     bonus:280,  check:function(s){ return s.airTime>=20; } },
  { id:"t35",    text:"Stay airborne 35 s",     bonus:800,  check:function(s){ return s.airTime>=35; } },
  { id:"fuel",   text:"Use all your fuel",      bonus:90,   check:function(s){ return s.usedAllFuel; } }
];

var MILESTONES = [
  { d:0,     label:"🧪 Launch Facility" },
  { d:500,   label:"🌊 Shoreline" },
  { d:1200,  label:"🎣 Fishing boats — they wave" },
  { d:2000,  label:"🧊 Icebergs" },
  { d:3000,  label:"🐋 Whale watching you" },
  { d:4500,  label:"🏙️ Distant city" },
  { d:6000,  label:"🏔️ The Pointy Mountains" },
  { d:8000,  label:"🏰 Castle of Questionable Physics" },
  { d:11000, label:"🌋 Volcano (do not land here)" },
  { d:15000, label:"🗽 Statue of Dennis" },
  { d:20000, label:"🛸 Aliens taking notes" },
  { d:30000, label:"🌙 Basically the moon. Congrats." }
];

var QUOTES = [
  "Gravity remains undefeated.",
  "Dennis meant to do that.",
  "The landing gear was decorative anyway.",
  "Aerodynamics is a state of mind.",
  "Somewhere, a penguin is laughing.",
  "That crater has your name on it. Nice!",
  "Fish oil can't melt steel dodos.",
  "The judges award a 4.2 for enthusiasm.",
  "Dennis regrets nothing. Mostly nothing.",
  "Flight data recorder just says 'wheee'."
];
var GOOD_QUOTES = [
  "Dennis is basically an eagle now.",
  "New record! The dodo community weeps with joy.",
  "Magnificent. Stupid, but magnificent.",
  "NASA just called. They're confused.",
  "That landing was almost intentional!"
];

var PREVIEW_QUIPS = [
  "Dennis judges your spending.",
  "Cardboard wings? Bold.",
  "More fish oil fixes everything.",
  "Pointier is always faster.",
  "Dennis demands titanium."
];

window.DA = window.DA || {};
window.DA.UPGRADES = UPGRADES;
window.DA.priceOf = priceOf;
window.DA.launchSpeed = launchSpeed;
window.DA.launchAngleDeg = launchAngleDeg;
window.DA.sledMult = sledMult;
window.DA.liftCoef = liftCoef;
window.DA.sinkMult = sinkMult;
window.DA.dragCoef = dragCoef;
window.DA.boosterThrust = boosterThrust;
window.DA.fuelTime = fuelTime;
window.DA.OBJECTIVES = OBJECTIVES;
window.DA.MILESTONES = MILESTONES;
window.DA.QUOTES = QUOTES;
window.DA.GOOD_QUOTES = GOOD_QUOTES;
window.DA.PREVIEW_QUIPS = PREVIEW_QUIPS;
})();
