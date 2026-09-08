/* World rendering: sky, parallax mountains, clouds, ground/water, milestones, ramp, dodo. */
(function(){
"use strict";

function hash(n){ var x = Math.sin(n*127.1)*43758.5453; return x - Math.floor(x); }

function skyColors(dist, alt){
  // subtle shift: start cold blue -> teal -> sunset purple -> night w/ stars far away
  var t = Math.min(1, dist/30000);
  var top, bot;
  if(t < 0.33){ var k=t/0.33;
    top = mix([110,178,230],[90,200,210],k); bot = mix([227,242,253],[255,244,214],k);
  } else if(t < 0.66){ var k2=(t-0.33)/0.33;
    top = mix([90,200,210],[120,110,190],k2); bot = mix([255,244,214],[255,200,170],k2);
  } else { var k3=(t-0.66)/0.34;
    top = mix([120,110,190],[10,16,40],k3); bot = mix([255,200,170],[40,40,90],k3);
  }
  // higher altitude -> darker, richer
  var a = Math.min(1, alt/300);
  top = mix(top, [8,10,40], a*0.55);
  return { top:rgb(top), bot:rgb(bot), night:t>0.62, t:t };
}
function mix(a,b,k){ return [a[0]+(b[0]-a[0])*k, a[1]+(b[1]-a[1])*k, a[2]+(b[2]-a[2])*k]; }
function rgb(c){ return "rgb("+(c[0]|0)+","+(c[1]|0)+","+(c[2]|0)+")"; }

function groundY(x){
  // Launch hill (x<140) is the ski-jump ramp track: a Hermite curve from the
  // flat top down to the lip, whose exit tangent EXACTLY matches the launch
  // angle for the current ramp level. Past the lip: gentle dunes (~0).
  if(x < 140) return rampY(x);
  return Math.sin(x*0.01)*1.2 + Math.sin(x*0.043)*0.5;
}
function isWater(x){ return x > 500; }

/* Ramp track. The dodo rides this curve, the ramp structure is drawn along
   it, and launch velocity leaves along its exit tangent — one shared truth. */
var _rampLvl = 0;
function setRampLevel(r){ _rampLvl = Math.max(0, Math.min(8, r || 0)); }
function rampLipY(){ return window.DA.rampLipY(_rampLvl); }
function rampExitAngle(){ return window.DA.launchAngleDeg(_rampLvl) * Math.PI / 180; }
function rampY(x){
  var x0 = -60, L = 200;
  var y1 = window.DA.rampLipY(_rampLvl);
  var m1 = Math.tan(window.DA.launchAngleDeg(_rampLvl) * Math.PI / 180);
  if(x > 140) return y1 + (x - 140) * m1; // keep leaving along the exit tangent
  var t = (x - x0) / L;
  if(t < 0) t = 0;
  if(t > 1) t = 1;
  var y0 = 55;
  var m0 = -0.05;
  var t2 = t*t, t3 = t2*t;
  var h00 = 2*t3 - 3*t2 + 1, h10 = t3 - 2*t2 + t;
  var h01 = -2*t3 + 3*t2, h11 = t3 - t2;
  return h00*y0 + h10*L*m0 + h01*y1 + h11*L*m1;
}
function rampSlopeY(x){
  var e = 2;
  return (rampY(x + e) - rampY(x - e)) / (2 * e);
}

function drawBackground(g, W, H, cam, dist, alt){
  var sky = skyColors(dist, alt);
  var gr = g.createLinearGradient(0,0,0,H);
  gr.addColorStop(0, sky.top); gr.addColorStop(1, sky.bot);
  g.fillStyle = gr; g.fillRect(0,0,W,H);

  // sun/moon
  g.save();
  var sy = H*0.22 - cam.y*0.05;
  g.globalAlpha = 0.9;
  g.fillStyle = sky.night ? "#f4f1de" : "#fff3b0";
  g.beginPath(); g.arc(W*0.8, Math.max(40, H*0.2 - cam.y*0.03), sky.night?22:34, 0, 7); g.fill();
  g.globalAlpha = 0.25;
  g.beginPath(); g.arc(W*0.8, Math.max(40, H*0.2 - cam.y*0.03), sky.night?34:52, 0, 7); g.fill();
  g.restore();

  // stars far away
  if(sky.night){
    g.fillStyle = "#fff";
    var a = (sky.t-0.62)/0.38;
    g.globalAlpha = Math.min(1, a+0.2);
    for(var i=0;i<70;i++){
      var px = (hash(i)*W*1.4 - cam.x*0.02) % W; if(px<0)px+=W;
      var py = hash(i+99)*H*0.6;
      g.globalAlpha *= 1;
      g.fillRect(px, py, 2, 2);
    }
    g.globalAlpha = 1;
  }

  // parallax mountain layers
  mountainLayer(g, W, H, cam, 0.12, H*0.62, 90, "#7a8fb0", "#5d7396", 3.1);
  mountainLayer(g, W, H, cam, 0.25, H*0.70, 60, "#93a9c9", "#6d86ab", 7.7);
  mountainLayer(g, W, H, cam, 0.45, H*0.78, 34, "#b9cbe4", "#8fa6c6", 12.3);

  // clouds (world-anchored pseudo random)
  var startC = Math.floor((cam.x-200)/380);
  var endC = Math.floor((cam.x+W+200)/380);
  for(var c=startC;c<=endC;c++){
    var cx = c*380 + hash(c)*220;
    var cy = cam.y + H*0.12 + hash(c+50)*H*0.45;
    var sy2 = cam.y + H - cy; // screen y
    if(sy2 < -60 || sy2 > H+60) continue;
    var sx2 = cx - cam.x;
    var s = 0.7 + hash(c+7)*0.9;
    cloud(g, sx2, H - (cy - cam.y), s);
  }
}

function cloud(g, sx, sy, s){
  g.save();
  g.globalAlpha = 0.85;
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.ellipse(sx, sy, 46*s, 15*s, 0, 0, 7);
  g.ellipse(sx-28*s, sy+6*s, 26*s, 11*s, 0, 0, 7);
  g.ellipse(sx+28*s, sy+6*s, 28*s, 12*s, 0, 0, 7);
  g.fill();
  g.restore();
}

function mountainLayer(g, W, H, cam, par, baseY, amp, c1, c2, seed){
  g.save();
  g.beginPath();
  g.moveTo(0, H);
  var horizon = baseY + cam.y*par*0.4;
  for(var sx=0; sx<=W; sx+=24){
    var wx = cam.x*par + sx;
    var h = (Math.sin(wx*0.006+seed)*0.5+0.5)*amp + (Math.sin(wx*0.017+seed*2)*0.5+0.5)*amp*0.5;
    // snow caps: draw mountain then white tip
    g.lineTo(sx, horizon - h);
  }
  g.lineTo(W, H);
  g.closePath();
  var gr = g.createLinearGradient(0, horizon-amp*1.5, 0, H);
  gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.fill();
  // snow caps
  g.fillStyle = "rgba(255,255,255,0.85)";
  for(var sx2=0; sx2<=W; sx2+=24){
    var wx2 = cam.x*par + sx2;
    var h2 = (Math.sin(wx2*0.006+seed)*0.5+0.5)*amp + (Math.sin(wx2*0.017+seed*2)*0.5+0.5)*amp*0.5;
    if(h2 > amp*0.72){
      g.fillRect(sx2-8, horizon-h2, 16, 7);
    }
  }
  g.restore();
}

/* Full scene draw. Convention:
   screenX = (wx - cam.x)*zoom ; screenY = H*groundFrac - (wy - cam.y)*zoom
   Zoom is 1 up close, easing out slightly at high speed/altitude. */
function drawScene(g, W, H, cam, zoom, S, opts){
  drawBackground(g, W, H, cam, S.x, S.y);
  var groundFrac = 0.80;

  function SX(wx){ return (wx - cam.x)*zoom; }
  function SY(wy){ return H*groundFrac - (wy - cam.y)*zoom; }

  // distant water shimmer / snow field
  // ground fill
  g.save();
  g.beginPath();
  g.moveTo(-10, H+10);
  for(var sx=0; sx<=W+10; sx+=10){
    var wx = cam.x + sx/zoom;
    g.lineTo(sx, SY(groundY(wx)));
  }
  g.lineTo(W+10, H+10);
  g.closePath();
  var water = cam.x > 300;
  var grd = g.createLinearGradient(0, H*0.5, 0, H);
  if(!water && S.x < 600){
    grd.addColorStop(0, "#f4f8ff"); grd.addColorStop(1, "#b9cbe4");
  } else {
    // mixed: draw snow color then water overlay handled per segment below
    grd.addColorStop(0, "#cfe3f5"); grd.addColorStop(1, "#5aa9e6");
  }
  g.fillStyle = grd; g.fill();
  // water overlay for x>500 segments
  g.save();
  g.clip();
  var wg = g.createLinearGradient(0, H*0.6, 0, H);
  wg.addColorStop(0, "rgba(64,150,220,0.9)"); wg.addColorStop(1, "rgba(10,60,130,0.95)");
  g.fillStyle = wg;
  var wxWater = Math.max(cam.x, 500);
  var sxWater = SX(wxWater);
  if(sxWater < W) g.fillRect(Math.max(0,sxWater), 0, W, H);
  // snow part highlight
  g.restore();
  // shoreline foam
  if(SX(500) > -50 && SX(500) < W+50){
    g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 3;
    g.beginPath();
    for(var t=0;t<20;t++){ var wy=groundY(500)+Math.sin(t+Date.now()*0.003)*1.5; }
    g.moveTo(SX(500), SY(groundY(500)));
    g.lineTo(SX(500), SY(groundY(500))-8);
    g.stroke();
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.font = "bold 13px sans-serif"; g.textAlign="center";
    g.fillText("🏖️ shoreline", SX(500), SY(groundY(500))-34);
  }
  g.restore();

  // ground detail: trees on snow (x<500), waves/boats after
  drawDetails(g, SX, SY, cam, W, H, zoom, S);

  // milestones flags + labels
  var MS = window.DA.MILESTONES;
  g.textAlign = "center";
  for(var i=0;i<MS.length;i++){
    var mx = MS[i].d, msx = SX(mx);
    if(msx < -200 || msx > W+200) continue;
    var msy = SY(groundY(mx));
    // pole
    g.strokeStyle = "#5b3a29"; g.lineWidth = 4;
    g.beginPath(); g.moveTo(msx, msy); g.lineTo(msx, msy-70); g.stroke();
    g.fillStyle = i===0 ? "#e63946" : "#ffb703";
    g.fillRect(msx, msy-70, 46, 24);
    g.fillStyle = "#222"; g.font = "bold 11px sans-serif";
    g.fillText(fmtM(mx), msx+23, msy-54);
    g.fillStyle = "#fff"; g.font = "12px sans-serif";
    g.fillText(MS[i].label, msx+23, msy-80);
  }

  // ramp structure
  drawRamp(g, SX, SY, zoom);

  // shadow under player (helps judge landing)
  var pgy = groundY(S.x);
  var shx = SX(S.x), shy = SY(pgy);
  var hAbove = Math.max(0, S.y - pgy);
  var shScale = Math.max(0.15, 1 - hAbove/180);
  g.save();
  g.globalAlpha = 0.3*shScale;
  g.fillStyle = "#000";
  g.beginPath(); g.ellipse(shx, shy+4, 26*shScale*zoom, 6*shScale*zoom, 0, 0, 7); g.fill();
  g.restore();

  // particles in world space, mapped with the same projection
  if(opts && opts.particles && opts.particles.list){
    var pl = opts.particles.list;
    for(var pi=0; pi<pl.length; pi++){
      var pp = pl[pi];
      var psx = SX(pp.x), psy = SY(pp.y);
      if(psx<-30||psx>W+30||psy<-30||psy>H+30) continue;
      var pt = 1 - pp.age/pp.life;
      g.globalAlpha = Math.max(0, Math.min(1, pt*1.2));
      g.fillStyle = pp.color;
      var psz = (pp.shrink ? pp.size*pt + 0.5 : pp.size) * zoom;
      g.fillRect(psx-psz/2, psy-psz/2, psz, psz);
    }
    g.globalAlpha = 1;
  }

  // player dodo (drawn at its own scale so it stays readable at any zoom)
  var ps = (opts && opts.playerScale) || zoom;
  drawDodo(g, SX(S.x), SY(S.y), S, ps, opts||{});
}

function fmtM(m){ return m>=1000 ? (m/1000).toFixed(m>=10000?0:1)+"km" : m+"m"; }

function drawDetails(g, SX, SY, cam, W, H, zoom, S){
  var x0 = cam.x - 60, x1 = cam.x + W/zoom + 60;
  // pine trees before shoreline
  if(x0 < 500){
    for(var x=Math.max(-120, Math.floor(x0/90)*90); x<Math.min(500,x1); x+=90){
      var jx = x + hash(x)*40;
      var gy = groundY(jx);
      var sx = SX(jx), sy = SY(gy);
      if(sx<-40||sx>W+40) continue;
      drawPine(g, sx, sy, (0.7+hash(x+3)*0.6)*zoom);
    }
  }
  // buoys / boats / icebergs / city / etc based on world x
  for(var wx=Math.floor(x0/400)*400; wx<x1; wx+=400){
    var sx2 = SX(wx+hash(wx)*200), gy2 = groundY(wx);
    var sy2 = SY(gy2);
    if(sx2<-200||sx2>W+200) continue;
    if(wx+200 < 500) continue;
    var pick = pickFor(wx+200);
    if(pick) drawProp(g, sx2, sy2, pick, zoom, wx);
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
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.beginPath(); g.moveTo(x-7*s, y-14*s-30*s); g.lineTo(x, y-14*s-38*s); g.lineTo(x+7*s, y-14*s-30*s); g.closePath(); g.fill();
}
function drawProp(g, x, y, kind, zoom, seed){
  g.save();
  var bob = Math.sin(Date.now()*0.002 + seed)*3;
  if(kind==="boat"){
    y += bob;
    g.fillStyle = "#8d0801"; g.fillRect(x-26*zoom, y-14*zoom, 52*zoom, 12*zoom);
    g.fillStyle = "#fff"; g.fillRect(x-14*zoom, y-26*zoom, 22*zoom, 12*zoom);
    g.fillStyle = "#001219"; g.font = (12*zoom+8)+"px sans-serif"; g.textAlign="center";
    g.fillText("🎣", x, y-26*zoom);
  } else if(kind==="ice"){
    g.fillStyle = "rgba(220,240,255,0.95)";
    g.beginPath(); g.moveTo(x-34*zoom, y); g.lineTo(x-10*zoom, y-44*zoom); g.lineTo(x+12*zoom, y-20*zoom); g.lineTo(x+34*zoom, y); g.closePath(); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.moveTo(x-10*zoom, y-44*zoom); g.lineTo(x-2*zoom, y-34*zoom); g.lineTo(x-18*zoom, y-32*zoom); g.closePath(); g.fill();
    g.fillStyle = "#001219"; g.font = (14*zoom+6)+"px sans-serif"; g.textAlign="center";
    g.fillText("🐧", x+10*zoom, y-8);
  } else if(kind==="whale"){
    y += bob*1.5;
    g.font = (34*zoom+10)+"px sans-serif"; g.textAlign="center";
    g.fillText("🐋", x, y-4);
  } else if(kind==="city"){
    g.fillStyle = "#22333b";
    for(var i=0;i<4;i++){ var bw=18*zoom, bh=(30+hash(seed+i)*50)*zoom;
      g.fillRect(x-40*zoom+i*22*zoom, y-bh, bw, bh); }
    g.fillStyle = "#ffe66d";
    for(var w2=0;w2<12;w2++){ g.fillRect(x-38*zoom+hash(seed+w2)*76*zoom, y-10-hash(seed+w2+9)*60*zoom, 3, 3); }
  } else if(kind==="mountain"){
    g.fillStyle = "#5c677d";
    g.beginPath(); g.moveTo(x-60*zoom, y); g.lineTo(x, y-110*zoom); g.lineTo(x+60*zoom, y); g.closePath(); g.fill();
    g.fillStyle = "#fff";
    g.beginPath(); g.moveTo(x-18*zoom, y-74*zoom); g.lineTo(x, y-110*zoom); g.lineTo(x+18*zoom, y-74*zoom); g.lineTo(x+8*zoom, y-66*zoom); g.lineTo(x-8*zoom, y-70*zoom); g.closePath(); g.fill();
  } else if(kind==="castle"){
    g.fillStyle = "#6d597a";
    g.fillRect(x-34*zoom, y-50*zoom, 68*zoom, 50*zoom);
    g.fillRect(x-34*zoom, y-66*zoom, 12*zoom, 20*zoom);
    g.fillRect(x+22*zoom, y-66*zoom, 12*zoom, 20*zoom);
    g.font = (20*zoom+6)+"px sans-serif"; g.textAlign="center"; g.fillText("🚩", x, y-66*zoom);
  } else if(kind==="volcano"){
    g.fillStyle = "#4a4e69";
    g.beginPath(); g.moveTo(x-55*zoom, y); g.lineTo(x-15*zoom, y-90*zoom); g.lineTo(x+15*zoom, y-90*zoom); g.lineTo(x+55*zoom, y); g.closePath(); g.fill();
    g.fillStyle = "#ff5400";
    g.beginPath(); g.moveTo(x-15*zoom, y-90*zoom); g.lineTo(x+15*zoom, y-90*zoom); g.lineTo(x+8*zoom, y-70*zoom); g.lineTo(x-8*zoom, y-70*zoom); g.closePath(); g.fill();
    g.fillStyle = "rgba(120,120,120,0.7)";
    g.beginPath(); g.ellipse(x, y-110*zoom, 12*zoom, 8*zoom, 0, 0, 7); g.fill();
  } else if(kind==="statue"){
    g.fillStyle = "#8d99ae";
    g.fillRect(x-8*zoom, y-60*zoom, 16*zoom, 60*zoom);
    g.font = (36*zoom+8)+"px sans-serif"; g.textAlign="center";
    g.fillText("🐤", x, y-58*zoom);
  } else if(kind==="ufo"){
    var fy = y-90*zoom + Math.sin(Date.now()*0.003+seed)*8;
    g.fillStyle = "rgba(180,255,200,0.5)";
    g.beginPath(); g.ellipse(x, fy+16*zoom, 26*zoom, 22*zoom, 0, 0, 7); g.fill();
    g.fillStyle = "#adb5bd";
    g.beginPath(); g.ellipse(x, fy, 30*zoom, 10*zoom, 0, 0, 7); g.fill();
    g.fillStyle = "#80ed99";
    for(var l=0;l<4;l++){ g.beginPath(); g.arc(x-18*zoom+l*12*zoom, fy+2*zoom, 3*zoom, 0, 7); g.fill(); }
  } else if(kind==="moon"){
    g.font = "40px sans-serif"; g.textAlign="center";
    g.fillText("🌙", x, y-70*zoom);
    g.fillText("🐄", x+40*zoom, y-40*zoom);
  }
  g.restore();
}

function drawRamp(g, SX, SY, zoom){
  // wooden ramp from x=-60 (high) to x=140 (lip)
  var pts = [];
  for(var x=-60; x<=140; x+=10) pts.push([SX(x), SY(groundY(x)+2)]);
  g.save();
  g.lineCap = "round";
  // supports
  g.strokeStyle = "#5b3a29"; g.lineWidth = 6*zoom;
  for(var x2=-40; x2<=120; x2+=40){
    g.beginPath(); g.moveTo(SX(x2), SY(groundY(x2))); g.lineTo(SX(x2), SY(groundY(x2))+46*zoom); g.stroke();
  }
  // ramp surface
  g.strokeStyle = "#9c6644"; g.lineWidth = 10*zoom;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for(var i=1;i<pts.length;i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke();
  g.strokeStyle = "#e9c46a"; g.lineWidth = 3*zoom;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]-4); 
  for(var j=1;j<pts.length;j++) g.lineTo(pts[j][0], pts[j][1]-4);
  g.stroke();
  // start banner
  g.fillStyle = "#e63946";
  var bx = SX(-60), by = SY(groundY(-60)+2);
  g.fillRect(bx-6, by-64, 12, 40);
  g.fillStyle = "#fff"; g.font = "bold 11px sans-serif"; g.textAlign="center";
  g.fillText("START", bx+34, by-44);
  g.restore();
}

/* Dennis the dodo. S.pitch is the ONE authoritative angle (radians, +up):
   the body rotates to exactly that, so the beak shows where thrust goes. */
function drawDodo(g, x, y, S, zoom, opts){
  g.save();
  g.translate(x, y);
  g.rotate(-(S.pitch || 0));
  var s = zoom * (1 + Math.min(0.35, (S.wingsLvl||0)*0.03));
  var crashSpin = opts.crashSpin || 0;
  if(crashSpin) g.rotate(crashSpin);

  // booster flame: points backwards along the nose (-nose vector)
  if(S.boosting){
    var f = 14 + Math.random()*16;
    g.fillStyle = "#ffbe0b";
    g.beginPath(); g.moveTo(-22*s, -4*s); g.lineTo(-22*s-f*s, 2*s); g.lineTo(-22*s, 8*s); g.closePath(); g.fill();
    g.fillStyle = "#fb5607";
    g.beginPath(); g.moveTo(-22*s, -1*s); g.lineTo(-22*s-f*0.55*s, 2*s); g.lineTo(-22*s, 5*s); g.closePath(); g.fill();
  }

  // sled (visual tiers)
  var sled = S.sledLvl||0;
  g.fillStyle = sled>=5 ? "#e63946" : (sled>=2 ? "#9c6644" : "#7f5539");
  var sledW = 44*s + sled*2*s;
  g.fillRect(-24*s, 12*s, sledW, 6*s);
  if(sled>=3){ g.fillStyle = "#ffd60a"; g.fillRect(-24*s, 12*s, sledW, 2*s); }
  if(sled>=6){ g.fillStyle = "#80ed99"; g.fillRect(-20*s, 16*s, 6*s, 6*s); g.fillRect(10*s, 16*s, 6*s, 6*s); }
  else { g.fillStyle = "#333"; g.fillRect(-18*s, 17*s, 5*s, 5*s); g.fillRect(8*s, 17*s, 5*s, 5*s); }

  // booster rocket visual tiers
  var bl = S.boosterLvl||0;
  if(bl>0){
    g.fillStyle = bl>=5 ? "#e63946" : "#adb5bd";
    g.fillRect(-26*s, -6*s, 8*s, 10*s);
    g.fillStyle = "#fff"; g.fillRect(-26*s, -6*s, 8*s, 3*s);
    if(bl>=7){ g.fillStyle="#ffbe0b"; g.fillRect(-28*s,-8*s,3*s,14*s); }
  }

  // wings (size by level)
  var wl = S.wingsLvl||0;
  var wingLen = (20 + wl*5)*s, wingW = (10 + wl*1.2)*s;
  var flap = Math.sin(Date.now()*0.02)* (S.boosting?6:3);
  if(S.stalled) flap = Math.sin(Date.now()*0.06)*10;
  g.fillStyle = wl>=6 ? "#90be6d" : (wl>=3 ? "#e9c46a" : "#c9ada7");
  g.strokeStyle = "rgba(0,0,0,0.3)"; g.lineWidth = 2;
  g.save();
  g.translate(2*s, -6*s); g.rotate((-0.25 + flap*0.02));
  g.beginPath(); g.ellipse(0, -wingLen/2, wingW/2, wingLen/2, 0, 0, 7); g.fill(); g.stroke();
  g.restore();

  // body (round dodo)
  var bodyG = g.createLinearGradient(0,-16*s,0,14*s);
  bodyG.addColorStop(0, "#8d99ae"); bodyG.addColorStop(1, "#495057");
  g.fillStyle = bodyG;
  g.beginPath(); g.ellipse(0, 0, 20*s, 14*s, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 2; g.stroke();

  // belly
  g.fillStyle = "#edf2f4";
  g.beginPath(); g.ellipse(4*s, 5*s, 11*s, 7*s, 0, 0, 7); g.fill();

  // tail
  g.fillStyle = "#495057";
  g.beginPath(); g.moveTo(-18*s, -2*s); g.lineTo(-28*s, -8*s); g.lineTo(-26*s, 2*s); g.closePath(); g.fill();

  // eye (panics at speed / stall)
  var speed = Math.sqrt((S.vx||0)*(S.vx||0)+(S.vy||0)*(S.vy||0));
  var eyeR = 5*s;
  g.fillStyle = "#fff"; g.beginPath(); g.arc(9*s, -5*s, eyeR, 0, 7); g.fill();
  g.fillStyle = "#111";
  var look = Math.max(-2, Math.min(2, (S.vy||0)*0.05));
  var wide = speed>35 ? 1.4 : 1;
  g.beginPath(); g.arc((10+look)*s, (-5+ (S.stalled? -1:0))*s, 2.2*s*wide, 0, 7); g.fill();
  if(speed>40 || S.stalled){ // worried brow
    g.strokeStyle="#111"; g.lineWidth=2*s;
    g.beginPath(); g.moveTo(3*s,-12*s); g.lineTo(15*s,-10*s); g.stroke();
  }

  // big dodo beak
  g.fillStyle = "#fb8500";
  g.beginPath(); g.moveTo(16*s, -6*s); g.lineTo(30*s, 0); g.lineTo(16*s, 4*s); g.closePath(); g.fill();
  g.fillStyle = "#e36414";
  g.beginPath(); g.moveTo(16*s, 0); g.lineTo(30*s, 0); g.lineTo(16*s, 4*s); g.closePath(); g.fill();
  // scarf flows with speed
  var sc = Math.min(26, 8 + speed*0.5);
  g.fillStyle = "#e63946";
  g.beginPath(); g.moveTo(-14*s, -8*s); g.quadraticCurveTo(-14*s-sc*s, -10*s+Math.sin(Date.now()*0.02)*4, -16*s-sc*s, -4*s); g.lineTo(-14*s, -2*s); g.closePath(); g.fill();

  // helmet pointiness by aero
  var aero = S.aeroLvl||0;
  if(aero>0){
    g.fillStyle = "#219ebc";
    g.beginPath(); g.moveTo(-2*s, -13*s); g.lineTo((4+aero*2.2)*s, -13*s); g.lineTo((-2+aero*1.1)*s, (-20-aero*1.2)*s); g.closePath(); g.fill();
  }

  // crash X eyes + orbiting stars
  if(opts.crashed){
    g.strokeStyle = "#111"; g.lineWidth = 2.5*s;
    g.beginPath();
    g.moveTo(5*s,-9*s); g.lineTo(13*s,-1*s); g.moveTo(13*s,-9*s); g.lineTo(5*s,-1*s);
    g.stroke();
    g.fillStyle = "#ffd60a";
    var now = Date.now()*0.005;
    for(var si=0; si<3; si++){
      var sa = now + si*2.094;
      g.beginPath();
      g.arc(Math.cos(sa)*17*s, -13*s + Math.sin(sa)*6*s, 2.6*s, 0, 7);
      g.fill();
    }
  }
  g.restore();
}

window.DA = window.DA || {};
window.DA.World = { drawScene:drawScene, drawDodo:drawDodo, groundY:groundY, isWater:isWater, skyColors:skyColors,
  setRampLevel:setRampLevel, rampY:rampY, rampSlopeY:rampSlopeY, rampLipY:rampLipY, rampExitAngle:rampExitAngle };
})();
