'use strict';
window.PX = window.PX || {};

PX.files = (function () {

  const state = PX.state;
  const dom = PX.dom;

  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi', 'video/mov', 'video/webm'];
  const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,' +
                 'video/x-msvideo,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.avi,.webm';

  function showCanvas() {
    dom.dropZone.style.display = 'none';
    dom.previewCanvas.style.display = 'block';
  }

  function hideCanvas() {
    dom.dropZone.style.display = '';
    dom.previewCanvas.style.display = 'none';
  }

  /* La v1 sortait en silence sur un fichier illisible. On le signale. */
  function fail(message) {
    console.warn('[PXSize]', message);
    dom.dropZone.querySelector('.drop-text').textContent = message;
    setTimeout(() => {
      dom.dropZone.querySelector('.drop-text').textContent =
        'Drag & drop an image or a video here';
    }, 2600);
  }

  function cleanupVideo() {
    PX.render.stopLoop();
    const vid = dom.sourceVideo;
    vid.pause();
    vid.removeAttribute('src');
    vid.load();
    state.videoPlaying = false;
    state.videoLastTime = -1;
  }

  function loadImage(url) {
    const img = new Image();
    img.onload = () => {
      cleanupVideo();
      state.sourceType = 'image';
      state.sourceImg = img;
      state.hasContent = true;

      PX.zoom.reset();
      showCanvas();
      dom.videoControls.classList.remove('visible');
      dom.exportBtn.disabled = false;
      PX.controls.updateVisibility();   // la case Alpha dépend du type de source
      PX.render.draw();
    };
    img.onerror = () => fail('Could not read this image');
    img.src = url;
  }

  function loadVideo(url) {
    cleanupVideo();
    const vid = dom.sourceVideo;

    vid.onerror = () => fail('Could not read this video');

    /* v1 attendait 100 ms au pif ; loadeddata garantit que la première
       frame est décodée, donc on peut rendre tout de suite. */
    vid.onloadeddata = () => {
      state.sourceType = 'video';
      state.sourceImg = null;
      state.hasContent = true;
      state.videoPlaying = false;
      dom.playPauseBtn.textContent = '▶';

      PX.zoom.reset();
      showCanvas();
      dom.videoControls.classList.add('visible');
      dom.exportBtn.disabled = false;
      PX.controls.updateVisibility();   // masque la case Alpha pour une vidéo

      PX.render.draw();
      PX.render.startLoop();
    };

    vid.onended = () => {
      state.videoPlaying = false;
      dom.playPauseBtn.textContent = '▶';
    };

    vid.src = url;
    vid.load();
  }

  function load(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);

    if (IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|gif|webp)$/i.test(file.name)) {
      loadImage(url);
    } else if (VIDEO_TYPES.includes(file.type) || /\.(mp4|mov|avi|webm)$/i.test(file.name)) {
      loadVideo(url);
    } else {
      URL.revokeObjectURL(url);
      fail('Unsupported file type');
    }
  }

  function reset() {
    cleanupVideo();
    state.sourceType = null;
    state.sourceImg = null;
    state.hasContent = false;
    dom.previewCanvas.width = 0;
    dom.previewCanvas.height = 0;
    PX.zoom.reset();
    hideCanvas();
    dom.exportBtn.disabled = true;
    dom.videoControls.classList.remove('visible');
  }

  function init() {
    const area = dom.previewArea;

    /*
     * Le dépôt est écouté sur TOUTE la fenêtre, pas seulement sur la zone
     * de preview : le rail de gauche fait 430 px (logo + contrôles), c'est
     * une cible de dépôt naturelle et y lâcher un fichier ne faisait rien.
     *
     * preventDefault sur dragover ET drop est également obligatoire :
     * sans ça Chromium applique son comportement par défaut et navigue
     * vers le fichier, ce qui remplacerait l'app par l'image brute.
     */
    let dragDepth = 0;   // dragenter/leave se déclenchent aussi sur les enfants

    window.addEventListener('dragenter', e => {
      e.preventDefault();
      dragDepth++;
      dom.dropZone.classList.add('drag-over');
    });

    window.addEventListener('dragover', e => e.preventDefault());

    window.addEventListener('dragleave', () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) dom.dropZone.classList.remove('drag-over');
    });

    window.addEventListener('drop', e => {
      e.preventDefault();
      dragDepth = 0;
      dom.dropZone.classList.remove('drag-over');
      const file = e.dataTransfer && e.dataTransfer.files[0];
      if (file) load(file);
    });

    // Clic sur la zone vide → sélecteur de fichier
    area.addEventListener('click', () => {
      if (state.hasContent) return;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = ACCEPT;
      input.onchange = e => { if (e.target.files[0]) load(e.target.files[0]); };
      input.click();
    });
    dom.dropZone.style.cursor = 'pointer';
  }

  return { init, load, reset };

})();
