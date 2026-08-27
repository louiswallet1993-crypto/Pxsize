'use strict';
window.PX = window.PX || {};

/* Bootstrap — l'ordre compte : le thème d'abord (évite le flash), puis
   les modules d'UI, puis ceux qui en dépendent. */
(function () {

  PX.theme.init();
  PX.zoom.init();
  PX.controls.init();
  PX.palette.init();
  PX.picker.init();
  PX.files.init();
  PX.video.init();
  PX.modals.init();
  PX.exporter.init();

  // Lien Instagram
  PX.dom.igBtn.addEventListener('click', () => {
    require('electron').ipcRenderer.send('open-url', 'https://www.instagram.com/rastrolastronot/');
  });

  // La sonde du worker est asynchrone : on log une fois qu'elle a répondu
  setTimeout(() => {
    console.log(
      `[PXSize] 2.0 prêt — moteur : ${PX.engine.usesWorker ? 'Web Worker' : 'thread principal'}`
    );
  }, 200);

})();
