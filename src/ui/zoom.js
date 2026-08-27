'use strict';
window.PX = window.PX || {};

/* Zoom molette ×1→×8 + pan au drag, via transform CSS sur le canvas. */
PX.zoom = (function () {

  const state = PX.state;
  const dom = PX.dom;

  const view = { scale: 1, tx: 0, ty: 0 };
  const pan = { active: false, startX: 0, startY: 0, startTx: 0, startTy: 0 };

  function apply() {
    const cv = dom.previewCanvas;
    cv.style.transformOrigin = 'center center';
    cv.style.transform = view.scale === 1
      ? ''
      : `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`;

    /*
     * Le canvas est rendu à la résolution d'export (souvent bien plus grande
     * que la zone d'affichage), donc il est réduit par le CSS.
     *   - réduction  → interpolation lisse : c'est ce que montre n'importe
     *     quelle visionneuse sur le PNG exporté, donc fidèle.
     *   - zoom > 1:1 → on veut des pixels francs pour juger le dithering,
     *     pas un flou d'interpolation.
     */
    if (cv.width) {
      const displayed = (cv.clientWidth || 0) * view.scale;
      cv.style.imageRendering = displayed >= cv.width ? 'pixelated' : 'auto';
    }
  }

  function reset() {
    view.scale = 1; view.tx = 0; view.ty = 0;
    apply();
    dom.previewArea.style.cursor = '';
  }

  function init() {
    dom.previewArea.addEventListener('wheel', e => {
      if (!state.hasContent) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      view.scale = Math.max(1, Math.min(8, view.scale * delta));
      if (view.scale <= 1.001) { view.scale = 1; view.tx = 0; view.ty = 0; }
      apply();
      dom.previewArea.style.cursor = view.scale > 1 ? 'grab' : '';
    }, { passive: false });

    dom.previewArea.addEventListener('mousedown', e => {
      if (view.scale <= 1 || !state.hasContent) return;
      pan.active = true;
      pan.startX = e.clientX;
      pan.startY = e.clientY;
      pan.startTx = view.tx;
      pan.startTy = view.ty;
      dom.previewArea.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!pan.active) return;
      view.tx = pan.startTx + (e.clientX - pan.startX);
      view.ty = pan.startTy + (e.clientY - pan.startY);
      apply();
    });

    document.addEventListener('mouseup', () => {
      if (!pan.active) return;
      pan.active = false;
      dom.previewArea.style.cursor = view.scale > 1 ? 'grab' : '';
    });
  }

  return { init, reset, view, refresh: apply };

})();
