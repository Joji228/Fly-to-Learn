/* In-flight pickups: golden fish and gust rings.
   A fixed, hand-shaped course (deterministic hash, same every flight) so a
   glide is never "hold nothing and wait": there is always a fish arc or a
   ring ahead worth steering for.
     FISH  — +$FISH_VALUE each, chained pickups climb in pitch.
     RINGS — fly through the hoop: +RING_KICK m/s along the current path.
   Energy stays honest: the course is finite (ends past City Isle), each
   ring pays once per flight, so no pickup can sustain perpetual flight.
   World units (meters, world x — the lip sits at x=140). */
(function(){
"use strict";

var FISH_VALUE = 4;
var RING_KICK = 7;      // m/s added along the velocity vector
var RING_HALF = 6.5;    // hoop half-height (m): generous, readable
var FISH_R = 3.4;       // pickup radius (m)
var COURSE_END = 4300;

function hash(n){ var x = Math.sin(n*91.7+13.3)*43758.5453; return x - Math.floor(x); }
function ground(x){
  try{ return window.DA.World.groundY(x); }catch(e){ return 0; }
}

var course = null;
function build(){
  var rings = [], fish = [];
  // gust rings: every ~200 m, a little higher the farther out you get
  var rx = 330, ri = 0;
  while(rx < COURSE_END){
    var lift = Math.min(1, rx / 3000);
    rings.push({ x: rx, y: Math.max(ground(rx), 0) + 12 + hash(ri+1)*(26 + lift*30) });
    rx += 185 + hash(ri+7)*70; ri++;
  }
  // fish arcs: five fish on a gentle hump, skipped near rings
  var fx = 185, fi = 0;
  while(fx < COURSE_END){
    var near = false;
    for(var k=0;k<rings.length;k++) if(Math.abs(rings[k].x - fx) < 28){ near = true; break; }
    if(!near){
      var lift2 = Math.min(1, fx / 3000);
      var base = Math.max(ground(fx), 0) + 5 + hash(fi+3)*(22 + lift2*28);
      var arcH = 2 + hash(fi+5)*5, dir = hash(fi+9) < 0.5 ? 1 : -1;
      for(var j=0;j<5;j++){
        var tj = j/4;
        fish.push({ x: fx + j*5.5, y: base + dir*Math.sin(tj*Math.PI)*arcH });
      }
    }
    fx += 70 + hash(fi+11)*55; fi++;
  }
  return { rings: rings, fish: fish };
}
function getCourse(){ if(!course) course = build(); return course; }

function newRun(){
  var c = getCourse();
  return { fishGot: new Array(c.fish.length), ringGot: new Array(c.rings.length),
    fish: 0, rings: 0, chain: 0, chainT: 0 };
}

/* One sim step. prevX = S.x before stepFlight. Returns what was collected. */
function step(st, S, prevX, dt){
  var c = getCourse(), ev = { fish: 0, ring: false, fx: 0, fy: 0 };
  if(!st || !S) return ev;
  st.chainT = Math.max(0, st.chainT - (dt || 0));
  if(st.chainT <= 0) st.chain = 0;
  var lo = Math.min(prevX, S.x) - FISH_R, hi = Math.max(prevX, S.x) + FISH_R;
  if(hi < 150 || lo > COURSE_END + 40) return ev;
  for(var i=0;i<c.fish.length;i++){
    var f = c.fish[i];
    if(f.x < lo || f.x > hi || st.fishGot[i]) continue;
    if(Math.abs(f.y - S.y) <= FISH_R){
      st.fishGot[i] = true; st.fish++; ev.fish++;
      st.chain++; st.chainT = 0.9;
      ev.fx = f.x; ev.fy = f.y;
    }
  }
  for(var r=0;r<c.rings.length;r++){
    var R = c.rings[r];
    if(st.ringGot[r]) continue;
    if(prevX < R.x && S.x >= R.x && Math.abs(S.y - R.y) <= RING_HALF){
      st.ringGot[r] = true; st.rings++; ev.ring = true;
      var sp = Math.sqrt(S.vx*S.vx + S.vy*S.vy);
      if(sp > 0.5){ var k2 = (sp + RING_KICK) / sp; S.vx *= k2; S.vy *= k2; S.speed = sp + RING_KICK; }
    }
  }
  return ev;
}

/* Next un-collected ring ahead (for the HUD / approach hints). */
function nextRing(st, x){
  var c = getCourse();
  for(var r=0;r<c.rings.length;r++){
    if(c.rings[r].x > x && !(st && st.ringGot[r])) return c.rings[r];
  }
  return null;
}

/* ---------- drawing (world -> screen via SX/SY from drawScene) ---------- */
function drawFish(g, x, y, s, t, seed){
  var bob = Math.sin(t*0.004 + seed)*2*s;
  g.save();
  g.translate(x, y + bob);
  g.rotate(Math.sin(t*0.003 + seed)*0.15);
  // glow
  g.fillStyle = "rgba(255,214,10,0.22)";
  g.beginPath(); g.arc(0, 0, 11*s, 0, 7); g.fill();
  // body
  var gr = g.createLinearGradient(0, -5*s, 0, 5*s);
  gr.addColorStop(0, "#fff3a8"); gr.addColorStop(0.5, "#ffc93c"); gr.addColorStop(1, "#e59500");
  g.fillStyle = gr; g.strokeStyle = "#8a4b00"; g.lineWidth = Math.max(1, 1.4*s);
  g.beginPath();
  g.moveTo(7*s, 0);
  g.quadraticCurveTo(3*s, -5.5*s, -4*s, -2.5*s);
  g.lineTo(-9*s, -5.5*s); g.lineTo(-7.5*s, 0); g.lineTo(-9*s, 5.5*s);
  g.lineTo(-4*s, 2.5*s);
  g.quadraticCurveTo(3*s, 5.5*s, 7*s, 0);
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#3a2200";
  g.beginPath(); g.arc(3.4*s, -1.2*s, 1.1*s, 0, 7); g.fill();
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.beginPath(); g.ellipse(0, -2.4*s, 3*s, 1*s, -0.2, 0, 7); g.fill();
  g.restore();
}
function ringArc(g, cx, cy, rx, ry, a0, a1, lw, col){
  g.strokeStyle = col; g.lineWidth = lw;
  g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, a0, a1); g.stroke();
}
function drawRingHalf(g, cx, cy, ry, s, front, got, t){
  var rx = ry * 0.34;
  var a0 = front ? -Math.PI/2 : Math.PI/2, a1 = front ? Math.PI/2 : Math.PI*1.5;
  var pulse = 0.5 + 0.5*Math.sin(t*0.006);
  g.save();
  g.lineCap = "round";
  if(got){
    ringArc(g, cx, cy, rx, ry, a0, a1, 3*s, "rgba(255,255,255,0.35)");
  } else {
    ringArc(g, cx, cy, rx, ry, a0, a1, 11*s, "rgba(61,242,214," + (0.18 + 0.12*pulse).toFixed(3) + ")");
    ringArc(g, cx, cy, rx, ry, a0, a1, 6*s, front ? "#3df2d6" : "#1fb7a3");
    ringArc(g, cx, cy, rx, ry, a0, a1, 2*s, "rgba(255,255,255,0.9)");
  }
  g.restore();
}
function inView(sx, W){ return sx > -80 && sx < W + 80; }

function drawBack(g, SX, SY, zoom, st, W, H){
  var c = getCourse(), PPM = (window.DA.World && window.DA.World.PPM) || 5;
  var t = Date.now(), s = Math.max(0.7, zoom * PPM / 6);
  for(var r=0;r<c.rings.length;r++){
    var R = c.rings[r], sx = SX(R.x);
    if(!inView(sx, W)) continue;
    var got = !!(st && st.ringGot[r]);
    var ry = RING_HALF * PPM * zoom;
    // chevrons inside the hoop (unclaimed only): point the way through
    if(!got){
      g.save();
      g.globalAlpha = 0.55 + 0.25*Math.sin(t*0.008);
      g.strokeStyle = "#ffffff"; g.lineWidth = 3*s; g.lineCap = "round"; g.lineJoin = "round";
      var cy0 = SY(R.y);
      for(var k=0;k<2;k++){
        var ox = sx - 5*s + k*9*s;
        g.beginPath(); g.moveTo(ox - 4*s, cy0 - 7*s); g.lineTo(ox + 3*s, cy0); g.lineTo(ox - 4*s, cy0 + 7*s); g.stroke();
      }
      g.restore();
    }
    drawRingHalf(g, sx, SY(R.y), ry, s, false, got, t);
  }
  for(var i=0;i<c.fish.length;i++){
    if(st && st.fishGot[i]) continue;
    var f = c.fish[i], fx = SX(f.x);
    if(!inView(fx, W)) continue;
    var fy = SY(f.y);
    if(fy < -30 || fy > H + 30) continue;
    drawFish(g, fx, fy, s*1.55, t, i*1.7);
  }
}
function drawFront(g, SX, SY, zoom, st, W){
  var c = getCourse(), PPM = (window.DA.World && window.DA.World.PPM) || 5;
  var t = Date.now(), s = Math.max(0.7, zoom * PPM / 6);
  for(var r=0;r<c.rings.length;r++){
    var R = c.rings[r], sx = SX(R.x);
    if(!inView(sx, W)) continue;
    drawRingHalf(g, sx, SY(R.y), RING_HALF * PPM * zoom, s, true, !!(st && st.ringGot[r]), t);
  }
}

window.DA = window.DA || {};
window.DA.Pickups = { FISH_VALUE: FISH_VALUE, RING_KICK: RING_KICK, RING_HALF: RING_HALF,
  getCourse: getCourse, newRun: newRun, step: step, nextRing: nextRing,
  drawBack: drawBack, drawFront: drawFront, drawFish: drawFish };
})();
