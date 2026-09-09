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

   How it works: the glider nudges its velocity vector toward the pitch
   with small capped rotations, so gravity's fall PERSISTS instead of being
   rebuilt away. Plain gravity then does the energy magic: dives accelerate,
   climbs decelerate, level glides. No AoA curves, no induced-drag equations,
   no thin air. Momentum you can feel.

   NO GLIDER = NO GLIDING: Bare Dodo (p.bare) flies like a falling body —
   ~15% steering, heavy extra sink, fast horizontal bleed. The first real
   glider is a massive unlock because suddenly momentum, steering, glide,
   dives and pull-ups all start working.

   Exported for game loop AND for node test simulations. */
(function(){
"use strict";

var GRAVITY = 30.0;          // m/s^2 — fast falls, fast dives, fast arcs
var PITCH_RATE = 3.2;        // rad/s — 0 to ±30deg in ~0.2s, arcade snap
var PITCH_SMOOTH = 28;       // higher = snappier settle, no trailing drift
var MAX_PITCH = 1.15;        // ~66 deg
var MIN_PITCH = -1.15;
var STEER_GAIN = 3.0;        // global trajectory responsiveness (glider ladder untouched)
var DIVE_K = 8.0;            // downhill-only entry snap (too weak to sustain flight)
var OVER_TOP_K = 1.25;       // extra drag past redline top: firm, brief overshoot OK
var BARE_SINK = 12.0;        // extra fall for the glider-less: no free gliding
var REDLINE_K = 0.25;        // shared redline drag strength (soft top speed)
var DEG = 180 / Math.PI;

function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function wrapAngle(a){
  while(a > Math.PI) a -= Math.PI*2;
  while(a < -Math.PI) a += Math.PI*2;
  return a;
}

/* One physics step. state: {x,y,vx,vy,pitch,pitchVel,fuel,airTime,speed}
   input: {up:bool,down:bool,boost:bool}
   params: {control,drag,turnK,comfort,top,stall,thrust,fuelMax,bare,sinkBias}
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
  // A steep nose-up stalls EARLIER (wings give up sooner when yanked).
  var speed = Math.sqrt(s.vx*s.vx + s.vy*s.vy);
  var stallMargin = (s.pitch > 0.5) ? 3 : 0;
  var stalled = (speed < p.stall + stallMargin && s.pitch > 0.18);
  if(stalled){
    s.pitch -= 2.8 * dt; // nose falls fast: STALL -> DIVE -> SPEED, quickly
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
  // Falls, sinks and stalls all draw from this one honest source, so every
  // descent must be repaid on the way back up: porpoising always decays.
  s.vy -= GRAVITY * dt;
  if(stalled) s.vy -= 7 * dt; // stalled wings barely hold you: drop decisively
  // NO GLIDER = NO GLIDING: bare Dennis falls like a body, always.
  // (Gliders rely on steering to fight this; bare steering is ~15%.)
  var bare = !!p.bare;
  if(bare) s.vy -= BARE_SINK * dt;
  // Slow flight sinks hard: below ~12 m/s no wing can hold you up, so the
  // fall steepens instead of porpoising in place. Healthy speed unaffected.
  if(speed < 12) s.vy -= (12 - speed) * 1.2 * dt;

  // NOTE: no fall-assist pump — gravity alone powers every fall, so each
  // descent must be repaid on the climb back. Free descent energy turns
  // porpoising into perpetual motion; honest gravity plus drag guarantees
  // every flight eventually ends. Redline drag still caps each glider's top.
  // A SMALL downhill-only nudge (DIVE_K) sharpens dive entries; it is far
  // too weak to sustain flight on its own (proven by sim: all runs land).
  var preDiveAng = Math.atan2(s.vy, s.vx);
  if(preDiveAng < -0.08 && s.pitch < -0.05){
    var db = DIVE_K * Math.min(1, (-preDiveAng) / 0.6);
    s.vx += Math.cos(preDiveAng) * db * dt;
    s.vy += Math.sin(preDiveAng) * db * dt;
  }

  // --- steering: INCREMENTAL perpendicular nudge toward the nose ---
  // The velocity vector is rotated by a small capped angle each step, so
  // gravity's vy contribution PERSISTS instead of being rebuilt away.
  // MANDATORY GLIDE SINK: we steer toward (pitch - sinkBias), never toward
  // pitch itself, so nose-level always settles into a descending path.
  // Better gliders sink less; nothing sinks zero; bare Dodo plummets.
  // Authority is superlinear in speed: it collapses hard below ~20 m/s
  // (gravity wins, you fall — no low-speed hovering, no self-recovery
  // into a mushy level hover) and is full at healthy flight speed, with
  // a touch extra when very fast.
  // Rotating UP (recovering/climbing toward the nose) additionally needs
  // airspeed behind it; rotating DOWN stays responsive so dives and stall
  // recoveries bite. A slow fall therefore only ends if the pilot points
  // down and earns speed back — holding level just keeps falling.
  // Bare Dodo gets ~15% authority on top: enough to aim the fall, never
  // enough to fly. High speed + nose-up therefore arcs hard for gliders;
  // low speed + nose-up mushes for everyone.
  speed = Math.sqrt(s.vx*s.vx + s.vy*s.vy);
  var velAng = Math.atan2(s.vy, s.vx);
  var authority = clamp(Math.pow(Math.max(0, speed - 6) / 20, 1.6), 0.1, 1) * (stalled ? 0.25 : 1);
  var diff = wrapAngle((s.pitch - (p.sinkBias || 0)) - velAng);
  if(diff > 0) authority *= clamp((speed - 10) / 18, 0.15, 1); // up-rotations need airspeed
  if(bare) authority *= 0.12;
  if(speed > 55) authority *= 1.1;
  var steerRate = (p.control || 1.5) * authority * STEER_GAIN;
  var maxTurn = steerRate * dt;
  var turn = clamp(diff, -maxTurn, maxTurn);
  var turnRate = turn / dt;
  if(Math.abs(turn) > 1e-9){
    var ca = Math.cos(turn), sa = Math.sin(turn);
    var rx = s.vx * ca - s.vy * sa;
    var ry = s.vx * sa + s.vy * ca;
    s.vx = rx; s.vy = ry;
  }

  // --- turn cost: only real yanks bleed. Tiny gravity-trim corrections
  // ride free, so there is no constant drain death spiral.
  var trAbs = Math.abs(turnRate);
  if(trAbs > 0.6){
    var cost = Math.exp(-(p.turnK || 0.1) * (trAbs - 0.6) * dt);
    s.vx *= cost; s.vy *= cost;
  }

  // --- drag: quadratic body drag + soft redline per glider ---
  // Below comfort: clean. Approaching top: drag swells. Past top: wall.
  // (No hard clamp — drag is the speed limit, plus a huge safety net.)
  // Drag opposes CURRENT motion (already steered above — never rebuilt).
  // Bare bodies are extra draggy: horizontal speed bleeds out quickly.
  speed = Math.sqrt(s.vx*s.vx + s.vy*s.vy);
  var red = 0;
  if(speed > p.comfort){
    var span = Math.max(5, p.top - p.comfort);
    red = REDLINE_K * Math.pow((speed - p.comfort) / span, 1.5);
    if(speed > p.top) red += OVER_TOP_K;
  }
  var dragF = (0.5 * speed * speed * 0.15 * p.drag) + (speed * speed * 0.004 * red);
  if(bare) dragF *= 2.0;
  if(speed > 0.5){
    // drag opposes CURRENT motion (already steered above — never rebuilt)
    var vNew = Math.max(0, speed - dragF * dt);
    var sc = vNew / speed;
    s.vx *= sc; s.vy *= sc;
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
