/* Dodo Airways world renderer — cartoon Flash-game aesthetic, all procedural.
   RENDER SCALE: physics lives in meters; drawing uses PIXELS_PER_METER.
     screenX = (worldX - cam.x) * PPM * zoom
     screenY = H*0.80 - (worldY - cam.y) * PPM * zoom
   Dennis himself is drawn in screen px (readable star), everything else in
   world meters so speed reads as rushing scenery, not a map. */
(function(){
"use strict";

var PPM = 5; // screen pixels per world meter at zoom 1 (tuned: launch ~140px/s)

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
  // snow caps on tall peaks
  g.fillStyle = hazy ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.9)";
  for(var sx2=0; sx2<=W+24; sx2+=24){
    var ph2 = cam.x*par*PPM + sx2;
    var h2 = (Math.sin(ph2*0.006+seed)*0.5+0.5)*amp + (Math.sin(ph2*0.017+seed*2)*0.5+0.5)*amp*0.5;
    if(h2 > amp*0.70) g.fillRect(sx2-9, horizon-h2, 18, 8);
  }
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
function groundY(x){
  if(x < 140) return rampY(x);
  return Math.sin(x*0.01)*1.2 + Math.sin(x*0.043)*0.5;
}
function isWater(x){ return x > 500; }

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

  // shoreline foam + sign
  var shx = SX(500);
  if(shx > -80 && shx < W+80){
    var shy = SY(groundY(500));
    var tt = Date.now()*0.003;
    g.save();
    for(var f=0; f<3; f++){
      g.strokeStyle = "rgba(255,255,255,"+(0.75-f*0.2)+")";
      g.lineWidth = 3-f*0.7;
      g.beginPath();
      g.moveTo(shx-40, shy+6+f*7+Math.sin(tt+f)*2);
      g.quadraticCurveTo(shx, shy-2+f*7+Math.sin(tt+f+1)*2, shx+40, shy+6+f*7);
      g.stroke();
    }
    drawSign(g, shx-70, shy-46*zoom, "SEA →", zoom);
    g.restore();
  }

  drawDetails(g, SX, SY, cam, W, H, zoom, S);

  // milestone plaques
  var MS = window.DA.MILESTONES;
  g.textAlign = "center";
  for(var i=0;i<MS.length;i++){
    var mx = MS[i].d, msx = SX(mx);
    if(msx < -160 || msx > W+160) continue;
    var msy = SY(groundY(mx));
    g.save();
    g.strokeStyle = "#4a3728"; g.lineWidth = 5;
    g.beginPath(); g.moveTo(msx, msy); g.lineTo(msx, msy-64); g.stroke();
    g.fillStyle = i===0 ? "#e63946" : "#ffb703";
    rr(g, msx, msy-92, 52, 30, 6); g.fill();
    g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 2; g.stroke();
    g.fillStyle = "#3a2200"; g.font = "bold 12px sans-serif";
    g.fillText(fmtM(mx), msx+26, msy-73);
    g.fillStyle = "#fff"; g.font = "12px sans-serif";
    g.fillText(stripEmoji(MS[i].label), msx+26, msy-98);
    g.restore();
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
      var psz = (pp.shrink ? pp.size*pt + 0.5 : pp.size) * PPM * zoom * 0.55;
      if(psz < 1) psz = 1;
      g.fillRect(psx-psz/2, psy-psz/2, psz, psz);
    }
    g.globalAlpha = 1;
  }

  // Dennis — drawn in screen px at his own decoupled scale
  var ps = opts.playerScale || zoom;
  drawDodo(g, SX(S.x), SY(S.y), S, ps, opts);
}

function fmtM(m){ return m>=1000 ? (m/1000).toFixed(m>=10000?0:1)+"km" : m+"m"; }

/* ---------------- terrain: snow + water ---------------- */
function drawTerrain(g, W, H, cam, zoom, SX, SY, overWater, S){
  var step = 12;
  // snow base (also under water region; water paints over it)
  g.save();
  g.beginPath();
  g.moveTo(-12, H+12);
  for(var sx=0; sx<=W+12; sx+=step){
    var wx = cam.x + sx/(PPM*zoom);
    g.lineTo(sx, SY(groundY(wx)));
  }
  g.lineTo(W+12, H+12);
  g.closePath();
  var sg = g.createLinearGradient(0, H*0.45, 0, H);
  if(!overWater && S.x < 620){ sg.addColorStop(0, "#f7faff"); sg.addColorStop(1, "#b7c9e4"); }
  else { sg.addColorStop(0, "#d8e7f7"); sg.addColorStop(1, "#9db9d9"); }
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

  // ---- water: alive layered ocean over x>500 ----
  var waterSX = SX(Math.max(cam.x, 500));
  if(waterSX < W+40){
    g.save();
    g.beginPath();
    g.moveTo(Math.max(0, waterSX), H+12);
    for(var wx2=Math.max(0,waterSX); wx2<=W+12; wx2+=step){
      var wxx = cam.x + wx2/(PPM*zoom);
      g.lineTo(wx2, SY(groundY(wxx)));
    }
    g.lineTo(W+12, H+12);
    g.closePath();
    var wg = g.createLinearGradient(0, H*0.55, 0, H);
    wg.addColorStop(0, "#4aa3df"); wg.addColorStop(0.35, "#2b7fc4"); wg.addColorStop(1, "#0b3d75");
    g.fillStyle = wg; g.fill();
    g.clip();
    // animated wave rows
    var wt = Date.now()*0.0022;
    for(var row=0; row<3; row++){
      g.strokeStyle = "rgba(255,255,255,"+(0.55-row*0.14)+")";
      g.lineWidth = 3-row*0.6;
      g.beginPath();
      var baseY = H*0.80 + 14 + row*22 - (0 - cam.y)*PPM*zoom*0; // screen-locked rows
      for(var px2=Math.max(0,waterSX)-20; px2<=W+20; px2+=16){
        var phw = (cam.x + px2/(PPM*zoom))*0.08 + wt*(1+row*0.4) + row*2;
        var py2 = baseY + Math.sin(phw)*4;
        if(px2<=Math.max(0,waterSX)-19) g.moveTo(px2, py2); else g.lineTo(px2, py2);
      }
      g.stroke();
    }
    // crest highlights + foam patches
    for(var fx2=Math.floor(x0/37)*37; fx2<x1; fx2+=37){
      if(fx2 < 510) continue;
      var fsx = SX(fx2+hash(fx2+1)*18);
      if(fsx<-60||fsx>W+60) continue;
      var fsy = SY(groundY(fx2)) + 4 + Math.sin(wt*1.3+fx2)*3;
      g.fillStyle = "rgba(255,255,255,0.5)";
      g.beginPath(); g.ellipse(fsx, fsy, (8+hash(fx2+2)*14)*zoom, 3*zoom, 0, 0, 7); g.fill();
    }
    // sun glints
    g.fillStyle = "rgba(255,246,200,0.5)";
    for(var lx=Math.floor(x0/53)*53; lx<x1; lx+=53){
      if(lx < 510) continue;
      var lsx = SX(lx+hash(lx+4)*24);
      if(lsx<-40||lsx>W+40) continue;
      var lsy = SY(groundY(lx)) + 12 + hash(lx+6)*30;
      g.globalAlpha = 0.25 + 0.25*Math.abs(Math.sin(wt*2+lx));
      g.fillRect(lsx, lsy, (3+hash(lx+8)*5)*zoom, 2*zoom);
    }
    g.globalAlpha = 1;
    g.restore();
  }
}

function drawSign(g, x, y, text, zoom){
  g.save();
  g.strokeStyle = "#5b3a29"; g.lineWidth = 3*zoom;
  g.beginPath(); g.moveTo(x, y+34*zoom); g.lineTo(x, y); g.stroke();
  g.fillStyle = "#9c6644";
  rr(g, x-4*zoom, y-16*zoom, 64*zoom, 22*zoom, 4); g.fill();
  g.strokeStyle = "#5b3a29"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#fff"; g.font = "bold "+Math.round(11*zoom+3)+"px sans-serif"; g.textAlign = "center";
  g.fillText(text, x+28*zoom, y-Math.round(1*zoom));
  g.restore();
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
  // buoys + floating ice at sea
  for(x=Math.floor(x0/30)*30; x<x1; x+=30){
    if(x < 520) continue;
    jx = x + hash(x+9)*16; sx = SX(jx); if(sx<-60||sx>W+60) continue;
    sy = SY(groundY(jx)) + Math.sin(Date.now()*0.002+x)*2*zoom;
    if(hash(x+13) < 0.55) drawBuoy(g, sx, sy, NS);
    else drawFloater(g, sx, sy, NS, x);
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
  for(var wx=Math.floor(x0/400)*400; wx<x1; wx+=400){
    var sx2 = SX(wx+hash(wx)*200), gy2 = groundY(wx);
    var sy2 = SY(gy2);
    if(sx2<-220||sx2>W+220) continue;
    if(wx+200 < 500) continue;
    var pick = pickFor(wx+200);
    if(pick) drawProp(g, sx2, sy2, pick, PPM*zoom*0.32, wx);
  }
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

/* ---------------- DENNIS the dodo: expressive cartoon star ---------------- */
function drawDodo(g, x, y, S, zoom, opts){
  var speed = Math.sqrt((S.vx||0)*(S.vx||0)+(S.vy||0)*(S.vy||0));
  var boosting = !!S.boosting, stalled = !!S.stalled;
  var panic = speed > 42 || stalled;
  g.save();
  g.translate(x, y);
  g.rotate(-(S.pitch || 0));
  // squash & stretch with speed (cartoony momentum)
  var sq = Math.min(0.10, speed*0.0018);
  g.scale(1+sq, 1-sq*0.8);
  var s = zoom;
  var crashSpin = opts.crashSpin || 0;
  if(crashSpin) g.rotate(crashSpin);
  var T = Date.now();

  // glider apparatus behind/above the body
  if(window.DA.drawGlider){
    try{ window.DA.drawGlider(g, S.glider||0, s, {boosting:boosting, stalled:stalled, t:T}); }
    catch(e){}
  }

  // booster flame (local -x = backwards along the nose), wilder per rocket
  if(boosting){
    var rk = (typeof S.rocket === "number") ? S.rocket : -1;
    var f = (16 + Math.random()*18) * (rk >= 0 ? 1 + rk*0.22 : 1);
    g.fillStyle = "rgba(255,190,11,0.9)";
    g.beginPath(); g.moveTo(-20*s, -5*s); g.lineTo(-20*s-f*s, 2*s); g.lineTo(-20*s, 9*s); g.closePath(); g.fill();
    g.fillStyle = "#fb5607";
    g.beginPath(); g.moveTo(-20*s, -1*s); g.lineTo(-20*s-f*0.6*s, 2*s); g.lineTo(-20*s, 5*s); g.closePath(); g.fill();
    g.fillStyle = "#fff3b0";
    g.beginPath(); g.moveTo(-20*s, 0.5*s); g.lineTo(-20*s-f*0.3*s, 2*s); g.lineTo(-20*s, 3.5*s); g.closePath(); g.fill();
  }

  // dangling feet (trail with speed, kick when boosting)
  var feetSwing = Math.sin(T*0.012)*2*s + (boosting ? -2*s : 0);
  var feetBack = Math.min(10, speed*0.22)*s;
  g.fillStyle = "#e36414";
  g.strokeStyle = "#9c4a00"; g.lineWidth = 1.6;
  [[-4, 12, 0],[7, 12, 1]].forEach(function(ft){
    var fx = ft[0]*s - feetBack, fy = ft[1]*s + (ft[2]? feetSwing : -feetSwing)*0.4;
    g.beginPath(); g.ellipse(fx, fy, 4.6*s, 3*s, -0.2, 0, 7); g.fill(); g.stroke();
  });

  // sled (visual tiers)
  var sled = S.sledLvl||0;
  g.fillStyle = sled>=5 ? "#e63946" : (sled>=2 ? "#9c6644" : "#7f5539");
  var sledW = 44*s + sled*2*s;
  rr(g, -24*s, 12*s, sledW, 6*s, 3*s); g.fill();
  g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 1.6; g.stroke();
  if(sled>=3){ g.fillStyle = "#ffd60a"; g.fillRect(-22*s, 12.5*s, sledW-4*s, 2*s); }
  if(sled>=6){ g.fillStyle = "#80ed99"; g.fillRect(-20*s, 17*s, 6*s, 5*s); g.fillRect(10*s, 17*s, 6*s, 5*s); }

  // equipped rocket hardware (nothing drawn when flying rocket-less)
  var rkid = (typeof S.rocket === "number") ? S.rocket : -1;
  if(rkid >= 0 && window.DA.drawRocket){
    try{ window.DA.drawRocket(g, rkid, s, {firing: boosting, t:T}); }
    catch(e){}
  }

  // tail feathers
  g.fillStyle = "#3d405b";
  g.strokeStyle = "#2b2d42"; g.lineWidth = 2;
  g.beginPath(); g.moveTo(-16*s, -4*s); g.lineTo(-29*s, -11*s); g.lineTo(-30*s, -4*s); g.lineTo(-29*s, 3*s); g.lineTo(-16*s, 2*s); g.closePath(); g.fill(); g.stroke();

  // body: cel-shaded round dodo with thick clean outline
  var bodyG = g.createLinearGradient(0,-15*s,0,14*s);
  bodyG.addColorStop(0, "#a8b2c6"); bodyG.addColorStop(0.55, "#7d8aa3"); bodyG.addColorStop(1, "#4a4e69");
  g.fillStyle = bodyG;
  g.beginPath(); g.ellipse(0, 0, 20*s, 14*s, 0, 0, 7); g.fill();
  g.strokeStyle = "#2b2d42"; g.lineWidth = 3; g.stroke();
  // belly + highlight
  g.fillStyle = "#f4f1de";
  g.beginPath(); g.ellipse(4*s, 5.5*s, 11*s, 6.5*s, 0, 0, 7); g.fill();
  g.fillStyle = "rgba(255,255,255,0.75)";
  g.beginPath(); g.ellipse(-5*s, -7*s, 7*s, 3.5*s, -0.5, 0, 7); g.fill();

  // scarf: 3 flowing segments, longer/faster with speed
  var segs = 3, scLen = Math.min(30, 10 + speed*0.45)*s;
  var scx = -15*s, scy = -8*s;
  g.fillStyle = "#e63946";
  g.strokeStyle = "#9d0208"; g.lineWidth = 1.4;
  for(var sg2=0; sg2<segs; sg2++){
    var wob = Math.sin(T*0.02 - sg2*0.9)*(2+speed*0.06)*s;
    var nx2 = scx - scLen/segs, ny2 = scy + wob*0.5 - sg2*1.2*s;
    g.lineWidth = (5.5-sg2*1.1)*s;
    g.beginPath(); g.moveTo(scx, scy); g.lineTo(nx2, ny2); g.stroke();
    scx = nx2; scy = ny2;
  }
  g.fillStyle = "#e63946"; // knot
  g.beginPath(); g.arc(-14*s, -8*s, 4*s, 0, 7); g.fill();
  g.strokeStyle = "#9d0208"; g.lineWidth = 1.4; g.stroke();

  // ---- face ----
  var eyeR = panic ? 5.8*s : 5*s;
  g.fillStyle = "#fff";
  g.beginPath(); g.arc(9*s, -5*s, eyeR, 0, 7); g.fill();
  g.strokeStyle = "#2b2d42"; g.lineWidth = 1.8; g.stroke();
  var look = Math.max(-2.4, Math.min(2.4, (S.vy||0)*0.06));
  var pup = (stalled || opts.crashed) ? 1.8*s : (panic ? 3*s : 2.2*s);
  g.fillStyle = "#14141f";
  g.beginPath(); g.arc((10+look)*s, (-5+(stalled?-1.2:0))*s, pup, 0, 7); g.fill();
  g.fillStyle = "#fff";
  g.beginPath(); g.arc((10+look)*s+0.8*s, (-5.8)*s, 0.9*s, 0, 7); g.fill(); // catchlight
  // brows: determined default, worried when fast/stalled
  g.strokeStyle = "#14141f"; g.lineWidth = 2.2*s; g.lineCap = "round";
  g.beginPath();
  if(panic || stalled){ g.moveTo(2*s,-13*s); g.lineTo(16*s,-9.5*s); }
  else { g.moveTo(3*s,-11.5*s); g.lineTo(14*s,-12.5*s); }
  g.stroke();
  if(stalled){ // sweat drop
    g.fillStyle = "#90e0ef";
    var swy = (Math.sin(T*0.01)*2-2)*s;
    g.beginPath(); g.ellipse(17*s, -14*s+swy, 2*s, 3*s, 0, 0, 7); g.fill();
  }
  // beak: closed normally, open shouting when boosting
  g.fillStyle = "#fb8500";
  g.strokeStyle = "#9c4a00"; g.lineWidth = 1.6;
  if(boosting){
    g.beginPath(); g.moveTo(15*s, -8*s); g.lineTo(30*s, -4*s); g.lineTo(16*s, -1*s); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#e36414";
    g.beginPath(); g.moveTo(15*s, 2*s); g.lineTo(28*s, 2*s); g.lineTo(16*s, 7*s); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#7f1d1d";
    g.beginPath(); g.ellipse(21*s, 0.5*s, 4.5*s, 2*s, 0, 0, 7); g.fill(); // mouth
  } else {
    g.beginPath(); g.moveTo(16*s, -6*s); g.lineTo(30*s, 0); g.lineTo(16*s, 4*s); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#e36414";
    g.beginPath(); g.moveTo(16*s, 0); g.lineTo(30*s, 0); g.lineTo(16*s, 4*s); g.closePath(); g.fill();
  }

  // aviator goggles for aero builds
  var aero = S.aeroLvl||0;
  if(aero>0){
    g.strokeStyle = "#3a2200"; g.lineWidth = 2.4*s;
    g.beginPath(); g.moveTo(-6*s, -9*s); g.quadraticCurveTo(2*s, -13*s, 12*s, -10.5*s); g.stroke(); // strap
    g.fillStyle = "rgba(140,200,240,0.85)";
    g.beginPath(); g.arc(9*s, -5.5*s, 6.4*s, 0, 7); g.fill();
    g.strokeStyle = "#5b3a29"; g.lineWidth = 2.4*s; g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 1.4*s;
    g.beginPath(); g.moveTo(5.5*s, -8*s); g.lineTo(8*s, -3.5*s); g.stroke(); // lens glint
  }

  // crash X eyes + orbiting stars
  if(opts.crashed){
    g.strokeStyle = "#14141f"; g.lineWidth = 2.6*s;
    g.beginPath();
    g.moveTo(5*s,-9*s); g.lineTo(13*s,-1*s); g.moveTo(13*s,-9*s); g.lineTo(5*s,-1*s);
    g.stroke();
    g.fillStyle = "#ffd60a";
    for(var si=0; si<3; si++){
      var sa = T*0.005 + si*2.094;
      g.beginPath();
      g.arc(Math.cos(sa)*17*s, -13*s + Math.sin(sa)*6*s, 2.6*s, 0, 7);
      g.fill();
    }
  }
  // boost motion ticks behind the bird
  if(boosting || speed > 48){
    g.strokeStyle = "rgba(255,255,255,0.65)"; g.lineWidth = 2;
    for(var mi=0; mi<3; mi++){
      var my = (-10+mi*9)*s + Math.sin(T*0.03+mi)*2;
      var mx = -30*s - mi*9*s - Math.random()*6;
      g.beginPath(); g.moveTo(mx, my); g.lineTo(mx-14*s, my); g.stroke();
    }
  }
  g.restore();
}

window.DA = window.DA || {};
window.DA.World = { drawScene:drawScene, drawDodo:drawDodo, groundY:groundY, isWater:isWater, skyColors:skyColors,
  setRampLevel:setRampLevel, rampY:rampY, rampSlopeY:rampSlopeY, rampLipY:rampLipY, rampExitAngle:rampExitAngle,
  PPM:PPM };
})();
