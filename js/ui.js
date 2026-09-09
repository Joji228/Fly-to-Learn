/* UI: screens, HUD, shop, results animation, stats, settings. */
(function(){
"use strict";

var save = null;
function $(id){ return document.getElementById(id); }

function init(s){
  save = s;
  bindButtons();
  buildSpeedo();
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
  $("btn-cheats").onclick = function(){ click(); showCheats(); };
  $("btn-cheats-back").onclick = function(){ click(); goBackFromSub(); };
  $("btn-cheat-1k").onclick = function(){ giveMoney(1000); };
  $("btn-cheat-10k").onclick = function(){ giveMoney(10000); };
  $("btn-cheat-50k").onclick = function(){ giveMoney(50000); };
  $("btn-cheat-zero").onclick = function(){
    click();
    save.money = 0;
    window.DA.Save.save(save);
    refreshMenu(); renderShop();
    toast("💸 Wallet emptied. Bold strategy.");
  };
  $("btn-resume").onclick = function(){ click(); window.DA.pauseGame(false); };
  $("btn-restart").onclick = function(){
    click();
    window.DA.pauseGame(false);
    $("screen-pause").classList.add("hidden");
    window.DA.abandonRun(); // drops the current attempt without banking it
    window.DA.startRun();   // ...and launches a fresh one immediately
  };
  $("btn-pause-settings").onclick = function(){ click(); showSettingsFromPause(); };
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
/* Cheat menu: instant local money. Save + every visible wallet refresh now. */
function giveMoney(n){
  click();
  save.money += n;
  window.DA.Save.save(save);
  refreshMenu();
  if(!$("screen-shop").classList.contains("hidden")) renderShop();
  floatText("+$" + n.toLocaleString() + "!", "#c77dff");
  toast("🎮 +$" + n.toLocaleString() + " added. Spend it wisely-ish.");
}
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
  $("hud").classList.add("hidden"); setSpeedoVisible(false); $("touch-controls").classList.add("hidden"); $("pitch-hint").classList.add("hidden");
  refreshMenu();
}
function showShop(){
  window.DA.Game.phase = "shop";
  hideAll(); $("screen-shop").classList.remove("hidden");
  $("hud").classList.add("hidden"); setSpeedoVisible(false); $("touch-controls").classList.add("hidden"); $("pitch-hint").classList.add("hidden");
  renderShop();
}
function showStats(){ subReturn = window.DA.Game.phase==="shop"?"shop":"menu"; hideAll(); $("screen-stats").classList.remove("hidden"); renderStats(); }
function showSettings(){ subReturn = window.DA.Game.phase==="shop"?"shop":"menu"; hideAll(); $("screen-settings").classList.remove("hidden"); }
function showCheats(){
  subReturn = window.DA.Game.phase==="shop" ? "shop" : "menu";
  if(!$("screen-settings").classList.contains("hidden")) subReturn = "settings";
  hideAll(); $("screen-cheats").classList.remove("hidden");
}
function showSettingsFromPause(){
  subReturn = "pause"; // back button returns to the paused game, still paused
  hideAll(); $("screen-settings").classList.remove("hidden");
}
function goBackFromSub(){
  hideAll();
  if(subReturn==="shop") showShop();
  else if(subReturn==="settings") showSettings();
  else if(subReturn==="pause"){ $("screen-pause").classList.remove("hidden"); }
  else showMenu();
}
function hideAll(){ ["screen-menu","screen-shop","screen-results","screen-stats","screen-settings","screen-cheats","screen-pause"].forEach(function(id){ $(id).classList.add("hidden"); }); }

function refreshMenu(){
  $("menu-best-dist").textContent = "Best: " + window.DA.Physics.fmtDist(save.best.dist);
  $("menu-flights").textContent = "Flights: " + save.flights;
  $("menu-cash").textContent = "$" + save.money.toLocaleString();
  // SHOP glows on the menu whenever a new purchase is affordable
  var sb = $("btn-shop");
  if(sb){
    var nx = nextAffordable();
    sb.classList.toggle("attn", !!(nx && nx.price <= save.money));
  }
}

function showFlight(){
  hideAll();
  $("hud").classList.remove("hidden");
  setSpeedoVisible(true);
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
  updateSpeedo(G);
  var hasBooster = !!(G.P && G.P.thrust > 0);
  var f = (G.S.fuelMax>0 && hasBooster) ? G.S.fuel/G.S.fuelMax : 0;
  var fill = $("fuel-fill");
  fill.style.width = (f*100).toFixed(1)+"%";
  fill.className = (!hasBooster || f<0.25) ? "low" : "";
  fill.id = "fuel-fill";
  var fl = $("fuel-label");
  if(fl) fl.textContent = hasBooster ? "FUEL" : "NO BOOSTER";
  var fb = $("fuel-bar");
  if(fb) fb.classList.toggle("burning", !!G.S.boosting && hasBooster);
  $("hud-best").textContent = window.DA.Physics.fmtDist(save.best.dist);
  // pause panel run readout (kept fresh live; shown only when paused)
  var pd = $("pause-stat-dist"), ps2 = $("pause-stat-speed"), pa = $("pause-stat-alt");
  if(pd) pd.textContent = window.DA.Physics.fmtDist(Math.max(0,G.S.x));
  if(ps2) ps2.textContent = Math.round((G.S.speed||0)*3.6)+" km/h";
  if(pa) pa.textContent = Math.max(0,G.S.y).toFixed(0)+" m";
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
  // loadout: tiny equipped-equipment readout (cached, cheap)
  var lo = gliderName(save.glider.equipped) + "|" + save.rocket.equipped;
  if(lo !== G._lastLoadout){
    G._lastLoadout = lo;
    var ll = $("loadout-label");
    if(ll) ll.textContent = "🪂 " + gliderName(save.glider.equipped) + " • 🚀 " + rocketName(save.rocket.equipped);
  }
}

function onRecord(){
  $("record-banner").classList.remove("hidden");
  var hb = $("hud-best");
  if(hb){ hb.classList.remove("bestflash"); void hb.offsetWidth; hb.classList.add("bestflash"); }
  window.DA.Audio.SFX.record();
  toast("🎉 NEW RECORD!");
}

/* ---------- SPEEDOMETER (bottom-right arcade gauge) ---------- */
var SP_MAX = 400; // gauge face range; numbers never clamp, needle pins instead
var spBuilt = false, spRedKey = "";
function spAngle(frac){ return (135 + 270 * Math.max(0, Math.min(1, frac))) * Math.PI / 180; }
function spPoint(frac, r){
  var a = spAngle(frac);
  return [90 + r * Math.cos(a), 90 + r * Math.sin(a)];
}
function spArcD(f0, f1, r){
  var p0 = spPoint(f0, r), p1 = spPoint(f1, r);
  var large = (f1 - f0) > 0.5 ? 1 : 0;
  return "M " + p0[0].toFixed(1) + " " + p0[1].toFixed(1) +
         " A " + r + " " + r + " 0 " + large + " 1 " +
         p1[0].toFixed(1) + " " + p1[1].toFixed(1);
}
function setSpeedoVisible(on){
  var el = $("speedometer");
  if(el) el.classList.toggle("hidden", !on);
}
function buildSpeedo(){
  if(spBuilt) return;
  spBuilt = true;
  var NS = "http://www.w3.org/2000/svg";
  var ticks = $("sp-ticks");
  if(ticks && ticks.appendChild){
    for(var v=0; v<=SP_MAX; v+=20){
      var major = (v % 100 === 0);
      var p0 = spPoint(v/SP_MAX, major ? 66 : 70), p1 = spPoint(v/SP_MAX, 78);
      var ln = document.createElementNS ? document.createElementNS(NS, "line") : null;
      if(!ln || !ln.setAttribute) continue;
      ln.setAttribute("x1", p0[0]); ln.setAttribute("y1", p0[1]);
      ln.setAttribute("x2", p1[0]); ln.setAttribute("y2", p1[1]);
      ln.setAttribute("class", major ? "sp-tick major" : "sp-tick");
      ticks.appendChild(ln);
      if(major){
        var lp = spPoint(v/SP_MAX, 54);
        var tx = document.createElementNS(NS, "text");
        if(!tx.setAttribute) continue;
        tx.setAttribute("x", lp[0]); tx.setAttribute("y", lp[1] + 3.5);
        tx.setAttribute("class", "sp-lab");
        tx.textContent = String(v);
        ticks.appendChild(tx);
      }
    }
  }
  var track = $("sp-track"), prog = $("sp-prog");
  if(track && track.setAttribute) track.setAttribute("d", spArcD(0, 1, 64));
  if(prog && prog.setAttribute) prog.setAttribute("d", spArcD(0, 1, 64));
}
function updateSpeedo(G){
  var box = $("speedometer");
  if(!box) return;
  var spdKmh = Math.round((G.S.speed||0)*3.6);
  var num = $("sp-number");
  if(num){
    num.textContent = String(spdKmh);
    // punch the number on rapid gains (dopamine for diving/boosting)
    if(G._lastSpd !== undefined && spdKmh - G._lastSpd > 6 && G.phase === "fly"){
      num.classList.remove("punch"); void num.offsetWidth; num.classList.add("punch");
    }
  }
  G._lastSpd = spdKmh;
  // smoothed needle (mechanical feel, still immediate)
  var disp = (G._spdDisp === undefined) ? spdKmh : G._spdDisp + (spdKmh - G._spdDisp) * 0.3;
  if(!isFinite(disp)) disp = spdKmh;
  G._spdDisp = disp;
  var frac = Math.max(0, Math.min(1, disp / SP_MAX));
  var boosting = !!G.S.boosting;
  var needle = $("sp-needle");
  if(needle && needle.setAttribute){
    var deg = -135 + 270 * frac;
    if(boosting && disp > 40) deg += (Math.random()-0.5) * 2.4; // faint boost tremble
    needle.setAttribute("transform", "rotate(" + deg.toFixed(1) + " 90 90)");
  }
  var prog = $("sp-prog");
  if(prog && prog.setAttribute) prog.setAttribute("stroke-dasharray", (frac*100).toFixed(1) + " 100");
  // redline zone follows the equipped glider (rebuilt only when it changes)
  if(G.P){
    var key = G.P.comfort.toFixed(1) + "|" + G.P.top.toFixed(1);
    if(key !== spRedKey){
      spRedKey = key;
      var red = $("sp-red");
      if(red && red.setAttribute) red.setAttribute("d", spArcD(G.P.comfort/SP_MAX, Math.min(1, G.P.top/SP_MAX), 64));
    }
  }
  // visual states: fast -> redline -> extreme, plus boost glow
  var overTop = !!(G.P && (G.S.speed||0) > G.P.top);
  var overMax = (G.S.speed||0)*3.6 > SP_MAX;
  var fast = !!(G.P && (G.S.speed||0) > G.P.comfort);
  box.classList.toggle("fast", fast && !overTop);
  box.classList.toggle("redline", overTop);
  box.classList.toggle("extreme", overMax);
  box.classList.toggle("boosting", boosting);
  if(num){
    num.style.color = overTop ? "#ff5d5d" : fast ? "#ffb703" : "#fff";
  }
}
// launch moment: punchy whoosh (the ramp sound already played at release)
function onLaunch(){ window.DA.Audio.ensure(); window.DA.Audio.SFX.whoosh(); }
// boost ignition: flash + fuel glow + speed punch reset
function onBoostStart(){
  window.DA.Audio.SFX.ignite();
  var f = document.getElementById("flash");
  if(f){ f.style.transition="none"; f.style.opacity="0.25"; f.style.background="#ffdca8";
    requestAnimationFrame(function(){ f.style.transition="opacity 0.25s"; f.style.opacity="0"; setTimeout(function(){ f.style.background="#fff"; }, 300); }); }
  var fb = $("fuel-bar");
  if(fb){ fb.classList.remove("burning"); void fb.offsetWidth; fb.classList.add("burning"); }
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

/* ---------- SHOP: loadout preview, gliders, rockets, workshop ---------- */
var SVG_WING = '<svg class="sec-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L21 19 L12 15.5 L3 19 Z" fill="currentColor"/><path d="M12 3 L12 15.5" stroke="#0b1626" stroke-width="1.6"/></svg>';
var SVG_ROCKET = '<svg class="sec-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1c3 2.5 4.5 6.5 4.5 10.5l2.5 3.5-3.5-.5c-.8 1-1.9 1.7-3.5 2-1.6-.3-2.7-1-3.5-2l-3.5.5L7.5 11.5C7.5 7.5 9 3.5 12 1z" fill="currentColor"/><circle cx="12" cy="9" r="2" fill="#0b1626"/><path d="M10 17.5 L12 22 L14 17.5" fill="currentColor"/></svg>';
var SVG_GEAR = '<svg class="sec-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5zM12 1l1.4 3a8 8 0 0 1 2.5 1.1L19 3.8l1.2 2.1-2.4 2.2a8 8 0 0 1 0 2.6l2.4 2.2-1.2 2.1-3.1-1.3a8 8 0 0 1-2.5 1.1L12 19l-1.4-3a8 8 0 0 1-2.5-1.1L5 16.2l-1.2-2.1 2.4-2.2a8 8 0 0 1 0-2.6L3.8 7.1 5 5l3.1 1.3a8 8 0 0 1 2.5-1.1L12 1z" fill="currentColor" fill-rule="evenodd"/></svg>';
function secHead(icon, title, sub){
  return '<span class="sec-title">' + icon + "<b>" + title + "</b>" +
    (sub ? "<small>" + sub + "</small>" : "") + "</span>";
}
function gliderName(id){
  var g = window.DA.GLIDERS && window.DA.GLIDERS[id];
  return g ? g.name : "Bare Dodo";
}
function rocketName(id){
  var r = window.DA.ROCKETS && id >= 0 && window.DA.ROCKETS[id];
  return r ? r.name : "none yet";
}
function renderShop(){
  $("shop-cash").textContent = "$" + save.money.toLocaleString();
  computeHotPick();
  renderGliders();
  renderRockets();
  renderTracks();
  drawPreview();
  var q = window.DA.PREVIEW_QUIPS[(Math.random()*window.DA.PREVIEW_QUIPS.length)|0];
  $("preview-text").textContent = '"' + q + '" — 🪂 ' + gliderName(save.glider.equipped) +
    " • 🚀 " + rocketName(save.rocket.equipped);
}
function totalLv(){ var t=0; for(var k in save.upgrades) t+=save.upgrades[k]; return t; }
function maxLv(){
  var t=0;
  for(var k in save.upgrades){
    var u = window.DA.UPGRADES[k];
    t += u ? u.max : 8;
  }
  return t;
}
function ownedGliders(){
  // collectible gliders only: Bare Dodo (id 0) is the free baseline, not stock
  var n=0, g = save.glider.owned;
  for(var i=1;i<g.length;i++) if(g[i]) n++;
  return n;
}
function gliderStockCount(){
  var n=0, all = window.DA.GLIDERS || [];
  for(var i=1;i<all.length;i++) n++;
  return n;
}
function ownedRockets(){ var n=0, r = save.rocket.owned; for(var i=0;i<r.length;i++) if(r[i]) n++; return n; }

/* ---------- GLIDER HANGAR: exactly 5 buyable gliders (id 1-5) ---------- */
function statBar(label, v){
  var bars = "";
  for(var i=0;i<10;i++) bars += '<div class="pip'+(i<Math.round(v)?' on':'')+'"></div>';
  return '<div class="gstat"><span>'+label+'</span><div class="pips">'+bars+'</div></div>';
}
function equipCard(opts){
  // shared card builder: {name, tag, status, barsHtml, preview(draw fn),
  // btnText, btnDisabled, onBtn, flashId, equipped, dim, hot}
  var card = document.createElement("div");
  card.className = "up-card gcard" + (opts.equipped ? " maxed equipped" : "") + (opts.dim ? " cant" : "") + (opts.hot ? " hotpick" : "");
  if(opts.flashId) card.id = opts.flashId;
  var cv = document.createElement("canvas");
  cv.width = 320; cv.height = 180; cv.className = "gprev";
  card.appendChild(cv);
  var info = document.createElement("div");
  info.innerHTML =
    '<div class="up-top"><span class="up-name">' + opts.name + '</span>' +
    '<span class="up-lvl">' + opts.status + '</span></div>' +
    '<div class="up-desc">' + opts.tag + '</div>' + opts.barsHtml;
  card.appendChild(info);
  var btn = document.createElement("button");
  btn.className = "buy-btn";
  btn.textContent = opts.btnText;
  btn.disabled = !!opts.btnDisabled;
  if(opts.onBtn) btn.onclick = opts.onBtn;
  card.appendChild(btn);
  try{ opts.preview(cv); }catch(e){}
  return card;
}
function renderGliders(){
  var wrap = $("glider-grid");
  if(!wrap || !window.DA.GLIDERS) return;
  wrap.innerHTML = "";
  var eq = save.glider.equipped;
  var head = document.createElement("div");
  head.className = "glider-head";
  head.innerHTML = secHead(SVG_WING, "GLIDERS",
    "equipped: <b>" + (window.DA.GLIDERS[eq] ? window.DA.GLIDERS[eq].name : "Bare Dodo") + "</b>");
  wrap.appendChild(head);
  window.DA.GLIDERS.forEach(function(gl){
    if(gl.id === 0) return; // Bare Dodo is the free baseline, not a shop card
    var owned = !!save.glider.owned[gl.id];
    var equipped = (eq === gl.id);
    var hot = isHotPick("glider", gl.id);
    wrap.appendChild(equipCard({
      name: gl.name, tag: gl.tag,
      status: equipped ? "EQUIPPED" : owned ? "OWNED" : "$" + gl.price.toLocaleString(),
      barsHtml: statBar("GLIDE", gl.bars.fly) + statBar("SPEED", gl.bars.speed) + statBar("CONTROL", gl.bars.ctrl),
      preview: function(cv){ window.DA.drawGliderPreview(cv, gl.id); },
      equipped: equipped, dim: !owned && gl.price > save.money,
      flashId: "card-glider-" + gl.id, hot: hot,
      btnText: (hot && !equipped && !owned ? "★ " : "") + (equipped ? "✔ EQUIPPED" : owned ? "EQUIP" : "BUY — $" + gl.price.toLocaleString()),
      btnDisabled: equipped || (!owned && gl.price > save.money),
      onBtn: equipped ? null : owned
        ? (function(id){ return function(){ equipGlider(id); }; })(gl.id)
        : (function(id, price){ return function(){ buyGlider(id, price); }; })(gl.id, gl.price)
    }));
  });
}
/* ---------- ROCKET HANGAR: exactly 3 boosters ---------- */
function renderRockets(){
  var wrap = $("rocket-grid");
  if(!wrap || !window.DA.ROCKETS) return;
  wrap.innerHTML = "";
  var eq = save.rocket.equipped;
  var head = document.createElement("div");
  head.className = "glider-head";
  head.innerHTML = secHead(SVG_ROCKET, "ROCKET BOOSTERS", "equipped: <b>" + rocketName(eq) + "</b>");
  wrap.appendChild(head);
  window.DA.ROCKETS.forEach(function(rk){
    var owned = !!save.rocket.owned[rk.id];
    var equipped = (eq === rk.id);
    var hot = isHotPick("rocket", rk.id);
    wrap.appendChild(equipCard({
      name: rk.name, tag: rk.tag,
      status: equipped ? "EQUIPPED" : owned ? "OWNED" : "$" + rk.price.toLocaleString(),
      barsHtml: statBar("THRUST", rk.bars.thrust) + statBar("BURN", rk.bars.burn),
      preview: function(cv){ window.DA.drawRocketPreview(cv, rk.id); },
      equipped: equipped, dim: !owned && rk.price > save.money,
      flashId: "card-rocket-" + rk.id, hot: hot,
      btnText: (hot && !equipped && !owned ? "★ " : "") + (equipped ? "✔ EQUIPPED" : owned ? "EQUIP" : "BUY — $" + rk.price.toLocaleString()),
      btnDisabled: equipped || (!owned && rk.price > save.money),
      onBtn: equipped ? null : owned
        ? (function(id){ return function(){ equipRocket(id); }; })(rk.id)
        : (function(id, price){ return function(){ buyRocket(id, price); }; })(rk.id, rk.price)
    }));
  });
}
/* ---------- WORKSHOP: small permanent upgrades ---------- */
function renderTracks(){
  var grid = $("shop-grid");
  if(!grid) return;
  grid.innerHTML = "";
  var head = document.createElement("div");
  head.className = "glider-head";
  head.innerHTML = secHead(SVG_GEAR, "WORKSHOP", "permanent upgrades");
  grid.appendChild(head);
  ["ramp","sled","aero","fuel"].forEach(function(k){
    var u = window.DA.UPGRADES[k];
    if(!u) return;
    var lvl = save.upgrades[k] || 0;
    var maxed = lvl>=u.max;
    var price = maxed?0:window.DA.priceOf(k,lvl);
    var hot = isHotPick("track", k);
    var card = document.createElement("div");
    card.className = "up-card" + (maxed?" maxed":"") + (price>save.money&&!maxed?" cant":"") + (hot?" hotpick":"");
    card.id = "card-"+k;
    var cv = document.createElement("canvas");
    cv.width = 320; cv.height = 180; cv.className = "gprev";
    card.appendChild(cv);
    try{ if(window.DA.drawPartPreview) window.DA.drawPartPreview(cv, k, lvl); }catch(e){}
    var pips = "";
    for(var i=0;i<u.max;i++) pips += '<div class="pip'+(i<lvl?' on':'')+'"></div>';
    var extra = "";
    if(k === "fuel"){ // show real burn seconds for the equipped rocket
      var rq = save.rocket.equipped;
      if(rq >= 0 && window.DA.ROCKETS && window.DA.ROCKETS[rq]){
        var base = window.DA.ROCKETS[rq].burn;
        extra = '<div class="up-next">Burn with ' + window.DA.ROCKETS[rq].name + ': ' +
          (base*window.DA.fuelMult(lvl)).toFixed(1) + "s" +
          (maxed ? "" : " → " + (base*window.DA.fuelMult(lvl+1)).toFixed(1) + "s") + "</div>";
      } else {
        extra = '<div class="up-next">No rocket equipped — buy one to burn anything!</div>';
      }
    }
    var info = document.createElement("div");
    info.innerHTML =
      '<div class="up-top"><span class="up-name">'+u.icon+' '+u.name+'</span><span class="up-lvl">Lv '+lvl+'/'+u.max+'</span></div>' +
      '<div class="pips">'+pips+'</div>' +
      '<div class="up-desc">'+u.blurb+'</div>' +
      '<div class="up-desc" style="color:#fff">Now: '+u.desc(lvl)+'</div>' +
      '<div class="up-next">'+u.next(lvl)+'</div>' + extra;
    card.appendChild(info);
    var btn = document.createElement("button");
    btn.className = "buy-btn";
    if(maxed){ btn.textContent = "★ MAXED ★"; btn.disabled = true; }
    else { btn.textContent = (hot?"★ ":"") + "BUY — $" + price.toLocaleString(); btn.disabled = price>save.money; }
    btn.onclick = (function(key, p){
      return function(){ buy(key, p); };
    })(k, price);
    card.appendChild(btn);
    grid.appendChild(card);
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
  floatText("🪂 NEW GLIDER: " + gl.name + "!", "#80ed99");
  toast("🪂 NEW GLIDER: " + gl.name + " equipped!");
  flashCard("card-glider-" + id);
  renderShop();
  refreshMenu();
}
function buyRocket(id, price){
  var rk = window.DA.ROCKETS[id];
  if(!rk || save.rocket.owned[id]) return;
  if(save.money < price){ window.DA.Audio.SFX.denied(); toast("❌ Not enough cash! One more flight..."); return; }
  save.money -= price;
  save.rocket.owned[id] = true;
  save.rocket.equipped = id;
  window.DA.Save.save(save);
  window.DA.Audio.SFX.purchase();
  floatText("🚀 NEW ROCKET: " + rk.name + "!", "#80ed99");
  toast("🚀 NEW ROCKET: " + rk.name + " equipped!");
  flashCard("card-rocket-" + id);
  renderShop();
  refreshMenu();
}
function flashCard(id){
  var card = $(id);
  if(card){ card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash"); }
}
function equipGlider(id){
  if(!save.glider.owned[id] || save.glider.equipped === id) return;
  save.glider.equipped = id;
  window.DA.Save.save(save);
  window.DA.Audio.ensure(); window.DA.Audio.SFX.equip();
  toast("🪂 Equipped " + gliderName(id) + "!");
  renderShop();
  refreshMenu();
}
function equipRocket(id){
  if(!save.rocket.owned[id] || save.rocket.equipped === id) return;
  save.rocket.equipped = id;
  window.DA.Save.save(save);
  window.DA.Audio.ensure(); window.DA.Audio.SFX.equip();
  toast("🚀 Equipped " + rocketName(id) + "!");
  renderShop();
  refreshMenu();
}
/* Next affordable purchase of any kind (equipment or track level).
   Used for the menu SHOP glow, the results nudge, and the in-shop hotpick. */
function nextAffordable(){
  var cands = [];
  if(window.DA.GLIDERS) window.DA.GLIDERS.forEach(function(gl){
    if(gl.id !== 0 && !save.glider.owned[gl.id]) cands.push({ type:"glider", id:gl.id, label:"🪂 " + gl.name, price:gl.price });
  });
  if(window.DA.ROCKETS) window.DA.ROCKETS.forEach(function(rk){
    if(!save.rocket.owned[rk.id]) cands.push({ type:"rocket", id:rk.id, label:"🚀 " + rk.name, price:rk.price });
  });
  ["ramp","sled","aero","fuel"].forEach(function(k){
    var u = window.DA.UPGRADES[k];
    if(!u) return;
    var lvl = save.upgrades[k] || 0;
    if(lvl < u.max) cands.push({ type:"track", id:k, label:u.icon + " " + u.name + " Lv " + (lvl+1), price:window.DA.priceOf(k, lvl) });
  });
  cands.sort(function(a,b){ return a.price - b.price; });
  return cands.length ? cands[0] : null;
}
/* Cheapest AFFORDABLE purchase right now (for the in-shop hotpick). */
var hotPick = null;
function computeHotPick(){
  hotPick = null;
  var cands = [];
  if(window.DA.GLIDERS) window.DA.GLIDERS.forEach(function(gl){
    if(gl.id !== 0 && !save.glider.owned[gl.id] && gl.price <= save.money)
      cands.push({ type:"glider", id:gl.id, price:gl.price });
  });
  if(window.DA.ROCKETS) window.DA.ROCKETS.forEach(function(rk){
    if(!save.rocket.owned[rk.id] && rk.price <= save.money)
      cands.push({ type:"rocket", id:rk.id, price:rk.price });
  });
  ["ramp","sled","aero","fuel"].forEach(function(k){
    var u = window.DA.UPGRADES[k];
    if(!u) return;
    var lvl = save.upgrades[k] || 0;
    if(lvl >= u.max) return;
    var pr = window.DA.priceOf(k, lvl);
    if(pr <= save.money) cands.push({ type:"track", id:k, price:pr });
  });
  cands.sort(function(a,b){ return a.price - b.price; });
  if(cands.length) hotPick = cands[0];
}
function isHotPick(type, id){
  return !!hotPick && hotPick.type === type && String(hotPick.id) === String(id);
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
  var W = c.width || 420, H = c.height || 200;
  g.clearRect(0,0,W,H);
  var grd = g.createLinearGradient(0,0,0,H);
  grd.addColorStop(0,"#87b5d6"); grd.addColorStop(1,"#e3f2fd");
  g.fillStyle = grd; g.fillRect(0,0,W,H);
  // soft sun glow
  var sun = g.createRadialGradient(W*0.82,H*0.22,4,W*0.82,H*0.22,60);
  sun.addColorStop(0,"rgba(255,246,200,0.9)"); sun.addColorStop(1,"rgba(255,246,200,0)");
  g.fillStyle = sun; g.fillRect(0,0,W,H);
  g.fillStyle = "#fff"; g.fillRect(0,H-32,W,32);
  g.fillStyle = "#dfe7ec"; g.fillRect(0,H-32,W,3);
  // snow hill
  g.fillStyle = "#f4f8ff";
  g.beginPath(); g.moveTo(0,H-32);
  g.quadraticCurveTo(W*0.25,H-100,W*0.55,H-52);
  g.lineTo(W,H-40); g.lineTo(W,H-32); g.closePath(); g.fill();
  g.fillStyle = "rgba(120,150,200,0.25)";
  g.beginPath(); g.ellipse(W*0.3,H-34,60,8,0,0,7); g.fill();
  window.DA.World.drawDodo(g, W*0.42, H-72, {
    pitch: -0.15, vx: 20, vy: 4, boosting:false, stalled:false,
    glider: save.glider.equipped, rocket: save.rocket.equipped,
    sledLvl: save.upgrades.sled, aeroLvl: save.upgrades.aero
  }, 1.9, {});
  g.fillStyle = "#123"; g.font = "bold 13px sans-serif"; g.textAlign="left";
  g.fillText("Ramp "+save.upgrades.ramp+" • Sled "+save.upgrades.sled+" • Aero "+save.upgrades.aero+" • Fuel Lv "+(save.upgrades.fuel||0)+"/5", 10, 20);
  var lg = $("loadout-glider"), lr = $("loadout-rocket"), lf = $("loadout-fuel");
  if(lg) lg.textContent = gliderName(save.glider.equipped);
  if(lr) lr.textContent = rocketName(save.rocket.equipped);
  if(lf) lf.textContent = "Lv " + (save.upgrades.fuel || 0) + " / 5";
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
  $("hud").classList.add("hidden"); setSpeedoVisible(false); $("touch-controls").classList.add("hidden");
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
  // default loop: FLIGHT -> RESULTS -> SHOP. After counting finishes plus a
  // beat, glide into the shop — unless the player already chose otherwise
  // (PLAY AGAIN bumps runId; SHOP/Menu hide this screen; phase changes).
  setTimeout(function(){
    if(id !== runId) return;
    if(window.DA.Game.phase !== "results") return;
    if($("screen-results").classList.contains("hidden")) return;
    showShop();
  }, 120*(rows.length+1) + 1500);
  // affordable nudge: point at the next equipment ("one more flight" fuel)
  var od2 = $("results-objectives");
  var next = nextAffordable();
  var shopBtn = $("btn-to-shop");
  if(shopBtn) shopBtn.classList.remove("attn");
  if(next && id === runId){
    if(save.money >= next.price){
      var ndiv = document.createElement("div");
      ndiv.className = "obj-done nudge";
      ndiv.textContent = "🛒 NEW EQUIPMENT AFFORDABLE: " + next.label + " ($" + next.price.toLocaleString() + ")!";
      od2.appendChild(ndiv);
      if(shopBtn) shopBtn.classList.add("attn");
    } else {
      var soon = document.createElement("div");
      soon.className = "obj-soon";
      soon.textContent = "Next: " + next.label + " ($" + next.price.toLocaleString() + ") — wallet $" + save.money.toLocaleString();
      od2.appendChild(soon);
    }
  }
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
    statBox("PILOT LEVEL", "Lv "+totalLv()+"/"+maxLv()) +
    statBox("GLIDERS OWNED", ownedGliders()+"/"+gliderStockCount()) +
    statBox("ROCKETS", ownedRockets()+"/3");
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
  onLaunch:onLaunch, onBoostStart:onBoostStart,
  toast:toast, floatText:floatText, enterPressed:enterPressed, refreshMenu:refreshMenu, renderShop:renderShop,
  onRunStart:onRunStart };
})();
