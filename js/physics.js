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
// DIVE_K removed (was 8.0): the downhill-only entry snap turned out to be
// a free-energy pump — each porpoise cycle harvested it on the way down
// and kept the change, so active porpoising with efficient wings flew
// forever (proven by sim: 36 km+ unpowered). Gravity alone powers every
// fall now; each descent must be repaid on the climb back, so porpoising
// always decays. Dive entries stay snappy (gravity is 30 m/s^2).
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
    returns {stalled, boosting, turb} */
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
  // A steep nose-up stalls EARLIER (yanked wings give up sooner), so a
  // slow high-nose hang falls out instead of hovering in place. Fast zoom
  // climbs at healthy speed stay far above the raised line and are unaffected.
  var speed = Math.sqrt(s.vx*s.vx + s.vy*s.vy);
  var stallMargin = (s.pitch > 0.5) ? Math.min(12, 3 + (s.pitch - 0.5) * 40) : 0;
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

  // NOTE: no fall-assist pump — gravity alone powers every fall, so each
  // descent must be repaid on the climb back. Free descent energy turns
  // porpoising into perpetual motion (a downhill-only snap of 8 was proven
  // to sustain 36 km+ unpowered flights); honest gravity plus drag
  // guarantees every flight eventually ends. Redline drag caps top speed.

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
  if(diff > 0) authority *= clamp((speed - 16) / 12, 0.05, 1); // up-rotations need real airspeed
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
  // --- saturated-trim heater: a SUSTAINED one-direction hover is expensive.
  // Pinning the trim against its cap with a LARGE sustained tracking error
  // (|diff| > ~26 deg) in the SAME direction for many seconds (high-lift
  // mush) builds heat, which bleeds energy until the hover collapses.
  // Small corrections never qualify (absolute-error gate), so cruise and
  // feathered piloting stay cool; brief yanks qualify but flip every
  // second or two, which restarts the clock. It builds SLOWLY (full in
  // ~10 s) and cools FAST, and the bleed is QUADRATIC in heat: small
  // warmth costs ~nothing, full heat costs a lot. A minutes-long steady
  // hover therefore pays full rate for 95%+ of its life and dies, while
  // normal flight — even clumsy bang-bang corrections — pays ~nothing.
  // No speed gate anywhere in this.
  if(typeof s.hoverHeat !== "number" || !isFinite(s.hoverHeat)) s.hoverHeat = 0;
  var unsat = Math.abs(diff) - maxTurn;
  var tdir = (turn > 1e-9) ? 1 : ((turn < -1e-9) ? -1 : 0);
  if(unsat > 0.2 && tdir !== 0 && Math.abs(diff) > 0.45){
    if((s.hoverHeat > 0 ? 1 : ((s.hoverHeat < 0) ? -1 : 0)) === tdir && Math.abs(s.hoverHeat) > 1e-9)
      s.hoverHeat = Math.max(-1.2, Math.min(1.2, s.hoverHeat + tdir * dt / 8));
    else s.hoverHeat = tdir * dt / 8; // flip (or start): restart the clock
  } else if(s.hoverHeat > 0) s.hoverHeat = Math.max(0, s.hoverHeat - 5 * dt);
  else if(s.hoverHeat < 0) s.hoverHeat = Math.min(0, s.hoverHeat + 5 * dt);
  if(s.hoverHeat > 0.01 || s.hoverHeat < -0.01){
    var hh = s.hoverHeat * s.hoverHeat;
    var heatCost = Math.exp(-0.5 * hh * dt);
    s.vx *= heatCost; s.vy *= heatCost;
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
  // --- upper-air turbulence: a dodo does not belong up here. Above ~150 m
  // the ride shakes and bleeds speed, so banked boost altitude spends
  // itself instead of floating forever. Low flight (where every stock
  // glider lives) is completely untouched; diving back down recovers
  // clean air. This is what guarantees long high flights always decay.
  var turb = 0;
  if(s.y > 150) turb = Math.min(1, (s.y - 150) / 150);
  dragF += turb * 6.0;
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
  return { stalled:stalled, boosting:boosting, turb:turb };
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
  DIVE_K:0, clamp:clamp, wrapAngle:wrapAngle, // DIVE_K retired (was an energy pump); kept as 0 for API compat
  stepFlight:stepFlight, econReward:econReward, fmtDist:fmtDist };

// browser + node compatibility
if(typeof window !== "undefined"){ window.DA = window.DA || {}; window.DA.Physics = api; }
if(typeof module !== "undefined" && module.exports){ module.exports = api; }
})();
