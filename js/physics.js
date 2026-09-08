/* Arcade flight physics — signed-AoA energy model.
   Units: meters, seconds. x = distance, y = altitude above ground (y=0 ground).
   ONE authoritative pitch (s.pitch, radians, + = nose up). Thrust acts EXACTLY
   along the nose vector (cos pitch, sin pitch). Lift uses SIGNED angle of
   attack so pointing the nose down can never magically produce upward force.

   Skill loop: dive (gravity -> speed) -> pull up (speed -> altitude, induced
   drag bleeds speed) -> level out (efficient glide) -> boost strategically.

   Exported for game loop AND for node test simulations. */
(function(){
"use strict";

var GRAVITY = 13.0;          // m/s^2
var PITCH_RATE = 2.2;        // rad/s max pitch rate at full authority
var MAX_PITCH = 1.15;        // ~66 deg
var MIN_PITCH = -1.15;
var STALL_AOA = 0.55;        // ~31 deg effective AoA where wings let go
var DEG = 180 / Math.PI;

function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function wrapAngle(a){
  while(a > Math.PI) a -= Math.PI*2;
  while(a < -Math.PI) a += Math.PI*2;
  return a;
}

/* Lift coefficient from SIGNED effective AoA (arcade thin-airfoil curve):
   linear up to ~18 deg, softens to a peak, collapses past stall. Negative
   AoA gives NEGATIVE lift (nose-down at speed pushes the dive steeper). */
function liftCoefFromAoa(aoaEff){
  var a = Math.abs(aoaEff);
  var sgn = aoaEff < 0 ? -1 : 1;
  var cl;
  if(a <= 0.32){ cl = 5.0 * aoaEff; }
  else if(a <= STALL_AOA){
    var k = (a - 0.32) / (STALL_AOA - 0.32);
    cl = sgn * (1.6 * (1 - k) + 0.55 * k);
  }
  else { cl = sgn * 0.30; }
  if(cl > 1.6) cl = 1.6;
  if(cl < -1.3) cl = -1.3;
  return cl;
}

/* One physics step. state: {x,y,vx,vy,pitch,pitchVel,fuel,airTime,speed}
   input: {up:bool,down:bool,boost:bool}
   params: {liftArea,trim,stallSpeed,sink,cd0,kInd,thrust,fuelMax}
   returns {stalled, boosting} */
function stepFlight(s, input, p, dt){
  if(!(dt > 0)) dt = 0.016;
  if(dt > 1/30) dt = 1/30;
  var boosting = false;

  if(!isFinite(s.pitch)) s.pitch = 0;
  if(typeof s.pitchVel !== "number" || !isFinite(s.pitchVel)) s.pitchVel = 0;
  if(!isFinite(s.vx)) s.vx = 0;
  if(!isFinite(s.vy)) s.vy = 0;
  if(!(s.fuel >= 0)) s.fuel = 0;

  var speed = Math.sqrt(s.vx*s.vx + s.vy*s.vy);
  var velAng = Math.atan2(s.vy, s.vx);

  // --- signed angle of attack (nose vs. velocity) + wing trim ---
  // (evaluated pre-input for control feel, re-evaluated for forces below)
  var aoaPre = wrapAngle(s.pitch - velAng) + (p.trim || 0);
  var stalledPre = (Math.abs(aoaPre) > STALL_AOA) ||
                   (speed < p.stallSpeed && s.pitch > 0.15);

  // --- pitch control: smoothed rate with airspeed authority ---
  // slow = mushy, normal = responsive, extreme speed = damped (not twitchy)
  var dir = 0;
  if(input.up && !input.down) dir = 1;
  else if(input.down && !input.up) dir = -1;
  var auth = clamp(0.35 + speed / 30, 0.35, 1.0);
  if(speed > 55) auth *= Math.max(0.7, 1 - (speed - 55) / 100);
  var targetRate = dir * PITCH_RATE * auth;
  if(stalledPre) targetRate *= 0.2; // controls go mushy in a stall
  s.pitchVel += (targetRate - s.pitchVel) * Math.min(1, 12 * dt);
  s.pitch += s.pitchVel * dt;
  if(s.pitch > MAX_PITCH){ s.pitch = MAX_PITCH; if(s.pitchVel > 0) s.pitchVel = 0; }
  if(s.pitch < MIN_PITCH){ s.pitch = MIN_PITCH; if(s.pitchVel < 0) s.pitchVel = 0; }

  var aoa = wrapAngle(s.pitch - velAng);
  var aoaEff = aoa + (p.trim || 0);
  var stalled = (Math.abs(aoaEff) > STALL_AOA) ||
                (speed < p.stallSpeed && s.pitch > 0.15);

  var CL = liftCoefFromAoa(aoaEff);
  if(stalled) CL *= 0.6; // lift collapses

  // --- thin air: lift and (fish-oil) thrust fade with altitude ---
  // This keeps zoom-climbs viable but makes 10 km vertical rockets
  // impossible: up high the wings stop working and you must come down.
  var thin = 1 / (1 + Math.max(0, s.y - 350) / 350);

  // --- lift: perpendicular to velocity, SIGNED (can push down) ---
  var q = 0.5 * speed * speed;
  var area = p.liftArea || 0.15;
  var liftF = q * area * CL * thin;
  var lx = 0, ly = 0;
  if(speed > 0.5){
    lx = -Math.sin(velAng) * liftF;
    ly = Math.cos(velAng) * liftF;
  }

  // --- drag: parasite (fixed body ref area) + induced (grows with lift) ---
  // NOTE: parasite drag uses a fixed reference area so bigger wings do not
  // magically add body drag; wings only add their (smaller) induced drag.
  var CD = p.cd0 + (p.kInd || 0) * CL * CL;
  if(stalled) CD *= 1.8;
  var dragF = q * 0.15 * CD;
  var dx = 0, dy = 0;
  if(speed > 0.5){
    dx = -s.vx / speed * dragF;
    dy = -s.vy / speed * dragF;
  }

  var ax = lx + dx;
  var ay = -GRAVITY * (p.sink || 1) + ly + dy;

  // --- booster: EXACTLY along the nose, no fudge factors ---
  // (breathes thin air too, but never fully quits — unfun otherwise)
  if(input.boost && s.fuel > 0){
    boosting = true;
    var th = p.thrust * (0.4 + 0.6 * thin);
    ax += Math.cos(s.pitch) * th;
    ay += Math.sin(s.pitch) * th;
    s.fuel = Math.max(0, s.fuel - dt);
  }

  // --- stall: nose drops on its own, sink grows, speed can recover ---
  // (pitchVel was already integrated once above; here we only bleed it off
  // so the nose falls while the pilot holds useless full-up.)
  if(stalled){
    ay -= 6.0;
    s.pitchVel -= 6.0 * dt;
  }

  // gentle extra sink at crawl speed so flights always end
  if(speed < 8) ay -= (8 - speed) * 1.5;

  s.vx += ax * dt;
  s.vy += ay * dt;
  // anti-NaN guard only (drag is the real speed limit)
  s.vx = clamp(s.vx, -160, 160);
  s.vy = clamp(s.vy, -160, 160);
  if(!isFinite(s.vx)) s.vx = 0;
  if(!isFinite(s.vy)) s.vy = 0;

  s.x += s.vx * dt;
  s.y += s.vy * dt;
  if(s.x < 0){ s.x = 0; if(s.vx < 0) s.vx = 0; }
  s.airTime += dt;
  s.speed = Math.sqrt(s.vx*s.vx + s.vy*s.vy);
  return { stalled:stalled, boosting:boosting };
}

/* Ramp slide speed profile 0..launchSpeed (HUD + feel; actual launch uses
   the built-up speed along the ramp exit tangent). */
function rampSlide(t, duration, launchSpeed){
  var k = clamp(t / duration, 0, 1);
  var eased = k*k*(3-2*k)*0.4 + k*k*0.6;
  return eased * launchSpeed;
}

function econReward(stat){
  // stat: {dist, maxAlt, maxSpeedKmh, airTime}
  var d = Math.floor(stat.dist * 0.6);
  var a = Math.floor(stat.maxAlt * 0.8);
  var sp = Math.floor(stat.maxSpeedKmh * 1.5);
  var t = Math.floor(stat.airTime * 8);
  return { dist:d, alt:a, speed:sp, time:t, total: d+a+sp+t };
}

function fmtDist(m){
  if(m >= 10000) return (m/1000).toFixed(1) + " km";
  if(m >= 1000) return (m/1000).toFixed(2) + " km";
  return Math.floor(m) + " m";
}

var api = { GRAVITY:GRAVITY, PITCH_RATE:PITCH_RATE, MAX_PITCH:MAX_PITCH, MIN_PITCH:MIN_PITCH,
  STALL_AOA:STALL_AOA, clamp:clamp, wrapAngle:wrapAngle, liftCoefFromAoa:liftCoefFromAoa,
  stepFlight:stepFlight, rampSlide:rampSlide, econReward:econReward, fmtDist:fmtDist };

// browser + node compatibility
if(typeof window !== "undefined"){ window.DA = window.DA || {}; window.DA.Physics = api; }
if(typeof module !== "undefined" && module.exports){ module.exports = api; }
})();
