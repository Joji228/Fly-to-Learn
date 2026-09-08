/* Dodo Airways — all tunables, upgrades, objectives, milestones. No external assets.
   RULE: every shop description is computed from the SAME functions the
   physics/launch code uses, so displayed numbers always match reality. */
(function(){
"use strict";

/* ---------- upgrade math (single source of truth) ---------- */
function priceOf(key, level){ // level = current level, price for next
  var u = UPGRADES[key];
  return Math.round(u.base * Math.pow(u.growth, level) / 5) * 5;
}
// Ramp: better launch geometry (higher lip, steeper exit) + base speed.
function launchSpeed(rampLvl, sledLvl){
  var r = rampLvl || 0, s = sledLvl || 0;
  return 20 + r * 5.0 + s * 1.6;
}
function launchAngleDeg(rampLvl){ return 9 + (rampLvl || 0) * 1.5; } // == ramp exit tangent, see World.rampY
function rampLipY(rampLvl){ return 14 + (rampLvl || 0) * 1.8; }       // lip height in m, matches ramp track
// Sled: faster ride down the ramp (accel feel) + small launch bonus.
function sledMult(l){ return 1 + l * 0.28; }
function rampRideTime(sledLvl){ return Math.max(1.1, 2.3 / sledMult(sledLvl || 0)); }
// Wings: bigger lifting surface, better trim, slower + gentler stall,
// less induced drag. Gravity is gravity — wings earn glide honestly.
function liftArea(l){ return 0.15 + l * 0.022; }
function wingTrim(l){ return 0.07 + l * 0.003; }
function stallSpeed(l){ return 12 - l * 0.4; }                        // m/s
function stallAoa(l){ return 0.55 + l * 0.008; }                      // rad, wings let go later
function wingInduced(l){ return 1 - 0.06 * l; }                       // induced-drag multiplier x1 -> x0.52
// Aero: less parasite drag + less induced drag (keeps speed in maneuvers).
function dragCoef(l){ return Math.max(0.016, 0.055 - l * 0.005); }
function kindCoef(l){ return 0.22 - l * 0.011; }
// Booster: exact thrust along the nose (m/s^2).
function boosterThrust(l){ return 14 + l * 11; }
function fuelTime(l){ return 2.5 + l * 1.3; }                         // seconds of burn

var UPGRADES = {
  ramp: {
    name: "Launch Ramp", icon: "🚀",
    blurb: "Taller lip, steeper exit, hotter launch. The single best start.",
    max: 8, base: 270, growth: 2.05,
    desc: function(l){ return "Lip " + rampLipY(l).toFixed(0) + "m • exit " + launchAngleDeg(l).toFixed(0) + "° • base " + (20 + l*5).toFixed(0) + " m/s"; },
    next: function(l){ return l>=8 ? "MAXED — orbital dodo" : "→ lip " + rampLipY(l+1).toFixed(0) + "m • exit " + launchAngleDeg(l+1).toFixed(0) + "° • base " + (20 + (l+1)*5).toFixed(0) + " m/s"; }
  },
  sled: {
    name: "Waddle Sled", icon: "🛷",
    blurb: "Greased runners. Shorter ride, snappier accel, bonus launch speed.",
    max: 8, base: 230, growth: 2.0,
    desc: function(l){ return "Ride " + rampRideTime(l).toFixed(1) + "s • +" + (l*1.6).toFixed(1) + " m/s launch"; },
    next: function(l){ return l>=8 ? "MAXED — frictionless nonsense" : "→ ride " + rampRideTime(l+1).toFixed(1) + "s • +" + ((l+1)*1.6).toFixed(1) + " m/s launch"; }
  },
  wings: {
    name: "Wings (cardboard→titanium)", icon: "🪽",
    blurb: "More lift, cleaner glide, later stall. The best way to stay up.",
    max: 8, base: 300, growth: 2.1,
    desc: function(l){ return "Lift " + liftArea(l).toFixed(2) + " • stall " + Math.round(stallSpeed(l)*3.6) + " km/h • induced x" + wingInduced(l).toFixed(2); },
    next: function(l){ return l>=8 ? "MAXED — basically an albatross" : "→ lift " + liftArea(l+1).toFixed(2) + " • stall " + Math.round(stallSpeed(l+1)*3.6) + " km/h • induced x" + wingInduced(l+1).toFixed(2); }
  },
  aero: {
    name: "Aerodynamics", icon: "💨",
    blurb: "Pointier helmet, slicker belly. Keeps speed through every maneuver.",
    max: 8, base: 300, growth: 2.0,
    desc: function(l){ return "Drag " + (dragCoef(l)*1000).toFixed(1) + " • induced " + kindCoef(l).toFixed(2); },
    next: function(l){ return l>=8 ? "MAXED — soap-bar dodo" : "→ drag " + (dragCoef(l+1)*1000).toFixed(1) + " • induced " + kindCoef(l+1).toFixed(2); }
  },
  booster: {
    name: "Sardine Booster", icon: "🔥",
    blurb: "Hold SPACE for thrust along your nose. Points where you point.",
    max: 8, base: 340, growth: 2.1,
    desc: function(l){ return "Thrust " + boosterThrust(l).toFixed(0) + " m/s² along nose"; },
    next: function(l){ return l>=8 ? "MAXED — illegal in 12 countries" : "→ thrust " + boosterThrust(l+1).toFixed(0) + " m/s² along nose"; }
  },
  fuel: {
    name: "Fuel Tank (fish oil)", icon: "🛢️",
    blurb: "Longer burn time for the booster. Fly now, smell later.",
    max: 8, base: 250, growth: 2.0,
    desc: function(l){ return fuelTime(l).toFixed(1) + "s of boost"; },
    next: function(l){ return l>=8 ? "MAXED — mobile ocean" : "→ " + fuelTime(l+1).toFixed(1) + "s of boost"; }
  }
};

var OBJECTIVES = [
  { id:"d300",   text:"Reach 300 m",            bonus:25,   check:function(s){ return s.dist>=300; } },
  { id:"d800",   text:"Reach 800 m",            bonus:70,   check:function(s){ return s.dist>=800; } },
  { id:"d2000",  text:"Reach 2,000 m",          bonus:180,  check:function(s){ return s.dist>=2000; } },
  { id:"d5000",  text:"Reach 5,000 m",          bonus:450,  check:function(s){ return s.dist>=5000; } },
  { id:"d8000",  text:"Reach 8,000 m",          bonus:1100, check:function(s){ return s.dist>=8000; } },
  { id:"d15000", text:"Reach 15,000 m. Absurd.",bonus:3000, check:function(s){ return s.dist>=15000; } },
  { id:"a40",    text:"Climb above 40 m",       bonus:30,   check:function(s){ return s.maxAlt>=40; } },
  { id:"a100",   text:"Climb above 100 m",      bonus:100,  check:function(s){ return s.maxAlt>=100; } },
  { id:"a200",   text:"Climb above 200 m",      bonus:300,  check:function(s){ return s.maxAlt>=200; } },
  { id:"s100",   text:"Hit 100 km/h",           bonus:40,   check:function(s){ return s.maxSpeedKmh>=100; } },
  { id:"s160",   text:"Hit 160 km/h",           bonus:150,  check:function(s){ return s.maxSpeedKmh>=160; } },
  { id:"s230",   text:"Hit 230 km/h. Screaming.",bonus:450, check:function(s){ return s.maxSpeedKmh>=230; } },
  { id:"t10",    text:"Stay airborne 10 s",     bonus:35,   check:function(s){ return s.airTime>=10; } },
  { id:"t20",    text:"Stay airborne 20 s",     bonus:140,  check:function(s){ return s.airTime>=20; } },
  { id:"t35",    text:"Stay airborne 35 s",     bonus:400,  check:function(s){ return s.airTime>=35; } },
  { id:"fuel",   text:"Use all your fuel",      bonus:45,   check:function(s){ return s.usedAllFuel; } }
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
var GENTLE_QUOTES = [
  "Dennis sticks the landing! Judges weep.",
  "Smoother than expected. Suspiciously smooth.",
  "That was almost flying. Keep going!",
  "A landing you can waddle away from."
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
window.DA.rampLipY = rampLipY;
window.DA.sledMult = sledMult;
window.DA.rampRideTime = rampRideTime;
window.DA.liftArea = liftArea;
window.DA.wingTrim = wingTrim;
window.DA.stallSpeed = stallSpeed;
window.DA.stallAoa = stallAoa;
window.DA.wingInduced = wingInduced;
window.DA.dragCoef = dragCoef;
window.DA.kindCoef = kindCoef;
window.DA.boosterThrust = boosterThrust;
window.DA.fuelTime = fuelTime;
window.DA.OBJECTIVES = OBJECTIVES;
window.DA.MILESTONES = MILESTONES;
window.DA.QUOTES = QUOTES;
window.DA.GOOD_QUOTES = GOOD_QUOTES;
window.DA.GENTLE_QUOTES = GENTLE_QUOTES;
window.DA.PREVIEW_QUIPS = PREVIEW_QUIPS;
})();
