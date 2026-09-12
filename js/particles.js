/* Simple pooled particle system (world-space). */
(function(){
"use strict";
function Particles(){
  this.list = [];
  this.enabled = true;
}
Particles.prototype.spawn = function(o){
  if(!this.enabled) return;
  if(this.list.length > 450) this.list.shift();
  this.list.push({
    x:o.x||0, y:o.y||0, vx:o.vx||0, vy:o.vy||0,
    life:o.life||0.7, age:0, size:o.size||3,
    color:o.color||"#fff", grav:o.grav||0, drag:o.drag||0, shrink:o.shrink!==false
  });
};
Particles.prototype.burst = function(x,y,n,opts){
  opts = opts||{};
  for(var i=0;i<n;i++){
    var a = Math.random()*Math.PI*2;
    var sp = (opts.speed||60) * (0.3+Math.random()*0.9);
    this.spawn({ x:x, y:y,
      vx:Math.cos(a)*sp + (opts.vx||0), vy:Math.sin(a)*sp + (opts.vy||0),
      life:(opts.life||0.8)*(0.5+Math.random()*0.8),
      size:(opts.size||3)*(0.6+Math.random()*0.9),
      color:opts.colors ? opts.colors[(Math.random()*opts.colors.length)|0] : (opts.color||"#fff"),
      grav:opts.grav||0, drag:opts.drag||0 });
  }
};
Particles.prototype.update = function(dt){
  var l = this.list;
  for(var i=l.length-1;i>=0;i--){
    var p = l[i];
    p.age += dt;
    if(p.age >= p.life){ l.splice(i,1); continue; }
    p.vy -= (p.grav||0)*dt;
    if(p.drag){ p.vx *= (1-p.drag*dt); p.vy *= (1-p.drag*dt); }
    p.x += p.vx*dt; p.y += p.vy*dt;
  }
};
Particles.prototype.clear = function(){ this.list.length = 0; };

window.DA = window.DA || {};
window.DA.Particles = Particles;
})();
