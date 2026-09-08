/* Arcade flight physics — pure functions + stepper, tuned for fun.
   Units: meters, seconds. x = distance, y = altitude above ground/water (y=0 ground).
   Exported for game loop AND for node balance simulation. */
(function(){
"use strict";

var GRAVITY = 13.0;          // m/s^2 (arcade, slightly floaty)
var PITCH_RATE = 1.9;        // rad/s (~109 deg/s) responsive
var MAX_PITCH = 1.35;        // ~77 deg
var MIN_PITCH = -1.35;
var STALL_SPEED = 13.0;

function clamp(v,a,b){ return v<a?a:(v>b?b:v); }

/* One physics step. state: {x,y,vx,vy,pitch,fuel,airTime}
   input: {up:bool,down:bool,boost:bool}
   params: {lift,drag,thrust,fuelMax,sink}  (derived from upgrades)
   returns events flags {stalled, boosting} */
function stepFlight(s, input, p, dt){
  dt = Math.min(dt, 1/30);
  var boosting = false;

  // pitch control (clamped, no weird combos: up wins if both? prefer last — here cancel out)
  var dir = 0;
  if(input.up && !input.down) dir = 1;
  else if(input.down && !input.up) dir = -1;
  s.pitch = clamp(s.pitch + dir * PITCH_RATE * dt, MIN_PITCH, MAX_PITCH);

  var vx = s.vx, vy = s.vy;
  var speed = Math.sqrt(vx*vx + vy*vy);
  var velAng = Math.atan2(vy, vx);

  // angle of attack: difference between nose and velocity
  var aoa = s.pitch - velAng;
  while(aoa > Math.PI) aoa -= Math.PI*2;
  while(aoa < -Math.PI) aoa += Math.PI*2;

  // Lift: perpendicular to velocity, scales with speed^2, reduced at high AoA (stall)
  var aoaDeg = Math.abs(aoa) * 180/Math.PI;
  var aoaFactor;
  if(aoaDeg < 25) aoaFactor = Math.cos(aoa*1.2);
  else if(aoaDeg < 55) aoaFactor = 0.55;         // mushy
  else aoaFactor = 0.05;                          // stalled: almost no lift
  var stalled = (speed < STALL_SPEED && s.pitch > 0.25) || aoaDeg > 55;

  var liftMag = p.lift * speed * speed * Math.max(0, aoaFactor);
  // lift direction: perpendicular to velocity (rotate +90deg), but only upward component helps
  var lx = 0, ly = 0;
  if(speed > 0.5){
    lx = -Math.sin(velAng) * liftMag;
    ly = Math.cos(velAng) * liftMag;
    if(ly < 0) ly *= 0.25; // don't let lift suck us down
  }

  // Drag: opposes velocity, quadratic; extra induced drag at high AoA / stall
  var dragK = p.drag * (stalled ? 2.6 : 1) * (1 + Math.max(0, aoaFactor<0.6? (0.6-aoaFactor):0));
  var dx = -dragK * speed * vx;
  var dy = -dragK * speed * vy;

  var ax = lx + dx;
  var ay = -GRAVITY * p.sink + ly + dy;

  // Booster thrust along nose
  if(input.boost && s.fuel > 0 && speed < 140){
    boosting = true;
    ax += Math.cos(s.pitch) * p.thrust;
    ay += Math.sin(s.pitch) * p.thrust * 0.9;
    s.fuel = Math.max(0, s.fuel - dt);
  }

  // Nose-drop when stalled: gravity wins + pitch eases down
  if(stalled){
    ay -= 11.0;
    s.pitch -= 1.2 * dt;
  }

  // Gentle extra sink at very low speed so flights always end
  if(speed < 10) ay -= (10 - speed) * 2.2;

  s.vx += ax * dt;
  s.vy += ay * dt;
  // safety clamps so nothing explodes / floats forever
  s.vx = clamp(s.vx, -5, 110);
  s.vy = clamp(s.vy, -85, 55);

  s.x += s.vx * dt;
  s.y += s.vy * dt;
  if(s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx)*0.3; }
  s.airTime += dt;
  s.speed = Math.sqrt(s.vx*s.vx + s.vy*s.vy);
  return { stalled:stalled, boosting:boosting };
}

/* Ramp slide: returns launch velocity vector given upgrades.
   Slide sim is visual; gameplay launch speed derived from config. */
function rampSlide(t, duration, launchSpeed){
  // ease-in acceleration curve 0..1
  var k = clamp(t/duration, 0, 1);
  var eased = k*k*(3-2*k)*0.4 + k*k*0.6;
  return eased * launchSpeed;
}

function econReward(stat){
  // stat: {dist, maxAlt, maxSpeedKmh, airTime}
  var d = Math.floor(stat.dist * 0.75);
  var a = Math.floor(stat.maxAlt * 1.0);
  var sp = Math.floor(stat.maxSpeedKmh * 2.0);
  var t = Math.floor(stat.airTime * 10);
  return { dist:d, alt:a, speed:sp, time:t, total: d+a+sp+t };
}

function fmtDist(m){
  if(m >= 10000) return (m/1000).toFixed(1) + " km";
  if(m >= 1000) return (m/1000).toFixed(2) + " km";
  return Math.floor(m) + " m";
}

var api = { GRAVITY:GRAVITY, PITCH_RATE:PITCH_RATE, MAX_PITCH:MAX_PITCH, MIN_PITCH:MIN_PITCH,
  STALL_SPEED:STALL_SPEED, clamp:clamp, stepFlight:stepFlight, rampSlide:rampSlide,
  econReward:econReward, fmtDist:fmtDist };

// browser + node compatibility
if(typeof window !== "undefined"){ window.DA = window.DA || {}; window.DA.Physics = api; }
if(typeof module !== "undefined" && module.exports){ module.exports = api; }
})();
