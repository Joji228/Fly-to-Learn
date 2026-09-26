/* UI: screens, HUD, shop, results animation, stats, settings. */
(function(){
"use strict";

var save = null;
function $(id){ return document.getElementById(id); }

function init(s){
  save = s;
  bindButtons();
  bindShopTabs();
  buildSpeedo();
  renderShop();
  refreshMenu();
  refreshModeBtn();
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
  $("btn-mode").onclick = function(){ click(); switchMode(); };
  $("btn-export").onclick = function(){ click(); exportSave(); };
  $("btn-import").onclick = function(){ click(); $("import-file").click(); };
  $("import-file").onchange = function(e){ importSave(e); };
  $("btn-restart").onclick = function(){
    click();
    window.DA.pauseGame(false);
    $("screen-pause").classList.add("hidden");
    window.DA.abandonRun(); // drops the current attempt without banking it
    window.DA.startRun();   // ...and launches a fresh one immediately
  };
  $("btn-pause-settings").onclick = function(){ click(); showSettingsFromPause(); };
  $("btn-quit").onclick = function(){ click(); $("screen-pause").classList.add("hidden"); window.DA.abandonRun(); };
  $("btn-pause").onclick = function(){ click(); dropFocus(this); window.DA.pauseGame(true); };
  // HUD mute is a MASTER mute (SFX + music): the old SFX-only toggle left
  // the music playing, which read as "mute is broken". Granular toggles
  // stay in Settings.
  $("btn-mute-hud").onclick = function(){
    dropFocus(this); // a focused HUD button would re-fire on Enter mid-flight
    var on = !(save.settings.sfx || save.settings.music);
    save.settings.sfx = on; save.settings.music = on;
    window.DA.Save.save(save);
    window.DA.Audio.setEnabled(save.settings.sfx, save.settings.music);
    applySettingsToInputs();
  };
  $("set-sfx").onchange = function(e){ save.settings.sfx=e.target.checked; window.DA.Save.save(save); window.DA.Audio.setEnabled(save.settings.sfx, save.settings.music); updateMuteBtn(); };
  $("set-music").onchange = function(e){ save.settings.music=e.target.checked; window.DA.Save.save(save); window.DA.Audio.setEnabled(save.settings.sfx, save.settings.music); };
  $("set-shake").onchange = function(e){
    save.settings.shake=e.target.checked; window.DA.Save.save(save); applyMotionClass();
    if(!save.settings.shake && window.DA.Game){ window.DA.Game.shake=0; window.DA.Game.zoomPunch=0; }
  };
  $("set-particles").onchange = function(e){ save.settings.particles=e.target.checked; if(window.DA.Game.particles) window.DA.Game.particles.enabled=save.settings.particles; window.DA.Save.save(save); };
  if($("btn-sb-all")) $("btn-sb-all").onclick = function(){ click(); window.DA.Save.sandboxUnlock(save); window.DA.Save.save(save); refreshMenu(); renderShop(); toast("🧪 All gear unlocked. Go break physics (gently)."); };
  if($("btn-sb-max")) $("btn-sb-max").onclick = function(){ click(); window.DA.Save.sandboxMaxWorkshop(save); window.DA.Save.save(save); refreshMenu(); renderShop(); toast("🧪 Workshop maxed. Stupid-fast enabled."); };
  if($("btn-sb-cash")) $("btn-sb-cash").onclick = function(){ click(); save.money += 50000; window.DA.Save.save(save); refreshMenu(); renderShop(); toast("🧪 +$50,000 sandbox funds."); };
  $("btn-reset-save").onclick = function(){
    var modeName = (window.DA.Save.getMode() === "sandbox") ? "Sandbox" : "Campaign";
    if(confirm("Reset " + modeName + " progress? The other mode keeps its save. (This cannot be undone.)")){
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
function dropFocus(el){ try{ if(el && el.blur) el.blur(); }catch(e){} }
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
function updateMuteBtn(){
  var anyOn = !!(save.settings.sfx || save.settings.music);
  $("btn-mute-hud").textContent = anyOn ? "🔊" : "🔇";
  try{ $("btn-mute-hud").setAttribute("aria-label", anyOn ? "Mute all sound" : "Unmute sound"); }catch(e){}
}
function hasBooster(){ return !!(save && save.rocket && save.rocket.equipped >= 0); }
/* Completionist skin: every bonus objective done, in any order. */
function isGolden(s){
  if(!s || !Array.isArray(s.objectivesDone)) return false;
  return window.DA.OBJECTIVES.every(function(o){ return s.objectivesDone.indexOf(o.id) >= 0; });
}
/* Campaign <-> sandbox: separate saves, separate progress. Switching saves
   the current mode first so nothing is lost, then reloads the other. */
function refreshModeBtn(){
  var b = $("btn-mode");
  if(b) b.textContent = (window.DA.Save.getMode() === "sandbox" ? "Sandbox" : "Campaign") + " ⇄";
}
function switchMode(){
  window.DA.Save.save(save); // bank current mode first
  var next = window.DA.Save.getMode() === "sandbox" ? "campaign" : "sandbox";
  window.DA.Save.setMode(next);
  save = window.DA.Save.load();
  window.DA.Game.save = save;
  if(window.DA.Game.particles) window.DA.Game.particles.enabled = save.settings.particles;
  applySettingsToInputs(); refreshMenu(); renderShop(); refreshModeBtn();
  window.DA.Audio.setEnabled(save.settings.sfx, save.settings.music);
  toast(next === "sandbox" ? "🗂️ Sandbox save — separate progress, same sky." : "🗂️ Campaign save — the grind continues.");
}
function exportSave(){
  try{
    var blob = new Blob([window.DA.Save.exportJSON(save)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dodo-airways-" + window.DA.Save.getMode() + ".json";
    document.body.appendChild(a); a.click();
    setTimeout(function(){ try{ URL.revokeObjectURL(a.href); a.remove(); }catch(e){} }, 500);
    toast("💾 Save exported. Guard it with your life.");
  }catch(e){ toast("❌ Export failed in this browser."); }
}
function importSave(e){
  try{
    var f = e && e.target && e.target.files && e.target.files[0];
    if(!f) return;
    var rd = new FileReader();
    rd.onload = function(){
      try{
        save = window.DA.Save.importJSON(String(rd.result || ""));
        window.DA.Game.save = save;
        if(window.DA.Game.particles) window.DA.Game.particles.enabled = save.settings.particles;
        applySettingsToInputs(); refreshMenu(); renderShop(); refreshModeBtn();
        window.DA.Audio.setEnabled(save.settings.sfx, save.settings.music);
        toast("📥 Save imported. Welcome back, Dennis.");
      }catch(err){ toast("❌ That file is not a valid save."); }
      try{ e.target.value = ""; }catch(e2){}
    };
    rd.readAsText(f);
  }catch(e2){ toast("❌ Import failed in this browser."); }
}
/* Reduced motion: OS preference OR shake toggle off. Kills CSS animation
   globally (body class) and gates JS-driven flashes / FOV punches. */
function reducedMotion(){
  try{
    if(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  }catch(e){}
  return !save.settings.shake;
}
function applyMotionClass(){
  try{ document.body.classList.toggle("reduced-motion", reducedMotion()); }catch(e){}
}
function applySettingsToInputs(){
  $("set-sfx").checked = save.settings.sfx;
  $("set-music").checked = save.settings.music;
  $("set-shake").checked = save.settings.shake;
  $("set-particles").checked = save.settings.particles;
  updateMuteBtn();
  applyMotionClass();
}

var subReturn = "menu";
// where Settings itself goes back to. Tracked apart from subReturn so a
// detour Settings -> Cheats -> Back -> Back still lands on the paused
// flight instead of dumping the run on the main menu.
var settingsReturn = "menu";
function showMenu(){
  window.DA.Game.phase = "menu";
  try{ dropFocus(document.activeElement); }catch(e){} // quit-to-menu must not leave a focused flight button behind
  hideAll(); $("screen-menu").classList.remove("hidden");
  $("hud").classList.add("hidden"); setSpeedoVisible(false); $("touch-controls").classList.add("hidden"); $("pitch-hint").classList.add("hidden");
  refreshMenu();
}
function showShop(){
  window.DA.Game.phase = "shop";
  try{ dropFocus(document.activeElement); }catch(e){} // same stale-focus hazard as showFlight/showResults
  hideAll(); $("screen-shop").classList.remove("hidden");
  computeHotPick(); shopTab = hotPick ? hotPick.type : (shopTab || "glider");
  $("hud").classList.add("hidden"); setSpeedoVisible(false); $("touch-controls").classList.add("hidden"); $("pitch-hint").classList.add("hidden");
  renderShop();
}
function showStats(){ subReturn = window.DA.Game.phase==="shop"?"shop":"menu"; hideAll(); $("screen-stats").classList.remove("hidden"); renderStats(); }
function showSettings(){
  settingsReturn = subReturn = window.DA.Game.phase==="shop"?"shop":"menu";
  openSettings(false);
}
function showCheats(){
  subReturn = window.DA.Game.phase==="shop" ? "shop" : "menu";
  if(!$("screen-settings").classList.contains("hidden")) subReturn = "settings";
  hideAll(); $("screen-cheats").classList.remove("hidden");
}
function showSettingsFromPause(){
  settingsReturn = subReturn = "pause"; // back button returns to the paused game, still paused
  openSettings(true);
}
/* Mid-flight, the save-swapping actions (reset / import) would replace the
   save under a live run, so they only show from the menu or shop. */
function openSettings(fromPause){
  hideAll();
  try{
    $("save-row").classList.toggle("hidden", fromPause);
    $("btn-reset-save").classList.toggle("hidden", fromPause);
  }catch(e){}
  $("screen-settings").classList.remove("hidden");
}
function goBackFromSub(){
  hideAll();
  if(subReturn==="shop") showShop();
  else if(subReturn==="settings"){ subReturn = settingsReturn; openSettings(settingsReturn==="pause"); }
  else if(subReturn==="pause"){ $("screen-pause").classList.remove("hidden"); }
  else showMenu();
}
function hideAll(){ ["screen-menu","screen-shop","screen-results","screen-stats","screen-settings","screen-cheats","screen-pause"].forEach(function(id){ $(id).classList.add("hidden"); }); }

function refreshMenu(){
  $("menu-best-dist").textContent = "Best: " + window.DA.Physics.fmtDist(save.best.dist);
  $("menu-flights").textContent = "Flights: " + save.flights;
  $("menu-cash").textContent = "$" + save.money.toLocaleString();
  // contextual controls: never advertise BOOST as available when no rocket
  try{
    var hb = $("howto-boost");
    if(hb){
      if(hasBooster()){
        hb.innerHTML = '<span class="keys"><kbd>SPACE</kbd></span><span><b>Booster</b> thrust</span>';
      } else {
        hb.innerHTML = '<span class="keys"><kbd>SPACE</kbd></span><span><b>Booster</b> buy a rocket</span>';
      }
    }
  }catch(e){}
  // SHOP glows on the menu whenever a new purchase is affordable
  var sb = $("btn-shop");
  if(sb){
    var nx = nextAffordable();
    sb.classList.toggle("attn", !!(nx && nx.price <= save.money));
  }
}

function showFlight(){
  hideAll();
  // FIX: drop focus from any menu button — a focused LAUNCH/PLAY AGAIN
  // button would ALSO fire on Space/Enter mid-flight (double launch /
  // stuck booster). Flying starts with no focused control.
  try{ if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); }catch(e){}
  $("hud").classList.remove("hidden");
  // speedometer appears at LAUNCH (ramp ride is a cinematic: true track
  // velocity spikes mid-ride, so the gauge stays hidden until flying).
  setSpeedoVisible(false);
  $("touch-controls").classList.remove("hidden");
  // contextual touch + hint: no rocket => no BOOST button, no SPACE hint
  try{
    var tb = $("tc-boost");
    if(tb) tb.style.display = hasBooster() ? "" : "none";
    var ph = $("pitch-hint");
    if(ph){
      var coarse = false;
      try{ coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches; }catch(e){}
      if(!coarse && window.innerWidth>700){
        ph.textContent = hasBooster() ? "A/W nose up • D/S nose down • SPACE = boost" : "A/W nose up • D/S nose down • buy a rocket to unlock BOOST";
        ph.classList.remove("hidden");
      } else {
        ph.classList.add("hidden");
      }
    }
  }catch(e){}
  var id = runId;
  setTimeout(function(){ try{ if(id === runId) $("pitch-hint").classList.add("hidden"); }catch(e2){} }, 6000);
  $("record-banner").classList.add("hidden");
}

/* HUD write cache: updateHUD runs every rAF, so text/color writes only go
   out when the value actually changed (cheap mobile perf win). */
var _hudCache = {};
function setText(id, v){
  if(_hudCache[id] === v) return;
  _hudCache[id] = v;
  var el = $(id);
  if(el) el.textContent = v;
}
function updateHUD(){
  var G = window.DA.Game;
  if(!G.S) return;
  // lip-relative distance (0 at launch) — same origin as milestones/landing
  var LX = (window.DA.LAUNCH_X === undefined) ? 140 : window.DA.LAUNCH_X;
  var dist = (window.DA.flightDist ? window.DA.flightDist() : Math.max(0, G.S.x - LX));
  setText("hud-dist", window.DA.Physics.fmtDist(dist));
  // progress toward the record: blue while chasing, amber once it falls
  var bestD = save.best.dist || 0;
  var pf = bestD > 0 ? Math.min(1, dist / bestD) : 0;
  var pkey = (pf*100).toFixed(1) + (dist > bestD && bestD > 0 ? "b" : "");
  if(_hudCache["prog"] !== pkey){
    _hudCache["prog"] = pkey;
    var pfill = $("hud-prog-fill");
    if(pfill){ pfill.style.width = (bestD > 0 ? pf*100 : 0).toFixed(1) + "%"; pfill.className = (dist > bestD && bestD > 0) ? "beat" : ""; }
  }
  setText("hud-fish", String((G.runStats && G.runStats.fish) || 0));
  setText("hud-alt", Math.max(0,G.S.y).toFixed(0)+" m");
  updateSpeedo(G);
  var hasBooster = !!(G.P && G.P.thrust > 0);
  var f = (G.S.fuelMax>0 && hasBooster) ? G.S.fuel/G.S.fuelMax : 0;
  var fill = $("fuel-fill");
  // width string only changes as fuel burns: don't rewrite style every rAF
  var fw = (f*100).toFixed(1)+"%";
  if(_hudCache["fuel-w"] !== fw){
    _hudCache["fuel-w"] = fw;
    fill.style.width = fw;
  }
  fill.className = (!hasBooster || f<0.25) ? "low" : "";
  setText("fuel-label", hasBooster ? "FUEL" : "NO BOOSTER");
  var fb = $("fuel-bar");
  if(fb){
    fb.classList.toggle("burning", !!G.S.boosting && hasBooster);
    fb.classList.toggle("empty", hasBooster && G.S.fuelMax>0 && G.S.fuel<=0);
    // rocket-less flights stare at a red "low" bar all flight: dim the stat
    var fstat = fb.parentNode;
    if(fstat && fstat.classList) fstat.classList.toggle("nobooster", !hasBooster);
  }
  // once the record falls, BEST tracks the live distance (it no longer lags
  // behind the NEW RECORD banner until the results screen)
  setText("hud-best", window.DA.Physics.fmtDist(G.bestBeaten ? Math.max(save.best.dist, dist) : save.best.dist));
  // pause panel run readout (live while paused; skipped entirely otherwise —
  // the old code rewrote three nodes + the goal line every rAF of flight)
  if(!$("screen-pause").classList.contains("hidden")){
    setText("pause-stat-dist", window.DA.Physics.fmtDist(dist));
    setText("pause-stat-speed", Math.round((G.S.speed||0)*3.6)+" km/h");
    setText("pause-stat-alt", Math.max(0,G.S.y).toFixed(0)+" m");
    // pause panel goal line: loadout + next buy, refreshed live while paused
    var pg = $("pause-goal");
    if(pg){
      var pgoal = savingsGoal();
      var pgt = "🪂 " + gliderName(save.glider.equipped) + " • 🚀 " + rocketName(save.rocket.equipped) +
        (pgoal ? " • 🎯 " + pgoal.label + " $" + pgoal.price.toLocaleString() : " • 🎯 everything maxed ★");
      if(_hudCache["pause-goal"] !== pgt){
        _hudCache["pause-goal"] = pgt;
        pg.textContent = pgt;
      }
    }
  }
  var crashed = (G.phase === "crashed" && G.crashedInfo);
  var sevTxt = crashed ? { smooth:"🛬 SMOOTH", rough:"⛷️ ROUGH", crash:"💥 CRASH", mega:"☄️ MEGA" }[G.crashedInfo.severity] : null;
  var phaseTxt = G.phase==="ramp" ? "🛷 RAMP!" : sevTxt ? sevTxt
    : (G.S.boosting?"🔥 BOOST!":(G.S.stalled?"⚠ STALL":"🕊️ FLY"));
  setText("phase-label", phaseTxt);
  var phaseCol = sevTxt ? "#fff" : (G.S.boosting ? "#ffb703" : "#fff");
  if(_hudCache["phase-color"] !== phaseCol){
    _hudCache["phase-color"] = phaseCol;
    var phel = $("phase-label");
    if(phel) phel.style.color = phaseCol;
  }
  // pitch indicator: arrow + degrees, one glance tells where the nose (and booster) points
  var deg = Math.round((G.S.pitch||0) * 180/Math.PI);
  var arrow = deg > 12 ? "↗" : deg < -12 ? "↘" : "→";
  var pl = $("pitch-label");
  if(pl){
    setText("pitch-label", arrow + " " + (deg>0?"+":"") + deg + "°");
    var degCol = G.S.stalled ? "#ff5d5d" : (Math.abs(deg) > 55 ? "#ffb703" : "#fff");
    if(_hudCache["pitch-color"] !== degCol){
      _hudCache["pitch-color"] = degCol;
      pl.style.color = degCol;
    }
  }
  // loadout: tiny equipped-equipment readout (cached, cheap)
  var lo = gliderName(save.glider.equipped) + "|" + save.rocket.equipped;
  if(lo !== G._lastLoadout){
    G._lastLoadout = lo;
    var ll = $("loadout-label");
    if(ll) ll.textContent = "🪂 " + gliderName(save.glider.equipped) + " • 🚀 " + rocketName(save.rocket.equipped);
  }
}

function onFish(n){
  var c = $("hud-fish-chip");
  if(c && c.classList){ c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); }
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
  // redline zone follows the equipped glider (rebuilt only when it changes).
  // comfort/top are m/s; the gauge face is km/h, so convert (was unit bug).
  if(G.P){
    var key = G.P.comfort.toFixed(1) + "|" + G.P.top.toFixed(1);
    if(key !== spRedKey){
      spRedKey = key;
      var red = $("sp-red");
      if(red && red.setAttribute) red.setAttribute("d", spArcD(G.P.comfort*3.6/SP_MAX, Math.min(1, G.P.top*3.6/SP_MAX), 64));
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
function onLaunch(){
  window.DA.Audio.ensure(); window.DA.Audio.SFX.whoosh();
  setSpeedoVisible(true); // gauge goes live now that speed is flight speed
}
function onFuelEmpty(){
  try{ window.DA.Audio.SFX.fuelEmpty(); }catch(e){}
  floatText("🛢️ FUEL EMPTY!", "#ff5d5d");
  toast("🛢️ Fuel exhausted — glide it home!");
  try{
    var fb = $("fuel-bar");
    if(fb){ fb.classList.remove("emptyflash"); void fb.offsetWidth; fb.classList.add("emptyflash"); }
  }catch(e2){}
}
function onStallRecover(){
  try{ window.DA.Audio.SFX.recover(); }catch(e){}
  floatText("✔ Recovered!", "#80ed99");
}
// boost ignition: flash + fuel glow + speed punch reset
function onBoostStart(){
  window.DA.Audio.SFX.ignite();
  if(reducedMotion()) return;
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
/* Vector icons for workshop tracks (cards show real icons, not emoji). */
var SVG_PART = {
  ramp: '<svg class="item-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 20 L14 20 L20 8 L16 8 L10 18 L2 18 Z" fill="currentColor"/><path d="M14 20 L20 8" stroke="#0b1626" stroke-width="1.4"/><circle cx="18" cy="5.5" r="1.6" fill="currentColor"/></svg>',
  sled: '<svg class="item-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13 L19 13 L17 9 L5 9 Z" fill="currentColor"/><rect x="2" y="15" width="5" height="3" rx="1.5" fill="currentColor"/><rect x="17" y="15" width="5" height="3" rx="1.5" fill="currentColor"/><path d="M6 9 L12 4 L12 9 Z" fill="currentColor"/></svg>',
  aero: '<svg class="item-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 15 C7 15 12 12 19 5 L21 7 C15 13 9 17 4 17 Z" fill="currentColor"/><path d="M15 17 L19 21 L20 18 Z" fill="currentColor"/></svg>',
  fuel: '<svg class="item-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="4" width="10" height="16" rx="3" fill="currentColor"/><rect x="7" y="9" width="10" height="3" fill="#0b1626" opacity=".45"/><circle cx="12" cy="15" r="2.2" fill="#0b1626"/></svg>',
  nitro: '<svg class="item-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 C12 2 5 11 5 15 a7 7 0 0 0 14 0 C19 11 12 2 12 2Z" fill="currentColor"/><path d="M9 15.5 a3 3 0 0 0 3 3" stroke="#0b1626" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>'
};
function partIcon(key, fallback){
  return SVG_PART[key] || fallback || "";
}
function gliderName(id){
  var g = window.DA.GLIDERS && window.DA.GLIDERS[id];
  return g ? g.name : "Bare Dodo";
}
function rocketName(id){
  var r = window.DA.ROCKETS && id >= 0 && window.DA.ROCKETS[id];
  return r ? r.name : "none yet";
}
/* ---------- HANGAR (shop): one tab at a time, clean cards ----------
   Gliders | Rockets | Workshop. Every grid keeps a one-line caption row
   first, then its cards. The open tab defaults to wherever the best
   affordable buy lives. */
var shopTab = null;
function setShopTab(tab){
  shopTab = tab;
  var m = $("shop-main");
  if(m && m.setAttribute) m.setAttribute("data-tab", tab);
  try{
    var tabs = document.querySelectorAll ? document.querySelectorAll(".shop-tab") : [];
    for(var i=0;i<tabs.length;i++){
      var on = tabs[i].getAttribute("data-tab") === tab;
      tabs[i].classList.toggle("active", on);
      tabs[i].setAttribute("aria-selected", on ? "true" : "false");
    }
  }catch(e){}
}
function bindShopTabs(){
  try{
    var tabs = document.querySelectorAll ? document.querySelectorAll(".shop-tab") : [];
    for(var i=0;i<tabs.length;i++){
      tabs[i].onclick = function(){ click(); setShopTab(this.getAttribute("data-tab")); };
    }
  }catch(e){}
}
function renderShop(){
  $("shop-cash").textContent = "$" + save.money.toLocaleString();
  // sandbox bar: free experimentation, never touches campaign
  try{
    var sb = $("sandbox-bar");
    if(sb) sb.classList.toggle("hidden", window.DA.Save.getMode() !== "sandbox");
  }catch(e){}
  // goal bar: the next recommended buy and how close the wallet is
  var sg = $("shop-goal"), goal = savingsGoal();
  if(sg){
    sg.innerHTML = goal
      ? '<span class="goal-k">NEXT UP</span><b>' + esc(stripIcon(goal.label)) + '</b>' +
        '<span class="goal-bar"><i style="width:' + goal.pct + '%"></i></span>' +
        '<span class="goal-v">' + (goal.pct >= 100 ? "Affordable now" : "$" + save.money.toLocaleString() + " / $" + goal.price.toLocaleString()) + '</span>'
      : '<span class="goal-k">ALL DONE</span><b>Everything is maxed. Magnificent.</b>';
    sg.classList.toggle("ready", !!(goal && goal.pct >= 100));
  }
  computeHotPick();
  if(!shopTab) shopTab = hotPick ? hotPick.type : "glider";
  renderGliders();
  renderRockets();
  renderTracks();
  tabMeta();
  setShopTab(shopTab);
  drawPreview();
  $("preview-text").textContent = gliderName(save.glider.equipped) + " • " +
    (save.rocket.equipped >= 0 ? rocketName(save.rocket.equipped) : "no rocket");
}
function esc(t){ return String(t).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function stripIcon(label){ return String(label).replace(/^[^A-Za-z0-9$]+\s*/, ""); }
function tabMeta(){
  var aff = { glider:false, rocket:false, track:false };
  rankedPurchases(true).forEach(function(c){ aff[c.type] = true; });
  var meta = { glider: ownedGliders() + "/" + gliderStockCount(), rocket: ownedRockets() + "/3", track: "Lv " + totalLv() + "/" + maxLv() };
  ["glider","rocket","track"].forEach(function(k){
    var el = $("tab-meta-" + k);
    if(el){ el.textContent = meta[k]; el.classList.toggle("buyable", aff[k]); }
  });
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

/* one stat row: label, a continuous bar (0-10), and the change versus the
   currently equipped item as a small +/- chip */
function statBar(label, v, delta){
  var d = "";
  if(typeof delta === "number" && delta !== 0) d = '<em class="' + (delta > 0 ? "up" : "down") + '">' + (delta > 0 ? "+" : "") + delta + '</em>';
  return '<div class="gstat"><span>' + label + '</span><div class="sbar"><i style="width:' + Math.max(4, Math.min(100, v*10)) + '%"></i></div>' + d + '</div>';
}
function captionRow(text){
  var head = document.createElement("div");
  head.className = "glider-head";
  head.textContent = text;
  return head;
}
function equipCard(opts){
  // {name, tag, statusText, statusKind, barsHtml, preview, btnText, btnDisabled, onBtn, flashId, equipped, dim, hot}
  var card = document.createElement("div");
  card.className = "up-card gcard" + (opts.equipped ? " equipped" : "") + (opts.dim ? " cant" : "") + (opts.hot ? " hotpick" : "");
  if(opts.flashId) card.id = opts.flashId;
  var cv = document.createElement("canvas");
  cv.width = 480; cv.height = 210; cv.className = "gprev";
  card.appendChild(cv);
  var info = document.createElement("div");
  info.className = "card-body";
  info.innerHTML =
    '<div class="up-top"><span class="up-name">' + opts.name + '</span>' +
    '<span class="up-lvl ' + (opts.statusKind || "") + '">' + opts.statusText + '</span></div>' +
    '<div class="up-desc">' + opts.tag + '</div>' + opts.barsHtml;
  card.appendChild(info);
  var btn = document.createElement("button");
  btn.className = "buy-btn" + (opts.owned && !opts.equipped ? " ghost" : "");
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
  var egl = window.DA.GLIDERS[eq] || window.DA.GLIDERS[0];
  wrap.appendChild(captionRow("Wings decide how far Dennis glides. Better wings sink slower, dive faster and steer sharper."));
  window.DA.GLIDERS.forEach(function(gl){
    if(gl.id === 0) return; // Bare Dodo is the free baseline, not a shop card
    var owned = !!save.glider.owned[gl.id];
    var equipped = (eq === gl.id);
    var cmp = !equipped;
    wrap.appendChild(equipCard({
      name: gl.name, tag: gl.tag,
      statusText: equipped ? "EQUIPPED" : owned ? "OWNED" : "$" + gl.price.toLocaleString(),
      statusKind: equipped ? "eq" : owned ? "own" : "",
      barsHtml: statBar("GLIDE", gl.bars.fly, cmp ? gl.bars.fly - egl.bars.fly : 0) +
        statBar("SPEED", gl.bars.speed, cmp ? gl.bars.speed - egl.bars.speed : 0) +
        statBar("CONTROL", gl.bars.ctrl, cmp ? gl.bars.ctrl - egl.bars.ctrl : 0),
      preview: function(cv){ window.DA.drawGliderPreview(cv, gl.id); },
      equipped: equipped, owned: owned, dim: !owned && gl.price > save.money,
      flashId: "card-glider-" + gl.id, hot: isHotPick("glider", gl.id),
      btnText: equipped ? "Equipped" : owned ? "Equip" : "Buy $" + gl.price.toLocaleString(),
      btnDisabled: equipped || (!owned && gl.price > save.money),
      onBtn: equipped ? null : owned
        ? (function(id){ return function(){ equipGlider(id); }; })(gl.id)
        : (function(id, price){ return function(){ buyGlider(id, price); }; })(gl.id, gl.price)
    }));
  });
}
function renderRockets(){
  var wrap = $("rocket-grid");
  if(!wrap || !window.DA.ROCKETS) return;
  wrap.innerHTML = "";
  var eq = save.rocket.equipped;
  var erk = (eq >= 0 && window.DA.ROCKETS[eq]) ? window.DA.ROCKETS[eq] : null;
  wrap.appendChild(captionRow("Hold SPACE to burn. Thrust pushes exactly where the nose points, so aim before you light it."));
  window.DA.ROCKETS.forEach(function(rk){
    var owned = !!save.rocket.owned[rk.id];
    var equipped = (eq === rk.id);
    var cmp = erk && !equipped;
    var burn = rk.burn * window.DA.fuelMult(save.upgrades.fuel || 0);
    wrap.appendChild(equipCard({
      name: rk.name, tag: rk.tag + ' <span class="spec">' + Math.round(rk.thrust * window.DA.thrustMult(save.upgrades.nitro || 0)) + " thrust • " + burn.toFixed(1) + "s burn</span>",
      statusText: equipped ? "EQUIPPED" : owned ? "OWNED" : "$" + rk.price.toLocaleString(),
      statusKind: equipped ? "eq" : owned ? "own" : "",
      barsHtml: statBar("THRUST", rk.bars.thrust, cmp ? rk.bars.thrust - erk.bars.thrust : 0) +
        statBar("BURN", rk.bars.burn, cmp ? rk.bars.burn - erk.bars.burn : 0),
      preview: function(cv){ window.DA.drawRocketPreview(cv, rk.id); },
      equipped: equipped, owned: owned, dim: !owned && rk.price > save.money,
      flashId: "card-rocket-" + rk.id, hot: isHotPick("rocket", rk.id),
      btnText: equipped ? "Equipped" : owned ? "Equip" : "Buy $" + rk.price.toLocaleString(),
      btnDisabled: equipped || (!owned && rk.price > save.money),
      onBtn: equipped ? null : owned
        ? (function(id){ return function(){ equipRocket(id); }; })(rk.id)
        : (function(id, price){ return function(){ buyRocket(id, price); }; })(rk.id, rk.price)
    }));
  });
}
function renderTracks(){
  var grid = $("shop-grid");
  if(!grid) return;
  grid.innerHTML = "";
  grid.appendChild(captionRow("Permanent upgrades. They apply to every glider and rocket you own."));
  ["ramp","sled","aero","fuel","nitro"].forEach(function(k){
    var u = window.DA.UPGRADES[k];
    if(!u) return;
    var lvl = save.upgrades[k] || 0;
    var maxed = lvl>=u.max;
    var price = maxed?0:window.DA.priceOf(k,lvl);
    var hot = isHotPick("track", k);
    var card = document.createElement("div");
    card.className = "up-card track" + (maxed?" maxed":"") + (price>save.money&&!maxed?" cant":"") + (hot?" hotpick":"");
    card.id = "card-"+k;
    var cv = document.createElement("canvas");
    cv.width = 480; cv.height = 210; cv.className = "gprev";
    card.appendChild(cv);
    try{ if(window.DA.drawPartPreview) window.DA.drawPartPreview(cv, k, lvl); }catch(e){}
    var segs = "";
    for(var i=0;i<u.max;i++) segs += '<i class="' + (i<lvl ? "on" : "") + '"></i>';
    var extra = "";
    if(k === "fuel" || k === "nitro"){
      var rq = save.rocket.equipped;
      if(!(rq >= 0 && window.DA.ROCKETS && window.DA.ROCKETS[rq])) extra = '<div class="up-note">Needs a rocket to do anything.</div>';
    }
    var info = document.createElement("div");
    info.className = "card-body";
    info.innerHTML =
      '<div class="up-top"><span class="up-name">' + partIcon(k, u.icon) + " " + u.name + '</span>' +
      '<span class="up-lvl' + (maxed ? " eq" : "") + '">Lv ' + lvl + '/' + u.max + '</span></div>' +
      '<div class="segs">' + segs + '</div>' +
      '<div class="up-desc">' + u.blurb + '</div>' +
      '<div class="up-now"><span>NOW</span>' + u.desc(lvl) + '</div>' +
      (maxed ? "" : '<div class="up-next"><span>NEXT</span>' + String(u.next(lvl)).replace(/^→\s*/, "") + '</div>') + extra;
    card.appendChild(info);
    var btn = document.createElement("button");
    btn.className = "buy-btn";
    if(maxed){ btn.textContent = "Maxed"; btn.disabled = true; }
    else { btn.textContent = "Upgrade $" + price.toLocaleString(); btn.disabled = price>save.money; }
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
/* Progression-aware recommendations (priority beats raw price):
   first glider > first rocket > next glider > next rocket >
   fuel/nitro (only with a rocket) > ramp/aero > sled. Fuel and nitro
   without a rocket are never recommended. */
function hasRealGlider(){
  for(var i=1;i<save.glider.owned.length;i++) if(save.glider.owned[i]) return true;
  return false;
}
function hasRocket(){
  for(var j=0;j<save.rocket.owned.length;j++) if(save.rocket.owned[j]) return true;
  return false;
}
function rankedPurchases(affordableOnly){
  var cands = [];
  var realGlider = hasRealGlider(), rocket = hasRocket();
  function consider(type, id, label, price, prio){
    if(affordableOnly && price > save.money) return;
    cands.push({ type:type, id:id, label:label, price:price, prio:prio });
  }
  if(window.DA.GLIDERS) window.DA.GLIDERS.forEach(function(gl){
    if(gl.id === 0 || save.glider.owned[gl.id]) return;
    // first real glider is THE unlock; later ones are tier upgrades
    var first = !realGlider && gl.id === 1;
    consider("glider", gl.id, "🪂 " + gl.name, gl.price, first ? 0 : 2);
  });
  if(window.DA.ROCKETS) window.DA.ROCKETS.forEach(function(rk){
    if(save.rocket.owned[rk.id]) return;
    var firstR = realGlider && !rocket && rk.id === 0;
    consider("rocket", rk.id, "🚀 " + rk.name, rk.price, firstR ? 1 : 3);
  });
  ["ramp","sled","aero","fuel","nitro"].forEach(function(k){
    var u = window.DA.UPGRADES[k];
    if(!u) return;
    var lvl = save.upgrades[k] || 0;
    if(lvl >= u.max) return;
    if((k === "fuel" || k === "nitro") && !rocket) return; // tanks/punch with no rocket help nobody
    var prio = (k === "fuel" || k === "nitro") ? 4 : (k === "sled" ? 6 : 5);
    consider("track", k, u.icon + " " + u.name + " Lv " + (lvl+1), window.DA.priceOf(k, lvl), prio);
  });
  cands.sort(function(a,b){ return (a.prio - b.prio) || (a.price - b.price); });
  return cands;
}
/* Section summaries: every shop section gets a live one-liner (owned /
   equipped / next buy) so the hangar reads at a glance. */
function nextInSection(type){
  var cands = rankedPurchases(false);
  for(var i = 0; i < cands.length; i++) if(cands[i].type === type) return cands[i];
  return null;
}
function sectionSummary(type){
  var nx = nextInSection(type);
  var tail = nx ? (" • next: " + nx.label + " $" + nx.price.toLocaleString()) : " • all maxed ★";
  if(type === "glider") return "owned " + ownedGliders() + "/" + gliderStockCount() + " • equipped: " + gliderName(save.glider.equipped) + tail;
  if(type === "rocket") return "owned " + ownedRockets() + "/3 • equipped: " + rocketName(save.rocket.equipped) + tail;
  return "Lv " + totalLv() + "/" + maxLv() + tail;
}
/* Next purchase to point at (menu SHOP glow, results nudge). */
function nextAffordable(){
  var cands = rankedPurchases(false);
  return cands.length ? cands[0] : null;
}
/* Savings goal: ONE wallet number, shared by the affordable nudge and the
   goal line. The goal is simply the next recommended purchase. */
function savingsGoal(){
  var nx = nextAffordable();
  if(!nx) return null;
  return { label: nx.label, price: nx.price,
    pct: Math.min(100, Math.floor(100 * save.money / Math.max(1, nx.price))) };
}
/* Cheapest AFFORDABLE purchase right now (for the in-shop hotpick). */
var hotPick = null;
function computeHotPick(){
  hotPick = null;
  var cands = rankedPurchases(true);
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
  if(window.DA.drawStage) window.DA.drawStage(g, W, H, null);
  window.DA.World.drawDodo(g, W*0.52, H*0.7, {
    pitch: 0.06, vx: 26, vy: 0, boosting: save.rocket.equipped >= 0, stalled:false,
    glider: save.glider.equipped, rocket: save.rocket.equipped,
    sledLvl: save.upgrades.sled, aeroLvl: save.upgrades.aero, golden: isGolden(save)
  }, H/118, {});
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
  // FIX: drop focus like showFlight does — a focused PLAY AGAIN button
  // would ALSO fire on Enter/Space mid-results (double startRun via
  // enterPressed + button click in the same tick).
  try{ if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); }catch(e){}
  $("hud").classList.add("hidden"); setSpeedoVisible(false); $("touch-controls").classList.add("hidden");
  var st = res.stats, rw = res.rewards;
  var crashed = res.crash || {};
  var sev = crashed.severity || "crash";
  $("results-title").textContent = crashed.water ? (sev === "mega" ? "Mega Splash!" : "Splashdown!")
    : sev === "smooth" ? "Butter-smooth landing!"
    : sev === "rough" ? "Bumpy but alive!"
    : sev === "mega" ? "Mega Wipeout!" : "Snow Snack!";
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
  if(rw.streakBonus>0) rows.push(["🔥 Landing streak x" + (save.landingStreak||0), rw.streakBonus]);
  if(rw.glideBonus>0) rows.push(["⛵ Pure glide (no boost)", rw.glideBonus]);
  if(rw.fishBonus>0) rows.push(["🐟 Golden fish ×" + (st.fish||0) + (st.rings ? " • 💨 " + st.rings + " gust ring" + (st.rings>1?"s":"") : ""), rw.fishBonus]);
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
    }, 120*(i+1));
  });
  setTimeout(function(){ if(id === runId) animateMoney(totalEl, rw.total, id); }, 120*(rows.length+1));
  // default loop: FLIGHT -> RESULTS -> SHOP. After counting finishes plus a
  // proper reading beat, glide into the shop — unless the player already
  // chose otherwise (PLAY AGAIN bumps runId; SHOP/Menu hide this screen;
  // phase changes). The old +1500ms beat cut the breakdown off mid-read
  // (~3s total); ~8s lets a human actually finish the rows.
  setTimeout(function(){
    if(id !== runId) return;
    if(window.DA.Game.phase !== "results") return;
    if($("screen-results").classList.contains("hidden")) return;
    showShop();
  }, 120*(rows.length+1) + 8000);
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
  // streak teaching: the bonus only pays from x2, so say so at x1
  if(!rw.streakBonus && (save.landingStreak||0) === 1 && id === runId){
    var sn = document.createElement("div");
    sn.className = "obj-soon";
    sn.textContent = "🔥 Streak ×1 — grease one more landing for a streak bonus!";
    od2.appendChild(sn);
  }
  $("screen-results").classList.remove("hidden");
  // in-flight toasts (crash quips, isle calls) are stale once the results
  // card is up — the title already says it — so clear them; anything new
  // pins to the top where it can't cover PLAY AGAIN / Shop / Menu.
  try{ var tw = $("toast-wrap"); tw.classList.add("top"); while(tw.firstChild) tw.removeChild(tw.firstChild); }catch(e){}
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
  var perGlider = "";
  for(var bi=0; bi<6; bi++){
    var bgn = (window.DA.GLIDERS && window.DA.GLIDERS[bi] && window.DA.GLIDERS[bi].name) || ("Glider "+bi);
    var bgd = (save.bestByGlider && save.bestByGlider[bi]) || 0;
    perGlider += statBox("★ " + bgn.toUpperCase(), window.DA.Physics.fmtDist(bgd));
  }
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
    statBox("ROCKETS", ownedRockets()+"/3") +
    statBox("LANDING STREAK", "x"+(save.landingStreak||0)+" (best x"+(save.bestStreak||0)+")") +
    (isGolden(save) ? statBox("🌟 DENNIS", "GOLDEN") : "") + perGlider;
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
  // results screen owns the bottom of the viewport (buttons live there):
  // pin toasts to the top while it is open so they never cover actions.
  try{ w.classList.toggle("top", !$("screen-results").classList.contains("hidden")); }
  catch(e){}
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
/* ESC backs out one screen level: sub-screens return to where they came
   from, the shop returns to the menu. Results/menu/flight ignore it
   (results auto-advances; flight uses ESC for pause, handled in game.js). */
function escapePressed(){
  if(!$("screen-stats").classList.contains("hidden") ||
     !$("screen-settings").classList.contains("hidden") ||
     !$("screen-cheats").classList.contains("hidden")) goBackFromSub();
  else if(!$("screen-shop").classList.contains("hidden")) showMenu();
}

window.DA = window.DA || {};
window.DA.UI = { init:init, showMenu:showMenu, showShop:showShop, showFlight:showFlight,
  updateHUD:updateHUD, showResults:showResults, onRecord:onRecord, onCrash:onCrash,
  onLaunch:onLaunch, onFish:onFish, onBoostStart:onBoostStart, onFuelEmpty:onFuelEmpty, onStallRecover:onStallRecover,
  reducedMotion:reducedMotion, isGolden:isGolden,
  toast:toast, floatText:floatText, enterPressed:enterPressed, escapePressed:escapePressed, refreshMenu:refreshMenu, renderShop:renderShop,
  onRunStart:onRunStart,
  /* test hook: rank purchases for a synthetic save without touching live state */
  testRank: function(saveState){ var real = save; save = saveState; var r; try{ r = rankedPurchases(false); }finally{ save = real; } return r; },
  /* test hook: section summaries + savings goal for a synthetic save */
  testShopText: function(saveState){
    var real = save; save = saveState; var r;
    try{ r = { glider: sectionSummary("glider"), rocket: sectionSummary("rocket"), track: sectionSummary("track"), goal: savingsGoal() }; }
    finally{ save = real; }
    return r;
  } };
})();

