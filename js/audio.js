/* Procedural Web Audio: SFX + tiny music loop. No external files. */
(function(){
"use strict";

var ctx = null, master = null, sfxGain = null, musicGain = null, windNodes = null;
var enabled = { sfx:true, music:true };
var musicTimer = null, musicStep = 0;

function ensure(){
  if(ctx) { if(ctx.state==="suspended") ctx.resume(); return true; }
  try{
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.32; musicGain.connect(master);
    return true;
  }catch(e){ return false; }
}

function setEnabled(sfx, music){
  enabled.sfx = !!sfx; enabled.music = !!music;
  if(sfxGain) sfxGain.gain.value = enabled.sfx ? 0.9 : 0;
  if(musicGain) musicGain.gain.value = enabled.music ? 0.32 : 0;
  if(!enabled.music) stopMusic(); else startMusic();
}

function now(){ return ctx ? ctx.currentTime : 0; }

function blip(freq, dur, type, vol, slideTo){
  if(!ensure() || !enabled.sfx) return;
  type = type||"square"; vol = vol||0.25; dur = dur||0.12;
  var t = now();
  var o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo), t+dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t+dur);
  o.connect(g); g.connect(sfxGain);
  o.start(t); o.stop(t+dur+0.02);
}

function noiseBurst(dur, vol, filterFreq, slideTo){
  if(!ensure() || !enabled.sfx) return;
  dur = dur||0.3; vol = vol||0.4; filterFreq = filterFreq||1200;
  var t = now();
  var len = Math.floor(ctx.sampleRate * dur);
  var buf = ctx.createBuffer(1, len, ctx.sampleRate);
  var ch = buf.getChannelData(0);
  for(var i=0;i<len;i++) ch[i] = (Math.random()*2-1) * (1 - i/len);
  var src = ctx.createBufferSource(); src.buffer = buf;
  var f = ctx.createBiquadFilter(); f.type="lowpass"; f.frequency.setValueAtTime(filterFreq, t);
  if(slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(40,slideTo), t+dur);
  var g = ctx.createGain(); g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t+dur);
  src.connect(f); f.connect(g); g.connect(sfxGain);
  src.start(t);
}

var SFX = {
  click: function(){ blip(660, 0.07, "square", 0.15, 880); },
  launch: function(){ noiseBurst(0.9, 0.5, 3000, 300); blip(140, 0.8, "sawtooth", 0.2, 420); },
  purchase: function(){ blip(880,0.09,"square",0.22); setTimeout(function(){blip(1174,0.09,"square",0.22);},90); setTimeout(function(){blip(1568,0.16,"square",0.22);},180); },
  denied: function(){ blip(180,0.18,"sawtooth",0.2,120); },
  coin: function(){ blip(1320,0.06,"square",0.12,1760); },
  record: function(){ var n=[523,659,784,1046,1318]; n.forEach(function(f,i){ setTimeout(function(){blip(f,0.18,"triangle",0.3);},i*110); }); },
  impact: function(hard){ noiseBurst(hard?0.7:0.35, hard?0.7:0.4, hard?900:1400, 120); blip(hard?70:110, hard?0.5:0.25, "sine", 0.5, 35); },
  splash: function(){ noiseBurst(0.6, 0.5, 2500, 400); blip(300,0.4,"sine",0.2,80); },
  milestone: function(){ blip(784,0.12,"triangle",0.25,1176); },
  stall: function(){ blip(300,0.25,"sawtooth",0.15,140); }
};

/* looping wind: filtered noise, gain driven by speed */
function startWind(){
  if(!ensure()) return;
  if(windNodes) return;
  var len = ctx.sampleRate * 1.5;
  var buf = ctx.createBuffer(1, len, ctx.sampleRate);
  var ch = buf.getChannelData(0);
  for(var i=0;i<len;i++) ch[i]=Math.random()*2-1;
  var src = ctx.createBufferSource(); src.buffer=buf; src.loop=true;
  var f = ctx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=600; f.Q.value=0.6;
  var g = ctx.createGain(); g.gain.value=0;
  src.connect(f); f.connect(g); g.connect(sfxGain);
  src.start();
  windNodes = {src:src, filter:f, gain:g};
}
function setWind(speedMs, boosting){
  if(!windNodes || !enabled.sfx) return;
  var v = Math.min(1, speedMs/60);
  var target = v*v*0.5 + (boosting?0.12:0);
  windNodes.gain.gain.setTargetAtTime(target, now(), 0.1);
  windNodes.filter.frequency.setTargetAtTime(400 + speedMs*22, now(), 0.1);
}
function stopWind(){
  if(!windNodes) return;
  try{ windNodes.gain.gain.setTargetAtTime(0, now(), 0.1); }catch(e){}
}

/* booster loop */
var boostOsc = null;
function startBoost(){
  if(!ensure() || !enabled.sfx || boostOsc) return;
  var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type="sawtooth"; o.frequency.value=90;
  f.type="lowpass"; f.frequency.value=900;
  g.gain.value=0.12;
  o.connect(f); f.connect(g); g.connect(sfxGain);
  o.start();
  boostOsc = {o:o,g:g};
}
function stopBoost(){
  if(!boostOsc) return;
  try{ boostOsc.o.stop(); }catch(e){}
  boostOsc = null;
}

/* tiny cheerful music loop (menu/shop): bass + pluck sequencer */
var MELODY = [262,0,330,0,392,0,330,392, 262,0,330,392,523,392,330,0];
function startMusic(){
  if(!ensure() || !enabled.music || musicTimer) return;
  musicStep = 0;
  musicTimer = setInterval(function(){
    if(!enabled.music || !ctx) return;
    var t = now();
    var f = MELODY[musicStep % MELODY.length];
    if(f){
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = (musicStep%4===0)?"triangle":"sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.20, t);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.28);
      o.connect(g); g.connect(musicGain);
      o.start(t); o.stop(t+0.3);
    }
    if(musicStep%2===0){
      var b = ctx.createOscillator(), bg = ctx.createGain();
      b.type="sine"; b.frequency.value = [131,98,110,98][(musicStep/2)%4|0];
      bg.gain.setValueAtTime(0.22,t); bg.gain.exponentialRampToValueAtTime(0.001,t+0.4);
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
