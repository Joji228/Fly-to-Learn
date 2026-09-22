/* Dodo Airways world renderer — cartoon Flash-game aesthetic, all procedural.
   RENDER SCALE: physics lives in meters; drawing uses PIXELS_PER_METER.
     screenX = (worldX - cam.x) * PPM * zoom
     screenY = H*0.80 - (worldY - cam.y) * PPM * zoom
   Dennis himself is drawn in screen px (readable star), everything else in
   world meters so speed reads as rushing scenery, not a map. */
(function(){
"use strict";

var PPM = 6; // screen pixels per world meter at zoom 1 (closer camera: the world rushes past)

function hash(n){ var x = Math.sin(n*127.1)*43758.5453; return x - Math.floor(x); }
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function rr(g,x,y,w,h,r){
  r = Math.min(r, w/2, h/2);
  g.beginPath();
  g.moveTo(x+r,y);
  g.arcTo(x+w,y,x+w,y+h,r);
  g.arcTo(x+w,y+h,x,y+h,r);
  g.arcTo(x,y+h,x,y,r);
  g.arcTo(x,y,x+w,y,r);
  g.closePath();
}
function stripEmoji(s){
  return String(s).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, "").trim();
}

/* ---------------- sky + light ---------------- */
function skyColors(dist, alt){
  var t = Math.min(1, dist/30000);
  var top, bot;
  if(t < 0.33){ var k=t/0.33;
    top = mix([105,175,232],[86,198,212],k); bot = mix([226,242,253],[255,243,212],k);
  } else if(t < 0.66){ var k2=(t-0.33)/0.33;
    top = mix([86,198,212],[118,108,192],k2); bot = mix([255,243,212],[255,199,168],k2);
  } else { var k3=(t-0.66)/0.34;
    top = mix([118,108,192],[9,15,40],k3); bot = mix([255,199,168],[38,38,88],k3);
  }
  var a = Math.min(1, alt/300);
  top = mix(top, [8,10,40], a*0.55);
  return { top:rgb(top), bot:rgb(bot), night:t>0.62, t:t };
}
function mix(a,b,k){ return [a[0]+(b[0]-a[0])*k, a[1]+(b[1]-a[1])*k, a[2]+(b[2]-a[2])*k]; }
function rgb(c){ return "rgb("+(c[0]|0)+","+(c[1]|0)+","+(c[2]|0)+")"; }

function drawBackground(g, W, H, cam, dist, alt, zoom){
  var sky = skyColors(dist, alt);
  var gr = g.createLinearGradient(0,0,0,H);
  gr.addColorStop(0, sky.top); gr.addColorStop(0.72, sky.bot);
  gr.addColorStop(1, shade(sky.bot, -18));
  g.fillStyle = gr; g.fillRect(0,0,W,H);

  // sun with halo
  var sunX = W*0.8, sunY = Math.max(50, H*0.2 - cam.y*PPM*zoom*0.03);
  g.save();
  g.globalAlpha = 0.30;
  g.fillStyle = sky.night ? "#e8e4d0" : "#fff3b0";
  g.beginPath(); g.arc(sunX, sunY, sky.night?40:58, 0, 7); g.fill();
  g.globalAlpha = 0.95;
  g.beginPath(); g.arc(sunX, sunY, sky.night?22:32, 0, 7); g.fill();
  g.restore();

  // stars
  if(sky.night){
    g.fillStyle = "#fff";
    var a = Math.min(1, (sky.t-0.62)/0.38 + 0.2);
    for(var i=0;i<70;i++){
      var px = (hash(i)*W*1.4 - cam.x*PPM*0.02) % W; if(px<0)px+=W;
      var py = hash(i+99)*H*0.6;
      g.globalAlpha = a*(0.4+0.6*hash(i+7));
      g.fillRect(px, py, 2, 2);
    }
    g.globalAlpha = 1;
  }

  // atmospheric haze band above horizon
  g.save();
  g.globalAlpha = 0.35;
  var hz = g.createLinearGradient(0, H*0.45, 0, H*0.75);
  hz.addColorStop(0, "rgba(255,255,255,0)");
  hz.addColorStop(1, "rgba(255,255,255,0.55)");
  g.fillStyle = hz; g.fillRect(0, H*0.45, W, H*0.3);
  g.restore();

  // LAYER 2+3: far + mid mountain silhouettes (slow parallax)
  mountainLayer(g, W, H, cam, 0.10, H*0.60, 110, "rgba(122,143,176,0.75)", "rgba(93,115,150,0.75)", 3.1, zoom, true);
  mountainLayer(g, W, H, cam, 0.22, H*0.70, 70, "#8ba0c2", "#66799b", 7.7, zoom, true);
  mountainLayer(g, W, H, cam, 0.40, H*0.80, 40, "#a9bcd8", "#7e93b5", 12.3, zoom, false);
}
function shade(rgbStr, amt){
  var m = rgbStr.match(/\d+/g);
  var r = clamp(parseInt(m[0])+amt,0,255), gg = clamp(parseInt(m[1])+amt,0,255), b = clamp(parseInt(m[2])+amt,0,255);
  return "rgb("+r+","+gg+","+b+")";
}

function mountainLayer(g, W, H, cam, par, baseY, amp, c1, c2, seed, zoom, hazy){
  g.save();
  g.beginPath();
  g.moveTo(-4, H+4);
  var horizon = baseY + cam.y*par*PPM*zoom*0.3;
  for(var sx=0; sx<=W+24; sx+=24){
    var ph = cam.x*par*PPM + sx;
    var h = (Math.sin(ph*0.006+seed)*0.5+0.5)*amp + (Math.sin(ph*0.017+seed*2)*0.5+0.5)*amp*0.5;
    g.lineTo(sx, horizon - h);
  }
  g.lineTo(W+4, H+4);
  g.closePath();
  var grd = g.createLinearGradient(0, horizon-amp*1.5, 0, H);
  grd.addColorStop(0, c1); grd.addColorStop(1, c2);
  g.fillStyle = grd; g.fill();
  // snow caps: a smooth band hugging the ridge, deepest on the tallest peaks
  // (one filled polygon — the old per-sample rectangles read as dashes)
  var thr = amp*0.62, top = [], bot = [];
  for(var sx2=0; sx2<=W+24; sx2+=12){
    var ph2 = cam.x*par*PPM + sx2;
    var h2 = (Math.sin(ph2*0.006+seed)*0.5+0.5)*amp + (Math.sin(ph2*0.017+seed*2)*0.5+0.5)*amp*0.5;
    var depth = Math.max(0, h2 - thr) * 0.55;
    top.push([sx2, horizon - h2 - 0.5]);
    bot.push([sx2, horizon - h2 + depth + (depth > 0 ? Math.sin(sx2*0.21)*depth*0.25 : 0)]);
  }
  g.fillStyle = hazy ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.92)";
  g.beginPath();
  g.moveTo(top[0][0], top[0][1]);
  for(var ti=1; ti<top.length; ti++) g.lineTo(top[ti][0], top[ti][1]);
  for(var bi=bot.length-1; bi>=0; bi--) g.lineTo(bot[bi][0], bot[bi][1]);
  g.closePath(); g.fill();
  g.restore();
}

// clouds live at world altitudes so they parallax correctly for free
function drawClouds(g, W, H, cam, zoom){
  var spanM = W/(PPM*zoom);
  var c0 = Math.floor((cam.x-40)/76), c1 = Math.floor((cam.x+spanM+40)/76);
  for(var c=c0;c<=c1;c++){
    var cx = (c*76 + hash(c)*44 - cam.x)*PPM*zoom;
    var alt = 45 + hash(c+50)*150;
    var cy = H*0.80 - (alt - cam.y)*PPM*zoom;
    if(cx<-160||cx>W+160||cy<-80||cy>H+80) continue;
    var s = (0.7 + hash(c+7)*0.9) * PPM * zoom * 0.5;
    g.save();
    g.globalAlpha = 0.88;
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.ellipse(cx, cy, 46*s, 15*s, 0, 0, 7);
    g.ellipse(cx-28*s, cy+6*s, 26*s, 11*s, 0, 0, 7);
    g.ellipse(cx+28*s, cy+6*s, 28*s, 12*s, 0, 0, 7);
    g.fill();
    g.globalAlpha = 0.5;
    g.fillStyle = "#cfe0f5";
    g.beginPath(); g.ellipse(cx, cy+9*s, 40*s, 8*s, 0, 0, 7); g.fill();
    g.restore();
  }
}

/* ---------------- terrain profile ---------------- */
/* Downrange islands: landable targets past the home snowfield (surf starts
   at x=500). Each isle is a gentle cosine bump — max slope ~4-7 deg — so a
   flared touchdown can grease it, while the surf (bump under 0.5 m) still
   splashes. Without these, every flight past 360 m ends in open ocean: the
   whole landing-skill game (smooth bonuses, streaks, the smooth-800 m
   objective) would be dead content after the second glider. Lip-relative distances:
   Palm Isle ~1010-1210 m (fishing boats), Floe Berg ~1810-2060 m
   (icebergs), Gull Rock ~2810-3060 m (whale waters), City Isle ~3510-3960 m
   (the d3500 epic finally has a landing pad). */
var ISLANDS = [
  { x0:1150, x1:1350, h:6,  ice:false, name:"Palm Isle" },
  { x0:1950, x1:2200, h:8,  ice:true,  name:"Floe Berg" },
  { x0:2950, x1:3200, h:7,  ice:false, name:"Gull Rock" },
  { x0:3650, x1:4100, h:10, ice:false, name:"City Isle" }
];
function islandH(x){
  for(var i=0;i<ISLANDS.length;i++){
    var isl = ISLANDS[i];
    if(x >= isl.x0 && x <= isl.x1){
      var t = (x - isl.x0) / (isl.x1 - isl.x0);
      var s = Math.sin(Math.PI * t);
      return isl.h * s * s;
    }
  }
  return 0;
}
function groundY(x){
  if(x < 140) return rampY(x);
  return Math.sin(x*0.01)*1.2 + Math.sin(x*0.043)*0.5 + islandH(x);
}
function isWater(x){ return x > 500 && islandH(x) < 0.5; }
/* Visual sea level: the terrain without island bumps. Islands rise OUT of
   this surface; the water itself never bulges over them. */
var SHORE_X = 500, BANK_LEN = 46, BANK_DROP = 130;
function seaY(x){ return Math.sin(x*0.01)*1.2 + Math.sin(x*0.043)*0.5; }

var _rampLvl = 0;
function setRampLevel(r){ _rampLvl = Math.max(0, Math.min(8, r || 0)); }
function rampLipY(){ return window.DA.rampLipY(_rampLvl); }
function rampExitAngle(){ return window.DA.launchAngleDeg(_rampLvl) * Math.PI / 180; }
function rampY(x){
  var x0 = -60, L = 200;
  var y1 = window.DA.rampLipY(_rampLvl);
  var m1 = Math.tan(window.DA.launchAngleDeg(_rampLvl) * Math.PI / 180);
  if(x > 140) return y1 + (x - 140) * m1;
  var t = (x - x0) / L;
  if(t < 0) t = 0;
  if(t > 1) t = 1;
  var y0 = 55, m0 = -0.05;
  var t2 = t*t, t3 = t2*t;
  var h00 = 2*t3 - 3*t2 + 1, h10 = t3 - 2*t2 + t;
  var h01 = -2*t3 + 3*t2, h11 = t3 - t2;
  return h00*y0 + h10*L*m0 + h01*y1 + h11*L*m1;
}
function rampSlopeY(x){
  var e = 2;
  return (rampY(x + e) - rampY(x - e)) / (2 * e);
}

/* ---------------- main scene ---------------- */
function drawScene(g, W, H, cam, zoom, S, opts){
  opts = opts || {};
  drawBackground(g, W, H, cam, S.x, S.y, zoom);
  drawClouds(g, W, H, cam, zoom);
  var groundFrac = 0.80;

  function SX(wx){ return (wx - cam.x)*PPM*zoom; }
  function SY(wy){ return H*groundFrac - (wy - cam.y)*PPM*zoom; }

  var overWater = (S.x > 500);
  drawTerrain(g, W, H, cam, zoom, SX, SY, overWater, S);

  drawDetails(g, SX, SY, cam, W, H, zoom, S);

  // milestone signboards (lip-relative distances; world x = d + 140, exactly
  // where the toast fires). Label + distance live inside one wooden board.
  var MS = window.DA.MILESTONES;
  for(var i=1;i<MS.length;i++){
    var mx = MS[i].d, wx = mx + 140;
    if(wx >= SHORE_X && islandH(wx) < 1) wx = SHORE_X - 8; // never plant a sign in the sea
    var msx = SX(wx);
    if(msx < -200 || msx > W+200) continue;
    drawMilestone(g, msx, SY(groundY(wx)), stripEmoji(MS[i].label), fmtM(mx), zoom);
  }

  drawRamp(g, SX, SY, zoom);

  // soft shadow under player
  var pgy = groundY(S.x);
  var shScale = Math.max(0.12, 1 - Math.max(0, S.y - pgy)/60);
  g.save();
  g.globalAlpha = 0.32*shScale;
  g.fillStyle = "#1d3557";
  g.beginPath(); g.ellipse(SX(S.x), SY(pgy)+5, 30*shScale, 7*shScale, 0, 0, 7); g.fill();
  g.restore();

  // splash rings (timed overlay after water crash)
  if(opts.splash && opts.splash.t < 0.9){
    var st = opts.splash.t, spx = SX(opts.splash.x), spy = SY(groundY(opts.splash.x));
    g.save();
    for(var ri=0; ri<2; ri++){
      var rr2 = 12 + st*(90+ri*40);
      g.globalAlpha = Math.max(0, 0.7 - st*0.8);
      g.strokeStyle = "#ffffff"; g.lineWidth = 4-ri;
      g.beginPath(); g.ellipse(spx, spy, rr2, rr2*0.32, 0, 0, 7); g.stroke();
    }
    g.restore();
  }

  // particles (world-anchored, chunky cartoon scale)
  if(opts.particles && opts.particles.list){
    var pl = opts.particles.list;
    for(var pi=0; pi<pl.length; pi++){
      var pp = pl[pi];
      var psx = SX(pp.x), psy = SY(pp.y);
      if(psx<-40||psx>W+40||psy<-40||psy>H+40) continue;
      var pt = 1 - pp.age/pp.life;
      g.globalAlpha = Math.max(0, Math.min(1, pt*1.2));
      g.fillStyle = pp.color;
      var psz = (pp.shrink ? pp.size*pt + 0.5 : pp.size) * PPM * zoom * 0.5;
      if(psz < 1.2) psz = 1.2;
      g.beginPath(); g.arc(psx, psy, psz*0.62, 0, 6.2832); g.fill();
    }
    g.globalAlpha = 1;
  }

  // pickups: back half of every ring + fish behind Dennis, ring fronts over him
  var PK = window.DA.Pickups;
  if(opts.pickups && PK){ try{ PK.drawBack(g, SX, SY, zoom, opts.pickups, W, H); }catch(e){} }

  // Dennis — drawn in screen px at his own decoupled scale
  var ps = opts.playerScale || zoom;
  drawDodo(g, SX(S.x), SY(S.y), S, ps, opts);
  if(opts.pickups && PK){ try{ PK.drawFront(g, SX, SY, zoom, opts.pickups, W); }catch(e){} }
}

function drawMilestone(g, x, y, label, dist, zoom){
  var s = Math.max(0.85, Math.min(1.25, zoom*1.05));
  g.save();
  g.font = "800 " + Math.round(12*s) + "px Nunito, 'Segoe UI', sans-serif";
  var tw = Math.max(g.measureText(label).width, 40*s);
  var bw = tw + 22*s, bh = 38*s, by = y - 58*s - bh;
  // posts
  g.fillStyle = "#6b4226";
  g.fillRect(x - bw*0.3 - 2*s, by + bh - 2, 4*s, y - by - bh + 2);
  g.fillRect(x + bw*0.3 - 2*s, by + bh - 2, 4*s, y - by - bh + 2);
  // board
  g.fillStyle = "rgba(0,0,0,0.18)";
  rr(g, x - bw/2 + 2*s, by + 3*s, bw, bh, 7*s); g.fill();
  var bg = g.createLinearGradient(0, by, 0, by + bh);
  bg.addColorStop(0, "#b67a4b"); bg.addColorStop(1, "#8a5733");
  g.fillStyle = bg; rr(g, x - bw/2, by, bw, bh, 7*s); g.fill();
  g.strokeStyle = "#5b3a29"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(x - bw/2 + 5*s, by + 3*s, bw - 10*s, 2*s);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#fff6e0"; g.fillText(label, x, by + 13*s);
  g.font = "900 " + Math.round(12*s) + "px Nunito, 'Segoe UI', sans-serif";
  g.fillStyle = "#ffd166"; g.fillText(dist, x, by + 27*s);
  g.restore();
}
function fmtM(m){ return m>=1000 ? (m/1000).toFixed(m>=10000?0:1)+"km" : m+"m"; }

/* ---------------- terrain: snow + water ---------------- */
function drawTerrain(g, W, H, cam, zoom, SX, SY, overWater, S){
  var step = 12;
  // snow base (also under water region; water paints over it)
  g.save();
  g.beginPath();
  g.moveTo(-12, H+12);
  var snowEnd = Math.min(W+12, SX(SHORE_X + BANK_LEN));
  for(var sx=-12; sx<=snowEnd; sx+=step){
    g.lineTo(sx, SY(landY(cam.x + sx/(PPM*zoom))));
  }
  g.lineTo(snowEnd, SY(landY(cam.x + snowEnd/(PPM*zoom))));
  g.lineTo(snowEnd, H+12);
  g.closePath();
  var sg = g.createLinearGradient(0, H*0.45, 0, H);
  sg.addColorStop(0, "#f7faff"); sg.addColorStop(1, "#b7c9e4");
  g.fillStyle = sg; g.fill();
  g.clip();
  // blue shadow blobs (deterministic, world-anchored)
  var x0 = cam.x - 30, x1 = cam.x + W/(PPM*zoom) + 30;
  g.fillStyle = "rgba(120,150,200,0.20)";
  for(var bx=Math.floor(x0/45)*45; bx<x1; bx+=45){
    var bsx = SX(bx + hash(bx)*20);
    if(bsx<-120||bsx>W+120) continue;
    var bsy = SY(groundY(bx));
    g.beginPath(); g.ellipse(bsx, bsy+8, (18+hash(bx+3)*26)*zoom, 7*zoom, 0, 0, 7); g.fill();
  }
  // ridge strokes
  g.strokeStyle = "rgba(110,140,190,0.5)"; g.lineWidth = 2;
  for(var rx=Math.floor(x0/31)*31; rx<x1; rx+=31){
    var rsx = SX(rx + hash(rx+5)*14);
    if(rsx<-60||rsx>W+60) continue;
    var rsy = SY(groundY(rx));
    g.beginPath(); g.moveTo(rsx-14*zoom, rsy+4); g.quadraticCurveTo(rsx, rsy-3, rsx+14*zoom, rsy+3); g.stroke();
  }
  // sparkles (twinkle)
  var tt = Date.now()*0.003;
  g.fillStyle = "#ffffff";
  for(var kx=Math.floor(x0/23)*23; kx<x1; kx+=23){
    if(hash(kx+9) < 0.45) continue;
    var ksx = SX(kx+hash(kx)*10);
    if(ksx<-20||ksx>W+20) continue;
    var ksy = SY(groundY(kx));
    g.globalAlpha = 0.25 + 0.35*Math.abs(Math.sin(tt+hash(kx+2)*6));
    var kl = (2+hash(kx+4)*2.5)*zoom;
    g.fillRect(ksx-kl, ksy-1, kl*2, 2);
    g.fillRect(ksx-1, ksy-kl, 2, kl*2);
  }
  g.globalAlpha = 1;
  // ramp grooves
  g.strokeStyle = "rgba(140,110,90,0.55)"; g.lineWidth = 2;
  for(var gx=-50; gx<=130; gx+=18){
    g.beginPath();
    g.moveTo(SX(gx), SY(rampY(gx)+2.5));
    g.lineTo(SX(gx+9), SY(rampY(gx+9)+2.5));
    g.stroke();
  }
  // speed streaks on the ground when fast
  if(S.speed > 32){
    g.strokeStyle = "rgba(255,255,255,"+Math.min(0.5,(S.speed-32)/70).toFixed(2)+")";
    g.lineWidth = 2;
    var n = Math.min(10, (S.speed-30)|0);
    for(var qi=0; qi<n; qi++){
      var qx = S.x - 70 + Math.random()*120, qy = groundY(qx)+1+Math.random()*3;
      var qx2 = qx + 6 + Math.random()*Math.min(20, S.speed*0.3);
      g.beginPath(); g.moveTo(SX(qx), SY(qy)); g.lineTo(SX(qx2), SY(qy)); g.stroke();
    }
  }
  g.restore();

  // ---- water: flat living sea past the shore; the snow bank dives under it ----
  var wt = Date.now()*0.0022;
  var shoreSX = SX(SHORE_X);
  if(shoreSX < W+40){
    var wStart = Math.max(-12, shoreSX);
    g.save();
    // deep water: top = sea surface, left edge follows the submerged bank
    g.beginPath();
    g.moveTo(wStart, SY(seaY(cam.x + wStart/(PPM*zoom))));
    for(var wx2=wStart; wx2<=W+12; wx2+=step){
      g.lineTo(wx2, SY(seaY(cam.x + wx2/(PPM*zoom))));
    }
    g.lineTo(W+12, H+12);
    var bankBotSX = SX(SHORE_X + BANK_LEN);
    if(bankBotSX > wStart){
      g.lineTo(bankBotSX, H+12);
      for(var bx2=SHORE_X + BANK_LEN; bx2>=SHORE_X; bx2-=5){ var bsx2 = SX(bx2); if(bsx2 >= wStart) g.lineTo(bsx2, SY(landY(bx2))); }
    } else g.lineTo(wStart, H+12);
    g.closePath();
    _waterTop = SY(seaY(cam.x)) - 4; _waterH = H;
    var wg = g.createLinearGradient(0, _waterTop, 0, H);
    wg.addColorStop(0, "#56b4e9"); wg.addColorStop(0.25, "#2b86cc"); wg.addColorStop(1, "#0b3d75");
    g.fillStyle = wg; g.fill();
    // wet edge where the snow bank meets the water
    if(bankBotSX > -40 && shoreSX < W+40){
      g.strokeStyle = "rgba(60,112,170,0.55)"; g.lineWidth = 6;
      g.beginPath();
      for(var bx3=SHORE_X; bx3<=SHORE_X+BANK_LEN; bx3+=2){ var bsy3 = SY(landY(bx3)); if(bx3 === SHORE_X) g.moveTo(SX(bx3), bsy3); else g.lineTo(SX(bx3), bsy3); }
      g.stroke();
      g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 2;
      g.stroke();
    }
    // wave rows ride the surface (they used to be pinned to the screen)
    g.beginPath();
    g.moveTo(wStart, SY(seaY(cam.x + wStart/(PPM*zoom))));
    for(var cx2=wStart; cx2<=W+12; cx2+=step) g.lineTo(cx2, SY(seaY(cam.x + cx2/(PPM*zoom))));
    g.lineTo(W+12, H+12); g.lineTo(wStart, H+12); g.closePath();
    g.clip();
    for(var row=0; row<3; row++){
      g.strokeStyle = "rgba(255,255,255,"+(0.42-row*0.11)+")";
      g.lineWidth = 2.6-row*0.5;
      g.beginPath();
      for(var px2=wStart; px2<=W+20; px2+=14){
        var wxr = cam.x + px2/(PPM*zoom);
        var py2 = SY(seaY(wxr)) + (10 + row*20)*Math.max(0.7, zoom) + Math.sin(wxr*0.08 + wt*(1+row*0.4) + row*2)*3;
        if(px2 === wStart) g.moveTo(px2, py2); else g.lineTo(px2, py2);
      }
      g.stroke();
    }
    // surface highlight line + crest foam + sun glints (open water only)
    g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 2;
    g.beginPath();
    for(var hx=wStart; hx<=W+12; hx+=step){
      var hy = SY(seaY(cam.x + hx/(PPM*zoom))) + 1.5;
      if(hx === wStart) g.moveTo(hx, hy); else g.lineTo(hx, hy);
    }
    g.stroke();
    for(var fx2=Math.floor(x0/37)*37; fx2<x1; fx2+=37){
      if(fx2 < SHORE_X + 20 || islandNear(fx2, 12)) continue;
      var fsx = SX(fx2+hash(fx2+1)*18);
      if(fsx<-60||fsx>W+60) continue;
      var fsy = SY(seaY(fx2)) + 4 + Math.sin(wt*1.3+fx2)*2;
      g.fillStyle = "rgba(255,255,255,0.45)";
      g.beginPath(); g.ellipse(fsx, fsy, (8+hash(fx2+2)*14)*zoom, 2.4*zoom, 0, 0, 7); g.fill();
    }
    g.fillStyle = "rgba(255,246,200,0.5)";
    for(var lx=Math.floor(x0/53)*53; lx<x1; lx+=53){
      if(lx < SHORE_X + 10) continue;
      var lsx = SX(lx+hash(lx+4)*24);
      if(lsx<-40||lsx>W+40) continue;
      var lsy = SY(seaY(lx)) + 12 + hash(lx+6)*30;
      g.globalAlpha = 0.2 + 0.25*Math.abs(Math.sin(wt*2+lx));
      g.fillRect(lsx, lsy, (3+hash(lx+8)*5)*zoom, 2*zoom);
    }
    g.globalAlpha = 1;
    g.restore();
    // shore foam where the bank meets the sea
    shoreFoam(g, SX, SY, SHORE_X, zoom, wt, 1);
  }

  // ---- islands: land rising out of the sea, base visible in the shallows ----
  var viewX0 = cam.x - 60, viewX1 = cam.x + W/(PPM*zoom) + 60;
  for(var ii=0; ii<ISLANDS.length; ii++){
    var isl = ISLANDS[ii];
    if(isl.x1 + 40 < viewX0 || isl.x0 - 40 > viewX1) continue;
    drawIsland(g, SX, SY, isl, zoom, wt, viewX0, viewX1);
  }
}

/* The sea's vertical colour ramp (screen space: top -> H). Underwater tints
   sample it so submerged land fades into exactly the water behind it. */
var WATER_STOPS = [[0,[86,180,233]],[0.25,[43,134,204]],[1,[11,61,117]]];
var _waterTop = 0, _waterH = 1;
function waterRGBA(sy, a){
  var k = Math.max(0, Math.min(1, (sy - _waterTop) / Math.max(1, _waterH - _waterTop)));
  var c = WATER_STOPS[2][1];
  for(var i=0;i<2;i++){
    var s0 = WATER_STOPS[i], s1 = WATER_STOPS[i+1];
    if(k <= s1[0]){ var u = (k - s0[0])/(s1[0]-s0[0]); c = mix(s0[1], s1[1], u); break; }
  }
  return "rgba("+(c[0]|0)+","+(c[1]|0)+","+(c[2]|0)+","+a+")";
}
function landY(x){
  // snowfield, then the bank sloping under the sea past the shoreline
  if(x <= SHORE_X) return groundY(x);
  var k = Math.min(1, (x - SHORE_X) / BANK_LEN);
  return seaY(x) - BANK_DROP * k * k * (3 - 2*k) - 0.4 * Math.min(1, k*8);
}
function islandNear(x, pad){ return islandH(x) > 0.05 || islandH(x - pad) > 0.05 || islandH(x + pad) > 0.05; }
function shoreFoam(g, SX, SY, x, zoom, wt, dir){
  var fx = SX(x), fy = SY(seaY(x));
  g.save();
  g.lineCap = "round";
  for(var f=0; f<3; f++){
    g.strokeStyle = "rgba(255,255,255,"+(0.85-f*0.25)+")";
    g.lineWidth = (3.2-f*0.8)*Math.max(0.8, zoom);
    var off = (f*7 + Math.sin(wt*1.4+f)*2)*dir*zoom;
    g.beginPath();
    g.moveTo(fx - 10*zoom*dir + off, fy + 1 + f*2.5);
    g.quadraticCurveTo(fx + off + 6*dir*zoom, fy - 2 + f*2.5, fx + (22 + f*6)*dir*zoom + off, fy + 1.5 + f*2.5);
    g.stroke();
  }
  g.restore();
}
function drawIsland(g, SX, SY, isl, zoom, wt, viewX0, viewX1){
  var pad = 30, depth = 22;
  var a0 = Math.max(viewX0, isl.x0 - pad), a1 = Math.min(viewX1, isl.x1 + pad);
  var sand = isl.ice ? ["#ffffff", "#d6ebfb", "#9cc6ea"] : ["#f7e4b0", "#e6c283", "#b98a52"];
  g.save();
  // submerged base (a wide skirt under the waterline), seen through water
  g.beginPath();
  g.moveTo(SX(a0), SY(seaY(a0)));
  for(var x=a0; x<=a1; x+=6) g.lineTo(SX(x), SY(seaY(x)));
  g.lineTo(SX(a1), SY(seaY(a1)));
  var mid = (isl.x0 + isl.x1)/2, half = (isl.x1 - isl.x0)/2 + pad;
  for(var xb=a1; xb>=a0; xb-=6){
    var u = Math.min(1, Math.abs(xb - mid)/half);
    g.lineTo(SX(xb), SY(seaY(xb) - depth*Math.sqrt(Math.max(0, 1 - u*u))));
  }
  g.closePath();
  g.fillStyle = sand[2]; g.fill();
  // tint fades to the deep-water colour, so the base has no visible edge
  var sy0 = SY(seaY(mid)), sy1 = SY(seaY(mid) - depth);
  var tg = g.createLinearGradient(0, sy0, 0, sy1);
  tg.addColorStop(0, waterRGBA(sy0, 0.5)); tg.addColorStop(0.55, waterRGBA((sy0+sy1)/2, 0.9)); tg.addColorStop(1, waterRGBA(sy1, 1));
  g.fillStyle = tg; g.fill();
  // land above water: island top down to the sea surface. It tapers to
  // nothing at both ends, so there is never a cut-off slab edge.
  var pts = [];
  for(var x2=Math.max(a0, isl.x0); x2<=Math.min(a1, isl.x1); x2+=4) pts.push(x2);
  if(pts.length > 1){
    var topY = SY(seaY((isl.x0+isl.x1)/2) + isl.h);
    var ig = g.createLinearGradient(0, topY, 0, SY(seaY(isl.x0)));
    ig.addColorStop(0, sand[0]); ig.addColorStop(0.6, sand[1]); ig.addColorStop(1, sand[2]);
    g.beginPath();
    g.moveTo(SX(pts[0]), SY(seaY(pts[0])));
    for(var i=0;i<pts.length;i++) g.lineTo(SX(pts[i]), SY(groundY(pts[i])));
    for(var j=pts.length-1;j>=0;j--) g.lineTo(SX(pts[j]), SY(seaY(pts[j])));
    g.closePath();
    g.fillStyle = ig; g.fill();
    // rim light along the top + wet band at the waterline
    g.strokeStyle = isl.ice ? "rgba(255,255,255,0.95)" : "rgba(255,244,214,0.9)"; g.lineWidth = 2;
    g.beginPath();
    for(var k=0;k<pts.length;k++){ var tx = SX(pts[k]), ty = SY(groundY(pts[k])); if(k) g.lineTo(tx, ty); else g.moveTo(tx, ty); }
    g.stroke();
    g.strokeStyle = isl.ice ? "rgba(120,170,215,0.55)" : "rgba(140,96,50,0.45)"; g.lineWidth = 3*Math.max(0.8, zoom);
    g.beginPath();
    for(var m=0;m<pts.length;m++){ var wx4 = pts[m], wy = SY(seaY(wx4) + Math.min(0.9, islandH(wx4)*0.4)); if(m) g.lineTo(SX(wx4), wy); else g.moveTo(SX(wx4), wy); }
    g.stroke();
  }
  g.restore();
  // foam hugging both beaches
  shoreFoam(g, SX, SY, isl.x0 + 4, zoom, wt, -1);
  shoreFoam(g, SX, SY, isl.x1 - 4, zoom, wt, 1);
}

/* ---------------- details: dense near-field + vector mid props ---------------- */
function drawDetails(g, SX, SY, cam, W, H, zoom, S){
  var NS = PPM*zoom*0.5;   // near-field prop scale (foreground feel)
  var x0 = cam.x - 30, x1 = cam.x + W/(PPM*zoom) + 30;
  var i, x, jx, gy, sx, sy;

  // pine trees on snow country
  if(x0 < 500){
    for(x=Math.max(-120, Math.floor(x0/40)*40); x<Math.min(500,x1); x+=40){
      jx = x + hash(x)*18;
      gy = groundY(jx);
      sx = SX(jx); sy = SY(gy);
      if(sx<-50||sx>W+50) continue;
      drawPine(g, sx, sy, (0.7+hash(x+3)*0.6)*NS);
    }
  }
  // striped snow poles: frequent motion rulers on land
  for(x=Math.floor(x0/25)*25; x<Math.min(490,x1); x+=25){
    jx = x + 6;
    sx = SX(jx); if(sx<-40||sx>W+40) continue;
    sy = SY(groundY(jx));
    var ph = 30*NS;
    g.save();
    g.fillStyle = "#e63946"; g.fillRect(sx-2.5*NS, sy-ph, 5*NS, ph);
    g.fillStyle = "#ffffff";
    g.fillRect(sx-2.5*NS, sy-ph, 5*NS, ph*0.25);
    g.fillRect(sx-2.5*NS, sy-ph*0.55, 5*NS, ph*0.2);
    g.fillStyle = "#ffd60a";
    g.beginPath(); g.arc(sx, sy-ph-3*NS, 3.2*NS, 0, 7); g.fill();
    g.restore();
  }
  // rocks + bushes + fences on land
  for(x=Math.floor(x0/33)*33; x<Math.min(495,x1); x+=33){
    var h = hash(x+21);
    jx = x + h*22; sx = SX(jx); if(sx<-60||sx>W+60) continue;
    sy = SY(groundY(jx));
    if(h < 0.4) drawRock(g, sx, sy, (0.7+h)*NS);
    else if(h < 0.75) drawBush(g, sx, sy, (0.7+h*0.6)*NS);
    else drawFence(g, sx, sy, NS);
  }
  // buoys + floating ice at sea (open water only)
  for(x=Math.floor(x0/30)*30; x<x1; x+=30){
    if(x < SHORE_X + 40) continue;
    jx = x + hash(x+9)*16; sx = SX(jx); if(sx<-60||sx>W+60) continue;
    if(islandNear(jx, 20)) continue;
    sy = SY(seaY(jx)) + Math.sin(Date.now()*0.002+x)*2*zoom;
    if(hash(x+13) < 0.55) drawBuoy(g, sx, sy, NS);
    else drawFloater(g, sx, sy, NS, x);
  }
  // island flora: palms on sand, ice shards on the floe
  for(var iz=0; iz<ISLANDS.length; iz++){
    var isl = ISLANDS[iz];
    for(var px=isl.x0+30; px<isl.x1-10; px+=70){
      jx = px + hash(px)*20;
      if(jx < x0 || jx > x1 || islandH(jx) < 2) continue;
      sx = SX(jx); if(sx<-60||sx>W+60) continue;
      sy = SY(groundY(jx));
      if(isl.ice) drawShard(g, sx, sy, (0.8+hash(px+1)*0.5)*NS);
      else drawPalm(g, sx, sy, (0.8+hash(px+1)*0.5)*NS);
    }
  }
  // birds aloft
  g.save();
  g.strokeStyle = "rgba(30,30,40,0.75)"; g.lineWidth = 2;
  for(x=Math.floor(x0/150)*150; x<x1; x+=150){
    var bse = x*3+11;
    var bx = SX(x + hash(bse)*110);
    if(bx<-60||bx>W+60) continue;
    var bh = SY(55 + hash(bse+1)*110) + Math.sin(Date.now()*0.004+bse)*5;
    var fl = Math.sin(Date.now()*0.012+bse)*4;
    g.beginPath();
    g.moveTo(bx-9, bh); g.quadraticCurveTo(bx-4, bh-4-fl, bx, bh);
    g.quadraticCurveTo(bx+4, bh-4-fl, bx+9, bh);
    g.stroke();
  }
  g.restore();

  // bigger midground set pieces
  for(var wx=Math.floor((x0-200)/400)*400; wx<x1+200; wx+=400){
    var px0 = wx + hash(wx)*200, sx2 = SX(px0);
    if(sx2<-220||sx2>W+220) continue;
    if(px0 < SHORE_X + 60) continue;
    var pick = pickFor(wx+200);
    if(pick === "city") pick = (hash(wx+3) < 0.5) ? "whale" : "ice";
    var seaProp = (pick === "boat" || pick === "ice" || pick === "whale");
    if(seaProp && (islandNear(px0, 45))) continue;
    var gy2 = seaProp ? seaY(px0) : groundY(px0);
    if(pick) drawProp(g, sx2, SY(gy2), pick, PPM*zoom*0.32, wx);
  }
  // City Isle skyline
  var city = ISLANDS[3];
  [[city.x0 + 150, 11],[city.x0 + 235, 23],[city.x0 + 300, 37]].forEach(function(c){
    var csx = SX(c[0]);
    if(csx < -220 || csx > W + 220) return;
    drawProp(g, csx, SY(groundY(c[0])) + 2, "city", PPM*zoom*0.3, c[1]);
  });
}
function pickFor(x){
  if(x<500) return null;
  if(x<1600) return "boat";
  if(x<2600) return "ice";
  if(x<3800) return (x%800<400)?"whale":"ice";
  if(x<5500) return (x%800<400)?"city":"whale";
  if(x<7500) return (x%1000<500)?"mountain":"city";
  if(x<10000) return (x%1200<600)?"castle":"mountain";
  if(x<13500) return (x%1200<600)?"volcano":"castle";
  if(x<18000) return (x%1400<700)?"statue":"volcano";
  if(x<25000) return (x%1600<800)?"ufo":"statue";
  return "moon";
}
function drawPalm(g, x, y, s){
  g.strokeStyle = "#7f5539"; g.lineWidth = Math.max(1.5, 4*s); g.lineCap = "round";
  g.beginPath(); g.moveTo(x, y);
  g.quadraticCurveTo(x+4*s, y-16*s, x+8*s, y-26*s); g.stroke();
  g.strokeStyle = "#2d6a4f"; g.lineWidth = Math.max(1.2, 3*s);
  for(var f2=0; f2<5; f2++){
    var a2 = -Math.PI*0.12 - f2*(Math.PI*0.68/4);
    g.beginPath(); g.moveTo(x+8*s, y-26*s);
    g.quadraticCurveTo(x+8*s+Math.cos(a2)*13*s, y-28*s+Math.sin(a2)*7*s,
      x+8*s+Math.cos(a2)*19*s, y-23*s+Math.sin(a2)*11*s);
    g.stroke();
  }
  g.fillStyle = "#6b4226";
  g.beginPath(); g.arc(x+8*s, y-24*s, Math.max(1.2, 3*s), 0, 7); g.fill();
}
function drawShard(g, x, y, s){
  g.fillStyle = "#eef6fd";
  g.beginPath(); g.moveTo(x-11*s, y); g.lineTo(x-2*s, y-16*s); g.lineTo(x+4*s, y); g.closePath(); g.fill();
  g.fillStyle = "#bcd9f5";
  g.beginPath(); g.moveTo(x+1*s, y); g.lineTo(x+8*s, y-11*s); g.lineTo(x+13*s, y); g.closePath(); g.fill();
}
function drawPine(g, x, y, s){
  g.fillStyle = "#5b3a29"; g.fillRect(x-3*s, y-14*s, 6*s, 14*s);
  g.fillStyle = "#2d6a4f";
  for(var i=0;i<3;i++){ var w=(26-i*6)*s, yy=y-14*s-i*12*s;
    g.beginPath(); g.moveTo(x-w/2, yy); g.lineTo(x, yy-16*s); g.lineTo(x+w/2, yy); g.closePath(); g.fill(); }
  g.fillStyle = "#40916c";
  g.beginPath(); g.moveTo(x-9*s, y-14*s-10*s); g.lineTo(x-2*s, y-14*s-22*s); g.lineTo(x+4*s, y-14*s-10*s); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.beginPath(); g.moveTo(x-7*s, y-14*s-30*s); g.lineTo(x, y-14*s-38*s); g.lineTo(x+7*s, y-14*s-30*s); g.closePath(); g.fill();
}
function drawRock(g, x, y, s){
  g.fillStyle = "#6c757d";
  g.beginPath(); g.moveTo(x-14*s, y); g.lineTo(x-6*s, y-14*s); g.lineTo(x+6*s, y-12*s); g.lineTo(x+14*s, y); g.closePath(); g.fill();
  g.fillStyle = "#adb5bd";
  g.beginPath(); g.moveTo(x-6*s, y-14*s); g.lineTo(x-1*s, y-9*s); g.lineTo(x-9*s, y-8*s); g.closePath(); g.fill();
  g.fillStyle = "#ffffff";
  g.beginPath(); g.moveTo(x-6*s, y-14*s); g.lineTo(x-2*s, y-10*s); g.lineTo(x-8*s, y-10*s); g.closePath(); g.fill();
}
function drawBush(g, x, y, s){
  g.fillStyle = "#2d6a4f";
  g.beginPath(); g.ellipse(x, y-7*s, 13*s, 8*s, 0, 0, 7); g.fill();
  g.fillStyle = "#40916c";
  g.beginPath(); g.ellipse(x-4*s, y-9*s, 7*s, 5*s, 0, 0, 7); g.fill();
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.beginPath(); g.ellipse(x-2*s, y-12*s, 8*s, 3.5*s, 0, 0, 7); g.fill();
}
function drawFence(g, x, y, s){
  g.save();
  g.strokeStyle = "#7f5539"; g.lineWidth = 3*s;
  g.beginPath(); g.moveTo(x-16*s, y); g.lineTo(x-16*s, y-14*s); g.stroke();
  g.beginPath(); g.moveTo(x+16*s, y); g.lineTo(x+16*s, y-14*s); g.stroke();
  g.lineWidth = 2.4*s;
  g.beginPath(); g.moveTo(x-20*s, y-12*s); g.lineTo(x+20*s, y-10*s); g.stroke();
  g.beginPath(); g.moveTo(x-20*s, y-6*s); g.lineTo(x+20*s, y-4*s); g.stroke();
  g.fillStyle = "#fff";
  g.fillRect(x-19*s, y-15*s, 6*s, 4*s);
  g.restore();
}
function drawBuoy(g, x, y, s){
  var bob = Math.sin(Date.now()*0.002+x)*1.5;
  y += bob;
  g.fillStyle = "#c1121f";
  g.beginPath(); g.moveTo(x-8*s, y); g.lineTo(x-4*s, y-18*s); g.lineTo(x+4*s, y-18*s); g.lineTo(x+8*s, y); g.closePath(); g.fill();
  g.fillStyle = "#ffffff"; g.fillRect(x-4*s, y-13*s, 8*s, 4*s);
  g.fillStyle = "#ffd60a";
  g.beginPath(); g.arc(x, y-21*s, 3*s, 0, 7); g.fill();
  g.fillStyle = "rgba(255,255,255,0.6)";
  g.beginPath(); g.ellipse(x, y+1*s, 12*s, 2.5*s, 0, 0, 7); g.fill();
}
function drawFloater(g, x, y, s, seed){
  var bob = Math.sin(Date.now()*0.0022+seed)*2;
  y += bob;
  g.fillStyle = "rgba(220,240,255,0.95)";
  g.beginPath(); g.moveTo(x-22*s, y); g.lineTo(x-6*s, y-12*s); g.lineTo(x+10*s, y-6*s); g.lineTo(x+22*s, y); g.closePath(); g.fill();
  g.fillStyle = "#ffffff";
  g.beginPath(); g.moveTo(x-6*s, y-12*s); g.lineTo(x-1*s, y-7*s); g.lineTo(x-10*s, y-7*s); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,0.5)";
  g.beginPath(); g.ellipse(x, y+1, 24*s, 2.5*s, 0, 0, 7); g.fill();
}
function drawProp(g, x, y, kind, s, seed){
  if(s < 0.4) s = 0.4;
  g.save();
  var bob = Math.sin(Date.now()*0.002 + seed)*2;
  if(kind==="boat"){
    y += bob;
    g.fillStyle = "#7f4f24"; // hull
    g.beginPath(); g.moveTo(x-30*s, y-12*s); g.lineTo(x+30*s, y-12*s); g.lineTo(x+20*s, y); g.lineTo(x-20*s, y); g.closePath(); g.fill();
    g.strokeStyle = "#5b3a29"; g.lineWidth = 2; g.stroke();
    g.fillStyle = "#fff"; g.fillRect(x-12*s, y-26*s, 20*s, 14*s); // cabin
    g.fillStyle = "#219ebc"; g.fillRect(x-8*s, y-23*s, 12*s, 8*s); // window
    g.strokeStyle = "#5b3a29"; g.lineWidth = 2; // mast + sail
    g.beginPath(); g.moveTo(x+8*s, y-12*s); g.lineTo(x+8*s, y-40*s); g.stroke();
    g.fillStyle = "#f1faee";
    g.beginPath(); g.moveTo(x+8*s, y-40*s); g.lineTo(x+8*s, y-14*s); g.lineTo(x+28*s, y-14*s); g.closePath(); g.fill();
    g.fillStyle = "#343a40"; // fisherman: head + body + rod
    g.beginPath(); g.arc(x-14*s, y-32*s, 4*s, 0, 7); g.fill();
    g.fillRect(x-17*s, y-28*s, 6*s, 12*s);
    g.strokeStyle = "#343a40"; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x-12*s, y-26*s); g.lineTo(x-30*s, y-40*s); g.stroke();
    g.strokeStyle = "rgba(52,58,64,0.7)"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x-30*s, y-40*s); g.lineTo(x-30*s, y-16*s); g.stroke();
  } else if(kind==="ice"){
    g.fillStyle = "#d6e9fa";
    g.beginPath(); g.moveTo(x-36*s, y); g.lineTo(x-10*s, y-46*s); g.lineTo(x+14*s, y-20*s); g.lineTo(x+36*s, y); g.closePath(); g.fill();
    g.strokeStyle = "#9fc3e8"; g.lineWidth = 2; g.stroke();
    g.fillStyle = "#ffffff";
    g.beginPath(); g.moveTo(x-10*s, y-46*s); g.lineTo(x-2*s, y-34*s); g.lineTo(x-18*s, y-32*s); g.closePath(); g.fill();
    g.fillStyle = "#5aa9e6";
    g.beginPath(); g.moveTo(x+2*s, y-28*s); g.lineTo(x+10*s, y-18*s); g.lineTo(x-4*s, y-18*s); g.closePath(); g.fill();
  } else if(kind==="whale"){
    y += bob*1.5;
    g.fillStyle = "#33587c"; // body
    g.beginPath(); g.ellipse(x, y-14*s, 30*s, 13*s, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(x-26*s, y-14*s); g.lineTo(x-42*s, y-26*s); g.lineTo(x-38*s, y-12*s); g.lineTo(x-42*s, y-2*s); g.closePath(); g.fill(); // tail
    g.fillStyle = "#27435f";
    g.beginPath(); g.ellipse(x+4*s, y-4*s, 22*s, 7*s, 0, 0, 7); g.fill(); // belly shade
    g.fillStyle = "#fff"; g.beginPath(); g.arc(x+18*s, y-16*s, 3*s, 0, 7); g.fill(); // eye
    g.fillStyle = "#111"; g.beginPath(); g.arc(x+19*s, y-16*s, 1.4*s, 0, 7); g.fill();
    g.fillStyle = "rgba(202,240,248,0.9)"; // spout
    for(var sp=0; sp<3; sp++){
      g.beginPath(); g.arc(x-2*s+sp*5*s, y-34*s-Math.abs(sp-1)*-4*s, 2.4*s, 0, 7); g.fill();
    }
  } else if(kind==="city"){
    g.fillStyle = "#22333b";
    for(var i=0;i<5;i++){ var bw2=16*s, bh=(30+hash(seed+i)*55)*s;
      g.fillRect(x-44*s+i*19*s, y-bh, bw2, bh);
      g.fillStyle = "#33454e"; g.fillRect(x-44*s+i*19*s, y-bh, bw2, 4*s);
      g.fillStyle = "#22333b"; }
    g.fillStyle = "#ffe66d";
    for(var w2=0;w2<16;w2++){ g.fillRect(x-42*s+hash(seed+w2)*84*s, y-8-hash(seed+w2+9)*66*s, 2.6, 2.6); }
    g.fillStyle = "#e63946";
    g.beginPath(); g.arc(x+44*s, y-70*s, 2.5*s, 0, 7); g.fill(); // beacon
  } else if(kind==="mountain"){
    g.fillStyle = "#5c677d";
    g.beginPath(); g.moveTo(x-62*s, y); g.lineTo(x, y-112*s); g.lineTo(x+62*s, y); g.closePath(); g.fill();
    g.fillStyle = "#8d99ae";
    g.beginPath(); g.moveTo(x-40*s, y-40*s); g.lineTo(x, y-112*s); g.lineTo(x+40*s, y-40*s); g.lineTo(x+30*s, y-30*s); g.lineTo(x-30*s, y-34*s); g.closePath(); g.fill();
    g.fillStyle = "#ffffff";
    g.beginPath(); g.moveTo(x-17*s, y-76*s); g.lineTo(x, y-112*s); g.lineTo(x+17*s, y-76*s); g.lineTo(x+8*s, y-68*s); g.lineTo(x-8*s, y-72*s); g.closePath(); g.fill();
  } else if(kind==="castle"){
    g.fillStyle = "#6d597a";
    g.fillRect(x-36*s, y-52*s, 72*s, 52*s);
    g.fillRect(x-36*s, y-68*s, 13*s, 20*s);
    g.fillRect(x+23*s, y-68*s, 13*s, 20*s);
    g.fillStyle = "#5a4a66"; g.fillRect(x-36*s, y-52*s, 72*s, 6*s);
    g.fillStyle = "#ffe66d";
    g.fillRect(x-24*s, y-40*s, 8*s, 12*s); g.fillRect(x+16*s, y-40*s, 8*s, 12*s); // windows
    g.strokeStyle = "#4a3728"; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(x, y-52*s); g.lineTo(x, y-80*s); g.stroke();
    g.fillStyle = "#e63946"; // triangular pennant (vector, no emoji)
    g.beginPath(); g.moveTo(x, y-80*s); g.lineTo(x+22*s, y-74*s); g.lineTo(x, y-68*s); g.closePath(); g.fill();
  } else if(kind==="volcano"){
    g.fillStyle = "#4a4e69";
    g.beginPath(); g.moveTo(x-56*s, y); g.lineTo(x-16*s, y-92*s); g.lineTo(x+16*s, y-92*s); g.lineTo(x+56*s, y); g.closePath(); g.fill();
    g.fillStyle = "#ff5400";
    g.beginPath(); g.moveTo(x-16*s, y-92*s); g.lineTo(x+16*s, y-92*s); g.lineTo(x+8*s, y-70*s); g.lineTo(x-8*s, y-70*s); g.closePath(); g.fill();
    g.fillStyle = "#ffb703";
    g.beginPath(); g.moveTo(x-8*s, y-92*s); g.lineTo(x+8*s, y-92*s); g.lineTo(x, y-78*s); g.closePath(); g.fill();
    g.fillStyle = "rgba(120,120,120,0.65)";
    g.beginPath(); g.ellipse(x, y-112*s, 13*s, 8*s, 0, 0, 7); g.fill();
    g.fillStyle = "rgba(255,120,40,0.8)";
    g.beginPath(); g.arc(x, y-104*s, 3*s, 0, 7); g.fill();
  } else if(kind==="statue"){
    g.fillStyle = "#8d99ae"; // pedestal
    g.fillRect(x-16*s, y-26*s, 32*s, 26*s);
    g.fillStyle = "#767f92"; g.fillRect(x-16*s, y-26*s, 32*s, 5*s);
    g.fillStyle = "#c9a227"; // golden dodo: body + head + beak
    g.beginPath(); g.ellipse(x, y-44*s, 13*s, 10*s, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(x+10*s, y-52*s, 6*s, 0, 7); g.fill();
    g.fillStyle = "#e36414";
    g.beginPath(); g.moveTo(x+14*s, y-54*s); g.lineTo(x+22*s, y-51*s); g.lineTo(x+14*s, y-48*s); g.closePath(); g.fill();
  } else if(kind==="ufo"){
    var fy = y-92*s + Math.sin(Date.now()*0.003+seed)*7;
    g.fillStyle = "rgba(180,255,200,0.45)";
    g.beginPath(); g.ellipse(x, fy+18*s, 26*s, 24*s, 0, 0, 7); g.fill();
    g.fillStyle = "#9aa5b1";
    g.beginPath(); g.ellipse(x, fy, 30*s, 10*s, 0, 0, 7); g.fill();
    g.fillStyle = "#6c757d";
    g.beginPath(); g.ellipse(x, fy+4*s, 30*s, 5*s, 0, 0, 7); g.fill();
    g.fillStyle = "#495057";
    g.beginPath(); g.ellipse(x, fy-6*s, 12*s, 7*s, 0, 0, 7); g.fill(); // dome
    g.fillStyle = "#80ed99";
    for(var l=0;l<4;l++){ g.beginPath(); g.arc(x-18*s+l*12*s, fy+2*s, 3*s, 0, 7); g.fill(); }
  } else if(kind==="moon"){
    g.fillStyle = "#e9ecef";
    g.beginPath(); g.arc(x, y-72*s, 24*s, 0, 7); g.fill();
    g.fillStyle = "#ced4da";
    g.beginPath(); g.arc(x-8*s, y-78*s, 5*s, 0, 7); g.fill();
    g.beginPath(); g.arc(x+7*s, y-66*s, 4*s, 0, 7); g.fill();
    g.beginPath(); g.arc(x+4*s, y-82*s, 3*s, 0, 7); g.fill();
    g.fillStyle = "#212529"; // tiny cow silhouette sitting on the moon
    var cx2 = x+42*s, cy2 = y-44*s;
    g.fillRect(cx2-10*s, cy2-8*s, 18*s, 9*s); // body
    g.fillRect(cx2+6*s, cy2-13*s, 7*s, 7*s);  // head
    g.fillRect(cx2-8*s, cy2+1*s, 3*s, 7*s); g.fillRect(cx2+3*s, cy2+1*s, 3*s, 7*s); // legs
    g.fillStyle = "#fff"; g.fillRect(cx2-6*s, cy2-7*s, 5*s, 4*s); // patch
  }
  g.restore();
}

function drawRamp(g, SX, SY, zoom){
  var pts = [];
  // NOTE: rampY (the track), never groundY: at x=140 groundY resolves to
  // terrain (~1 m) while the lip is ~26 m up — the old call drew a cliff
  // at the endpoint. The sled rides rampY; so does the drawing.
  for(var x=-60; x<=140; x+=10) pts.push([SX(x), SY(rampY(x)+2)]);
  g.save();
  g.lineCap = "round";
  g.strokeStyle = "#4a3728"; g.lineWidth = 7*zoom; // supports
  for(var x2=-40; x2<=120; x2+=40){
    g.beginPath(); g.moveTo(SX(x2), SY(rampY(x2))); g.lineTo(SX(x2), SY(rampY(x2))+52*zoom); g.stroke();
  }
  g.strokeStyle = "#7f5539"; g.lineWidth = 12*zoom; // wooden frame
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for(var i=1;i<pts.length;i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke();
  g.strokeStyle = "#b08968"; g.lineWidth = 7*zoom; // deck planks
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]-1);
  for(var j=1;j<pts.length;j++) g.lineTo(pts[j][0], pts[j][1]-1);
  g.stroke();
  g.strokeStyle = "#e9c46a"; g.lineWidth = 2.4*zoom; // guide rails
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]-5);
  for(var k2=1;k2<pts.length;k2++) g.lineTo(pts[k2][0], pts[k2][1]-5);
  g.stroke();
  // start gate: two posts + banner
  var bx = SX(-60), by = SY(rampY(-60)+2);
  g.fillStyle = "#5b3a29";
  g.fillRect(bx-30, by-72, 9, 48); g.fillRect(bx+21, by-72, 9, 48);
  g.fillStyle = "#e63946";
  rr(g, bx-34, by-96, 68, 26, 6); g.fill();
  g.strokeStyle = "#9d0208"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#fff"; g.font = "bold 13px sans-serif"; g.textAlign="center";
  g.fillText("START", bx, by-78);
  g.restore();
}

/* ---------------- DENNIS the dodo: expressive cartoon star ----------------
   Drawn in unit space (g.scale(zoom)), facing +x. One merged silhouette
   outline (outline pass under the fills), a real dodo read: plump blue-grey
   body, big bare-faced head, bulbous hooked beak, curly tail plume, stubby
   wing, sturdy yellow legs. The red scarf is Dennis's signature. */
var DODO_INK = "#1f2235";
function dodoBodyPath(g){
  g.beginPath();
  g.moveTo(12, -8);
  g.bezierCurveTo(17, 4, 10, 16, -4, 15);
  g.bezierCurveTo(-16, 14, -24, 7, -23, -3);
  g.bezierCurveTo(-21, -12, -9, -16, 1, -14);
  g.bezierCurveTo(6, -13, 10, -11, 12, -8);
  g.closePath();
}
function dodoHeadPath(g){ g.beginPath(); g.ellipse(15, -15, 10.5, 9.5, -0.15, 0, Math.PI*2); }
function dodoBeakPath(g, open){
  g.beginPath();
  g.moveTo(21, -20);
  g.bezierCurveTo(30, -23, 38, -19, 40, -12);   // arched upper mandible
  g.quadraticCurveTo(41, -7, 36.5, -8.2);        // the hook
  g.bezierCurveTo(33, -10.5, 27, -11.5, 22, -11);
  if(open){ g.lineTo(21, -10); }
  g.closePath();
}
function dodoJawPath(g, open){
  g.beginPath();
  if(open){
    g.moveTo(22, -10); g.quadraticCurveTo(30, -4, 34, -2.5); g.quadraticCurveTo(27, 0, 20, -5);
  } else {
    g.moveTo(22, -11); g.quadraticCurveTo(30, -9.5, 34.5, -8.5); g.quadraticCurveTo(28, -5.5, 21, -6.5);
  }
  g.closePath();
}
function tailPlume(g, fill, T, speed){
  var w = Math.sin(T*0.012)*1.2 + Math.min(3, speed*0.05);
  var puffs = [[-23,-8,4.4],[-27,-3.5,3.8],[-24.5,1.5,3.4],[-20.5,-12,3.4]];
  for(var i=0;i<puffs.length;i++){
    var p = puffs[i];
    g.beginPath(); g.arc(p[0]-w*(i%2), p[1], p[2], 0, Math.PI*2);
    if(fill) g.fill(); else g.stroke();
  }
}
function drawDodo(g, x, y, S, zoom, opts){
  opts = opts || {};
  var speed = Math.sqrt((S.vx||0)*(S.vx||0)+(S.vy||0)*(S.vy||0));
  var boosting = !!S.boosting, stalled = !!S.stalled, crashed = !!opts.crashed;
  var panic = speed > 42 || stalled;
  var gold = !!S.golden;
  var gid = S.glider||0;
  var T = Date.now();
  g.save();
  g.translate(x, y);
  g.rotate(-(S.pitch || 0));
  var sq = Math.min(0.08, speed*0.0014);            // squash & stretch with speed
  g.scale(1+sq, 1-sq*0.8);
  if(opts.crashSpin) g.rotate(opts.crashSpin);
  g.scale(zoom, zoom);
  g.lineJoin = "round"; g.lineCap = "round";

  // glider: everything behind Dennis (wings, keel, rear rigging)
  if(window.DA.drawGlider){
    try{ window.DA.drawGlider(g, gid, 1, {boosting:boosting, stalled:stalled, t:T, speed:speed, layer:"back"}); }catch(e){}
  }

  // booster flame (behind the rocket), wilder per rocket tier
  var rk = (typeof S.rocket === "number") ? S.rocket : -1;
  if(boosting && rk >= 0) drawFlame(g, rk, T);

  // sled under the feet (tiers by sled level)
  var sled = S.sledLvl||0;
  var sledCol = sled>=5 ? "#e63946" : (sled>=2 ? "#b5733f" : "#8a5a36");
  g.fillStyle = sledCol; g.strokeStyle = DODO_INK; g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(-20, 21); g.lineTo(14 + sled*0.8, 21);
  g.quadraticCurveTo(21 + sled*0.8, 21, 21 + sled*0.8, 16);
  g.lineTo(18 + sled*0.8, 16); g.quadraticCurveTo(17 + sled*0.8, 18.5, 13 + sled*0.8, 18.5);
  g.lineTo(-20, 18.5); g.closePath(); g.fill(); g.stroke();
  if(sled>=3){ g.fillStyle = "#ffd60a"; g.fillRect(-18, 19.2, 30 + sled*0.8, 1.2); }

  // legs + feet: trail back with speed, dangle when slow
  var feetBack = Math.min(7, speed*0.14);
  var swing = Math.sin(T*0.014)*1.4 + (boosting ? -1.5 : 0);
  function leg(hx, sgn, shade){
    var fx = hx - feetBack, fy = 18.5 + sgn*swing*0.35;
    g.strokeStyle = DODO_INK; g.lineWidth = 5.2;
    g.beginPath(); g.moveTo(hx, 11); g.lineTo(fx, fy); g.stroke();
    g.strokeStyle = shade; g.lineWidth = 3;
    g.beginPath(); g.moveTo(hx, 11); g.lineTo(fx, fy); g.stroke();
    g.fillStyle = shade; g.strokeStyle = DODO_INK; g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(fx-2, fy-1); g.lineTo(fx+6, fy-0.5); g.lineTo(fx+7, fy+1.2);
    g.lineTo(fx+2, fy+1.4); g.lineTo(fx-3, fy+1.2); g.closePath(); g.fill(); g.stroke();
  }
  leg(-5, -1, "#d9a13a");

  // ---- silhouette: outline pass under the fills => one merged contour ----
  g.strokeStyle = DODO_INK; g.lineWidth = 4.4;
  dodoBodyPath(g); g.stroke();
  dodoHeadPath(g); g.stroke();
  g.lineWidth = 3.6; tailPlume(g, false, T, speed);

  var plumeFill = gold ? "#fff1b8" : "#f3f0e6";
  g.fillStyle = plumeFill; tailPlume(g, true, T, speed);
  g.strokeStyle = gold ? "#d8b24a" : "#c9c4b3"; g.lineWidth = 1;
  g.beginPath(); g.arc(-26, -5, 2.4, 0.4, 3.6); g.stroke();

  var bg = g.createLinearGradient(0, -16, 0, 16);
  if(gold){ bg.addColorStop(0, "#ffe27a"); bg.addColorStop(0.55, "#f2b830"); bg.addColorStop(1, "#b77a10"); }
  else { bg.addColorStop(0, "#a9b8d8"); bg.addColorStop(0.5, "#7f90b8"); bg.addColorStop(1, "#56628a"); }
  g.fillStyle = bg; dodoBodyPath(g); g.fill();
  var hg = g.createLinearGradient(8, -25, 20, -5);
  if(gold){ hg.addColorStop(0, "#fff0a6"); hg.addColorStop(1, "#e8a820"); }
  else { hg.addColorStop(0, "#b9c6e2"); hg.addColorStop(1, "#7d8db5"); }
  g.fillStyle = hg; dodoHeadPath(g); g.fill();
  // neck seam filler (hides the head/body join)
  g.fillStyle = gold ? "#f4c040" : "#8d9dc3";
  g.beginPath(); g.ellipse(9, -9.5, 5, 4.2, -0.5, 0, Math.PI*2); g.fill();

  // rocket hardware strapped on the back (over the body, under the wing)
  if(rk >= 0 && window.DA.drawRocket){
    try{ window.DA.drawRocket(g, rk, 1, {firing: boosting, t:T}); }catch(e){}
  }

  // belly + soft rim light
  g.fillStyle = gold ? "rgba(255,248,214,0.9)" : "rgba(238,232,214,0.95)";
  g.beginPath(); g.ellipse(2, 7, 11, 6.5, -0.12, 0, Math.PI*2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.45)";
  g.beginPath(); g.ellipse(-8, -9, 8, 2.6, -0.28, 0, Math.PI*2); g.fill();

  // scarf: knot at the neck + two tails streaming back
  var scCol = gold ? "#ffd60a" : "#e63946", scDk = gold ? "#a86b00" : "#9d0208";
  var flow = Math.min(1, speed/40);
  for(var tIdx=0; tIdx<2; tIdx++){
    var len = 14 + flow*16 - tIdx*4, ph = T*0.02 + tIdx*1.3;
    g.strokeStyle = scDk; g.lineWidth = 6.2 - tIdx;
    g.beginPath(); g.moveTo(6, -9);
    var px = 6, py = -9;
    for(var k=1;k<=4;k++){
      var nx = 6 - len*k/4, ny = -9 - tIdx*1.5 + Math.sin(ph - k*0.9)*(1.2 + flow*1.8)*k*0.5 - (1-flow)*k*1.2;
      g.quadraticCurveTo(px - len/8, py, nx, ny); px = nx; py = ny;
    }
    g.stroke();
    g.strokeStyle = scCol; g.lineWidth = 4 - tIdx;
    g.stroke();
  }
  g.fillStyle = scCol; g.strokeStyle = scDk; g.lineWidth = 1.4;
  g.beginPath(); g.ellipse(9, -8.5, 6.5, 3.6, -0.35, 0, Math.PI*2); g.fill(); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.beginPath(); g.ellipse(8, -10, 3.5, 1, -0.35, 0, Math.PI*2); g.fill();

  // near wing: bare Dennis flaps like mad, geared Dennis tucks + flutters
  var flap = (gid === 0) ? Math.sin(T*0.05)*0.9 - 0.2
    : (stalled ? Math.sin(T*0.03)*0.5 : Math.sin(T*0.01)*0.08 + (boosting ? 0.25 : 0));
  g.save();
  g.translate(-1, -5); g.rotate(-flap);
  var wg = g.createLinearGradient(0, -2, 0, 10);
  wg.addColorStop(0, gold ? "#f6c843" : "#6f80a8"); wg.addColorStop(1, gold ? "#b47a10" : "#48547a");
  g.fillStyle = wg; g.strokeStyle = DODO_INK; g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(2, -2); g.bezierCurveTo(-6, -4, -16, 0, -17, 7);
  g.lineTo(-13, 6); g.lineTo(-12, 9.5); g.lineTo(-8, 7.5); g.lineTo(-5, 10);
  g.bezierCurveTo(0, 8, 4, 3, 2, -2);
  g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = "rgba(20,24,40,0.35)"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(-3, 1); g.lineTo(-10, 5); g.moveTo(-1, 4); g.lineTo(-6, 8); g.stroke();
  g.restore();

  leg(4, 1, "#f2bb4a");

  // ---- face ----
  g.fillStyle = gold ? "#fff4cf" : "#e8dcc2";        // bare face patch
  g.beginPath(); g.ellipse(19.5, -16.5, 6.4, 5.4, -0.2, 0, Math.PI*2); g.fill();
  var eyeR = panic ? 4.8 : 4.1;
  g.fillStyle = "#ffffff"; g.strokeStyle = DODO_INK; g.lineWidth = 1.5;
  g.beginPath(); g.arc(19.5, -17, eyeR, 0, Math.PI*2); g.fill(); g.stroke();
  if(crashed){
    g.strokeStyle = DODO_INK; g.lineWidth = 2;
    g.beginPath(); g.moveTo(17, -19.5); g.lineTo(22, -14.5); g.moveTo(22, -19.5); g.lineTo(17, -14.5); g.stroke();
  } else {
    var look = Math.max(-1.6, Math.min(1.6, -(S.vy||0)*0.05));
    var pup = stalled ? 1.5 : (panic ? 2.1 : 2.4);
    g.fillStyle = "#14141f";
    g.beginPath(); g.arc(20.6, -17 + look, pup, 0, Math.PI*2); g.fill();
    g.fillStyle = "#ffffff";
    g.beginPath(); g.arc(21.4, -18 + look, 0.9, 0, Math.PI*2); g.fill();
    // eyelid: determined half-lid when cruising, wide open when panicking
    if(!panic){
      g.fillStyle = gold ? "#f0c24a" : "#8d9dc3"; g.strokeStyle = DODO_INK; g.lineWidth = 1.3;
      g.beginPath(); g.arc(19.5, -17, eyeR+0.2, Math.PI*1.08, Math.PI*1.92); g.closePath(); g.fill(); g.stroke();
    }
  }
  // brow
  g.strokeStyle = DODO_INK; g.lineWidth = 2.2;
  g.beginPath();
  if(panic){ g.moveTo(15, -24.5); g.quadraticCurveTo(19.5, -26.5, 24, -23.5); }
  else { g.moveTo(15, -22.5); g.lineTo(24, -23.5); }
  g.stroke();
  if(stalled){ // sweat drop
    g.fillStyle = "#90e0ef"; g.strokeStyle = "#3a86a8"; g.lineWidth = 1;
    var swy = Math.sin(T*0.01)*1.5;
    g.beginPath(); g.moveTo(9, -28+swy); g.quadraticCurveTo(12, -23+swy, 9, -22+swy); g.quadraticCurveTo(6, -23+swy, 9, -28+swy); g.fill(); g.stroke();
  }

  // beak: bulbous hooked dodo beak; jaw drops open (shouting) when boosting
  var open = boosting || panic;
  if(open){
    g.fillStyle = "#7f1d1d";
    g.beginPath(); g.moveTo(21, -11); g.lineTo(33, -8); g.lineTo(30, -4); g.lineTo(21, -6); g.closePath(); g.fill();
  }
  g.strokeStyle = DODO_INK; g.lineWidth = 1.7;
  var jg = g.createLinearGradient(20, 0, 35, 0);
  jg.addColorStop(0, "#e5b44a"); jg.addColorStop(1, "#c77d1e");
  g.fillStyle = jg; dodoJawPath(g, open); g.fill(); g.stroke();
  var bkg = g.createLinearGradient(20, -22, 41, -8);
  bkg.addColorStop(0, "#f7d774"); bkg.addColorStop(0.65, "#f0b440"); bkg.addColorStop(1, "#c46a17");
  g.fillStyle = bkg; dodoBeakPath(g, open); g.fill(); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.55)";
  g.beginPath(); g.ellipse(28, -18.5, 5, 1.3, -0.12, 0, Math.PI*2); g.fill();
  g.strokeStyle = "rgba(60,30,0,0.55)"; g.lineWidth = 1.1;      // nostril
  g.beginPath(); g.moveTo(26.5, -16.5); g.lineTo(29.5, -16); g.stroke();

  // aviator goggles for aero builds (rest on the forehead when calm)
  var aero = S.aeroLvl||0;
  if(aero>0){
    var gy2 = panic ? -17 : -24;
    g.strokeStyle = "#3a2200"; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(6, -18); g.quadraticCurveTo(12, gy2-3, 16, gy2); g.stroke();
    g.fillStyle = "rgba(140,210,245,0.85)"; g.strokeStyle = "#6b4226"; g.lineWidth = 2;
    g.beginPath(); g.ellipse(19.5, gy2, 5, 3.6, 0, 0, Math.PI*2); g.fill(); g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(17.3, gy2-1.6); g.lineTo(19, gy2+1.5); g.stroke();
  }

  // glider rigging in front of Dennis (control bar, straps, strings)
  if(window.DA.drawGlider){
    try{ window.DA.drawGlider(g, gid, 1, {boosting:boosting, stalled:stalled, t:T, speed:speed, layer:"front"}); }catch(e){}
  }

  // crash: orbiting stars
  if(crashed){
    g.fillStyle = "#ffd60a"; g.strokeStyle = "#8a5a00"; g.lineWidth = 0.8;
    for(var si=0; si<3; si++){
      var sa = T*0.005 + si*2.094;
      starPath(g, 14 + Math.cos(sa)*14, -30 + Math.sin(sa)*4.5, 3.2);
      g.fill(); g.stroke();
    }
  }
  // speed ticks behind the bird
  if(boosting || speed > 48){
    g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 1.8;
    for(var mi=0; mi<3; mi++){
      var my = -12 + mi*9 + Math.sin(T*0.03+mi)*1.5;
      var mx = -34 - mi*7 - Math.random()*5;
      g.beginPath(); g.moveTo(mx, my); g.lineTo(mx-12, my); g.stroke();
    }
  }
  g.restore();
}
function starPath(g, cx, cy, r){
  g.beginPath();
  for(var i=0;i<10;i++){
    var a = -Math.PI/2 + i*Math.PI/5, rr3 = (i%2) ? r*0.45 : r;
    var px = cx + Math.cos(a)*rr3, py = cy + Math.sin(a)*rr3;
    if(i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath();
}
/* layered teardrop flame out of the rocket nozzle (local -x = backwards) */
function drawFlame(g, rk, T){
  var nz = (window.DA.rocketNozzles && window.DA.rocketNozzles(rk)) || [[-31, -3, 1]];
  for(var i=0;i<nz.length;i++){
    var n = nz[i], big = n[2];
    var L = (18 + Math.random()*12) * big * (1 + rk*0.18), Wd = 4.2*big;
    var x0 = n[0], y0 = n[1];
    var layers = [["rgba(255,120,20,0.55)", 1.35, 1.2],["#ff8c1a", 1, 1],["#ffd23f", 0.68, 0.72],["#fffbe0", 0.36, 0.45]];
    for(var l=0;l<layers.length;l++){
      var c = layers[l], len = L*c[1], w = Wd*c[2];
      g.fillStyle = c[0];
      g.beginPath();
      g.moveTo(x0, y0 - w);
      g.quadraticCurveTo(x0 - len*0.55, y0 - w*1.1, x0 - len, y0 + Math.sin(T*0.05+i)*1.2);
      g.quadraticCurveTo(x0 - len*0.55, y0 + w*1.1, x0, y0 + w);
      g.closePath(); g.fill();
    }
  }
}

window.DA = window.DA || {};
window.DA.World = { drawScene:drawScene, drawDodo:drawDodo, groundY:groundY, isWater:isWater, skyColors:skyColors,
  setRampLevel:setRampLevel, rampY:rampY, rampSlopeY:rampSlopeY, rampLipY:rampLipY, rampExitAngle:rampExitAngle,
  ISLANDS:ISLANDS, islandH:islandH,
  PPM:PPM };
})();
