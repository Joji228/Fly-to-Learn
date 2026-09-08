(function () {
"use strict";
if (typeof window === "undefined") { return; }
if (!window.DA) { window.DA = {}; }

var GLIDERS = [
 {id:0,name:"Bare Dodo",tag:"Just Dennis. Just dreams.",price:0,control:1.3,drag:0.075,turnK:0.16,comfort:20,top:32,stall:12,bars:{fly:1,speed:2,ctrl:2},desc:"No gear, no shame, just vibes. Dennis flaps harder when everyone is watching."},
 {id:1,name:"Paper Dart",tag:"A giant folded paper plane. Somehow counts.",price:200,control:2.0,drag:0.048,turnK:0.13,comfort:30,top:50,stall:11,bars:{fly:3,speed:5,ctrl:4},desc:"Folded from a very large homework assignment. Flies great until it rains."},
 {id:2,name:"Rainbow Kite Rig",tag:"A loud kite. Surprisingly obedient.",price:650,control:2.5,drag:0.058,turnK:0.10,comfort:28,top:42,stall:8,bars:{fly:5,speed:4,ctrl:8},desc:"Visible from three islands away. Comes with extra string and zero stealth."},
 {id:3,name:"Stormbrella Sail",tag:"An umbrella. Maximum float, minimum dignity.",price:1000,control:1.9,drag:0.062,turnK:0.08,comfort:24,top:35,stall:7,bars:{fly:7,speed:3,ctrl:5},desc:"Catches wind, rain, and compliments. Turning is more of a suggestion."},
 {id:4,name:"The Compromise",tag:"Wood, cloth, tape. It holds together. Mostly.",price:1600,control:2.1,drag:0.048,turnK:0.09,comfort:34,top:52,stall:9,bars:{fly:6,speed:6,ctrl:6},desc:"Built from spare shed parts and strong opinions. Rattles in a reassuring way."},
 {id:5,name:"Sky Manta",tag:"A big friendly triangle of lift.",price:3000,control:2.5,drag:0.040,turnK:0.07,comfort:42,top:64,stall:9,bars:{fly:8,speed:7,ctrl:8},desc:"Soft, wide, and weirdly cuddly for a wing. Loves smooth air and snacks."},
 {id:6,name:"Needlefish",tag:"A sleek speed wing. Do not sneeze while flying.",price:4800,control:1.9,drag:0.030,turnK:0.10,comfort:58,top:88,stall:12,bars:{fly:7,speed:10,ctrl:5},desc:"Goes very fast in one direction. Landing is left as an exercise for Dennis."},
 {id:7,name:"Flying Deck Chair",tag:"An ultralight frame. Cupholder included.",price:8500,control:2.7,drag:0.032,turnK:0.05,comfort:52,top:78,stall:8,bars:{fly:9,speed:8,ctrl:9},desc:"Engineered for naps that happen to move forward. Do not recline during turbulence."},
 {id:8,name:"Black Swan X-1",tag:"Experimental carbon. Probably legal.",price:15000,control:2.9,drag:0.020,turnK:0.04,comfort:68,top:105,stall:9,bars:{fly:10,speed:9,ctrl:10},desc:"Hums ominously and glows for no reason. The manual is just a winking face."},
 {id:9,name:"Dodo-Star Gyro",tag:"A tiny rotorcraft. Definitely not anti-gravity.",price:26000,control:3.1,drag:0.018,turnK:0.03,comfort:75,top:120,stall:6,bars:{fly:10,speed:10,ctrl:10},desc:"Spins first, asks questions later. Dennis insists this is basically hovering."}
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
    g.save();
    try {
      if (stalled) {
        g.rotate(Math.sin(t / 180) * 0.06);
      }
      g.scale(sc, sc);
      g.lineJoin = "round";
      g.lineCap = "round";
      var i, k, a0, a1, ang;
      var cols;
      if (nid === 0) {
        g.fillStyle = "#cfd6dd";
        g.strokeStyle = "#8a949d";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-8, -6);
        g.lineTo(-14, -16);
        g.lineTo(-5, -13);
        g.closePath();
        g.fill();
        g.stroke();
        g.beginPath();
        g.moveTo(8, -6);
        g.lineTo(14, -16);
        g.lineTo(5, -13);
        g.closePath();
        g.fill();
        g.stroke();
      } else if (nid === 1) {
        g.fillStyle = "#f4f6f8";
        g.strokeStyle = "#8d979f";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(-2, -30);
        g.lineTo(-42, -8);
        g.lineTo(-2, -4);
        g.closePath();
        g.fill();
        g.stroke();
        g.beginPath();
        g.moveTo(2, -30);
        g.lineTo(42, -8);
        g.lineTo(2, -4);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = "#dde3e9";
        g.strokeStyle = "#7c868f";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(0, -32);
        g.lineTo(-2, -4);
        g.lineTo(2, -4);
        g.closePath();
        g.fill();
        g.stroke();
        g.strokeStyle = "#aab3bb";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-2, -28);
        g.lineTo(-30, -11);
        g.stroke();
        g.beginPath();
        g.moveTo(2, -28);
        g.lineTo(30, -11);
        g.stroke();
        g.strokeStyle = "#6b747c";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(0, -32);
        g.lineTo(0, -4);
        g.stroke();
      } else if (nid === 2) {
        g.strokeStyle = "#5a5a5a";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-8, -2);
        g.lineTo(0, -19);
        g.stroke();
        g.beginPath();
        g.moveTo(8, -2);
        g.lineTo(0, -19);
        g.stroke();
        g.save();
        g.beginPath();
        g.moveTo(0, -52);
        g.lineTo(20, -35);
        g.lineTo(0, -18);
        g.lineTo(-20, -35);
        g.closePath();
        g.clip();
        cols = ["#e74c3c", "#f39c12", "#f9e04b", "#2ecc71", "#3498db", "#9b59b6"];
        for (i = 0; i < 6; i++) {
          g.fillStyle = cols[i];
          g.fillRect(-20, -52 + i * (34 / 6), 40, (34 / 6) + 1);
        }
        g.restore();
        g.strokeStyle = "#5d3a1a";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(0, -52);
        g.lineTo(0, -18);
        g.stroke();
        g.beginPath();
        g.moveTo(-20, -35);
        g.lineTo(20, -35);
        g.stroke();
        g.strokeStyle = "#333333";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(0, -52);
        g.lineTo(20, -35);
        g.lineTo(0, -18);
        g.lineTo(-20, -35);
        g.closePath();
        g.stroke();
        g.fillStyle = "#e74c3c";
        g.beginPath();
        g.moveTo(-4, -11);
        g.lineTo(4, -11);
        g.lineTo(0, -6);
        g.closePath();
        g.fill();
      } else if (nid === 3) {
        g.strokeStyle = "#5a5a5a";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-24, -20);
        g.lineTo(-8, -2);
        g.stroke();
        g.beginPath();
        g.moveTo(24, -20);
        g.lineTo(8, -2);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -18);
        g.lineTo(0, -2);
        g.stroke();
        for (k = 0; k < 8; k++) {
          a0 = Math.PI + k * Math.PI / 8;
          a1 = Math.PI + (k + 1) * Math.PI / 8;
          if (k % 2 === 0) { g.fillStyle = "#d93a3a"; }
          else { g.fillStyle = "#f6f2ea"; }
          g.beginPath();
          g.moveTo(0, -18);
          g.arc(0, -18, 30, a0, a1);
          g.closePath();
          g.fill();
        }
        g.strokeStyle = "#5a1f1f";
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(0, -18, 30, Math.PI, 2 * Math.PI);
        g.closePath();
        g.stroke();
        g.strokeStyle = "#5a1f1f";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, -48);
        g.lineTo(0, -54);
        g.stroke();
        g.fillStyle = "#5a1f1f";
        g.beginPath();
        g.arc(0, -54, 2.5, 0, Math.PI * 2);
        g.fill();
      } else if (nid === 4) {
        g.fillStyle = "#e6d7b2";
        g.strokeStyle = "#8a7a5a";
        g.lineWidth = 1.5;
        g.fillRect(-38, -40, 36, 18);
        g.strokeRect(-38, -40, 36, 18);
        g.fillRect(2, -40, 36, 18);
        g.strokeRect(2, -40, 36, 18);
        g.strokeStyle = "#b3a37e";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-20, -40);
        g.lineTo(-20, -22);
        g.stroke();
        g.beginPath();
        g.moveTo(20, -40);
        g.lineTo(20, -22);
        g.stroke();
        g.fillStyle = "#8b5a2b";
        g.strokeStyle = "#5d3a1a";
        g.lineWidth = 1.5;
        g.fillRect(-40, -44, 80, 4);
        g.strokeRect(-40, -44, 80, 4);
        g.fillRect(-40, -24, 80, 4);
        g.strokeRect(-40, -24, 80, 4);
        g.fillRect(-23, -44, 4, 24);
        g.strokeRect(-23, -44, 4, 24);
        g.fillRect(19, -44, 4, 24);
        g.strokeRect(19, -44, 4, 24);
        g.fillStyle = "#9aa0a6";
        g.strokeStyle = "#6b7075";
        g.lineWidth = 1;
        g.fillRect(-25, -46, 8, 8);
        g.strokeRect(-25, -46, 8, 8);
        g.fillRect(17, -46, 8, 8);
        g.strokeRect(17, -46, 8, 8);
        g.fillRect(-25, -26, 8, 8);
        g.strokeRect(-25, -26, 8, 8);
        g.fillRect(17, -26, 8, 8);
        g.strokeRect(17, -26, 8, 8);
        g.strokeStyle = "#4a4a4a";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-10, -20);
        g.lineTo(-8, -2);
        g.stroke();
        g.beginPath();
        g.moveTo(10, -20);
        g.lineTo(8, -2);
        g.stroke();
      } else if (nid === 5) {
        g.fillStyle = "#2aa79b";
        g.strokeStyle = "#16665f";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-42, -12);
        g.lineTo(42, -12);
        g.lineTo(0, -50);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = "#5ed1c5";
        g.beginPath();
        g.moveTo(-28, -16);
        g.lineTo(28, -16);
        g.lineTo(0, -44);
        g.closePath();
        g.fill();
        g.strokeStyle = "#16665f";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(0, -50);
        g.lineTo(0, -12);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -50);
        g.lineTo(-20, -12);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -50);
        g.lineTo(20, -12);
        g.stroke();
        g.strokeStyle = "#0f4a44";
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(0, -12);
        g.lineTo(-8, -2);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -12);
        g.lineTo(8, -2);
        g.stroke();
      } else if (nid === 6) {
        g.fillStyle = "#1e3f8f";
        g.strokeStyle = "#0e2150";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(-44, -8);
        g.lineTo(-6, -30);
        g.lineTo(-4, -22);
        g.lineTo(-30, -2);
        g.closePath();
        g.fill();
        g.stroke();
        g.beginPath();
        g.moveTo(44, -8);
        g.lineTo(6, -30);
        g.lineTo(4, -22);
        g.lineTo(30, -2);
        g.closePath();
        g.fill();
        g.stroke();
        g.strokeStyle = "#5f8cff";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(-42, -8);
        g.lineTo(-6, -28);
        g.stroke();
        g.beginPath();
        g.moveTo(42, -8);
        g.lineTo(6, -28);
        g.stroke();
        g.fillStyle = "#0e2150";
        g.beginPath();
        g.moveTo(-3, -32);
        g.lineTo(3, -32);
        g.lineTo(0, -22);
        g.closePath();
        g.fill();
      } else if (nid === 7) {
        g.fillStyle = "#d8dee3";
        g.strokeStyle = "#5a646d";
        g.lineWidth = 1.5;
        g.fillRect(-40, -50, 80, 8);
        g.strokeRect(-40, -50, 80, 8);
        g.fillStyle = "#e67e22";
        g.fillRect(-40, -47, 80, 2);
        g.strokeStyle = "#444444";
        g.lineWidth = 1.5;
        g.strokeRect(-18, -42, 36, 24);
        g.fillStyle = "#7a4a2b";
        g.strokeStyle = "#4a2c18";
        g.lineWidth = 1;
        g.fillRect(-8, -26, 16, 6);
        g.strokeRect(-8, -26, 16, 6);
        g.fillRect(-10, -32, 4, 12);
        g.strokeRect(-10, -32, 4, 12);
        g.strokeStyle = "#444444";
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-30, -42);
        g.lineTo(-14, -18);
        g.stroke();
        g.beginPath();
        g.moveTo(30, -42);
        g.lineTo(14, -18);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -42);
        g.lineTo(0, -18);
        g.stroke();
        g.beginPath();
        g.moveTo(-8, -18);
        g.lineTo(-8, -2);
        g.stroke();
        g.beginPath();
        g.moveTo(8, -18);
        g.lineTo(8, -2);
        g.stroke();
        g.strokeStyle = "#444444";
        g.lineWidth = 1;
        g.beginPath();
        g.arc(12, -24, 3, 0, Math.PI * 2);
        g.stroke();
      } else if (nid === 8) {
        g.fillStyle = "#11151c";
        g.strokeStyle = "#000000";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(-44, -6);
        g.lineTo(-12, -34);
        g.lineTo(0, -28);
        g.lineTo(12, -34);
        g.lineTo(44, -6);
        g.lineTo(36, -6);
        g.lineTo(12, -26);
        g.lineTo(0, -22);
        g.lineTo(-12, -26);
        g.lineTo(-36, -6);
        g.closePath();
        g.fill();
        g.stroke();
        try { g.shadowColor = "#3df2d6"; g.shadowBlur = 8; } catch (e1) {}
        g.strokeStyle = "#3df2d6";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-44, -6);
        g.lineTo(-12, -34);
        g.lineTo(0, -28);
        g.lineTo(12, -34);
        g.lineTo(44, -6);
        g.stroke();
        try { g.shadowBlur = 0; } catch (e2) {}
        g.strokeStyle = "#1f8f80";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-36, -6);
        g.lineTo(-12, -26);
        g.lineTo(0, -22);
        g.lineTo(12, -26);
        g.lineTo(36, -6);
        g.stroke();
        g.fillStyle = "#3df2d6";
        g.beginPath();
        g.arc(0, -26, 2.5, 0, Math.PI * 2);
        g.fill();
      } else {
        g.fillStyle = "#c23b3b";
        g.strokeStyle = "#7a1f1f";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-34, -8);
        g.lineTo(-24, -8);
        g.lineTo(-29, -16);
        g.closePath();
        g.fill();
        g.stroke();
        g.beginPath();
        g.moveTo(34, -8);
        g.lineTo(24, -8);
        g.lineTo(29, -16);
        g.closePath();
        g.fill();
        g.stroke();
        g.strokeStyle = "#4a4a4a";
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-29, -10);
        g.lineTo(-6, -4);
        g.stroke();
        g.beginPath();
        g.moveTo(29, -10);
        g.lineTo(6, -4);
        g.stroke();
        g.fillStyle = "#6b7075";
        g.strokeStyle = "#3c4043";
        g.lineWidth = 1.2;
        g.fillRect(-2, -40, 4, 22);
        g.strokeRect(-2, -40, 4, 22);
        g.fillStyle = "rgba(180,190,200,0.25)";
        g.save();
        g.translate(0, -42);
        g.scale(1, 0.15);
        g.beginPath();
        g.arc(0, 0, 42, 0, Math.PI * 2);
        g.fill();
        g.restore();
        ang = t / 300;
        g.save();
        g.translate(0, -42);
        g.rotate(ang);
        g.fillStyle = "#333a40";
        g.strokeStyle = "#1c2126";
        g.lineWidth = 1;
        g.fillRect(-42, -2, 84, 4);
        g.strokeRect(-42, -2, 84, 4);
        g.fillStyle = "#d93a3a";
        g.fillRect(-42, -2, 6, 4);
        g.fillRect(36, -2, 6, 4);
        g.restore();
        g.fillStyle = "#22272c";
        g.strokeStyle = "#000000";
        g.lineWidth = 1;
        g.beginPath();
        g.arc(0, -42, 4, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = "#3df2d6";
        g.beginPath();
        g.arc(0, -42, 1.8, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#4a4a4a";
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(0, -18);
        g.lineTo(-8, -2);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -18);
        g.lineTo(8, -2);
        g.stroke();
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
