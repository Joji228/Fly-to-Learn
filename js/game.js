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
  save: null,
  particles: null,
  canvas: null, g: null, W: 0, H: 0,
  zoom: 1,
  bestBeaten: false,
  stallWarned: false,
  rampLvl: 0
};

function clamp(v,a,b){ return v<a?a:(v>b?b:v); }

function derivedParams(up){
  var DA = window.DA;
  return {
    liftArea: DA.liftArea(up.wings),
    trim: DA.wingTrim(up.wings),
    stallSpeed: DA.stallSpeed(up.wings),
    sink: DA.sinkMult(up.wings),
    cd0: DA.dragCoef(up.aero),
    kInd: DA.kindCoef(up.aero),
    thrust: DA.boosterThrust(up.booster),
    fuelMax: DA.fuelTime(up.fuel),
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
    clearInputs();
    if(document.hidden && (Game.phase==="ramp"||Game.phase==="fly")) pause(true);
  });
  window.addEventListener("blur", function(){
    clearInputs(); // never leave a key/booster stuck on
    if(Game.phase==="ramp"||Game.phase==="fly") pause(true);
  });
}

function clearInputs(){
  Game.input.up = false; Game.input.down = false; Game.input.boost = false;
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
    var off = function(e){ if(e) e.preventDefault(); Game.input[prop]=false; };
    el.addEventListener("pointerdown", on);
    el.addEventListener("pointerup", off);
    el.addEventListener("pointercancel", off);
    el.addEventListener("pointerleave", off);
    el.addEventListener("lostpointercapture", off);
    el.addEventListener("contextmenu", function(e){ e.preventDefault(); });
  }
  hold("tc-up","up"); hold("tc-down","down"); hold("tc-boost","boost");
}
function isFlyKey(c){ return c==="ArrowLeft"||c==="ArrowRight"||c==="KeyA"||c==="KeyD"||c==="Space"; }

function startRun(){
  var up = Game.save.upgrades;
  Game.P = derivedParams(up);
  Game.rampLvl = up.ramp;
  window.DA.World.setRampLevel(up.ramp);
  Game.S = {
    x: -60, y: window.DA.World.rampY(-60)+2,
    vx: 0, vy: 0, pitch: Math.atan(window.DA.World.rampSlopeY(-60)), pitchVel: 0, speed: 0,
    fuel: Game.P.fuelMax, fuelMax: Game.P.fuelMax,
    airTime: 0,
    sledLvl: up.sled, wingsLvl: up.wings, boosterLvl: up.booster, aeroLvl: up.aero,
    boosting: false, stalled: false
  };
  Game.rampT = 0;
  Game.rampDur = window.DA.rampRideTime(up.sled); // sled = accel: shorter ride
  Game.phase = "ramp";
  Game.paused = false;
  clearInputs();
  Game.runStats = { dist:0, maxAlt:0, maxSpeedKmh:0, airTime:0, usedAllFuel:false, maxSpeed:0 };
  Game.milestonesHit = {};
  Game.bestBeaten = false;
  Game.stallWarned = false;
  Game.crashTimer = 0; Game.crashSpin = 0; Game.crashedInfo = null;
  Game.particles.clear();
  Game.cam.x = Game.S.x - 120; Game.cam.y = 0;
  Game.shake = 0;
  window.DA.Audio.ensure();
  window.DA.Audio.SFX.launch();
  window.DA.Audio.startWind();
  if(window.DA.UI){
    if(window.DA.UI.onRunStart) window.DA.UI.onRunStart(); // cancel stale results timers
    window.DA.UI.showFlight();
  }
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
    // Ride the actual ramp track: position follows it, nose follows its
    // tangent, speed builds to launch speed — no teleport at the lip.
    var eased = k*k*(3-2*k)*0.35 + k*k*0.65;
    Game.S.x = -60 + 200*eased;
    Game.S.y = DA.World.rampY(Game.S.x)+2;
    Game.S.pitch = Math.atan(DA.World.rampSlopeY(Game.S.x));
    Game.S.pitchVel = 0;
    var v = DA.Physics.rampSlide(Game.rampT, Game.rampDur, Game.P.launchSpeed);
    Game.S.speed = v;
    Game.S.vx = Math.cos(Game.S.pitch)*v;
    Game.S.vy = Math.sin(Game.S.pitch)*v;
    // snow spray scales with speed
    if(Game.save.settings.particles && Math.random() < 0.3 + k*0.6)
      Game.particles.spawn({x:Game.S.x-14, y:Game.S.y-2, vx:-30-Math.random()*(40+v*2), vy:20+Math.random()*50,
        life:0.6, size:2+Math.random()*3, color:"#ffffff", grav:120});
    updateCamera(dt, Game.rampT < 0.05);
    if(Game.rampT >= Game.rampDur){
      // LAUNCH! Velocity continues along the exit tangent with the
      // speed built up on the way down. Nothing is teleported.
      var exit = DA.World.rampExitAngle();
      Game.phase = "fly";
      Game.S.vx = Math.cos(exit) * Game.P.launchSpeed;
      Game.S.vy = Math.sin(exit) * Game.P.launchSpeed;
      Game.S.pitch = exit;
      Game.S.pitchVel = 0;
      Game.S.speed = Game.P.launchSpeed;
      Game.S.y = DA.World.rampY(Game.S.x)+3;
      Game.shake = Game.save.settings.shake ? 0.25 : 0;
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

    // exhaust + trail: emitted from the tail, backwards along the nose.
    // (S.pitch is authoritative: the same angle thrust uses.)
    var nx = Math.cos(Game.S.pitch), ny = Math.sin(Game.S.pitch);
    var tailX = Game.S.x - nx*26, tailY = Game.S.y - ny*26;
    if(res.boosting && Game.save.settings.particles){
      for(var i=0;i<3;i++)
        Game.particles.spawn({x:tailX, y:tailY,
          vx:-nx*(150+Game.S.speed*0.5)+(Math.random()-0.5)*40,
          vy:-ny*(150+Game.S.speed*0.5)+(Math.random()-0.5)*40,
          life:0.35+Math.random()*0.3, size:3+Math.random()*4,
          color: Math.random()<0.5?"#ffbe0b":"#fb5607", drag:1.5});
      if(Math.random()<0.5)
        Game.particles.spawn({x:tailX, y:tailY, vx:-nx*30, vy:-ny*30+12,
          life:0.9, size:3, color:"rgba(200,200,200,0.7)", drag:1});
    } else if(Game.save.settings.particles && Game.S.speed>12 && Math.random()<0.35){
      // faint slipstream trail at speed
      Game.particles.spawn({x:tailX, y:tailY, vx:-nx*25, vy:-ny*25+6,
        life:0.8, size:2.5, color:"rgba(255,255,255,0.55)", drag:0.5});
    }

    // audio
    DA.Audio.setWind(Game.S.speed, res.boosting);
    if(res.boosting) DA.Audio.startBoost(); else DA.Audio.stopBoost();

    updateCamera(dt, false);

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
    var ci = Game.crashedInfo || {};
    if(!ci.water){
      // snow: roll/slide out with friction; rollout distance still counts!
      Game.S.x += Game.S.vx*dt;
      Game.S.vx *= Math.max(0, 1-2.2*dt);
      Game.S.y = DA.World.groundY(Game.S.x);
      Game.runStats.dist = Math.max(Game.runStats.dist, Math.max(0, Game.S.x));
      if(Math.abs(Game.S.vx) > 6 && Math.random()<0.4 && Game.save.settings.particles)
        Game.particles.spawn({x:Game.S.x-10, y:Game.S.y+2, vx:-Game.S.vx*0.3, vy:30+Math.random()*40,
          life:0.5, size:3, color:"#ffffff", grav:200});
    } else if(Game.crashTimer < 0.6 && Game.save.settings.particles && Math.random()<0.5){
      // splash keeps erupting briefly; the dodo itself stays put (no sliding on water!)
      Game.particles.spawn({x:Game.S.x+(Math.random()-0.5)*20, y:Game.S.y+2, vx:(Math.random()-0.5)*60, vy:60+Math.random()*80,
        life:0.7, size:3+Math.random()*3, color: Math.random()<0.5?"#caf0f8":"#ffffff", grav:300});
    }
    updateCamera(dt, false);
    var doneT = ci.water ? 1.2 : 2.0;
    if(Game.crashTimer > doneT || (!ci.water && Math.abs(Game.S.vx) < 1.5 && Game.crashTimer > 0.6)){
      finishRun();
    }
  }

  Game.particles.update(dt);
  if(Game.shake>0) Game.shake = Math.max(0, Game.shake - dt*3);
}

/* Camera: zoom stays in a tight readable band; screen position is solved
   FROM the zoom (cam = player - desiredScreenPos/zoom), so changing zoom
   never shoves the player across the screen. Player sits ~36% from the left
   with speed-scaled look-ahead; vertical framing follows climb/dive. */
function updateCamera(dt, snap){
  var S = Game.S;
  if(!S || !Game.W || !Game.H) return;
  var speed = S.speed || 0;

  var zT = 1.04 - speed*0.0011 - Math.max(0, S.y)*0.00003;
  zT = clamp(zT, 0.86, 1.05);
  if(snap) Game.zoom = zT;
  else Game.zoom += (zT - Game.zoom) * (1 - Math.exp(-3*dt));
  var z = Game.zoom;

  var fx = 0.38; // player screen fraction from the left while flying right
  // look-ahead is budgeted in SCREEN space so narrow phones are not punished:
  // it may shift the player left by at most ~10% of the viewport width.
  var lookPx = clamp(S.vx*1.1, -15, 90) + Math.min(30, speed*0.3);
  lookPx = Math.min(lookPx, 0.10*Game.W);
  var tx = S.x - fx*Game.W/z + lookPx/z;

  var pf = 0.55 + clamp(S.vy*0.005, -0.10, 0.12); // climb: more sky; dive: more ground
  var ty = S.y - (0.80-pf)*Game.H/z;
  if(ty < -40) ty = -40;

  if(snap){ Game.cam.x = tx; Game.cam.y = ty; return; }
  Game.cam.x += (tx - Game.cam.x) * (1 - Math.exp(-5*dt));
  Game.cam.y += (ty - Game.cam.y) * (1 - Math.exp(-3.5*dt));
}

/* Where will the player appear on screen with the current camera? (0..1) */
function playerScreenPos(){
  var S = Game.S;
  if(!S || !Game.W) return { fx:0, fy:0 };
  return {
    fx: (S.x - Game.cam.x) * Game.zoom / Game.W,
    fy: 0.80 - (S.y - Game.cam.y) * Game.zoom / Game.H
  };
}

function crash(gy){
  var DA = window.DA;
  Game.S.y = gy;
  clearInputs(); // a held SPACE must not stick into the results screen
  var impactVy = -Game.S.vy; // positive = downward
  var speed = Game.S.speed;
  var water = DA.World.isWater(Game.S.x);
  // severity tiers from vertical + total speed
  var severity = "gentle";
  if(impactVy > 20 || speed > 45) severity = "brutal";
  else if(impactVy > 7 || speed > 26) severity = "firm";
  Game.phase = "crashed";
  Game.crashTimer = 0;
  if(water){
    // splashdown: stop dead, erupt, never slide on water
    Game.crashSpin = (Math.random()-0.5)*0.8;
    Game.S.vx = 0; Game.S.vy = 0;
  } else if(severity === "gentle"){
    Game.crashSpin = 0; // greased landing, rolls out
    Game.S.vx *= 0.55;
  } else {
    Game.crashSpin = (Math.random()<0.5?-1:1) * (severity === "brutal" ? 2.2 : 1.2);
    Game.S.vx *= (severity === "brutal" ? 0.1 : 0.3);
  }
  Game.shake = Game.save.settings.shake
    ? (severity === "brutal" ? 1 : severity === "firm" ? 0.5 : 0) : 0;
  DA.Audio.stopBoost();
  if(water){ DA.Audio.SFX.splash(); } else { DA.Audio.SFX.impact(severity === "gentle" ? false : true); }
  DA.Audio.setWind(0,false);
  // particles
  if(Game.save.settings.particles){
    var cols = water ? ["#caf0f8","#90e0ef","#ffffff"] : ["#ffffff","#dee2e6","#adb5bd"];
    var n = severity === "brutal" ? 46 : severity === "firm" ? 26 : 12;
    Game.particles.burst(Game.S.x, gy+4, n, {speed: severity === "gentle" ? 70 : 160,
      life:0.9, size:4, colors:cols, grav:260, vy:70});
    if(severity === "brutal") flash();
  }
  Game.crashedInfo = { severity:severity, water:water, impactVy:impactVy, speed:speed };
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
  // gentle snow landings earn a small style bonus
  var landBonus = (Game.crashedInfo && Game.crashedInfo.severity === "gentle" &&
                   !Game.crashedInfo.water && st.dist > 100) ? 25 : 0;
  var newObj = [];
  DA.OBJECTIVES.forEach(function(o){
    if(Game.save.objectivesDone.indexOf(o.id)<0 && o.check(st)) newObj.push(o);
  });
  var objBonus = newObj.reduce(function(a,o){return a+o.bonus;},0);
  return { base:base, msBonus:msBonus, landBonus:landBonus, newObj:newObj, objBonus:objBonus,
    total: base.total + msBonus + landBonus + objBonus };
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
  // zoom is owned by updateCamera; render just reads it (tight readable band)
  var z = Game.zoom;
  var sp = (S && S.speed) || 0;
  // subtle extra shake at extreme speed (feel, not camera motion)
  var shk = Game.shake;
  if(Game.phase === "fly" && sp > 55) shk = Math.max(shk, Math.min(0.25, (sp-55)/160));
  var shx = 0, shy = 0;
  if(shk > 0){
    shx = (Math.random()-0.5)*14*shk;
    shy = (Math.random()-0.5)*12*shk;
  }
  g.save();
  g.translate(shx, shy);
  var crashed = Game.phase==="crashed";
  // player scale is decoupled from world zoom: readable at any zoom
  var playerScale = Math.pow(z, 0.35) * 1.22;
  window.DA.World.drawScene(g, W, H, Game.cam, z, {
    x:S.x, y:S.y, vx:S.vx, vy:S.vy, pitch:S.pitch,
    boosting:!!S.boosting, stalled:!!S.stalled,
    sledLvl:S.sledLvl, wingsLvl:S.wingsLvl, boosterLvl:S.boosterLvl, aeroLvl:S.aeroLvl
  }, { particles:Game.particles, crashSpin:Game.crashSpin, crashed:crashed, playerScale:playerScale });
  // directional speed lines: streak along the actual motion direction
  if(S && sp > 30 && Game.phase==="fly"){
    var ang = Math.atan2(-S.vy, S.vx);
    var ldx = Math.cos(ang), ldy = Math.sin(ang);
    var n = Math.min(16, Math.round((sp-30)*0.5));
    g.strokeStyle = "rgba(255,255,255,"+Math.min(0.45,(sp-30)/70).toFixed(3)+")";
    g.lineWidth = 2;
    for(var i=0;i<n;i++){
      var xx = Math.random()*W, yy = Math.random()*H;
      var len = 60+Math.random()*Math.min(160, sp*2.2);
      g.beginPath();
      g.moveTo(xx-ldx*len/2, yy-ldy*len/2);
      g.lineTo(xx+ldx*len/2, yy+ldy*len/2);
      g.stroke();
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
  if(Game.save) window.DA.World.setRampLevel(Game.save.upgrades.ramp);
  var g = Game.g, W = Game.W, H = Game.H;
  var menuCam = { x: menuT*8 % 600 - 120, y: 0 };
  window.DA.World.drawScene(g, W, H, menuCam, 1, {
    x:-20, y:window.DA.World.groundY(-20)+2, vx:0, vy:0, pitch:0, pitchVel:0,
    boosting:false, stalled:false,
    sledLvl:Game.save?Game.save.upgrades.sled:0, wingsLvl:Game.save?Game.save.upgrades.wings:0,
    boosterLvl:Game.save?Game.save.upgrades.booster:0, aeroLvl:Game.save?Game.save.upgrades.aero:0
  }, { playerScale: 1.22 });
}

function abandon(){
  Game.phase = "menu";
  clearInputs();
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
window.DA.updateCamera = updateCamera;
window.DA.playerScreenPos = playerScreenPos;
})();
