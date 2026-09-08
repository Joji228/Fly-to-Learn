/* Procedural Web Audio: soft layered wind, layered booster, punchy events.
   No external files. Hierarchy: UI quiet, flight medium, big events punchy. */
(function(){
"use strict";

var ctx = null, master = null, sfxGain = null, musicGain = null;
var enabled = { sfx:true, music:true };
var musicTimer = null, musicStep = 0;
var wind = null;   // {low, mid, high} layer nodes
var boostNodes = null;

function ensure(){
  if(ctx) { if(ctx.state==="suspended") ctx.resume(); return true; }
  try{
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.28; musicGain.connect(master);
    return true;
  }catch(e){ return false; }
}

function setEnabled(sfx, music){
  enabled.sfx = !!sfx; enabled.music = !!music;
  if(sfxGain) sfxGain.gain.value = enabled.sfx ? 0.9 : 0;
  if(musicGain) musicGain.gain.value = enabled.music ? 0.28 : 0;
  if(!enabled.music) stopMusic(); else startMusic();
  if(!enabled.sfx){ stopWind(); stopBoost(); }
}

function now(){ return ctx ? ctx.currentTime : 0; }

/* soft enveloped tone */
function tone(freq, dur, type, vol, slideTo, delay){
  if(!ensure() || !enabled.sfx) return;
  var t = now() + (delay||0);
  var o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || "sine";
  o.frequency.setValueAtTime(Math.max(20, freq), t);
  if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t+dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol || 0.2, t+0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(sfxGain);
  o.start(t); o.stop(t+dur+0.05);
}

/* filtered noise hit with envelope; seed varies the buffer content */
function noiseHit(dur, vol, type, freq, q, slideTo, delay, seed){
  if(!ensure() || !enabled.sfx) return null;
  var t = now() + (delay||0);
  var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  var buf = ctx.createBuffer(1, len, ctx.sampleRate);
  var ch = buf.getChannelData(0);
  var s = (seed||1) * 12345.678;
  for(var i=0;i<len;i++){
    s = (s*16807) % 2147483647; // deterministic-ish, different per seed
    var r = (s/2147483647)*2-1;
    var env = Math.sin(Math.PI * i/len); // smooth in AND out: no clicks
    ch[i] = r * env;
  }
  var src = ctx.createBufferSource(); src.buffer = buf;
  var f = ctx.createBiquadFilter(); f.type = type || "lowpass";
  f.frequency.setValueAtTime(freq || 800, t); f.Q.value = q || 0.7;
  if(slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t+dur);
  var g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol || 0.25, t+Math.min(0.03, dur*0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  src.connect(f); f.connect(g); g.connect(sfxGain);
  src.start(t);
  return { src:src, gain:g };
}

var SFX = {
  click: function(){ tone(620, 0.07, "triangle", 0.12, 840); },
  launch: function(){ // sled release: rising whoosh + low thump
    noiseHit(0.7, 0.30, "bandpass", 420, 0.8, 2500, 0, 11);
    tone(95, 0.45, "sine", 0.30, 42);
  },
  whoosh: function(){ // leaving the lip
    noiseHit(0.35, 0.22, "highpass", 1200, 0.7, 3600, 0, 12);
  },
  ignite: function(){ // PSSHH transient when boost lights
    noiseHit(0.22, 0.28, "highpass", 900, 0.7, 4200, 0, 13);
    tone(180, 0.25, "sawtooth", 0.06, 90);
  },
  purchase: function(){
    tone(880, 0.09, "triangle", 0.18); tone(1174, 0.12, "triangle", 0.18, null, 0.08);
  },
  equip: function(){ // new glider moment: rising sweep + chime
    noiseHit(0.35, 0.14, "bandpass", 500, 1.2, 2400, 0, 14);
    tone(660, 0.12, "triangle", 0.16, 990);
    tone(1320, 0.22, "triangle", 0.16, null, 0.12);
  },
  denied: function(){ tone(170, 0.16, "square", 0.10, 120); },
  coin: function(){ tone(1320, 0.05, "square", 0.07, 1760); },
  record: function(){
    var n=[523,659,784,1046];
    for(var i=0;i<n.length;i++) tone(n[i], 0.16, "triangle", 0.22, null, i*0.1);
  },
  milestone: function(){ tone(880, 0.1, "triangle", 0.14, 1318); },
  stall: function(){ // gentle warning wobble, not a buzzer
    tone(320, 0.16, "sine", 0.14, 210);
    tone(240, 0.2, "sine", 0.12, 160, 0.12);
  },
  smooth: function(){ // greased landing: soft thud + sparkle
    tone(140, 0.18, "sine", 0.22, 70);
    tone(1568, 0.25, "triangle", 0.10, null, 0.06);
  },
  impact: function(level){ // 0 soft (unused; smooth has its own), 1 hard, 2 mega
    if(level >= 2){
      tone(48, 0.55, "sine", 0.5, 30);
      noiseHit(0.5, 0.42, "lowpass", 700, 0.7, 120, 0, 15);
      noiseHit(0.3, 0.2, "highpass", 2000, 0.7, 500, 0.02, 16);
    } else {
      tone(90, 0.3, "sine", 0.34, 40);
      noiseHit(0.32, 0.3, "lowpass", 900, 0.7, 150, 0, 17);
    }
  },
  splash: function(big){ // 0 small, 1 Annex, 2 huge
    var v = big >= 2 ? 0.45 : big >= 1 ? 0.32 : 0.2;
    noiseHit(0.55, v, "bandpass", 1600, 0.6, 500, 0, 18);
    tone(280, 0.3, "sine", 0.14, 70, 0.02);
    if(big >= 2) noiseHit(0.4, 0.2, "highpass", 3000, 0.7, 1200, 0.08, 19);
  }
};

/* ---- three-layer wind: soft, wide, airy. Much quieter than before. ----
   LOW  (lowpass 240):   fades in ~70 km/h, whispers to ~0.05
   MID  (bandpass 850):  fades in ~120 km/h, breathes to ~0.06
   HIGH (highpass 3200): only >~170 km/h, light rush to ~0.05            */
function makeWindLayer(type, freq, q, seed){
  var len = ctx.sampleRate * 3; // long buffer: no obvious loop
  var buf = ctx.createBuffer(1, len, ctx.sampleRate);
  var ch = buf.getChannelData(0);
  var s = seed * 987654.321;
  var last = 0;
  for(var i=0;i<len;i++){
    s = (s*16807) % 2147483647;
    var r = (s/2147483647)*2-1;
    last = last*0.94 + r*0.06; // pre-soften: airy, not static
    ch[i] = (r*0.35 + last*2.2) * 0.5;
  }
  var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  var f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  var g = ctx.createGain(); g.gain.value = 0;
  src.connect(f); f.connect(g); g.connect(sfxGain);
  src.start();
  return g;
}
function startWind(){
  if(!ensure()) return;
  if(windNodes()) return;
  wind = {
    low: makeWindLayer("lowpass", 240, 0.5, 21),
    mid: makeWindLayer("bandpass", 850, 0.7, 22),
    high: makeWindLayer("highpass", 3200, 0.6, 23)
  };
}
function windNodes(){ return wind; }
function setWind(speedMs, boosting){
  if(!wind || !enabled.sfx) return;
  var kmh = speedMs * 3.6, t = now();
  var lowT = 0.055 * clamp01((kmh - 70) / 70);
  var midT = 0.060 * clamp01((kmh - 120) / 80);
  var highT = 0.050 * clamp01((kmh - 170) / 90);
  wind.low.gain.setTargetAtTime(lowT, t, 0.25);
  wind.mid.gain.setTargetAtTime(midT, t, 0.25);
  wind.high.gain.setTargetAtTime(highT, t, 0.3);
}
function clamp01(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }
function stopWind(){
  if(!wind) return;
  try{
    wind.low.gain.setTargetAtTime(0, now(), 0.15);
    wind.mid.gain.setTargetAtTime(0, now(), 0.15);
    wind.high.gain.setTargetAtTime(0, now(), 0.15);
  }catch(e){}
}

/* ---- booster: low rumble + soft thrust noise (no saw buzz) ---- */
function startBoost(strength){
  if(!ensure() || !enabled.sfx) return;
  if(boostNodes) { setBoostLevel(strength); return; }
  strength = (strength === undefined) ? 0.6 : strength;
  var o = ctx.createOscillator(), og = ctx.createGain();
  o.type = "sine"; o.frequency.value = 52;
  og.gain.value = 0.16 * strength;
  o.connect(og); og.connect(sfxGain); o.start();
  var len = ctx.sampleRate * 2;
  var buf = ctx.createBuffer(1, len, ctx.sampleRate);
  var ch = buf.getChannelData(0);
  var s = 777.123;
  for(var i=0;i<len;i++){ s = (s*16807) % 2147483647; ch[i] = ((s/2147483647)*2-1) * 0.6; }
  var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 750;
  var ng = ctx.createGain(); ng.gain.value = 0.10 * strength;
  src.connect(f); f.connect(ng); ng.connect(sfxGain); src.start();
  boostNodes = { o:o, og:og, src:src, ng:ng };
}
function setBoostLevel(strength){
  if(!boostNodes) return;
  strength = (strength === undefined) ? 0.6 : strength;
  boostNodes.og.gain.setTargetAtTime(0.16 * strength, now(), 0.08);
  boostNodes.ng.gain.setTargetAtTime(0.10 * strength, now(), 0.08);
}
function stopBoost(){
  if(!boostNodes) return;
  try{ boostNodes.o.stop(); boostNodes.src.stop(); }catch(e){}
  try{ boostNodes.o.disconnect(); boostNodes.src.disconnect(); }catch(e2){}
  boostNodes = null;
}

/* tiny cheerful music loop (menus): bass + pluck sequencer */
var MELODY = [262,0,330,0,392,0,330,392, 262,0,330,392,523,392,330,0];
function startMusic(){
  if(!ensure() || !enabled.music || musicTimer) return;
  musicStep = 0;
  musicTimer = setInterval(function(){
    if(!enabled.music || !ctx) return;
    var t = now();
    var fq = MELODY[musicStep % MELODY.length];
    if(fq){
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = (musicStep%4===0)?"triangle":"sine";
      o.frequency.value = fq;
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.28);
      o.connect(g); g.connect(musicGain);
      o.start(t); o.stop(t+0.3);
    }
    if(musicStep%2===0){
      var b = ctx.createOscillator(), bg = ctx.createGain();
      b.type="sine"; b.frequency.value = [131,98,110,98][(musicStep/2)%4|0];
      bg.gain.setValueAtTime(0.20,t); bg.gain.exponentialRampToValueAtTime(0.001,t+0.4);
      b.connect(bg); bg.connect(musicGain); b.start(t); b.stop(t+0.42);
    }
    musicStep++;
  }, 240);
}
function stopMusic(){ if(musicTimer){ clearInterval(musicTimer); musicTimer=null; } }

window.DA = window.DA || {};
window.DA.Audio = { ensure:ensure, setEnabled:setEnabled, SFX:SFX,
  startWind:startWind, setWind:setWind, stopWind:stopWind,
  startBoost:startBoost, stopBoost:stopBoost, startMusic:startMusic, stopMusic:stopMusic };
})();
