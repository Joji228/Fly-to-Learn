/* Arcade steering-glider physics — FAST, SIMPLE, MOMENTUM-BASED.
   Units: meters, seconds. x = distance, y = altitude above ground.
   ONE authoritative pitch (s.pitch, radians, + = nose up). Thrust acts
   EXACTLY along the nose vector.

   The whole game in five rules:
     NOSE DOWN -> path steers down, gravity accelerates you, speed rises FAST
     LEVEL     -> path flattens, you keep most of your speed (glide)
     NOSE UP   -> path arcs up, speed converts into altitude
     TOO STEEP -> speed collapses, you stall and fall (lower nose to recover)
     BOOST     -> rapid acceleration EXACTLY where the nose points

   How it works: the glider gently STEERS its velocity vector toward the
   pitch (limited turn rate = control). Plain gravity then does the energy
   magic: dives accelerate, climbs decelerate, level glides. No AoA curves,
   no induced-drag equations, no thin air. Momentum you can feel.

   Exported for game loop AND for node test simulations. */
(function(){
"use strict";

var GRAVITY = 19.0;          // m/s^2 — dives must pay, immediately (redlines cap the tops)
var PITCH_RATE = 3.2;        // rad/s — 0 to ±30deg in ~0.2s, arcade snap
var PITCH_SMOOTH = 28;       // higher = snappier settle, no trailing drift
var MAX_PITCH = 1.15;        // ~66 deg
var MIN_PITCH = -1.15;
var DIVE_K = 6.0;            // arcade dive assist along the path (feel it!)
var REDLINE_K = 0.25;        // shared redline drag strength (soft top speed)
var OVER_TOP_K = 0.6;        // extra drag past redline top
var DEG = 180 / Math.PI;

function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function wrapAngle(a){
  while(a > Math.PI) a -= Math.PI*2;
  while(a < -Math.PI) a += Math.PI*2;
  return a;
}

/* One physics step. state: {x,y,vx,vy,pitch,pitchVel,fuel,airTime,speed}
   input: {up:bool,down:bool,boost:bool}
   params: {control,drag,turnK,comfort,top,stall,thrust,fuelMax}
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

  // --- pitch: fast arcade rotation, settles the instant you let go ---
  var dir = 0;
  if(input.up && !input.down) dir = 1;
  else if(input.down && !input.up) dir = -1;
  var targetRate = dir * PITCH_RATE;
  s.pitchVel += (targetRate - s.pitchVel) * Math.min(1, PITCH_SMOOTH * dt);
  s.pitch += s.pitchVel * dt;
  if(s.pitch > MAX_PITCH){ s.pitch = MAX_PITCH; if(s.pitchVel > 0) s.pitchVel = 0; }
  if(s.pitch < MIN_PITCH){ s.pitch = MIN_PITCH; if(s.pitchVel < 0) s.pitchVel = 0; }

  // --- stall: simple and legible. Slow + trying to climb = fall out. ---
  var speed = Math.sqrt(s.vx*s.vx + s.vy*s.vy);
  var stalled = (speed < p.stall && s.pitch > 0.18);
  if(stalled){
    s.pitch -= 1.4 * dt; // nose falls on its own
    if(s.pitch < MIN_PITCH) s.pitch = MIN_PITCH;
  }

  // --- booster: EXACTLY along the nose. No thrust, no party. ---
  if(input.boost && s.fuel > 0 && p.thrust > 0){
    boosting = true;
    s.vx += Math.cos(s.pitch) * p.thrust * dt;
    s.vy += Math.sin(s.pitch) * p.thrust * dt;
    s.fuel = Math.max(0, s.fuel - dt);
  }

  // --- gravity: the engine of all fun (dives pay, climbs cost) ---
  s.vy -= GRAVITY * dt;
  if(stalled) s.vy -= 6 * dt; // stalled wings barely hold you

  // --- arcade dive assist: pointing downhill adds a controlled bonus push
  // along the path so dives feel powerful without touching top speeds much
  // (redline drag still caps every glider). Subtle but unmistakable.
  var preDiveAng = Math.atan2(s.vy, s.vx);
  if(preDiveAng < -0.12 && s.pitch < -0.08){
    var db = DIVE_K * Math.min(1, (-preDiveAng) / 0.6);
    s.vx += Math.cos(preDiveAng) * db * dt;
    s.vy += Math.sin(preDiveAng) * db * dt;
  }

  // --- steering: pull the velocity vector toward the nose ---
  // Better gliders turn harder; slow flight turns mushy; stalls barely turn.
  speed = Math.sqrt(s.vx*s.vx + s.vy*s.vy);
  var velAng = Math.atan2(s.vy, s.vx);
  var authority = clamp(speed / 12, 0.35, 1) * (stalled ? 0.2 : 1);
  var steerRate = (p.control || 1.5) * authority;
  var diff = wrapAngle(s.pitch - velAng);
  var maxTurn = steerRate * dt;
  var turn = clamp(diff, -maxTurn, maxTurn);
  var turnRate = turn / dt;
  var newAng = velAng + turn;

  // --- turn cost: smooth tracking is cheap, violent yanks bleed ---
  // Losing ~turnK per radian yanked: a full 90deg slam costs ~5-15%.
  speed = Math.sqrt(s.vx*s.vx + s.vy*s.vy);
  speed *= Math.exp(-(p.turnK || 0.1) * Math.abs(turnRate) * dt);

  // --- drag: quadratic body drag + soft redline per glider ---
  // Below comfort: clean. Approaching top: drag swells. Past top: wall.
  // (No hard clamp — drag is the speed limit, plus a huge safety net.)
  var red = 0;
  if(speed > p.comfort){
    var span = Math.max(5, p.top - p.comfort);
    red = REDLINE_K * Math.pow((speed - p.comfort) / span, 1.5);
    if(speed > p.top) red += OVER_TOP_K;
  }
  var dragF = (0.5 * speed * speed * 0.15 * p.drag) + (speed * speed * 0.004 * red);
  if(speed > 0.5){
    var nx = s.vx / speed, ny = s.vy / speed;
    // rebuild velocity along the steered direction, minus drag
    var vNew = Math.max(0, speed - dragF / 1 * dt);
    s.vx = Math.cos(newAng) * vNew;
    s.vy = Math.sin(newAng) * vNew;
  }

  // anti-NaN safety net only (drag is the real speed limit)
  s.vx = clamp(s.vx, -200, 200);
  s.vy = clamp(s.vy, -200, 200);
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
  // stat: {dist, maxAlt, maxSpeedKmh, airTime} — distance leads, rest assist
  var d = Math.floor(stat.dist * 0.45);
  var a = Math.floor(stat.maxAlt * 0.6);
  var sp = Math.floor(stat.maxSpeedKmh * 1.0);
  var t = Math.floor(stat.airTime * 6);
  return { dist:d, alt:a, speed:sp, time:t, total: d+a+sp+t };
}

function fmtDist(m){
  if(m >= 10000) return (m/1000).toFixed(1) + " km";
  if(m >= 1000) return (m/1000).toFixed(2) + " km";
  return Math.floor(m) + " m";
}

var api = { GRAVITY:GRAVITY, PITCH_RATE:PITCH_RATE, MAX_PITCH:MAX_PITCH, MIN_PITCH:MIN_PITCH,
  DIVE_K:DIVE_K, clamp:clamp, wrapAngle:wrapAngle,
  stepFlight:stepFlight, rampSlide:rampSlide, econReward:econReward, fmtDist:fmtDist };

// browser + node compatibility
if(typeof window !== "undefined"){ window.DA = window.DA || {}; window.DA.Physics = api; }
if(typeof module !== "undefined" && module.exports){ module.exports = api; }
})();
