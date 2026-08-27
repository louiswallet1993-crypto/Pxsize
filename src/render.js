'use strict';
window.PX = window.PX || {};

/*
 * Pipeline de rendu.
 *
 * Différence majeure avec la v1 : le dithering part dans un worker, donc
 * processAndRender est asynchrone. Un garde-fou « busy / queued » garantit
 * qu'il n'y a jamais plus d'un rendu en vol et d'un rendu en attente —
 * les demandes intermédiaires sont écrasées, ce qui est exactement le
 * comportement voulu quand on balaye un slider.
 */
PX.render = (function () {

  const state = PX.state;
  const MAX_PREVIEW_W = 1100;

  // Canvas source offscreen : redimensionne l'image / la frame vidéo
  const src = document.createElement('canvas');
  const srcCtx = src.getContext('2d', { willReadFrequently: true });

  function getSourceDims() {
    if (state.sourceType === 'image') {
      return { w: state.sourceImg.naturalWidth, h: state.sourceImg.naturalHeight };
    }
    const v = PX.dom.sourceVideo;
    return { w: v.videoWidth || 640, h: v.videoHeight || 360 };
  }

  function getPreviewDims() {
    const { w, h } = getSourceDims();
    const scale = Math.min(MAX_PREVIEW_W / w, 1);
    return { w: Math.round(w * scale), h: Math.round(h * scale) };
  }

  function getSourceImageData(targetW, targetH) {
    src.width = targetW;
    src.height = targetH;
    srcCtx.clearRect(0, 0, targetW, targetH);
    const el = state.sourceType === 'image' ? state.sourceImg : PX.dom.sourceVideo;
    srcCtx.drawImage(el, 0, 0, targetW, targetH);
    return srcCtx.getImageData(0, 0, targetW, targetH);
  }

  /** Paramètres envoyés au moteur (clonables : pas de référence DOM) */
  function params() {
    return {
      algorithm: state.algorithm,
      mode: state.mode,
      size: state.size,
      threshold: state.threshold,
      ditherFactor: state.ditherFactor,
      linesDir: state.linesDir,
      distortion: state.distortion,
      alpha: state.alpha,
      palette: state.palette.map(c => ({ color: c.color, weight: c.weight }))
    };
  }

  /*
   * WYSIWYG STRICT.
   *
   * `size` est en pixels. Rendre la preview à 1100 px et l'export en natif
   * donnait des cellules de tailles relatives différentes. Mettre `size` à
   * l'échelle rapprochait la densité, mais jamais au pixel près : la taille
   * de cellule s'arrondit à l'entier et la grille ne retombe pas au même
   * endroit.
   *
   * La seule façon d'avoir un rendu identique est de calculer la preview
   * AUX DIMENSIONS DE L'EXPORT, puis de la laisser s'afficher réduite par le
   * CSS. Le canvas contient alors littéralement les pixels de l'export.
   * C'est le worker qui encaisse le surcoût, donc l'UI ne bloque pas.
   *
   * Images : dimensions natives (identiques à exportImage()).
   * Vidéos : dimensions de preview paires — exactement ce qu'utilise
   *          exportVideo(), qui n'exporte pas en natif.
   */
  function getRenderDims() {
    if (state.sourceType === 'video') {
      const pd = getPreviewDims();
      return { w: Math.floor(pd.w / 2) * 2, h: Math.floor(pd.h / 2) * 2 };
    }
    return getSourceDims();
  }

  // ── Overlay de traitement : n'apparaît que si le rendu traîne ─────
  let overlayTimer = null;
  function overlayOn() {
    clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => PX.dom.processing.classList.add('active'), 120);
  }
  function overlayOff() {
    clearTimeout(overlayTimer);
    PX.dom.processing.classList.remove('active');
  }

  // ── Rendu de la preview ──────────────────────────────────────────
  let busy = false;
  let queued = false;

  async function draw() {
    if (!state.hasContent) return;
    if (busy) { queued = true; return; }

    busy = true;
    overlayOn();

    try {
      const { w, h } = getRenderDims();
      const out = await PX.engine.render(getSourceImageData(w, h), params());
      const cv = PX.dom.previewCanvas;
      if (cv.width !== out.width || cv.height !== out.height) {
        cv.width = out.width;
        cv.height = out.height;
      }
      cv.getContext('2d').putImageData(out, 0, 0);
      PX.zoom.refresh();   // réévalue le lissage : la taille du canvas a pu changer
    } catch (err) {
      console.error('[PXSize] Échec du rendu :', err);
    } finally {
      busy = false;
      overlayOff();
      if (queued) { queued = false; draw(); }
    }
  }

  /* Debounce court : le worker encaisse la charge et le garde-fou
     busy/queued absorbe le reste. La v1 devait attendre 150 ms. */
  const debouncedDraw = PX.utils.debounce(draw, 30);

  function trigger() {
    if (!state.hasContent) return;
    debouncedDraw();
  }

  /** Rendu ponctuel à des dimensions données (export) */
  function renderAt(w, h) {
    return PX.engine.render(getSourceImageData(w, h), params());
  }

  // ── Boucle vidéo ─────────────────────────────────────────────────
  let rafId = null;

  function loop() {
    if (state.sourceType !== 'video') return;
    const vid = PX.dom.sourceVideo;

    const cur = vid.currentTime;
    const dur = isFinite(vid.duration) ? vid.duration : 0;
    PX.dom.videoTime.textContent = `${PX.utils.formatTime(cur)} / ${PX.utils.formatTime(dur)}`;
    PX.dom.videoFill.style.width = dur > 0 ? `${(cur / dur) * 100}%` : '0%';

    // Ne re-rend que si la frame a changé
    if (Math.abs(cur - state.videoLastTime) >= 0.016) {
      state.videoLastTime = cur;
      draw();
    }

    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  return {
    draw, trigger, renderAt,
    getSourceDims, getPreviewDims, getRenderDims,
    startLoop, stopLoop,
    MAX_PREVIEW_W
  };

})();
