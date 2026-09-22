(function () {
"use strict";
if (typeof window === "undefined") { return; }
if (!window.DA) { window.DA = {}; }

var GLIDERS = [
 {id:0,name:"Bare Dodo",tag:"No gear. Just Dennis and gravity.",price:0,control:1.1,drag:0.085,turnK:0.16,comfort:20,top:32,stall:12,sink:0.38,bars:{fly:1,speed:2,ctrl:2},desc:"Flapping counts as trying. Results may vary. They vary."},
 {id:1,name:"Paper Dart",tag:"A giant folded paper plane. Somehow counts.",price:200,control:2.0,drag:0.045,turnK:0.13,comfort:30,top:50,stall:11,sink:0.12,bars:{fly:3,speed:5,ctrl:4},desc:"Folded from a very large homework assignment. Flies great until it rains."},
 {id:2,name:"Rainbow Kite Rig",tag:"A loud kite. Surprisingly obedient.",price:700,control:2.5,drag:0.038,turnK:0.09,comfort:32,top:56,stall:8,sink:0.108,bars:{fly:5,speed:6,ctrl:6},desc:"Visible from three islands away. Comes with extra string and zero stealth."},
 {id:3,name:"The Compromise",tag:"Wood, cloth, tape. A real glider. Mostly.",price:1900,control:2.65,drag:0.032,turnK:0.08,comfort:38,top:64,stall:8,sink:0.10,bars:{fly:7,speed:7,ctrl:7},desc:"Built from spare shed parts and strong opinions. Rattles in a reassuring way."},
 {id:4,name:"Needlefish",tag:"A sleek speed wing. Do not sneeze while flying.",price:5500,control:2.8,drag:0.023,turnK:0.075,comfort:58,top:95,stall:9,sink:0.09,bars:{fly:8,speed:9,ctrl:8},desc:"Goes very fast in one direction. Landing is left as an exercise for Dennis."},
 {id:5,name:"Black Swan X-1",tag:"Experimental carbon. Probably legal.",price:17000,control:2.9,drag:0.020,turnK:0.07,comfort:68,top:110,stall:8,sink:0.08,bars:{fly:10,speed:10,ctrl:10},desc:"Hums ominously and glows for no reason. The manual is just a winking face."}
];

var ROCKETS = [
 {id:0,name:"Puddle-Jumper",tag:"A fish-oil rocket. Smells like victory.",price:350,thrust:30,burn:2.0,bars:{thrust:3,burn:4},desc:"One rusty tube of dreams. Hold SPACE and apologize to physics."},
 {id:1,name:"Twin Sardine Rig",tag:"Two rockets. Twice the poor decisions.",price:2800,thrust:60,burn:2.5,bars:{thrust:6,burn:7},desc:"Synchronized sardine combustion. Dennis flies. Seagulls relocate."},
 {id:2,name:"Dodo-Star Engine",tag:"Experimental. The warning label just says 'wow'.",price:12000,thrust:105,burn:2.8,bars:{thrust:10,burn:10},desc:"Three nozzles, one glow, zero regrets. The sky files a complaint."}
];

function clampId(id, max) {
  var n = Math.floor(Number(id));
  if (!isFinite(n)) { n = 0; }
  if (n < 0) { n = 0; }
  if (n > max) { n = max; }
  return n;
}
function rr2(g, x, y, w, h, r){
  r = Math.min(r, w/2, h/2);
  g.beginPath();
  g.moveTo(x+r, y);
  g.arcTo(x+w, y, x+w, y+h, r);
  g.arcTo(x+w, y+h, x, y+h, r);
  g.arcTo(x, y+h, x, y, r);
  g.arcTo(x, y, x+w, y, r);
  g.closePath();
}

/* ================= GLIDERS (side / three-quarter view) =================
   Unit space, Dennis centred at the origin facing +x (head ~ (15,-15)).
   Two layers so rigging can wrap around him:
     layer "back"  — far wing, sail, keel, rear rigging (behind the body)
     layer "front" — control bar / strings / bridles (over the body)
   Every airframe shares the hang-glider silhouette language (nose ahead,
   far tip high, near tip low) so the ladder reads as one family. */
var INK = "#1f2235";

function wingShape(g, nose, tip, rear, billow){
  var mx = (tip[0] + rear[0]) / 2, my = (tip[1] + rear[1]) / 2;
  g.beginPath();
  g.moveTo(nose[0], nose[1]);
  g.quadraticCurveTo((nose[0]+tip[0])/2, (nose[1]+tip[1])/2 - 2, tip[0], tip[1]);
  g.quadraticCurveTo(mx + billow*0.6, my + billow*(tip[1] < rear[1] ? 1 : -1), rear[0], rear[1]);
  g.closePath();
}
function serrate(g, tip, rear, n, depth){
  g.beginPath();
  g.moveTo(tip[0], tip[1]);
  for(var i=1;i<=n;i++){
    var k = i/n, x = tip[0] + (rear[0]-tip[0])*k, y = tip[1] + (rear[1]-tip[1])*k;
    var kh = (i-0.5)/n, hx = tip[0] + (rear[0]-tip[0])*kh, hy = tip[1] + (rear[1]-tip[1])*kh;
    g.lineTo(hx - depth*0.4, hy + depth * (tip[1] > rear[1] ? 1 : -1)); g.lineTo(x, y);
  }
}
/* generic hang wing: cfg = {nose, near, far, rear, billow, nearFill, farFill, edge, edgeW} */
function hangWing(g, c){
  // far wing (shadowed, behind)
  g.fillStyle = c.farFill; g.strokeStyle = INK; g.lineWidth = 2;
  wingShape(g, c.nose, c.far, c.rear, -c.billow); g.fill(); g.stroke();
  // near wing
  g.fillStyle = c.nearFill; g.lineWidth = 2.2;
  wingShape(g, c.nose, c.near, c.rear, c.billow); g.fill(); g.stroke();
  // keel
  g.strokeStyle = c.keel || "#4a4e69"; g.lineWidth = 2.6;
  g.beginPath(); g.moveTo(c.nose[0], c.nose[1]); g.lineTo(c.rear[0], c.rear[1]); g.stroke();
  // leading edges
  if(c.edge){
    g.strokeStyle = c.edge; g.lineWidth = c.edgeW || 2.4;
    g.beginPath(); g.moveTo(c.nose[0], c.nose[1]);
    g.quadraticCurveTo((c.nose[0]+c.near[0])/2, (c.nose[1]+c.near[1])/2 - 2, c.near[0], c.near[1]); g.stroke();
  }
}
function controlFrame(g, keelX, keelY, col, layer){
  // A-frame: far downtube behind Dennis, near downtube + base bar in front
  g.lineCap = "round";
  if(layer === "back"){
    g.strokeStyle = INK; g.lineWidth = 3.4;
    g.beginPath(); g.moveTo(keelX, keelY); g.lineTo(keelX - 8, -2); g.stroke();
    g.strokeStyle = col; g.lineWidth = 1.8; g.stroke();
    g.strokeStyle = "#3a2d24"; g.lineWidth = 2.2;            // hang strap to the harness
    g.beginPath(); g.moveTo(keelX - 10, keelY + 1); g.lineTo(-6, -13); g.stroke();
  } else {
    g.strokeStyle = INK; g.lineWidth = 3.6;
    g.beginPath(); g.moveTo(keelX, keelY); g.lineTo(keelX + 8, -1); g.lineTo(keelX - 8, -2); g.stroke();
    g.strokeStyle = col; g.lineWidth = 2;
    g.beginPath(); g.moveTo(keelX, keelY); g.lineTo(keelX + 8, -1); g.lineTo(keelX - 8, -2); g.stroke();
    // harness band across the chest
    g.strokeStyle = "#3a2d24"; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(-6, -13); g.quadraticCurveTo(2, -4, 9, 3); g.stroke();
    g.fillStyle = "#c9a227"; g.strokeStyle = INK; g.lineWidth = 1;
    g.beginPath(); g.rect(1.5, -6.5, 4, 4); g.fill(); g.stroke();
  }
}

function drawGlider(g, id, s, o) {
  if (!g || typeof g.save !== "function" || typeof g.restore !== "function") { return; }
  var nid = clampId(id, 5);
  if (nid === 0) return; // bare Dennis: his own flapping wing is the whole show
  var sc = Number(s); if (!isFinite(sc) || sc <= 0) { sc = 1; }
  var opts = o || {};
  var layer = opts.layer || "back";
  var t = (typeof opts.t === "number" && isFinite(opts.t)) ? opts.t : 0;
  var speed = opts.speed || 0;
  g.save();
  try {
    g.scale(sc, sc);
    g.lineJoin = "round"; g.lineCap = "round";
    // stalled wings shudder; fast wings flex a hair
    var wob = opts.stalled ? Math.sin(t/60)*0.05 : Math.sin(t/220)*0.012*Math.min(1, speed/40);
    g.translate(0, -30); g.rotate(wob); g.translate(0, 30);

    if (nid === 1) paperDart(g, layer, t);
    else if (nid === 2) kiteRig(g, layer, t, speed);
    else if (nid === 3) compromise(g, layer);
    else if (nid === 4) needlefish(g, layer, t);
    else blackSwan(g, layer, t);
  } catch (e) {}
  g.restore();
}

function paperDart(g, layer, t){
  var nose = [36, -35], rearTop = [-30, -43], rearBot = [-30, -30], tip = [-24, -56];
  if(layer === "back"){
    // fuselage fold
    var fg = g.createLinearGradient(0, -44, 0, -28);
    fg.addColorStop(0, "#ffffff"); fg.addColorStop(1, "#d9e2ec");
    g.fillStyle = fg; g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.moveTo(nose[0], nose[1]); g.lineTo(rearTop[0], rearTop[1]); g.lineTo(rearBot[0], rearBot[1]); g.closePath();
    g.fill(); g.stroke();
    // wing panel (ruled homework paper)
    g.save();
    g.beginPath(); g.moveTo(nose[0], nose[1]); g.lineTo(tip[0], tip[1]); g.lineTo(rearTop[0], rearTop[1]); g.closePath();
    g.fillStyle = "#fbfdff"; g.fill();
    g.clip();
    g.strokeStyle = "rgba(90,150,220,0.55)"; g.lineWidth = 0.9;
    for(var i=0;i<7;i++){ var yy = -56 + i*3.2; g.beginPath(); g.moveTo(-34, yy); g.lineTo(40, yy + 10); g.stroke(); }
    g.strokeStyle = "rgba(230,57,70,0.6)"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-12, -60); g.lineTo(-18, -30); g.stroke();
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.moveTo(nose[0], nose[1]); g.lineTo(tip[0], tip[1]); g.lineTo(rearTop[0], rearTop[1]); g.closePath(); g.stroke();
    g.strokeStyle = "rgba(31,34,53,0.35)"; g.lineWidth = 1.2;       // crease
    g.beginPath(); g.moveTo(nose[0]-2, nose[1]-1); g.lineTo(rearTop[0]+4, rearTop[1]-1); g.stroke();
    // a doodle on the wing: tiny star
    g.fillStyle = "#e63946";
    g.beginPath(); g.arc(-8, -46, 1.6, 0, 7); g.fill();
    // strings (rear)
    g.strokeStyle = "rgba(60,60,70,0.8)"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-14, -32); g.lineTo(-8, -13); g.stroke();
  } else {
    g.strokeStyle = "rgba(60,60,70,0.85)"; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(8, -33); g.lineTo(4, -12); g.stroke();
    g.beginPath(); g.moveTo(8, -33); g.lineTo(-6, -12); g.stroke();
    g.fillStyle = "#e63946"; g.strokeStyle = INK; g.lineWidth = 1;  // paper clip
    g.beginPath(); g.rect(6, -35.5, 4.5, 3); g.fill(); g.stroke();
  }
}

function kiteRig(g, layer, t, speed){
  var T = [4, -70], F = [21, -49], B = [0, -28], R = [-18, -50];
  if(layer === "back"){
    // tail ribbon streaming behind, bows along it
    var flow = Math.min(1, speed/35);
    var pts = [];
    for(var i=0;i<=8;i++){
      var k = i/8;
      pts.push([B[0] - k*(34 + flow*16), B[1] + k*(8 - flow*6) + Math.sin(t*0.012 - k*6)*(2 + k*5)]);
    }
    g.strokeStyle = "#3a3a3a"; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for(var j=1;j<pts.length;j++) g.lineTo(pts[j][0], pts[j][1]);
    g.stroke();
    var bowCols = ["#ff595e","#ffca3a","#8ac926","#1982c4"];
    for(var b=0;b<4;b++){
      var p = pts[2 + b*2];
      g.fillStyle = bowCols[b]; g.strokeStyle = INK; g.lineWidth = 1;
      g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0]-4, p[1]-3); g.lineTo(p[0]-4, p[1]+3); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0]+4, p[1]-3); g.lineTo(p[0]+4, p[1]+3); g.closePath(); g.fill(); g.stroke();
    }
    // diamond sail with rainbow bands
    g.save();
    g.beginPath(); g.moveTo(T[0],T[1]); g.lineTo(F[0],F[1]); g.lineTo(B[0],B[1]); g.lineTo(R[0],R[1]); g.closePath();
    g.clip();
    var kc = ["#ff595e","#ff924c","#ffca3a","#8ac926","#1982c4","#6a4c93"];
    for(var c=0;c<6;c++){
      g.fillStyle = kc[c];
      g.beginPath();
      var x0 = -30 + c*10;
      g.moveTo(x0, -90); g.lineTo(x0+10, -90); g.lineTo(x0+10-22, -20); g.lineTo(x0-22, -20); g.closePath(); g.fill();
    }
    var shade = g.createLinearGradient(-22, -54, 24, -52);
    shade.addColorStop(0, "rgba(0,0,0,0.18)"); shade.addColorStop(0.5, "rgba(255,255,255,0.12)"); shade.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = shade; g.fillRect(-30, -90, 70, 70);
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(T[0],T[1]); g.lineTo(F[0],F[1]); g.lineTo(B[0],B[1]); g.lineTo(R[0],R[1]); g.closePath(); g.stroke();
    g.strokeStyle = "#6b4226"; g.lineWidth = 1.8;                     // spars
    g.beginPath(); g.moveTo(T[0],T[1]); g.lineTo(B[0],B[1]); g.moveTo(R[0],R[1]); g.lineTo(F[0],F[1]); g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(T[0]-2, T[1]+6); g.lineTo(R[0]+6, R[1]-1); g.stroke();
    g.strokeStyle = "#3a3a3a"; g.lineWidth = 1;                       // rear bridle
    g.beginPath(); g.moveTo(R[0]+2, R[1]+2); g.lineTo(-6, -13); g.stroke();
  } else {
    g.strokeStyle = "#3a3a3a"; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(F[0]-2, F[1]+2); g.lineTo(6, -11); g.moveTo(B[0], B[1]); g.lineTo(2, -12); g.stroke();
    g.fillStyle = "#6b4226"; g.strokeStyle = INK; g.lineWidth = 1;
    g.beginPath(); g.arc(3, -12, 2, 0, 7); g.fill(); g.stroke();
  }
}

function compromise(g, layer){
  var c = { nose:[34,-42], near:[-40,-27], far:[-28,-58], rear:[-28,-41], billow:6 };
  if(layer === "back"){
    var nf = g.createLinearGradient(0, -44, 0, -26);
    nf.addColorStop(0, "#f4e3b2"); nf.addColorStop(1, "#d6a86e");
    var ff = g.createLinearGradient(0, -58, 0, -40);
    ff.addColorStop(0, "#cfae78"); ff.addColorStop(1, "#b88a55");
    c.nearFill = nf; c.farFill = ff; c.edge = "#7f5539"; c.edgeW = 4; c.keel = "#6b4226";
    hangWing(g, c);
    // seams, patches, tape, bolts
    g.strokeStyle = "rgba(127,85,57,0.55)"; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(10, -41); g.lineTo(-14, -30); g.moveTo(-10, -41); g.lineTo(-30, -30); g.stroke();
    g.fillStyle = "#e9c46a"; g.strokeStyle = "#7f5539"; g.lineWidth = 1;
    g.beginPath(); g.rect(-4, -38, 8, 6); g.fill(); g.stroke();
    g.fillStyle = "#8ecae6";
    g.beginPath(); g.rect(-24, -35, 7, 5); g.fill(); g.stroke();
    g.strokeStyle = "#adb5bd"; g.lineWidth = 3;                       // duct-tape X
    g.beginPath(); g.moveTo(14, -44); g.lineTo(20, -38); g.moveTo(20, -44); g.lineTo(14, -38); g.stroke();
    g.fillStyle = "#495057";
    [[30,-42],[-26,-41],[-36,-28]].forEach(function(p){ g.beginPath(); g.arc(p[0], p[1], 1.5, 0, 7); g.fill(); });
    controlFrame(g, 4, -41, "#8a5a36", "back");
  } else controlFrame(g, 4, -41, "#8a5a36", "front");
}

function needlefish(g, layer, t){
  var c = { nose:[40,-41], near:[-46,-29], far:[-32,-55], rear:[-26,-41], billow:4 };
  if(layer === "back"){
    var nf = g.createLinearGradient(0, -46, 0, -28);
    nf.addColorStop(0, "#6aa9ff"); nf.addColorStop(0.55, "#2d6cc0"); nf.addColorStop(1, "#1b3f7a");
    var ff = g.createLinearGradient(0, -56, 0, -40);
    ff.addColorStop(0, "#2f5f9e"); ff.addColorStop(1, "#1a3563");
    c.nearFill = nf; c.farFill = ff; c.edge = "#e8f1ff"; c.edgeW = 2; c.keel = "#15213a";
    hangWing(g, c);
    // racing stripes parallel to the leading edge
    g.strokeStyle = "#ffffff"; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(30, -39.5); g.lineTo(-36, -30.5); g.stroke();
    g.strokeStyle = "#ffb703"; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(26, -37.5); g.lineTo(-30, -29.5); g.stroke();
    // winglets
    g.fillStyle = "#1b3f7a"; g.strokeStyle = INK; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(-46, -29); g.lineTo(-50, -38); g.lineTo(-43, -31); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-32, -55); g.lineTo(-35, -62); g.lineTo(-29, -56); g.closePath(); g.fill(); g.stroke();
    // nav lights
    var blink = (Math.floor(t/400) % 2) === 0;
    g.fillStyle = blink ? "#ff4d6d" : "#7a1f2e";
    g.beginPath(); g.arc(-45, -29.5, 1.8, 0, 7); g.fill();
    g.fillStyle = "#56f09a";
    g.beginPath(); g.arc(-31, -54.5, 1.5, 0, 7); g.fill();
    controlFrame(g, 6, -41, "#c0c8d8", "back");
  } else controlFrame(g, 6, -41, "#c0c8d8", "front");
}

function blackSwan(g, layer, t){
  var c = { nose:[38,-43], near:[-44,-26], far:[-34,-60], rear:[-28,-43], billow:5 };
  if(layer === "back"){
    var nf = g.createLinearGradient(0, -48, 0, -26);
    nf.addColorStop(0, "#4a5063"); nf.addColorStop(0.5, "#23262f"); nf.addColorStop(1, "#0e1016");
    var ff = g.createLinearGradient(0, -60, 0, -42);
    ff.addColorStop(0, "#2a2e3a"); ff.addColorStop(1, "#111319");
    c.nearFill = nf; c.farFill = ff; c.keel = "#0b0c10";
    hangWing(g, c);
    // feathered trailing edge on the near wing
    g.fillStyle = "#15171e"; g.strokeStyle = INK; g.lineWidth = 1.2;
    serrate(g, c.near, c.rear, 6, 4); g.lineTo(c.rear[0], c.rear[1] - 0.5); g.closePath(); g.fill(); g.stroke();
    // carbon weave glints
    g.strokeStyle = "rgba(170,180,210,0.28)"; g.lineWidth = 1;
    for(var i=0;i<5;i++){ g.beginPath(); g.moveTo(24 - i*12, -41 + i*0.5); g.lineTo(8 - i*12, -32 + i*0.5); g.stroke(); }
    // glowing leading edges
    var pulse = 0.6 + 0.4*Math.sin(t*0.004);
    g.save();
    g.shadowColor = "#3df2d6"; g.shadowBlur = 8 * pulse;
    g.strokeStyle = "#3df2d6"; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(c.nose[0], c.nose[1]);
    g.quadraticCurveTo((c.nose[0]+c.near[0])/2, (c.nose[1]+c.near[1])/2 - 2, c.near[0], c.near[1]); g.stroke();
    g.globalAlpha = 0.6;
    g.beginPath(); g.moveTo(c.nose[0], c.nose[1]);
    g.quadraticCurveTo((c.nose[0]+c.far[0])/2, (c.nose[1]+c.far[1])/2 - 2, c.far[0], c.far[1]); g.stroke();
    g.restore();
    g.fillStyle = "#3df2d6";
    g.beginPath(); g.arc(4, -40, 1.8, 0, 7); g.fill();
    g.fillStyle = "#ff4d6d";
    g.beginPath(); g.arc(-43, -26.5, 1.6, 0, 7); g.fill();
    controlFrame(g, 6, -43, "#5a6070", "back");
  } else controlFrame(g, 6, -43, "#5a6070", "front");
}

/* ================= ROCKETS: strapped along Dennis's back ================= */
var ROCKET_TUBES = [
  [[-9, -18, 20, 4.2, 1]],                                    // Puddle-Jumper: one rusty tube
  [[-13, -25, 18, 3.6, 0.8], [-8, -17, 21, 4.3, 1]],          // Twin Sardine: staggered pair
  [[-15, -28, 16, 3.2, 0.7], [-8, -18, 25, 5.2, 1.25], [-12, -9, 15, 3, 0.7]] // Dodo-Star
];
function rocketNozzles(id){
  var tubes = ROCKET_TUBES[clampId(id, 2)], out = [];
  for(var i=0;i<tubes.length;i++){ var tb = tubes[i]; out.push([tb[0] - tb[2]/2 - 3, tb[1], tb[4]]); }
  return out;
}
function drawRocket(g, id, s, o) {
  if (!g || typeof g.save !== "function" || typeof g.restore !== "function") { return; }
  var nid = clampId(id, 2);
  var sc = Number(s); if (!isFinite(sc) || sc <= 0) { sc = 1; }
  var firing = !!(o && o.firing);
  g.save();
  try {
    g.scale(sc, sc);
    g.lineJoin = "round"; g.lineCap = "round";
    var tubes = ROCKET_TUBES[nid];
    for(var i=0;i<tubes.length;i++){
      var tb = tubes[i], cx = tb[0], cy = tb[1], L = tb[2], r = tb[3];
      var x0 = cx - L/2, x1 = cx + L/2;
      var bg = g.createLinearGradient(0, cy - r, 0, cy + r);
      if (nid === 0) { bg.addColorStop(0, "#d4a373"); bg.addColorStop(0.5, "#a8703f"); bg.addColorStop(1, "#6b4226"); }
      else if (nid === 1) { bg.addColorStop(0, "#e9edf2"); bg.addColorStop(0.5, "#a9b3c2"); bg.addColorStop(1, "#5c677d"); }
      else { bg.addColorStop(0, "#565d70"); bg.addColorStop(0.5, "#2a2f3d"); bg.addColorStop(1, "#0f1119"); }
      // fins (behind the tube)
      g.fillStyle = "#e63946"; g.strokeStyle = INK; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(x0 + 5, cy - r + 0.5); g.lineTo(x0 - 1, cy - r - 4); g.lineTo(x0, cy - r + 0.5); g.closePath(); g.fill(); g.stroke();
      // nozzle bell
      g.fillStyle = "#343a40";
      g.beginPath(); g.moveTo(x0, cy - r*0.6); g.lineTo(x0 - 3, cy - r*0.85); g.lineTo(x0 - 3, cy + r*0.85); g.lineTo(x0, cy + r*0.6); g.closePath(); g.fill(); g.stroke();
      if(firing){ g.fillStyle = "#ffd23f"; g.beginPath(); g.ellipse(x0 - 3, cy, 0.9, r*0.7, 0, 0, 7); g.fill(); }
      // body + nose cone
      g.fillStyle = bg; g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(x0, cy - r); g.lineTo(x1 - r, cy - r);
      g.quadraticCurveTo(x1 + r*0.9, cy, x1 - r, cy + r);
      g.lineTo(x0, cy + r); g.closePath(); g.fill(); g.stroke();
      // bands / details per tier
      g.fillStyle = "#e63946"; g.fillRect(x1 - r - 2, cy - r + 0.8, 2, r*2 - 1.6);
      if (nid >= 1) { g.fillStyle = "#ffb703"; g.fillRect(x0 + 2, cy - 1, L - r - 5, 2); }
      if (nid >= 2) {
        g.save(); g.shadowColor = "#3df2d6"; g.shadowBlur = firing ? 9 : 4;
        g.fillStyle = "#3df2d6"; g.fillRect(x0 + 1, cy - r + 0.8, 1.6, r*2 - 1.6);
        g.restore();
      }
      g.fillStyle = "rgba(255,255,255,0.5)";
      g.beginPath(); g.ellipse(cx, cy - r*0.5, L*0.35, r*0.22, 0, 0, 7); g.fill();
      if (nid === 0) { g.fillStyle = "rgba(90,50,20,0.5)"; g.beginPath(); g.arc(cx - 3, cy + 1, 1.2, 0, 7); g.fill(); g.beginPath(); g.arc(cx + 2, cy + 2, 0.9, 0, 7); g.fill(); }
    }
    // strap over the tubes
    g.strokeStyle = "#3a2d24"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-4, -24); g.quadraticCurveTo(0, -16, -2, -9); g.stroke();
  } catch (e) {}
  g.restore();
}

/* ================= shop previews: the real Dennis, on a stage ================= */
function stage(ctx, w, h, glow){
  var grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, "#5fa8e0"); grd.addColorStop(0.62, "#bfe0f6"); grd.addColorStop(1, "#eaf5fc");
  ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
  var sun = ctx.createRadialGradient(w*0.84, h*0.2, 4, w*0.84, h*0.2, h*0.45);
  sun.addColorStop(0, "rgba(255,246,200,0.9)"); sun.addColorStop(1, "rgba(255,246,200,0)");
  ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath(); ctx.ellipse(w*0.2, h*0.26, w*0.12, h*0.05, 0, 0, 7); ctx.ellipse(w*0.27, h*0.3, w*0.09, h*0.045, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#a9c3de";
  ctx.beginPath(); ctx.moveTo(0, h*0.86); ctx.lineTo(w*0.18, h*0.66); ctx.lineTo(w*0.34, h*0.8); ctx.lineTo(w*0.55, h*0.62); ctx.lineTo(w*0.78, h*0.82); ctx.lineTo(w, h*0.7); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, h*0.88, w, h*0.12);
  if(glow){
    var gl = ctx.createRadialGradient(w*0.5, h*0.5, 4, w*0.5, h*0.5, h*0.55);
    gl.addColorStop(0, glow); gl.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h);
  }
}
function previewDennis(ctx, x, y, sc, S){
  var W = window.DA.World;
  if(W && W.drawDodo){ W.drawDodo(ctx, x, y, S, sc, {}); return; }
}
function drawGliderPreview(canvas, id) {
  if (!canvas || typeof canvas.getContext !== "function") { return; }
  try {
    var ctx = canvas.getContext("2d"); if (!ctx) { return; }
    var w = canvas.width || 160, h = canvas.height || 90;
    var nid = clampId(id, 5);
    stage(ctx, w, h, nid === 5 ? "rgba(61,242,214,0.18)" : null);
    var sc = h / 118;
    previewDennis(ctx, w*0.5, h*0.72, sc, { pitch: 0.06, vx: 24, vy: 0, glider: nid, rocket: -1, sledLvl: 0, aeroLvl: 0 });
  } catch (e4) {}
}
function drawRocketPreview(canvas, id) {
  if (!canvas || typeof canvas.getContext !== "function") { return; }
  try {
    var ctx = canvas.getContext("2d"); if (!ctx) { return; }
    var w = canvas.width || 160, h = canvas.height || 90;
    var nid = clampId(id, 2);
    stage(ctx, w, h, "rgba(255,183,3,0.22)");
    var sc = h / 80;
    previewDennis(ctx, w*0.56, h*0.64, sc, { pitch: 0.12, vx: 30, vy: 2, glider: 0, rocket: nid, boosting: true, sledLvl: 0, aeroLvl: 0 });
  } catch (e4) {}
}

/* Workshop part thumbnails: ramp / sled / aero / fuel.
   Same sky-and-snow stage as the glider previews so cards look consistent. */
function drawPartPreview(canvas, kind, level){
  if(!canvas || typeof canvas.getContext !== "function") return;
  try{
    var ctx = canvas.getContext("2d");
    if(!ctx) return;
    var w = canvas.width || 160, h = canvas.height || 90;
    if(!isFinite(w) || w <= 0) w = 160;
    if(!isFinite(h) || h <= 0) h = 90;
    var lv = Math.max(0, Math.min(8, level || 0));
    // the art is authored on a 160-wide stage; scale it up to the card canvas
    var k = w / 160; h = Math.round(160 * h / w); w = 160;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    stage(ctx, w, h, null);
    ctx.save();
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    var cx = w*0.5, cy = h*0.58, OUT = "#2b2d42";
    try{
      if(kind === "ramp"){
        // snowy hill + wooden launch ramp, taller/fancier with level
        ctx.fillStyle = "#f4f8ff";
        ctx.beginPath(); ctx.moveTo(0,h-16); ctx.quadraticCurveTo(w*0.35,h-46-lv*2,w*0.62,h-30-lv*3); ctx.lineTo(w,h-16); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#7f5539"; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(w*0.18,h-20); ctx.quadraticCurveTo(w*0.4,h-44-lv*2,w*0.62,h-34-lv*3); ctx.stroke();
        ctx.strokeStyle = "#e9c46a"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(w*0.18,h-24); ctx.quadraticCurveTo(w*0.4,h-48-lv*2,w*0.62,h-38-lv*3); ctx.stroke();
        ctx.fillStyle = "#e63946";
        ctx.fillRect(w*0.6,h-58-lv*3,4,20); // flag pole
        ctx.beginPath(); ctx.moveTo(w*0.6+4,h-58-lv*3); ctx.lineTo(w*0.6+20,h-53-lv*3); ctx.lineTo(w*0.6+4,h-48-lv*3); ctx.closePath(); ctx.fill();
      } else if(kind === "sled"){
        // red runner sled, sleeker + stripes with level
        ctx.fillStyle = lv >= 5 ? "#e63946" : "#9c6644";
        ctx.strokeStyle = OUT; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx-42,cy+12); ctx.lineTo(cx+38,cy+12); ctx.lineTo(cx+30,cy+2); ctx.lineTo(cx-34,cy+2); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#ffd60a"; ctx.fillRect(cx-38,cy+4,72,3);
        ctx.fillStyle = "#495057"; // runners
        ctx.fillRect(cx-44,cy+14,10,5); ctx.fillRect(cx+28,cy+14,10,5);
        ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 2; // speed shine
        ctx.beginPath(); ctx.moveTo(cx-30,cy+7); ctx.lineTo(cx+10,cy+7); ctx.stroke();
        if(lv >= 3){ ctx.fillStyle = "#80ed99"; ctx.beginPath(); ctx.arc(cx+18,cy-6,4,0,7); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth=1.5; ctx.stroke(); }
      } else if(kind === "aero"){
        // aviator helmet, pointier + goggles with level
        ctx.fillStyle = "#219ebc"; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx,cy+2,24,Math.PI*0.95,Math.PI*2.05); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#17829d";
        ctx.beginPath(); ctx.moveTo(cx+8,cy-18-lv*1.5); ctx.lineTo(cx+30,cy-16); ctx.lineTo(cx+8,cy-8); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(200,235,250,0.9)"; // goggles
        rr2(ctx,cx-20,cy-8,34,13,6); ctx.fill(); ctx.strokeStyle = "#5b3a29"; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(cx-14,cy-4); ctx.lineTo(cx-6,cy+1); ctx.stroke();
        ctx.strokeStyle = "#5b3a29"; ctx.lineWidth = 2; // strap
        ctx.beginPath(); ctx.moveTo(cx-24,cy+2); ctx.quadraticCurveTo(cx,cy+12,cx+24,cy+2); ctx.stroke();
      } else if(kind === "nitro"){
        // kelp-green nitro flask: fuller and fizzier with level
        var fill = 0.25 + 0.75 * Math.min(4, lv) / 4;
        var flask = function(){
          ctx.beginPath();
          ctx.moveTo(cx-6, cy-26); ctx.lineTo(cx+6, cy-26); ctx.lineTo(cx+6, cy-12);
          ctx.quadraticCurveTo(cx+24, cy-4, cx+22, cy+10); ctx.quadraticCurveTo(cx+20, cy+20, cx, cy+20);
          ctx.quadraticCurveTo(cx-20, cy+20, cx-22, cy+10); ctx.quadraticCurveTo(cx-24, cy-4, cx-6, cy-12);
          ctx.closePath();
        };
        ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
        flask(); ctx.fill();
        ctx.save(); ctx.clip();
        var ly = cy + 20 - fill*34;
        var ng = ctx.createLinearGradient(0, ly, 0, cy+20);
        ng.addColorStop(0, "#9bff6a"); ng.addColorStop(1, "#2fb344");
        ctx.fillStyle = ng; ctx.fillRect(cx-30, ly, 60, 40);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        for(var bi=0; bi<3+lv; bi++){ ctx.beginPath(); ctx.arc(cx-12+((bi*7)%24), ly+6+((bi*5)%12), 1.4+(bi%2), 0, 7); ctx.fill(); }
        ctx.restore();
        ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; flask(); ctx.stroke();
        ctx.fillStyle = "#8a5a36"; ctx.lineWidth = 1.5; ctx.fillRect(cx-7, cy-31, 14, 6); ctx.strokeRect(cx-7, cy-31, 14, 6);
        ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.ellipse(cx-12, cy+2, 2.5, 7, 0.3, 0, 7); ctx.fill();
      } else { // fuel
        // fish-oil tank: barrel, pipes, gauge, level pips on the tank
        ctx.fillStyle = "#e36414"; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
        rr2(ctx,cx-24,cy-22,48,40,8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fb8500";
        rr2(ctx,cx-24,cy-22,48,12,8); ctx.fill();
        ctx.fillStyle = "#ffd60a"; // hazard band
        ctx.fillRect(cx-24,cy-2,48,6);
        ctx.fillStyle = "#343a40";
        for(var i=0;i<5;i++){ ctx.fillRect(cx-20+i*9,cy+8,5,7); } // level pips on tank
        ctx.fillStyle = lv > 0 ? "#80ed99" : "#495057";
        for(var j=0;j<Math.min(5,lv);j++){ ctx.fillRect(cx-20+j*9,cy+8,5,7); }
        ctx.strokeStyle = "#8d99ae"; ctx.lineWidth = 4; // pipes
        ctx.beginPath(); ctx.moveTo(cx+24,cy-12); ctx.lineTo(cx+38,cy-12); ctx.lineTo(cx+38,cy+8); ctx.stroke();
        ctx.fillStyle = "#edf2f4"; ctx.strokeStyle = OUT; ctx.lineWidth = 2; // gauge
        ctx.beginPath(); ctx.arc(cx-32,cy-14,7,0,7); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "#e63946"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx-32,cy-14); ctx.lineTo(cx-32+5*Math.cos(-0.6+lv*0.18),cy-14+5*Math.sin(-0.6+lv*0.18)); ctx.stroke();
        ctx.fillStyle = "#212529"; // fish logo
        ctx.beginPath(); ctx.ellipse(cx,cy-13,7,4,0,0,7); ctx.fill();
        ctx.beginPath(); g2(ctx,cx+7,cy-13); ctx.fill();
      }
    } catch(e){}
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  } catch(e2){}
}
function g2(ctx, x, y){ ctx.moveTo(x,y-4); ctx.lineTo(x+6,y); ctx.lineTo(x,y+4); ctx.closePath(); }

window.DA.GLIDERS = GLIDERS;
window.DA.ROCKETS = ROCKETS;
window.DA.drawGlider = drawGlider;
window.DA.drawRocket = drawRocket;
window.DA.rocketNozzles = rocketNozzles;
window.DA.drawGliderPreview = drawGliderPreview;
window.DA.drawRocketPreview = drawRocketPreview;
window.DA.drawPartPreview = drawPartPreview;
window.DA.drawStage = stage;

})();
