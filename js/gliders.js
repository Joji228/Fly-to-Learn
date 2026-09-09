(function () {
"use strict";
if (typeof window === "undefined") { return; }
if (!window.DA) { window.DA = {}; }

var GLIDERS = [
 {id:0,name:"Bare Dodo",tag:"No gear. Just Dennis and gravity.",price:0,control:1.1,drag:0.085,turnK:0.16,comfort:20,top:32,stall:12,sink:0.38,bars:{fly:1,speed:2,ctrl:2},desc:"Flapping counts as trying. Results may vary. They vary."},
 {id:1,name:"Paper Dart",tag:"A giant folded paper plane. Somehow counts.",price:200,control:2.0,drag:0.050,turnK:0.13,comfort:30,top:50,stall:11,sink:0.09,bars:{fly:3,speed:5,ctrl:4},desc:"Folded from a very large homework assignment. Flies great until it rains."},
 {id:2,name:"Rainbow Kite Rig",tag:"A loud kite. Surprisingly obedient.",price:700,control:2.7,drag:0.044,turnK:0.09,comfort:32,top:56,stall:8,sink:0.085,bars:{fly:5,speed:6,ctrl:9},desc:"Visible from three islands away. Comes with extra string and zero stealth."},
 {id:3,name:"The Compromise",tag:"Wood, cloth, tape. A real glider. Mostly.",price:1900,control:2.6,drag:0.038,turnK:0.08,comfort:38,top:64,stall:8,sink:0.07,bars:{fly:7,speed:7,ctrl:7},desc:"Built from spare shed parts and strong opinions. Rattles in a reassuring way."},
 {id:4,name:"Needlefish",tag:"A sleek speed wing. Do not sneeze while flying.",price:5500,control:2.4,drag:0.026,turnK:0.08,comfort:58,top:95,stall:9,sink:0.055,bars:{fly:8,speed:10,ctrl:7},desc:"Goes very fast in one direction. Landing is left as an exercise for Dennis."},
 {id:5,name:"Black Swan X-1",tag:"Experimental carbon. Probably legal.",price:17000,control:2.9,drag:0.018,turnK:0.04,comfort:68,top:110,stall:8,sink:0.04,bars:{fly:10,speed:10,ctrl:10},desc:"Hums ominously and glows for no reason. The manual is just a winking face."}
];

var ROCKETS = [
 {id:0,name:"Puddle-Jumper",tag:"A fish-oil rocket. Smells like victory.",price:350,thrust:45,burn:2.2,bars:{thrust:3,burn:4},desc:"One rusty tube of dreams. Hold SPACE and apologize to physics."},
 {id:1,name:"Twin Sardine Rig",tag:"Two rockets. Twice the poor decisions.",price:2800,thrust:85,burn:3.4,bars:{thrust:6,burn:7},desc:"Synchronized sardine combustion. Dennis flies. Seagulls relocate."},
 {id:2,name:"Dodo-Star Engine",tag:"Experimental. The warning label just says 'wow'.",price:12000,thrust:150,burn:5.0,bars:{thrust:10,burn:10},desc:"Three nozzles, one glow, zero regrets. The sky files a complaint."}
];

function clampId(id, max) {
  var n = Math.floor(Number(id));
  if (!isFinite(n)) { n = 0; }
  if (n < 0) { n = 0; }
  if (n > max) { n = max; }
  return n;
}

function drawRocketPreview(canvas, id) {
  if (!canvas || typeof canvas.getContext !== "function") { return; }
  try {
    var ctx = canvas.getContext("2d");
    if (!ctx) { return; }
    var w = canvas.width || 160, h = canvas.height || 90;
    if (!isFinite(w) || w <= 0) { w = 160; }
    if (!isFinite(h) || h <= 0) { h = 90; }
    var nid = clampId(id, 2);
    var grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#3a4a63"); grd.addColorStop(0.7, "#1d2b45"); grd.addColorStop(1, "#101a30");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,183,3,0.12)";
    ctx.beginPath(); ctx.arc(w*0.5, h*0.55, 34, 0, 7); ctx.fill();
    var now = 500;
    try { now = Date.now(); } catch (e) {}
    ctx.save();
    try {
      ctx.translate(w*0.52, h*0.52);
      try { drawRocket(ctx, nid, 1.5, {firing: ((now/600)|0)%2===0}); } catch (e2) {}
    } catch (e3) {}
    ctx.restore();
  } catch (e4) {}
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

function drawGlider(g, id, s, o) {
  if (!g || typeof g.save !== "function" || typeof g.restore !== "function") { return; }
  try {
    var nid = clampId(id, 5);
    var sc = Number(s);
    if (!isFinite(sc) || sc <= 0) { sc = 1; }
    var opts = o || {};
    var t = (typeof opts.t === "number" && isFinite(opts.t)) ? opts.t : 0;
    var stalled = !!opts.stalled;
    var OUT = "#2b2d42";
    g.save();
    try {
      if (stalled) g.rotate(Math.sin(t / 170) * 0.07);
      g.scale(sc, sc);
      g.lineJoin = "round";
      g.lineCap = "round";

      function straps(){
        g.strokeStyle = "#5b3a29"; g.lineWidth = 2.4;
        g.beginPath(); g.moveTo(-9, -2); g.lineTo(-4, -20); g.stroke();
        g.beginPath(); g.moveTo(9, -2); g.lineTo(4, -20); g.stroke();
        g.fillStyle = "#c9a227";
        g.fillRect(-11, -6, 4, 4); g.fillRect(7, -6, 4, 4);
      }

      if (nid === 0) {
        g.fillStyle = "#cfd6dd"; g.strokeStyle = "#6b7480"; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(-8, -5); g.lineTo(-15, -17); g.lineTo(-4, -13); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(8, -5); g.lineTo(15, -17); g.lineTo(4, -13); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = "#8a949d"; g.lineWidth = 1;
        g.beginPath(); g.moveTo(-8, -6); g.lineTo(-12, -14); g.stroke();
        g.beginPath(); g.moveTo(8, -6); g.lineTo(12, -14); g.stroke();
      } else if (nid === 1) {
        straps();
        g.fillStyle = "#ffffff"; g.strokeStyle = OUT; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, -34); g.lineTo(-44, -8); g.lineTo(0, -5); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(0, -34); g.lineTo(44, -8); g.lineTo(0, -5); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = "#dbe3ea";
        g.beginPath(); g.moveTo(0, -34); g.lineTo(-44, -8); g.lineTo(0, -11); g.closePath(); g.fill();
        g.fillStyle = "#eef3f7";
        g.beginPath(); g.moveTo(0, -34); g.lineTo(44, -8); g.lineTo(0, -11); g.closePath(); g.fill();
        g.fillStyle = "#c3ccd4";
        g.beginPath(); g.moveTo(-2.5, -34); g.lineTo(2.5, -34); g.lineTo(1.5, -4); g.lineTo(-1.5, -4); g.closePath(); g.fill();
        g.strokeStyle = "#8d979f"; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(0, -34); g.lineTo(0, -4); g.stroke();
        g.beginPath(); g.moveTo(-6, -30); g.lineTo(-32, -12); g.stroke();
        g.beginPath(); g.moveTo(6, -30); g.lineTo(32, -12); g.stroke();
        g.fillStyle = "#e63946";
        g.fillRect(-4, -14, 8, 5);
      } else if (nid === 2) {
        var kc = ["#ff595e", "#ff924c", "#ffca3a", "#8ac926", "#4aa8de", "#9b5de5"];
        g.strokeStyle = "#3a3a3a"; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(-10, -4); g.lineTo(0, -24); g.stroke();
        g.beginPath(); g.moveTo(10, -4); g.lineTo(0, -24); g.stroke();
        for (var ki = 0; ki < 6; ki++){
          g.fillStyle = kc[ki];
          g.beginPath(); g.moveTo(0, -54); g.lineTo((ki-2.5)*8.4, -33); g.lineTo(0, -12); g.closePath(); g.fill();
        }
        g.strokeStyle = OUT; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(0, -54); g.lineTo(21, -33); g.lineTo(0, -12); g.lineTo(-21, -33); g.closePath(); g.stroke();
        // spar cross
        g.strokeStyle = "#5b3a29"; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(-21, -33); g.lineTo(21, -33); g.stroke();
        g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(-5, -50); g.lineTo(-13, -33); g.stroke();
        g.strokeStyle = "#3a3a3a"; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(0, -12); g.quadraticCurveTo(4, -4, 0, 2); g.stroke();
        g.fillStyle = "#ff595e"; g.fillRect(-3, -8, 6, 4);
        g.fillStyle = "#4aa8de"; g.fillRect(-3, -2, 6, 4);
      } else if (nid === 3) {
        straps();
        g.strokeStyle = "#7f5539"; g.lineWidth = 4.2;
        g.beginPath(); g.moveTo(-42, -14); g.lineTo(42, -14); g.stroke();
        g.beginPath(); g.moveTo(0, -14); g.lineTo(0, -42); g.stroke();
        g.strokeStyle = "#5b3a29"; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(-42, -14); g.lineTo(42, -14); g.stroke();
        var cloth = g.createLinearGradient(0, -42, 0, -14);
        cloth.addColorStop(0, "#f4e3b2"); cloth.addColorStop(1, "#d4a373");
        g.fillStyle = cloth; g.strokeStyle = OUT; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(-40, -16); g.lineTo(0, -44); g.lineTo(40, -16); g.lineTo(0, -23); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = "rgba(127,85,57,0.6)"; g.lineWidth = 1.2; // cloth seams
        g.beginPath(); g.moveTo(-20, -20); g.lineTo(-8, -36); g.stroke();
        g.beginPath(); g.moveTo(20, -20); g.lineTo(8, -36); g.stroke();
        g.fillStyle = "#e9c46a"; // patches
        g.fillRect(-28, -25, 10, 8); g.fillRect(13, -29, 9, 7);
        g.strokeStyle = "#7f5539"; g.lineWidth = 1; g.strokeRect(-28, -25, 10, 8); g.strokeRect(13, -29, 9, 7);
        g.fillStyle = "#adb5bd"; // tape + bolts
        g.fillRect(-4, -42, 8, 4); g.fillRect(-21, -16, 8, 4); g.fillRect(13, -16, 8, 4);
        g.fillStyle = "#495057";
        [[-38,-14],[38,-14],[0,-40]].forEach(function(b2){
          g.beginPath(); g.arc(b2[0], b2[1], 1.8, 0, 7); g.fill();
        });
      } else if (nid === 4) {
        var ng = g.createLinearGradient(0, -44, 0, -10);
        ng.addColorStop(0, "#5a8fd0"); ng.addColorStop(0.5, "#2b5f9e"); ng.addColorStop(1, "#1d3557");
        g.fillStyle = ng; g.strokeStyle = OUT; g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(0, -46); g.lineTo(48, -12); g.lineTo(10, -15); g.lineTo(0, -10);
        g.lineTo(-10, -15); g.lineTo(-48, -12); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 2.2; // gloss streak
        g.beginPath(); g.moveTo(-32, -18); g.lineTo(0, -40); g.stroke();
        g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-24, -15); g.lineTo(0, -32); g.stroke();
        g.fillStyle = "#ff595e"; // wingtip lights
        g.beginPath(); g.arc(-46, -12.5, 2.2, 0, 7); g.fill();
        g.beginPath(); g.arc(46, -12.5, 2.2, 0, 7); g.fill();
        g.fillStyle = "#21293d"; // center pod + stripe
        g.beginPath(); g.ellipse(0, -14, 6.5, 4.2, 0, 0, 7); g.fill();
        g.strokeStyle = OUT; g.lineWidth = 1.6; g.stroke();
        g.fillStyle = "#ffb703"; g.fillRect(-2, -44, 4, 8);
      } else {
        var cg = g.createLinearGradient(0, -54, 0, -12);
        cg.addColorStop(0, "#454b5e"); cg.addColorStop(0.6, "#23262f"); cg.addColorStop(1, "#101218");
        g.fillStyle = cg; g.strokeStyle = OUT; g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(0, -56); g.lineTo(42, -16); g.lineTo(13, -19); g.lineTo(0, -12);
        g.lineTo(-13, -19); g.lineTo(-42, -16); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = "rgba(170,180,200,0.55)"; g.lineWidth = 1.2; // carbon weave seams
        g.beginPath(); g.moveTo(-25, -25); g.lineTo(0, -48); g.lineTo(25, -25); g.stroke();
        g.beginPath(); g.moveTo(-13, -18); g.lineTo(0, -32); g.lineTo(13, -18); g.stroke();
        g.strokeStyle = "#3df2d6"; g.lineWidth = 2.4; // glowing edges
        g.shadowColor = "#3df2d6"; g.shadowBlur = 7;
        g.beginPath(); g.moveTo(0, -56); g.lineTo(42, -16); g.stroke();
        g.beginPath(); g.moveTo(0, -56); g.lineTo(-42, -16); g.stroke();
        g.shadowBlur = 0;
        g.fillStyle = "#3df2d6"; // status lights
        g.beginPath(); g.arc(0, -42, 2.4, 0, 7); g.fill();
        g.fillStyle = "#ff595e";
        g.beginPath(); g.arc(-40, -16.5, 1.8, 0, 7); g.fill();
        g.beginPath(); g.arc(40, -16.5, 1.8, 0, 7); g.fill();
      }
    } catch (e) {}
    g.restore();
  } catch (e3) {}
}

function drawRocket(g, id, s, o) {
  if (!g || typeof g.save !== "function" || typeof g.restore !== "function") { return; }
  try {
    var nid = clampId(id, 2);
    var sc = Number(s);
    if (!isFinite(sc) || sc <= 0) { sc = 1; }
    var firing = !!(o && o.firing);
    var OUT = "#2b2d42";
    g.save();
    try {
      g.scale(sc, sc);
      g.lineJoin = "round";
      g.lineCap = "round";
      function oneRocket(x, y, w, big){
        var h = big ? 15 : 12;
        var bg = g.createLinearGradient(0, y-8, 0, y+7);
        if (nid === 0) { bg.addColorStop(0, "#b08968"); bg.addColorStop(1, "#7f5539"); }
        else if (nid === 1) { bg.addColorStop(0, "#adb5bd"); bg.addColorStop(1, "#5c677d"); }
        else { bg.addColorStop(0, "#3a3f4d"); bg.addColorStop(1, "#14161f"); }
        g.fillStyle = bg; g.strokeStyle = OUT; g.lineWidth = 2;
        rr2(g, x-w/2, y-8, w, h, 3); g.fill(); g.stroke();
        g.fillStyle = "#e63946"; // nose band + fins
        g.fillRect(x-w/2, y-8, w, 3);
        g.beginPath();
        g.moveTo(x-w/2+1, y+7); g.lineTo(x-w/2-4, y+12); g.lineTo(x-w/2+5, y+7); g.closePath(); g.fill();
        g.beginPath();
        g.moveTo(x+w/2-1, y+7); g.lineTo(x+w/2+4, y+12); g.lineTo(x+w/2-5, y+7); g.closePath(); g.fill();
        g.fillStyle = "#edf2f4"; // porthole
        g.beginPath(); g.arc(x, y-2, big?2.6:2, 0, 7); g.fill();
        g.strokeStyle = OUT; g.lineWidth = 1.4; g.stroke();
        g.fillStyle = "#219ebc";
        g.beginPath(); g.arc(x, y-2, big?1.2:1, 0, 7); g.fill();
        if (nid >= 1) { // yellow racing stripe
          g.fillStyle = "#ffb703"; g.fillRect(x-w/2, y-4.5, w, 2.4);
        }
        if (nid >= 2) { // glow ring + rivets
          g.strokeStyle = "#3df2d6"; g.lineWidth = 1.6;
          g.shadowColor = "#3df2d6"; g.shadowBlur = firing ? 10 : 5;
          g.beginPath(); g.moveTo(x-w/2, y+7); g.lineTo(x+w/2, y+7); g.stroke();
          g.shadowBlur = 0;
          g.fillStyle = "#c9a227";
          g.beginPath(); g.arc(x-w/2+2, y-5, 1, 0, 7); g.fill();
          g.beginPath(); g.arc(x+w/2-2, y-5, 1, 0, 7); g.fill();
        }
        g.fillStyle = "#343a40"; // nozzle
        g.beginPath();
        g.moveTo(x-3, y+7); g.lineTo(x+3, y+7); g.lineTo(x+4.5, y+11); g.lineTo(x-4.5, y+11); g.closePath(); g.fill();
      }
      if (nid === 0) {
        oneRocket(-22, 0, 9, false); // one rusty tube of dreams
      } else if (nid === 1) {
        oneRocket(-27, 1, 9, true);  // twin rig: staggered pair
        oneRocket(-14, -2, 8, false);
      } else {
        oneRocket(-25, 0, 12, true); // endgame: big core + twin pods
        oneRocket(-12, -9, 7, false);
        oneRocket(-12, 9, 7, false);
      }
    } catch (e) {}
    g.restore();
  } catch (e3) {}
}
function drawGliderPreview(canvas, id) {
  if (!canvas || typeof canvas.getContext !== "function") { return; }
  try {
    var ctx = canvas.getContext("2d");
    if (!ctx) { return; }
    var w = canvas.width || 160, h = canvas.height || 90;
    if (!isFinite(w) || w <= 0) { w = 160; }
    if (!isFinite(h) || h <= 0) { h = 90; }
    var nid = clampId(id, 5);
    var grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#7ec0ee");
    grd.addColorStop(0.7, "#cfe8f7");
    grd.addColorStop(1, "#e8f3fa");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, h - 14, w, 14);
    ctx.fillStyle = "#dfe7ec";
    ctx.fillRect(0, h - 14, w, 2);
    var now = 500;
    try { now = Date.now(); } catch (e) { now = 500; }
    ctx.save();
    try {
      ctx.translate(w * 0.5, h * 0.62);
      ctx.fillStyle = "#8a8f96";
      ctx.strokeStyle = "#55595e";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 12, 0, 0, 7);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#333333";
      ctx.beginPath(); ctx.arc(6, -3, 2, 0, 7); ctx.fill();
      ctx.fillStyle = "#f0a030";
      ctx.beginPath(); ctx.moveTo(14, -2); ctx.lineTo(20, 0); ctx.lineTo(14, 2); ctx.closePath(); ctx.fill();
      try { drawGlider(ctx, nid, 0.9, {t: now}); } catch (e2) {}
    } catch (e3) {}
    ctx.restore();
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
    var grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#7ec0ee"); grd.addColorStop(0.7, "#cfe8f7"); grd.addColorStop(1, "#e8f3fa");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, h-16, w, 16);
    ctx.fillStyle = "#dfe7ec"; ctx.fillRect(0, h-16, w, 2);
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
  } catch(e2){}
}
function g2(ctx, x, y){ ctx.moveTo(x,y-4); ctx.lineTo(x+6,y); ctx.lineTo(x,y+4); ctx.closePath(); }

window.DA.GLIDERS = GLIDERS;
window.DA.ROCKETS = ROCKETS;
window.DA.drawGlider = drawGlider;
window.DA.drawRocket = drawRocket;
window.DA.drawGliderPreview = drawGliderPreview;
window.DA.drawRocketPreview = drawRocketPreview;
window.DA.drawPartPreview = drawPartPreview;

})();
