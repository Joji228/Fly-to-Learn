/* Bootstrap */
(function(){
"use strict";
window.addEventListener("load", function(){
  var save = window.DA.Save.load();
  var particles = new window.DA.Particles();
  particles.enabled = save.settings.particles;
  window.DA.gameInit(document.getElementById("game"), save, particles);
  window.DA.Game.save = save;
  window.DA.Game.particles = particles;
  window.DA.UI.init(save);
  window.DA.UI.showMenu();
  window.DA.Game.phase = "menu";
  window.DA.Game.lastT = performance.now();
  requestAnimationFrame(window.DA.gameLoop);
});
})();
