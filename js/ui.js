/* UI: screens, HUD, shop, results animation, stats, settings. */
(function(){
"use strict";

var save = null;
function $(id){ return document.getElementById(id); }

function init(s){
  save = s;
  bindButtons();
  renderShop();
  refreshMenu();
  applySettingsToInputs();
  window.DA.Audio.setEnabled(save.settings.sfx, save.settings.music);
  if(save.settings.music) window.DA.Audio.startMusic();
}

function bindButtons(){
  $("btn-fly").onclick = function(){ window.DA.Audio.ensure(); window.DA.Audio.SFX.click(); window.DA.startRun(); };
  $("btn-shop").onclick = function(){ click(); showShop(); };
  $("btn-stats").onclick = function(){ click(); showStats(); };
  $("btn-settings").onclick = function(){ click(); showSettings(); };
  $("btn-shop-fly").onclick = function(){ click(); window.DA.startRun(); };
  $("btn-shop-back").onclick = function(){ click(); showMenu(); };
  $("btn-again").onclick = function(){ click(); window.DA.startRun(); };
  $("btn-to-shop").onclick = function(){ click(); showShop(); };
  $("btn-to-menu").onclick = function(){ click(); showMenu(); };
  $("btn-stats-back").onclick = function(){ click(); goBackFromSub(); };
  $("btn-settings-back").onclick = function(){ click(); goBackFromSub(); };
  $("btn-resume").onclick = function(){ click(); window.DA.pauseGame(false); };
  $("btn-quit").onclick = function(){ click(); $("screen-pause").classList.add("hidden"); window.DA.abandonRun(); };
  $("btn-pause").onclick = function(){ click(); window.DA.pauseGame(true); };
  $("btn-mute-hud").onclick = function(){
    save.settings.sfx = !save.settings.sfx;
    window.DA.Save.save(save);
    window.DA.Audio.setEnabled(save.settings.sfx, save.settings.music);
    updateMuteBtn();
  };
  $("set-sfx").onchange = function(e){ save.settings.sfx=e.target.checked; window.DA.Save.save(save); window.DA.Audio.setEnabled(save.settings.sfx, save.settings.music); updateMuteBtn(); };
  $("set-music").onchange = function(e){ save.settings.music=e.target.checked; window.DA.Save.save(save); window.DA.Audio.setEnabled(save.settings.sfx, save.settings.music); };
  $("set-shake").onchange = function(e){ save.settings.shake=e.target.checked; window.DA.Save.save(save); };
  $("set-particles").onchange = function(e){ save.settings.particles=e.target.checked; if(window.DA.Game.particles) window.DA.Game.particles.enabled=save.settings.particles; window.DA.Save.save(save); };
  $("btn-reset-save").onclick = function(){
    if(confirm("Reset ALL progress? Dennis will forget everything. (This cannot be undone.)")){
      window.DA.Save.reset();
      save = window.DA.Save.load();
      window.DA.Game.save = save;
      window.DA.Game.particles.enabled = save.settings.particles;
      applySettingsToInputs(); refreshMenu(); renderShop();
      window.DA.Audio.setEnabled(save.settings.sfx, save.settings.music);
      toast("💾 Save wiped. Fresh dodo.");
    }
  };
  updateMuteBtn();
}

function click(){ window.DA.Audio.ensure(); window.DA.Audio.SFX.click(); }
function updateMuteBtn(){ $("btn-mute-hud").textContent = save.settings.sfx ? "🔊" : "🔇"; }
function applySettingsToInputs(){
  $("set-sfx").checked = save.settings.sfx;
  $("set-music").checked = save.settings.music;
  $("set-shake").checked = save.settings.shake;
  $("set-particles").checked = save.settings.particles;
  updateMuteBtn();
}

var subReturn = "menu";
function showMenu(){
  window.DA.Game.phase = "menu";
  hideAll(); $("screen-menu").classList.remove("hidden");
  $("hud").classList.add("hidden"); $("touch-controls").classList.add("hidden"); $("pitch-hint").classList.add("hidden");
  refreshMenu();
}
function showShop(){
  window.DA.Game.phase = "shop";
  hideAll(); $("screen-shop").classList.remove("hidden");
  $("hud").classList.add("hidden"); $("touch-controls").classList.add("hidden"); $("pitch-hint").classList.add("hidden");
  renderShop();
}
function showStats(){ subReturn = window.DA.Game.phase==="shop"?"shop":"menu"; hideAll(); $("screen-stats").classList.remove("hidden"); renderStats(); }
function showSettings(){ subReturn = window.DA.Game.phase==="shop"?"shop":"menu"; hideAll(); $("screen-settings").classList.remove("hidden"); }
function goBackFromSub(){ hideAll(); if(subReturn==="shop") showShop(); else showMenu(); }
function hideAll(){ ["screen-menu","screen-shop","screen-results","screen-stats","screen-settings","screen-pause"].forEach(function(id){ $(id).classList.add("hidden"); }); }

function refreshMenu(){
  $("menu-best-dist").textContent = "Best: " + window.DA.Physics.fmtDist(save.best.dist);
  $("menu-flights").textContent = "Flights: " + save.flights;
  $("menu-cash").textContent = "$" + save.money.toLocaleString();
}

function showFlight(){
  hideAll();
  $("hud").classList.remove("hidden");
  $("touch-controls").classList.remove("hidden");
  if(window.innerWidth>700) $("pitch-hint").classList.remove("hidden");
  var id = runId;
  setTimeout(function(){ if(id === runId) $("pitch-hint").classList.add("hidden"); }, 6000);
  $("record-banner").classList.add("hidden");
}

function updateHUD(){
  var G = window.DA.Game;
  if(!G.S) return;
  $("hud-dist").textContent = window.DA.Physics.fmtDist(Math.max(0,G.S.x));
  $("hud-alt").textContent = Math.max(0,G.S.y).toFixed(0)+" m";
  $("hud-speed").textContent = Math.round((G.S.speed||0)*3.6)+" km/h";
  // redline: speed readout heats up as the glider strains past comfort
  var spdEl = $("hud-speed");
  if(G.P && (G.S.speed||0) > G.P.top) spdEl.style.color = "#ff5d5d";
  else if(G.P && (G.S.speed||0) > G.P.comfort) spdEl.style.color = "#ffb703";
  else spdEl.style.color = "#fff";
  var hasBooster = !!(G.P && G.P.thrust > 0);
  var f = (G.S.fuelMax>0 && hasBooster) ? G.S.fuel/G.S.fuelMax : 0;
  var fill = $("fuel-fill");
  fill.style.width = (f*100).toFixed(1)+"%";
  fill.className = (!hasBooster || f<0.25) ? "low" : "";
  fill.id = "fuel-fill";
  var fl = $("fuel-label");
  if(fl) fl.textContent = hasBooster ? "FUEL" : "NO BOOSTER";
  $("hud-best").textContent = window.DA.Physics.fmtDist(save.best.dist);
  $("phase-label").textContent = G.phase==="ramp" ? "🛷 RAMP!" : (G.S.boosting?"🔥 BOOST!":(G.S.stalled?"⚠ STALL":"🕊️ FLY"));
  if(G.S.boosting) $("phase-label").style.color = "#ffb703"; else $("phase-label").style.color = "#fff";
  // pitch indicator: arrow + degrees, one glance tells where the nose (and booster) points
  var deg = Math.round((G.S.pitch||0) * 180/Math.PI);
  var arrow = deg > 12 ? "↗" : deg < -12 ? "↘" : "→";
  var pl = $("pitch-label");
  if(pl){
    pl.textContent = arrow + " " + (deg>0?"+":"") + deg + "°";
    pl.style.color = G.S.stalled ? "#ff5d5d" : (Math.abs(deg) > 55 ? "#ffb703" : "#fff");
  }
}

function onRecord(){
  $("record-banner").classList.remove("hidden");
  window.DA.Audio.SFX.record();
  toast("🎉 NEW RECORD!");
}
function onCrash(info){
  var msgs;
  if(info.water){
    msgs = info.severity === "mega" ? ["💦 MEGA SPLASH!", "🌊 Dennis vs. Ocean: ocean wins."]
      : ["💦 SPLASHDOWN!", "🌊 Belly-flop!", "🐟 The fish applaud."];
  }
  else if(info.severity === "smooth") msgs = ["🛬 Butter-smooth!", "⛷️ What a rollout!", "🧈 The judges weep."];
  else if(info.severity === "rough") msgs = ["❄️ Bumpy arrival!", "🛷 Rollout with style-ish."];
  else if(info.severity === "mega") msgs = ["💥 MEGA wipeout!", "☄️ Crater delivered!", "🩹 That one hurt."];
  else msgs = ["💥 Wipeout!", "❄️ Face-first!", "🕳️ Sudden stop!"];
  toast(msgs[(Math.random()*msgs.length)|0]);
}

/* ---------- SHOP ---------- */
function renderShop(){
  $("shop-cash").textContent = "$" + save.money.toLocaleString();
  renderGliders();
  var grid = $("shop-grid");
  grid.innerHTML = "";
  var keys = ["ramp","sled","aero","booster","fuel"];
  keys.forEach(function(k){
    var u = window.DA.UPGRADES[k];
    if(!u) return; // gliders replaced the old wings meter
    var lvl = save.upgrades[k];
    var maxed = lvl>=u.max;
    var price = maxed?0:window.DA.priceOf(k,lvl);
    var card = document.createElement("div");
    card.className = "up-card" + (maxed?" maxed":"") + (price>save.money&&!maxed?" cant":"");
    card.id = "card-"+k;
    var pips = "";
    for(var i=0;i<u.max;i++) pips += '<div class="pip'+(i<lvl?' on':'')+'"></div>';
    card.innerHTML =
      '<div class="up-top"><span class="up-name">'+u.icon+' '+u.name+'</span><span class="up-lvl">Lv '+lvl+'/'+u.max+'</span></div>' +
      '<div class="pips">'+pips+'</div>' +
      '<div class="up-desc">'+u.blurb+'</div>' +
      '<div class="up-desc" style="color:#fff">Now: '+u.desc(lvl)+'</div>' +
      '<div class="up-next">'+u.next(lvl)+'</div>';
    var btn = document.createElement("button");
    btn.className = "buy-btn";
    if(maxed){ btn.textContent = "★ MAXED ★"; btn.disabled = true; }
    else { btn.textContent = "BUY — $" + price.toLocaleString(); btn.disabled = price>save.money; }
    btn.onclick = (function(key, p){
      return function(){ buy(key, p); };
    })(k, price);
    card.appendChild(btn);
    grid.appendChild(card);
  });
  drawPreview();
  var q = window.DA.PREVIEW_QUIPS[(Math.random()*window.DA.PREVIEW_QUIPS.length)|0];
  var gl = (window.DA.GLIDERS && window.DA.GLIDERS[save.glider.equipped]) || { name:"Bare Dodo" };
  $("preview-text").textContent = '"' + q + '" — Dennis, flying ' + gl.name + " (Lv " + totalLv() + " pilot)";
}
function totalLv(){ var t=0; for(var k in save.upgrades) t+=save.upgrades[k]; return t; }
function ownedGliders(){ var n=0; for(var i=0;i<10;i++) if(save.glider.owned[i]) n++; return n; }

/* ---------- GLIDER HANGAR ---------- */
function statBar(label, v){
  var bars = "";
  for(var i=0;i<10;i++) bars += '<div class="pip'+(i<Math.round(v)?' on':'')+'"></div>';
  return '<div class="gstat"><span>'+label+'</span><div class="pips">'+bars+'</div></div>';
}
function renderGliders(){
  var wrap = $("glider-grid");
  if(!wrap || !window.DA.GLIDERS) return;
  wrap.innerHTML = "";
  var eq = save.glider.equipped;
  var head = document.createElement("div");
  head.className = "glider-head";
  head.innerHTML = "🪂 <b>GLIDER HANGAR</b> — equipped: <b>" + window.DA.GLIDERS[eq].name + "</b>";
  wrap.appendChild(head);
  window.DA.GLIDERS.forEach(function(gl){
    var owned = !!save.glider.owned[gl.id];
    var equipped = (eq === gl.id);
    var card = document.createElement("div");
    card.className = "up-card gcard" + (equipped ? " maxed" : "") + (!owned && gl.price > save.money ? " cant" : "");
    var cv = document.createElement("canvas");
    cv.width = 160; cv.height = 90; cv.className = "gprev";
    card.appendChild(cv);
    var info = document.createElement("div");
    info.innerHTML =
      '<div class="up-top"><span class="up-name">' + gl.name + '</span>' +
      '<span class="up-lvl">' + (equipped ? "EQUIPPED" : owned ? "OWNED" : "$" + gl.price.toLocaleString()) + '</span></div>' +
      '<div class="up-desc">' + gl.tag + '</div>' +
      statBar("FLIGHT", gl.bars.fly) + statBar("SPEED", gl.bars.speed) + statBar("CONTROL", gl.bars.ctrl);
    card.appendChild(info);
    var btn = document.createElement("button");
    btn.className = "buy-btn";
    if(equipped){ btn.textContent = "✔ EQUIPPED"; btn.disabled = true; }
    else if(owned){ btn.textContent = "EQUIP"; btn.onclick = (function(id){ return function(){ equipGlider(id); }; })(gl.id); }
    else { btn.textContent = "BUY — $" + gl.price.toLocaleString(); btn.disabled = gl.price > save.money;
      btn.onclick = (function(id, price){ return function(){ buyGlider(id, price); }; })(gl.id, gl.price); }
    card.appendChild(btn);
    wrap.appendChild(card);
    try{ window.DA.drawGliderPreview(cv, gl.id); }catch(e){}
  });
}
function buyGlider(id, price){
  var gl = window.DA.GLIDERS[id];
  if(!gl || save.glider.owned[id]) return;
  if(save.money < price){ window.DA.Audio.SFX.denied(); toast("❌ Not enough cash! One more flight..."); return; }
  save.money -= price;
  save.glider.owned[id] = true;
  save.glider.equipped = id;
  window.DA.Save.save(save);
  window.DA.Audio.SFX.purchase();
  floatText("🪂 " + gl.name + "!", "#80ed99");
  renderShop();
  refreshMenu();
}
function equipGlider(id){
  if(!save.glider.owned[id] || save.glider.equipped === id) return;
  save.glider.equipped = id;
  window.DA.Save.save(save);
  window.DA.Audio.ensure(); window.DA.Audio.SFX.click();
  toast("🪂 Equipped " + window.DA.GLIDERS[id].name + "!");
  renderShop();
  refreshMenu();
}

function buy(key, price){
  var u = window.DA.UPGRADES[key];
  var lvl = save.upgrades[key];
  if(lvl>=u.max) return;
  if(save.money < price){ window.DA.Audio.SFX.denied(); toast("❌ Not enough cash! One more flight..."); return; }
  save.money -= price;
  save.upgrades[key] = lvl+1;
  window.DA.Save.save(save);
  window.DA.Audio.SFX.purchase();
  floatText("Lv "+(lvl+1)+" "+u.name+"!", "#80ed99");
  var card = $("card-"+key);
  if(card){ card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash"); }
  renderShop();
  refreshMenu();
}

function drawPreview(){
  var c = $("preview-canvas");
  var g = c.getContext("2d");
  g.clearRect(0,0,c.width,c.height);
  var grd = g.createLinearGradient(0,0,0,c.height);
  grd.addColorStop(0,"#87b5d6"); grd.addColorStop(1,"#e3f2fd");
  g.fillStyle = grd; g.fillRect(0,0,c.width,c.height);
  g.fillStyle = "#fff"; g.fillRect(0,c.height-30,c.width,30);
  // snow hill
  g.fillStyle = "#f4f8ff";
  g.beginPath(); g.moveTo(0,c.height-30); g.quadraticCurveTo(90,c.height-90,200,c.height-44); g.lineTo(360,c.height-36); g.lineTo(360,c.height-30); g.closePath(); g.fill();
  window.DA.World.drawDodo(g, 150, 95, {
    pitch: -0.15, vx: 20, vy: 4, boosting:false, stalled:false,
    glider: save.glider.equipped,
    sledLvl: save.upgrades.sled,
    boosterLvl: save.upgrades.booster, aeroLvl: save.upgrades.aero
  }, 1.15, {});
  g.fillStyle = "#123"; g.font = "bold 12px sans-serif"; g.textAlign="left";
  var gl2 = (window.DA.GLIDERS && window.DA.GLIDERS[save.glider.equipped]) || { name:"Bare Dodo" };
  g.fillText("Ramp "+save.upgrades.ramp+" • Sled "+save.upgrades.sled+" • "+gl2.name, 8, 16);
  g.fillText("Aero "+save.upgrades.aero+" • Boost "+save.upgrades.booster+" • Fuel "+save.upgrades.fuel, 8, 32);
}

/* ---------- RESULTS ---------- */
// Stale-timer guard: every PLAY AGAIN / launch bumps runId; pending row
// animations from an older results screen abort instead of touching the
// new flight's DOM or playing sounds late.
var runId = 0;
function onRunStart(){ runId++; }

function showResults(res){
  var id = runId;
  hideAll();
  $("hud").classList.add("hidden"); $("touch-controls").classList.add("hidden");
  var st = res.stats, rw = res.rewards;
  var crashed = res.crash || {};
  var sev = crashed.severity || "crash";
  $("results-title").textContent = crashed.water ? (sev === "mega" ? "💦 Mega Splash!" : "💦 Splashdown!")
    : sev === "smooth" ? "🛬 Butter-smooth landing!"
    : sev === "rough" ? "⛷️ Bumpy but alive!"
    : sev === "mega" ? "💥 Mega Wipeout!" : "❄️ Snow Snack!";
  var quotes = res.isRecord ? window.DA.GOOD_QUOTES
    : sev === "smooth" ? window.DA.GENTLE_QUOTES : window.DA.QUOTES;
  $("results-quote").textContent = '"' + quotes[(Math.random()*quotes.length)|0] + '"';
  $("r-dist").textContent = window.DA.Physics.fmtDist(st.dist);
  $("r-dist-best").textContent = res.isRecord ? "🎉 NEW BEST!" : ("best " + window.DA.Physics.fmtDist(save.best.dist));
  $("r-alt").textContent = st.maxAlt.toFixed(0)+" m";
  $("r-speed").textContent = Math.round(st.maxSpeedKmh)+" km/h";
  $("r-time").textContent = st.airTime.toFixed(1)+" s";
  // snappy animated breakdown
  var bd = $("results-breakdown");
  bd.innerHTML = "";
  var rows = [
    ["📏 Distance ("+Math.floor(st.dist)+" m)", rw.base.dist],
    ["⛰️ Altitude ("+st.maxAlt.toFixed(0)+" m)", rw.base.alt],
    ["⚡ Top speed ("+Math.round(st.maxSpeedKmh)+" km/h)", rw.base.speed],
    ["⏱️ Airtime ("+st.airTime.toFixed(1)+" s)", rw.base.time]
  ];
  if(rw.msBonus>0) rows.push(["📍 Milestone flyovers", rw.msBonus]);
  if(rw.landBonus>0) rows.push(["🧈 Smooth-landing style", rw.landBonus]);
  var od = $("results-objectives"); od.innerHTML = "";
  rw.newObj.forEach(function(o){ rows.push(["🏆 "+o.text, o.bonus]); });
  var total = 0;
  var totalEl = $("results-total");
  totalEl.textContent = "$0";
  rows.forEach(function(r, i){
    var div = document.createElement("div");
    div.className = "bd-row" + (i>=4?" bonus":"");
    div.innerHTML = "<span>"+r[0]+"</span><b>+$"+r[1].toLocaleString()+"</b>";
    div.style.opacity = "0";
    bd.appendChild(div);
    setTimeout(function(){
      if(id !== runId) return; // user already started another flight: stay silent
      div.style.opacity = "1";
      div.style.transition = "opacity .25s";
      total += r[1];
      animateMoney(totalEl, total, id);
      window.DA.Audio.SFX.coin();
      if(i===rows.length-1 && rw.newObj.length){
        rw.newObj.forEach(function(o){
          var d2 = document.createElement("div");
          d2.className = "obj-done";
          d2.textContent = "🏆 Objective complete: " + o.text + " (+$"+o.bonus+")";
          od.appendChild(d2);
        });
      }
    }, 120*(i+1));
  });
  setTimeout(function(){ if(id === runId) animateMoney(totalEl, rw.total, id); }, 120*(rows.length+1));
  $("screen-results").classList.remove("hidden");
  refreshMenu();
}
function animateMoney(el, to, id){
  var from = parseInt(el.textContent.replace(/[^0-9]/g,""))||0;
  var start = performance.now(), dur = 200;
  function f(t){
    if(id !== undefined && id !== runId) return;
    var k = Math.min(1,(t-start)/dur);
    el.textContent = "$" + Math.round(from+(to-from)*k).toLocaleString();
    if(k<1) requestAnimationFrame(f);
  }
  requestAnimationFrame(f);
}

/* ---------- STATS ---------- */
function renderStats(){
  var b = save.best;
  $("stats-list").innerHTML =
    statBox("BEST DISTANCE", window.DA.Physics.fmtDist(b.dist)) +
    statBox("BEST ALTITUDE", b.alt.toFixed(0)+" m") +
    statBox("TOP SPEED", Math.round(b.speedKmh)+" km/h") +
    statBox("LONGEST FLIGHT", b.airTime.toFixed(1)+" s") +
    statBox("FLIGHTS", ""+save.flights) +
    statBox("TOTAL EARNED", "$"+save.totalEarned.toLocaleString()) +
    statBox("WALLET", "$"+save.money.toLocaleString()) +
    statBox("PILOT LEVEL", "Lv "+totalLv()+"/40") +
    statBox("GLIDERS", ownedGliders()+"/10");
  var ol = $("objectives-list"); ol.innerHTML = "";
  window.DA.OBJECTIVES.forEach(function(o){
    var done = save.objectivesDone.indexOf(o.id)>=0;
    var div = document.createElement("div");
    div.className = "obj-row"+(done?" done":"");
    div.innerHTML = "<span>"+(done?"✅ ":"⬜ ")+o.text+"</span><b>+$"+o.bonus+"</b>";
    ol.appendChild(div);
  });
}
function statBox(l,v){ return '<div class="stat-box"><label>'+l+'</label><b>'+v+'</b></div>'; }

function toast(msg){
  var w = $("toast-wrap");
  var d = document.createElement("div");
  d.className = "toast"; d.textContent = msg;
  w.appendChild(d);
  setTimeout(function(){ d.style.opacity="0"; d.style.transition="opacity .4s"; }, 2200);
  setTimeout(function(){ d.remove(); }, 2700);
  while(w.children.length>3) w.firstChild.remove();
}
function floatText(msg, color){
  var w = $("float-wrap");
  var d = document.createElement("div");
  d.className = "float-up"; d.textContent = msg;
  d.style.left = (30+Math.random()*40)+"%";
  d.style.top = (35+Math.random()*20)+"%";
  d.style.fontSize = "22px";
  if(color) d.style.color = color;
  w.appendChild(d);
  setTimeout(function(){ d.remove(); }, 1500);
}

function enterPressed(){
  if(!$("screen-menu").classList.contains("hidden")) window.DA.startRun();
  else if(!$("screen-results").classList.contains("hidden")) window.DA.startRun();
}

window.DA = window.DA || {};
window.DA.UI = { init:init, showMenu:showMenu, showShop:showShop, showFlight:showFlight,
  updateHUD:updateHUD, showResults:showResults, onRecord:onRecord, onCrash:onCrash,
  toast:toast, floatText:floatText, enterPressed:enterPressed, refreshMenu:refreshMenu, renderShop:renderShop,
  onRunStart:onRunStart };
})();
