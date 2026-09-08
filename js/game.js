/* Game core: state machine, loop, input, camera, crash, economy hooks. */
(function(){
"use strict";

var Game = {
  phase: "menu", // menu | ramp | fly | crashed | results | shop...
  S: null,       // flight state {x,y,vx,vy,pitch,fuel,airTime,...}
  P: null,       // derived params from upgrades
  rampT: 0, rampDur: 2.2,
  cam: { x:-120, y:0 },
  shake: 0,
  crashTimer: 0, crashSpin: 0, crashedInfo: null,
  input: { up:false, down:false, boost:false },
  runStats: null,
  raf: 0, lastT: 0,
  paused: false,
  milestonesHit: {},
  countdownT: 0,
  save: null,
  particles: null,
  canvas: null, g: null, W: 0, H: 0,
  zoom: 1,
  bestBeaten: false,
  stallWarned: false
};

function derivedParams(up){
  var DA = window.DA;
  return {
    lift: DA.liftCoef(up.wings),
    drag: DA.dragCoef(up.aero),
    thrust: DA.boosterThrust(up.booster),
    fuelMax: DA.fuelTime(up.fuel),
    sink: DA.sinkMult(up.wings),
    launchSpeed: DA.launchSpeed(up.ramp, up.sled),
    launchAngle: DA.launchAngleDeg(up.ramp) * Math.PI/180
  };
}

function init(canvas, save, particles){
  Game.canvas = canvas; Game.g = canvas.getContext("2d");
  Game.save = save; Game.particles = particles;
  resize();
  window.addEventListener("resize", resize);
  bindInput();
  document.addEventListener("visibilitychange", function(){
    if(document.hidden && (Game.phase==="ramp"||Game.phase==="fly")) pause(true);
  });
  window.addEventListener("blur", function(){
    if(Game.phase==="ramp"||Game.phase==="fly") pause(true);
  });
}

function resize(){
  var dpr = Math.min(2, window.devicePixelRatio||1);
  Game.W = window.innerWidth; Game.H = window.innerHeight;
  Game.canvas.width = Math.floor(Game.W*dpr);
  Game.canvas.height = Math.floor(Game.H*dpr);
  Game.canvas.style.width = Game.W+"px";
  Game.canvas.style.height = Game.H+"px";
  Game.g.setTransform(dpr,0,0,dpr,0,0);
}

function bindInput(){
  window.addEventListener("keydown", function(e){
    if(e.repeat){ if(isFlyKey(e.code)) e.preventDefault(); return; }
    if(e.code==="ArrowLeft"||e.code==="KeyA") Game.input.up = true;
    else if(e.code==="ArrowRight"||e.code==="KeyD") Game.input.down = true;
    else if(e.code==="Space"){ Game.input.boost = true; e.preventDefault(); }
    else if(e.code==="KeyP"||e.code==="Escape"){
      if(Game.phase==="fly"||Game.phase==="ramp") pause(!Game.paused);
    } else if(e.code==="Enter"){
      if(window.DA.UI) window.DA.UI.enterPressed();
    }
    if(isFlyKey(e.code)) e.preventDefault();
    window.DA.Audio.ensure();
  });
  window.addEventListener("keyup", function(e){
    if(e.code==="ArrowLeft"||e.code==="KeyA") Game.input.up = false;
    else if(e.code==="ArrowRight"||e.code==="KeyD") Game.input.down = false;
    else if(e.code==="Space") Game.input.boost = false;
  });
  // touch buttons
  function hold(id, prop){
    var el = document.getElementById(id);
    if(!el) return;
    var on = function(e){ e.preventDefault(); Game.input[prop]=true; window.DA.Audio.ensure(); };
    var off = function(e){ e.preventDefault(); Game.input[prop]=false; };
    el.addEventListener("pointerdown", on);
    el.addEventListener("pointerup", off);
    el.addEventListener("pointercancel", off);
    el.addEventListener("pointerleave", off);
  }
  hold("tc-up","up"); hold("tc-down","down"); hold("tc-boost","boost");
}
function isFlyKey(c){ return c==="ArrowLeft"||c==="ArrowRight"||c==="KeyA"||c==="KeyD"||c==="Space"; }

function startRun(){
  var up = Game.save.upgrades;
  Game.P = derivedParams(up);
  Game.S = {
    x: -60, y: window.DA.World.groundY(-60)+2,
    vx: 0, vy: 0, pitch: 0, speed: 0,
    fuel: Game.P.fuelMax, fuelMax: Game.P.fuelMax,
    airTime: 0,
    sledLvl: up.sled, wingsLvl: up.wings, boosterLvl: up.booster, aeroLvl: up.aero,
    boosting: false, stalled: false
  };
  Game.rampT = 0;
  Game.rampDur = Math.max(1.4, 2.4 - up.sled*0.09);
  Game.phase = "ramp";
  Game.paused = false;
  Game.runStats = { dist:0, maxAlt:0, maxSpeedKmh:0, airTime:0, usedAllFuel:false, maxSpeed:0 };
  Game.milestonesHit = {};
  Game.bestBeaten = false;
  Game.stallWarned = false;
  Game.crashTimer = 0; Game.crashSpin = 0;
  Game.particles.clear();
  Game.cam.x = Game.S.x - 120; Game.cam.y = 0;
  Game.shake = 0;
  window.DA.Audio.ensure();
  window.DA.Audio.SFX.launch();
  window.DA.Audio.startWind();
  if(window.DA.UI) window.DA.UI.showFlight();
  hideAllScreens();
}

function hideAllScreens(){
  ["screen-menu","screen-shop","screen-results","screen-stats","screen-settings","screen-pause"].forEach(function(id){
    document.getElementById(id).classList.add("hidden");
  });
}

function pause(on){
  if(Game.phase!=="ramp" && Game.phase!=="fly") return;
  Game.paused = !!on;
  document.getElementById("screen-pause").classList.toggle("hidden", !Game.paused);
  if(Game.paused){ window.DA.Audio.stopBoost(); window.DA.Audio.setWind(0,false); }
}

function update(dt){
  if(Game.paused) return;
  var DA = window.DA;
  if(Game.phase === "ramp"){
    Game.rampT += dt;
    var k = Math.min(1, Game.rampT / Game.rampDur);
    // accelerate down ramp: position along ramp x from -60 to 140
    var xEnd = 140;
    var eased = k*k*(3-2*k)*0.35 + k*k*0.65;
    // sled multiplier shortens effective time (already in rampDur) + adds speed via launchSpeed
    Game.S.x = -60 + (xEnd+60)*eased;
    Game.S.y = DA.World.groundY(Game.S.x)+2;
    var v = DA.Physics.rampSlide(Game.rampT, Game.rampDur, Game.P.launchSpeed);
    Game.S.speed = v;
    Game.S.pitch = -0.25 + k*0.35; // nose follows slope then up at lip
    // snow spray
    if(Math.random()<0.7 && Game.save.settings.particles)
      Game.particles.spawn({x:Game.S.x-14, y:Game.S.y-2, vx:-40-Math.random()*60, vy:20+Math.random()*50,
        life:0.6, size:2+Math.random()*3, color:"#ffffff", grav:120});
    // camera
    camFollow(dt, true);
    if(Game.rampT >= Game.rampDur){
      // LAUNCH!
      Game.phase = "fly";
      Game.S.vx = Math.cos(Game.P.launchAngle) * Game.P.launchSpeed;
      Game.S.vy = Math.sin(Game.P.launchAngle) * Game.P.launchSpeed;
      Game.S.pitch = Game.P.launchAngle * 0.8;
      Game.S.y = DA.World.groundY(Game.S.x)+3;
      if(window.DA.UI) window.DA.UI.toast("🕊️ LIFTOFF! Dive for speed, pull up to climb!");
    }
  }
  else if(Game.phase === "fly"){
    var res = DA.Physics.stepFlight(Game.S, Game.input, Game.P, dt);
    Game.S.boosting = res.boosting;
    Game.S.stalled = res.stalled;
    if(res.stalled && !Game.stallWarned){ Game.stallWarned = true; DA.Audio.SFX.stall(); if(window.DA.UI) window.DA.UI.toast("⚠️ STALL! Nose down to recover!"); }
    if(!res.stalled && Game.S.speed > 14) Game.stallWarned = false;

    // stats
    var st = Game.runStats;
    st.dist = Math.max(0, Game.S.x);
    st.maxAlt = Math.max(st.maxAlt, Game.S.y);
    var kmh = Game.S.speed*3.6;
    st.maxSpeedKmh = Math.max(st.maxSpeedKmh, kmh);
    st.airTime = Game.S.airTime;
    st.maxSpeed = Math.max(st.maxSpeed||0, Game.S.speed);
    if(Game.S.fuel<=0) st.usedAllFuel = true;

    // record?
    if(!Game.bestBeaten && st.dist > Game.save.best.dist && Game.save.best.dist>0){
      Game.bestBeaten = true;
      if(window.DA.UI) window.DA.UI.onRecord();
    }

    // milestones toast + sound
    DA.MILESTONES.forEach(function(m){
      if(!Game.milestonesHit[m.d] && st.dist >= m.d && m.d>0){
        Game.milestonesHit[m.d]=true;
        if(window.DA.UI) window.DA.UI.toast("📍 " + m.label);
        DA.Audio.SFX.milestone();
        if(window.DA.UI) window.DA.UI.floatText("+"+Math.round(m.d/50)+"$ bonus coming!", "#80ed99");
      }
    });

    // booster particles
    if(res.boosting && Game.save.settings.particles){
      for(var i=0;i<3;i++)
        Game.particles.spawn({x:Game.S.x-24, y:Game.S.y, vx:-Game.S.vx*0.3+(Math.random()-0.5)*40, vy:-30-Math.random()*40,
          life:0.4+Math.random()*0.3, size:3+Math.random()*4, color: Math.random()<0.5?"#ffbe0b":"#fb5607", drag:1});
      if(Math.random()<0.5)
        Game.particles.spawn({x:Game.S.x, y:Game.S.y-4, vx:-20, vy:10, life:0.9, size:3, color:"rgba(200,200,200,0.7)", drag:1});
    } else if(Game.save.settings.particles && Game.S.speed>12 && Math.random()<0.35){
      // smoke trail at speed
      Game.particles.spawn({x:Game.S.x-18, y:Game.S.y+2, vx:-15, vy:5, life:0.8, size:2.5, color:"rgba(255,255,255,0.55)", drag:0.5});
    }

    // audio
    DA.Audio.setWind(Game.S.speed, res.boosting);
    if(res.boosting) DA.Audio.startBoost(); else DA.Audio.stopBoost();

    camFollow(dt, false);

    // ground collision
    var gy = DA.World.groundY(Game.S.x);
    if(Game.S.y <= gy){
      crash(gy);
    }
    // safety: flew backwards past start? push forward
    if(Game.S.x < -80){ Game.S.x = -80; Game.S.vx = Math.abs(Game.S.vx); }
  }
  else if(Game.phase === "crashed"){
    Game.crashTimer += dt;
    Game.crashSpin *= (1-2*dt);
    // slide a bit on ground
    Game.S.x += Game.S.vx*dt*0.4;
    Game.S.vx *= (1-3*dt);
    Game.S.y = DA.World.groundY(Game.S.x);
    camFollow(dt, false);
    if(Game.crashTimer > 1.4){
      finishRun();
    }
  }

  Game.particles.update(dt);
  if(Game.shake>0) Game.shake = Math.max(0, Game.shake - dt*3);
}

function camFollow(dt, snap){
  var S = Game.S;
  if(!S) return;
  var lookX = S.vx*0.55, lookY = S.vy*0.25;
  var tx = S.x - Game.W*0.32 + lookX*8;
  var ty = Math.max(0, S.y - 40 + lookY*8);
  // don't show below ground much
  ty = Math.max(-10, ty);
  var k = snap ? 1 : 1 - Math.pow(0.001, dt); // smooth
  if(snap && Game.rampT < 0.1){ Game.cam.x = tx; Game.cam.y = ty; return; }
  Game.cam.x += (tx - Game.cam.x)*Math.min(1, k*1.2+dt*2);
  Game.cam.y += (ty - Game.cam.y)*Math.min(1, k+dt*1.5);
}

function crash(gy){
  var DA = window.DA;
  Game.S.y = gy;
  var impactSpeed = Math.abs(Game.S.vy);
  var speed = Game.S.speed;
  var water = DA.World.isWater(Game.S.x);
  var hard = impactSpeed > 18 || speed > 38;
  Game.phase = "crashed";
  Game.crashTimer = 0;
  Game.crashSpin = (Math.random()-0.5)*2.5;
  Game.shake = Game.save.settings.shake ? (hard?1:0.5) : 0;
  DA.Audio.stopBoost();
  if(water){ DA.Audio.SFX.splash(); } else { DA.Audio.SFX.impact(hard); }
  DA.Audio.setWind(0,false);
  // particles
  if(Game.save.settings.particles){
    var cols = water ? ["#caf0f8","#90e0ef","#ffffff"] : ["#ffffff","#dee2e6","#adb5bd"];
    Game.particles.burst(Game.S.x, gy+4, hard?40:20, {speed: hard?160:90, life:0.9, size:4, colors:cols, grav:260, vy:60});
    if(hard) flash();
  }
  Game.crashedInfo = { hard:hard, water:water, impact:impactSpeed };
  if(window.DA.UI) window.DA.UI.onCrash(Game.crashedInfo);
}

function flash(){
  var f = document.getElementById("flash");
  f.style.transition="none"; f.style.opacity="0.7";
  requestAnimationFrame(function(){ f.style.transition="opacity 0.4s"; f.style.opacity="0"; });
}

function calcRewards(){
  var DA = window.DA;
  var st = Game.runStats;
  var base = DA.Physics.econReward({dist:st.dist, maxAlt:st.maxAlt, maxSpeedKmh:st.maxSpeedKmh, airTime:st.airTime});
  // milestone flyover bonuses (small, immediate feel-good)
  var msBonus = 0;
  Object.keys(Game.milestonesHit).forEach(function(d){ msBonus += Math.round(Number(d)/50); });
  var newObj = [];
  DA.OBJECTIVES.forEach(function(o){
    if(Game.save.objectivesDone.indexOf(o.id)<0 && o.check(st)) newObj.push(o);
  });
  var objBonus = newObj.reduce(function(a,o){return a+o.bonus;},0);
  return { base:base, msBonus:msBonus, newObj:newObj, objBonus:objBonus,
    total: base.total + msBonus + objBonus };
}

function finishRun(){
  Game.phase = "results";
  var DA = window.DA;
  var st = Game.runStats;
  var rw = calcRewards();
  // apply
  Game.save.money += rw.total;
  Game.save.totalEarned += rw.total;
  Game.save.flights += 1;
  var isRecord = st.dist > Game.save.best.dist;
  Game.save.best.dist = Math.max(Game.save.best.dist, st.dist);
  Game.save.best.alt = Math.max(Game.save.best.alt, st.maxAlt);
  Game.save.best.speedKmh = Math.max(Game.save.best.speedKmh, st.maxSpeedKmh);
  Game.save.best.airTime = Math.max(Game.save.best.airTime, st.airTime);
  rw.newObj.forEach(function(o){ Game.save.objectivesDone.push(o.id); });
  DA.Save.save(Game.save);
  DA.Audio.stopWind(); DA.Audio.stopBoost();
  if(isRecord && st.dist>50) DA.Audio.SFX.record();
  Game.lastResult = { stats:JSON.parse(JSON.stringify(st)), rewards:rw, isRecord:isRecord, crash:Game.crashedInfo };
  if(window.DA.UI) window.DA.UI.showResults(Game.lastResult);
}

function loop(t){
  var dt = Math.min(0.05, (t - Game.lastT)/1000 || 0.016);
  Game.lastT = t;
  if(Game.phase==="ramp"||Game.phase==="fly"||Game.phase==="crashed"){
    update(dt);
    render();
    if(window.DA.UI) window.DA.UI.updateHUD();
  } else if(Game.phase==="menu"||Game.phase==="shop"){
    renderMenuBackdrop(dt, t);
  }
  Game.raf = requestAnimationFrame(loop);
}

function render(){
  var g = Game.g, W = Game.W, H = Game.H;
  var S = Game.S;
  // zoom: closer when slow/low, farther when fast/high
  var targetZoom = 1;
  if(S){
    var sp = S.speed||0;
    targetZoom = 1 - Math.min(0.35, sp/200) - Math.min(0.2, Math.max(0,S.y)/600);
    targetZoom = Math.max(0.55, targetZoom);
  }
  Game.zoom += (targetZoom - Game.zoom)*0.05;
  var z = Game.zoom;
  var shx = 0, shy = 0;
  if(Game.shake>0){
    shx = (Math.random()-0.5)*14*Game.shake;
    shy = (Math.random()-0.5)*12*Game.shake;
  }
  g.save();
  g.translate(shx, shy);
  var crashed = Game.phase==="crashed";
  window.DA.World.drawScene(g, W, H, Game.cam, z, {
    x:S.x, y:S.y, vx:S.vx, vy:S.vy, pitch:S.pitch,
    boosting:!!S.boosting, stalled:!!S.stalled,
    sledLvl:S.sledLvl, wingsLvl:S.wingsLvl, boosterLvl:S.boosterLvl, aeroLvl:S.aeroLvl
  }, { particles:Game.particles, crashSpin:Game.crashSpin, crashed:crashed });
  // speed lines at high velocity
  if(S && S.speed > 32 && Game.phase==="fly"){
    var n = Math.min(14, (S.speed-32)|0);
    g.strokeStyle = "rgba(255,255,255,"+Math.min(0.5,(S.speed-32)/60)+")";
    g.lineWidth = 2;
    for(var i=0;i<n;i++){
      var yy = Math.random()*H, len = 60+Math.random()*140;
      var xx = Math.random()*W;
      g.beginPath(); g.moveTo(xx,yy); g.lineTo(xx+len,yy); g.stroke();
    }
  }
  // stall warning
  if(S && S.stalled && Game.phase==="fly"){
    g.fillStyle = "rgba(230,57,70,0.9)";
    g.font = "bold 22px sans-serif"; g.textAlign="center";
    g.fillText("⚠ STALL — NOSE DOWN! ⚠", W/2, 90);
  }
  // boost meter hint near player when fuel empty
  g.restore();
  // speed vignette
  var fx = document.getElementById("speed-fx");
  if(S && S.speed>38 && Game.phase==="fly") fx.style.opacity = Math.min(0.9,(S.speed-38)/40);
  else fx.style.opacity = 0;
}

var menuT = 0;
function renderMenuBackdrop(dt, t){
  menuT += dt;
  var g = Game.g, W = Game.W, H = Game.H;
  var menuCam = { x: menuT*8 % 600 - 120, y: 0 };
  window.DA.World.drawScene(g, W, H, menuCam, 1, {
    x:-20, y:window.DA.World.groundY(-20)+2, vx:0, vy:0, pitch:0,
    boosting:false, stalled:false,
    sledLvl:Game.save?Game.save.upgrades.sled:0, wingsLvl:Game.save?Game.save.upgrades.wings:0,
    boosterLvl:Game.save?Game.save.upgrades.booster:0, aeroLvl:Game.save?Game.save.upgrades.aero:0
  }, {});
}

function abandon(){
  Game.phase = "menu";
  window.DA.Audio.stopWind(); window.DA.Audio.stopBoost();
  if(window.DA.UI) window.DA.UI.showMenu();
}

window.DA = window.DA || {};
window.DA.Game = Game;
window.DA.gameInit = init;
window.DA.startRun = startRun;
window.DA.pauseGame = pause;
window.DA.abandonRun = abandon;
window.DA.derivedParams = derivedParams;
window.DA.gameLoop = loop;
})();
