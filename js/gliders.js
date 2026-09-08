(function () {
"use strict";
if (typeof window === "undefined") { return; }
if (!window.DA) { window.DA = {}; }

var GLIDERS = [
 {id:0,name:"Bare Dodo",tag:"Just Dennis. Just dreams.",price:0,control:1.1,drag:0.085,turnK:0.16,comfort:20,top:32,stall:12,bars:{fly:1,speed:2,ctrl:2},desc:"No gear, no shame, just vibes. Dennis flaps harder when everyone is watching."},
 {id:1,name:"Paper Dart",tag:"A giant folded paper plane. Somehow counts.",price:200,control:2.0,drag:0.048,turnK:0.13,comfort:30,top:50,stall:11,bars:{fly:3,speed:5,ctrl:4},desc:"Folded from a very large homework assignment. Flies great until it rains."},
 {id:2,name:"Rainbow Kite Rig",tag:"A loud kite. Surprisingly obedient.",price:650,control:2.7,drag:0.058,turnK:0.10,comfort:28,top:42,stall:8,bars:{fly:5,speed:4,ctrl:9},desc:"Visible from three islands away. Comes with extra string and zero stealth."},
 {id:3,name:"Stormbrella Sail",tag:"An umbrella. Maximum float, minimum dignity.",price:1000,control:1.9,drag:0.062,turnK:0.08,comfort:24,top:35,stall:6,bars:{fly:7,speed:3,ctrl:5},desc:"Catches wind, rain, and compliments. Turning is more of a suggestion."},
 {id:4,name:"The Compromise",tag:"Wood, cloth, tape. It holds together. Mostly.",price:1600,control:2.1,drag:0.048,turnK:0.09,comfort:34,top:52,stall:9,bars:{fly:6,speed:6,ctrl:6},desc:"Built from spare shed parts and strong opinions. Rattles in a reassuring way."},
 {id:5,name:"Sky Manta",tag:"A big friendly triangle of lift.",price:3000,control:2.5,drag:0.040,turnK:0.07,comfort:42,top:64,stall:9,bars:{fly:8,speed:7,ctrl:8},desc:"Soft, wide, and weirdly cuddly for a wing. Loves smooth air and snacks."},
 {id:6,name:"Needlefish",tag:"A sleek speed wing. Do not sneeze while flying.",price:4800,control:1.9,drag:0.026,turnK:0.10,comfort:58,top:95,stall:12,bars:{fly:7,speed:10,ctrl:5},desc:"Goes very fast in one direction. Landing is left as an exercise for Dennis."},
 {id:7,name:"Flying Deck Chair",tag:"An ultralight frame. Cupholder included.",price:8500,control:2.7,drag:0.032,turnK:0.05,comfort:52,top:78,stall:8,bars:{fly:9,speed:8,ctrl:9},desc:"Engineered for naps that happen to move forward. Do not recline during turbulence."},
 {id:8,name:"Black Swan X-1",tag:"Experimental carbon. Probably legal.",price:15000,control:2.9,drag:0.018,turnK:0.04,comfort:68,top:105,stall:9,bars:{fly:10,speed:9,ctrl:10},desc:"Hums ominously and glows for no reason. The manual is just a winking face."},
 {id:9,name:"Dodo-Star Gyro",tag:"A tiny rotorcraft. Definitely not anti-gravity.",price:26000,control:3.1,drag:0.016,turnK:0.03,comfort:75,top:120,stall:6,bars:{fly:10,speed:10,ctrl:10},desc:"Spins first, asks questions later. Dennis insists this is basically hovering."}
];

function clampId(id) {
  var n = Math.floor(Number(id));
  if (!isFinite(n)) { n = 0; }
  if (n < 0) { n = 0; }
  if (n > 9) { n = 9; }
  return n;
}

function drawGlider(g, id, s, o) {
  if (!g || typeof g.save !== "function" || typeof g.restore !== "function") { return; }
  try {
    var nid = clampId(id);
    var sc = Number(s);
    if (!isFinite(sc) || sc <= 0) { sc = 1; }
    var opts = o || {};
    var t = (typeof opts.t === "number" && isFinite(opts.t)) ? opts.t : 0;
    var stalled = !!opts.stalled;
    var OUT = "#2b2d42"; // shared cartoon outline ink
    g.save();
    try {
      if (stalled) g.rotate(Math.sin(t / 170) * 0.07);
      g.scale(sc, sc);
      g.lineJoin = "round";
      g.lineCap = "round";

      // leather harness straps shared by every rigged glider
      function straps(){
        g.strokeStyle = "#5b3a29"; g.lineWidth = 2.4;
        g.beginPath(); g.moveTo(-9, -2); g.lineTo(-4, -20); g.stroke();
        g.beginPath(); g.moveTo(9, -2); g.lineTo(4, -20); g.stroke();
        g.fillStyle = "#c9a227";
        g.fillRect(-11, -6, 4, 4); g.fillRect(7, -6, 4, 4);
      }

      if (nid === 0) {
        // bare: two scruffy hopeful feathers
        g.fillStyle = "#cfd6dd"; g.strokeStyle = "#6b7480"; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(-8, -5); g.lineTo(-15, -17); g.lineTo(-4, -13); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(8, -5); g.lineTo(15, -17); g.lineTo(4, -13); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = "#8a949d"; g.lineWidth = 1;
        g.beginPath(); g.moveTo(-8, -6); g.lineTo(-12, -14); g.stroke();
        g.beginPath(); g.moveTo(8, -6); g.lineTo(12, -14); g.stroke();
      } else if (nid === 1) {
        // PAPER DART: folded sheet, center keel, panel shadows
        straps();
        g.fillStyle = "#ffffff"; g.strokeStyle = OUT; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, -34); g.lineTo(-44, -8); g.lineTo(0, -5); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(0, -34); g.lineTo(44, -8); g.lineTo(0, -5); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = "#dbe3ea";
        g.beginPath(); g.moveTo(0, -34); g.lineTo(-44, -8); g.lineTo(0, -11); g.closePath(); g.fill();
        g.fillStyle = "#eef3f7";
        g.beginPath(); g.moveTo(0, -34); g.lineTo(44, -8); g.lineTo(0, -11); g.closePath(); g.fill();
        g.fillStyle = "#c3ccd4"; // keel
        g.beginPath(); g.moveTo(-2.5, -34); g.lineTo(2.5, -34); g.lineTo(1.5, -4); g.lineTo(-1.5, -4); g.closePath(); g.fill();
        g.strokeStyle = "#8d979f"; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(0, -34); g.lineTo(0, -4); g.stroke();
        g.beginPath(); g.moveTo(-6, -30); g.lineTo(-32, -12); g.stroke(); // fold creases
        g.beginPath(); g.moveTo(6, -30); g.lineTo(32, -12); g.stroke();
        g.fillStyle = "#e63946"; // tiny tail sticker
        g.fillRect(-4, -14, 8, 5);
      } else if (nid === 2) {
        // RAINBOW KITE: paneled diamond + tail bows, taut strings
        var kc = ["#ff595e", "#ff924c", "#ffca3a", "#8ac926", "#4aa8de", "#9b5de5"];
        var kx = [0, 20, 0, -20], ky = [-52, -32, -12, -32];
        g.strokeStyle = "#3a3a3a"; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(-10, -4); g.lineTo(0, -24); g.stroke();
        g.beginPath(); g.moveTo(10, -4); g.lineTo(0, -24); g.stroke();
        for (var ki = 0; ki < 6; ki++){
          g.fillStyle = kc[ki];
          g.beginPath(); g.moveTo(0, -52); g.lineTo((ki-2.5)*8, -32); g.lineTo(0, -12); g.closePath(); g.fill();
        }
        g.strokeStyle = OUT; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, -52); g.lineTo(20, -32); g.lineTo(0, -12); g.lineTo(-20, -32); g.closePath(); g.stroke();
        g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 1.4; // panel shine
        g.beginPath(); g.moveTo(-4, -48); g.lineTo(-12, -32); g.stroke();
        g.strokeStyle = "#3a3a3a"; g.lineWidth = 1.2; // tail + bows
        g.beginPath(); g.moveTo(0, -12); g.quadraticCurveTo(4, -4, 0, 2); g.stroke();
        g.fillStyle = "#ff595e";
        g.fillRect(-3, -8, 6, 4); g.fillStyle = "#4aa8de"; g.fillRect(-3, -2, 6, 4);
      } else if (nid === 3) {
        // STORMBRELLA: ribbed canopy, highlight, little tip + handle straps
        straps();
        var panels = ["#e63946", "#f1faee", "#e63946", "#f1faee", "#e63946", "#f1faee", "#e63946", "#f1faee"];
        for (var pi = 0; pi < 8; pi++){
          var a0 = Math.PI + pi*Math.PI/8, a1 = Math.PI + (pi+1)*Math.PI/8;
          g.fillStyle = panels[pi];
          g.beginPath(); g.moveTo(0, -22);
          g.arc(0, -22, 34, a0, a1);
          g.closePath(); g.fill();
        }
        g.strokeStyle = OUT; g.lineWidth = 2.2;
        g.beginPath(); g.arc(0, -22, 34, Math.PI, 0); g.stroke();
        g.beginPath(); g.moveTo(-34, -22);
        for (var si = 0; si <= 8; si++) g.lineTo(-34 + si*8.5, -22 + ((si%2)? -4 : 0));
        g.lineTo(34, -22); g.stroke();
        for (var rib = 1; rib < 8; rib++){ // ribs
          var ra = Math.PI + rib*Math.PI/8;
          g.strokeStyle = "rgba(43,45,66,0.55)"; g.lineWidth = 1.4;
          g.beginPath(); g.moveTo(0, -22); g.lineTo(34*Math.cos(ra), -22+34*Math.sin(ra)); g.stroke();
        }
        g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 2; // canopy shine
        g.beginPath(); g.arc(-6, -26, 20, Math.PI*1.15, Math.PI*1.6); g.stroke();
        g.fillStyle = "#c9a227"; // tip
        g.beginPath(); g.arc(0, -58, 3, 0, 7); g.fill();
        g.strokeStyle = OUT; g.lineWidth = 1.6; g.stroke();
      } else if (nid === 4) {
        // THE COMPROMISE: wooden frame, patched cloth, tape, bolts
        straps();
        g.strokeStyle = "#7f5539"; g.lineWidth = 4; // spars
        g.beginPath(); g.moveTo(-40, -14); g.lineTo(40, -14); g.stroke();
        g.beginPath(); g.moveTo(0, -14); g.lineTo(0, -40); g.stroke();
        g.strokeStyle = "#5b3a29"; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(-40, -14); g.lineTo(40, -14); g.stroke();
        g.fillStyle = "#e9d8a6"; // cloth
        g.strokeStyle = OUT; g.lineWidth = 2;
        g.beginPath(); g.moveTo(-38, -16); g.lineTo(0, -42); g.lineTo(38, -16); g.lineTo(0, -22); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = "#d4a373"; // patches
        g.fillRect(-26, -24, 10, 8); g.fillRect(12, -28, 9, 7);
        g.strokeStyle = "#7f5539"; g.lineWidth = 1; g.strokeRect(-26, -24, 10, 8); g.strokeRect(12, -28, 9, 7);
        g.fillStyle = "#adb5bd"; // tape strips + bolts
        g.fillRect(-4, -40, 8, 4); g.fillRect(-20, -16, 8, 4); g.fillRect(12, -16, 8, 4);
        g.fillStyle = "#495057";
        [[-36,-14],[36,-14],[0,-38]].forEach(function(b2){
          g.beginPath(); g.arc(b2[0], b2[1], 1.8, 0, 7); g.fill();
        });
      } else if (nid === 5) {
        // SKY MANTA: big soft sail with leading edge + smile battens
        straps();
        var sail = g.createLinearGradient(0, -52, 0, -14);
        sail.addColorStop(0, "#80ed99"); sail.addColorStop(1, "#2d9d78");
        g.fillStyle = sail; g.strokeStyle = OUT; g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(0, -52);
        g.quadraticCurveTo(30, -40, 42, -16);
        g.quadraticCurveTo(20, -22, 0, -20);
        g.quadraticCurveTo(-20, -22, -42, -16);
        g.quadraticCurveTo(-30, -40, 0, -52);
        g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = "#1d6f54"; g.lineWidth = 4; // leading edge
        g.beginPath(); g.moveTo(-42, -16); g.quadraticCurveTo(-30, -40, 0, -52); g.quadraticCurveTo(30, -40, 42, -16); g.stroke();
        g.strokeStyle = "rgba(255,255,255,0.65)"; g.lineWidth = 2; // sheen
        g.beginPath(); g.moveTo(-24, -30); g.quadraticCurveTo(-12, -40, 0, -44); g.stroke();
        g.strokeStyle = "#1d3557"; g.lineWidth = 2.2; // king post + cables
        g.beginPath(); g.moveTo(0, -30); g.lineTo(0, -14); g.stroke();
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(0, -30); g.lineTo(-30, -17); g.stroke();
        g.beginPath(); g.moveTo(0, -30); g.lineTo(30, -17); g.stroke();
      } else if (nid === 6) {
        // NEEDLEFISH: sleek swept speed wing, glossy
        var ng = g.createLinearGradient(0, -40, 0, -10);
        ng.addColorStop(0, "#4a6fa5"); ng.addColorStop(1, "#1d3557");
        g.fillStyle = ng; g.strokeStyle = OUT; g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(0, -42); g.lineTo(46, -12); g.lineTo(10, -14); g.lineTo(0, -10);
        g.lineTo(-10, -14); g.lineTo(-46, -12); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = 2; // gloss streak
        g.beginPath(); g.moveTo(-30, -17); g.lineTo(0, -36); g.stroke();
        g.fillStyle = "#ff595e"; // wingtip lights
        g.beginPath(); g.arc(-44, -12.5, 2, 0, 7); g.fill();
        g.beginPath(); g.arc(44, -12.5, 2, 0, 7); g.fill();
        g.fillStyle = "#21293d"; // center pod
        g.beginPath(); g.ellipse(0, -13, 6, 4, 0, 0, 7); g.fill();
        g.strokeStyle = OUT; g.lineWidth = 1.6; g.stroke();
      } else if (nid === 7) {
        // FLYING DECK CHAIR: tube frame, seat, wing, cupholder + cup
        g.strokeStyle = "#8d99ae"; g.lineWidth = 3; // tubes
        g.beginPath(); g.moveTo(-20, -40); g.lineTo(20, -40); g.stroke();
        g.beginPath(); g.moveTo(-20, -40); g.lineTo(-12, -8); g.stroke();
        g.beginPath(); g.moveTo(20, -40); g.lineTo(12, -8); g.stroke();
        g.beginPath(); g.moveTo(-20, -40); g.lineTo(-20, -8); g.stroke();
        g.beginPath(); g.moveTo(20, -40); g.lineTo(20, -8); g.stroke();
        g.fillStyle = "#457b9d"; g.strokeStyle = OUT; g.lineWidth = 2; // fabric wing
        g.beginPath(); g.moveTo(-42, -44); g.lineTo(42, -44); g.lineTo(34, -34); g.lineTo(-34, -34); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(-36, -42); g.lineTo(36, -42); g.stroke();
        g.fillStyle = "#e63946"; g.strokeStyle = OUT; g.lineWidth = 2; // seat
        rr2(g, -9, -22, 18, 14, 4); g.fill(); g.stroke();
        g.fillStyle = "#ffb703"; // cushion
        rr2(g, -7, -20, 14, 5, 2); g.fill();
        g.strokeStyle = "#343a40"; g.lineWidth = 1.6; // cupholder + cup
        g.beginPath(); g.arc(24, -14, 4, 0, 7); g.stroke();
        g.fillStyle = "#f1faee"; g.fillRect(21.5, -22, 5, 7);
        g.fillStyle = "#e63946"; g.fillRect(21.5, -22, 5, 2);
      } else if (nid === 8) {
        // BLACK SWAN X-1: dark carbon panels, seams, teal glow edges
        var cg = g.createLinearGradient(0, -50, 0, -12);
        cg.addColorStop(0, "#3a3f4d"); cg.addColorStop(1, "#14161f");
        g.fillStyle = cg; g.strokeStyle = OUT; g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(0, -52); g.lineTo(40, -16); g.lineTo(12, -18); g.lineTo(0, -12);
        g.lineTo(-12, -18); g.lineTo(-40, -16); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = "rgba(160,170,190,0.5)"; g.lineWidth = 1.2; // panel seams
        g.beginPath(); g.moveTo(-24, -24); g.lineTo(0, -46); g.lineTo(24, -24); g.stroke();
        g.beginPath(); g.moveTo(-12, -17); g.lineTo(0, -30); g.lineTo(12, -17); g.stroke();
        g.strokeStyle = "#3df2d6"; g.lineWidth = 2.2; // glowing edges
        g.shadowColor = "#3df2d6"; g.shadowBlur = 6;
        g.beginPath(); g.moveTo(0, -52); g.lineTo(40, -16); g.stroke();
        g.beginPath(); g.moveTo(0, -52); g.lineTo(-40, -16); g.stroke();
        g.shadowBlur = 0;
        g.fillStyle = "#3df2d6"; // status light
        g.beginPath(); g.arc(0, -40, 2.2, 0, 7); g.fill();
      } else {
        // DODO-STAR GYRO: mast, spinning rotor + blur disc, tail fins
        g.fillStyle = "#495057"; g.strokeStyle = OUT; g.lineWidth = 2;
        g.fillRect(-3, -34, 6, 22); g.strokeRect(-3, -34, 6, 22); // mast
        g.fillStyle = "#e63946"; // motor pod
        rr2(g, -8, -40, 16, 9, 3); g.fill(); g.stroke();
        var ra2 = t / 90;
        g.save(); // blur disc
        g.globalAlpha = 0.28; g.fillStyle = "#adb5bd";
        g.beginPath(); g.ellipse(0, -42, 44, 5, 0, 0, 7); g.fill();
        g.restore();
        g.strokeStyle = "#212529"; g.lineWidth = 3.4; // blades
        g.beginPath();
        g.moveTo(-Math.cos(ra2)*42, -42 - Math.sin(ra2)*4);
        g.lineTo(Math.cos(ra2)*42, -42 + Math.sin(ra2)*4);
        g.stroke();
        g.fillStyle = "#ffd60a"; // blade tips
        g.beginPath(); g.arc(-Math.cos(ra2)*42, -42 - Math.sin(ra2)*4, 2.4, 0, 7); g.fill();
        g.beginPath(); g.arc(Math.cos(ra2)*42, -42 + Math.sin(ra2)*4, 2.4, 0, 7); g.fill();
        g.strokeStyle = "#212529"; g.lineWidth = 2; // struts + tail fins
        g.beginPath(); g.moveTo(0, -14); g.lineTo(-10, -2); g.stroke();
        g.beginPath(); g.moveTo(0, -14); g.lineTo(10, -2); g.stroke();
        g.fillStyle = "#4aa8de";
        g.beginPath(); g.moveTo(-30, -6); g.lineTo(-22, -14); g.lineTo(-22, -4); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(30, -6); g.lineTo(22, -14); g.lineTo(22, -4); g.closePath(); g.fill(); g.stroke();
      }
    } catch (e) {}
    g.restore();
  } catch (e3) {}
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
function drawGliderPreview(canvas, id) {
  if (!canvas || typeof canvas.getContext !== "function") { return; }
  try {
    var ctx = canvas.getContext("2d");
    if (!ctx) { return; }
    var w = 160;
    var h = 90;
    try {
      if (typeof canvas.hasAttribute === "function") {
        if (canvas.hasAttribute("width") && canvas.width) { w = canvas.width; }
        else if (canvas.width && canvas.width !== 300) { w = canvas.width; }
        if (canvas.hasAttribute("height") && canvas.height) { h = canvas.height; }
        else if (canvas.height && canvas.height !== 150) { h = canvas.height; }
      } else {
        if (canvas.width) { w = canvas.width; }
        if (canvas.height) { h = canvas.height; }
      }
    } catch (e) {}
    if (!isFinite(w) || w <= 0) { w = 160; }
    if (!isFinite(h) || h <= 0) { h = 90; }
    var nid = clampId(id);
    var grd = null;
    try {
      if (ctx.createLinearGradient) {
        grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "#7ec0ee");
        grd.addColorStop(0.7, "#cfe8f7");
        grd.addColorStop(1, "#e8f3fa");
        ctx.fillStyle = grd;
      } else {
        ctx.fillStyle = "#9fd0ef";
      }
    } catch (e2) { ctx.fillStyle = "#9fd0ef"; }
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, h - 14, w, 14);
    ctx.fillStyle = "#dfe7ec";
    ctx.fillRect(0, h - 14, w, 2);
    var cx = w * 0.5;
    var cy = h * 0.62;
    var now = 500;
    try { now = Date.now(); } catch (e3) { now = 500; }
    if (!isFinite(now)) { now = 500; }
    ctx.save();
    try {
      ctx.translate(cx, cy);
      ctx.fillStyle = "#8a8f96";
      ctx.strokeStyle = "#55595e";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (ctx.ellipse) {
        try { ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2); }
        catch (e4) { ctx.arc(0, 0, 13, 0, Math.PI * 2); }
      } else {
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#333333";
      ctx.beginPath();
      ctx.arc(6, -3, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f0a030";
      ctx.beginPath();
      ctx.moveTo(14, -2);
      ctx.lineTo(20, 0);
      ctx.lineTo(14, 2);
      ctx.closePath();
      ctx.fill();
      try { drawGlider(ctx, nid, 0.9, {t: now}); } catch (e5) {}
    } catch (e6) {}
    ctx.restore();
  } catch (e7) {}
}

window.DA.GLIDERS = GLIDERS;
window.DA.drawGlider = drawGlider;
window.DA.drawGliderPreview = drawGliderPreview;

})();
