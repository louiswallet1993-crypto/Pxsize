'use strict';
window.PX = window.PX || {};

PX.controls = (function () {

  const state = PX.state;
  const dom = PX.dom;

  /*
   * Règles de visibilité — identiques à la v1 :
   *   Threshold      → B&W   et algo ≠ lines
   *   Dither factor  → Color et algo ≠ lines
   *   Palette        → Color
   *   Direction H/V  → algo = lines
   */
  /** Bascule la visibilité, et signale si l'élément vient d'apparaître */
  function setVisible(el, visible) {
    const was = !el.hidden;
    el.hidden = !visible;
    return visible && !was;
  }

  function updateVisibility() {
    const isLines = state.algorithm === 'lines';
    const isBW = state.mode === 'bw';

    // Alpha : sans objet sur une vidéo (les frames sont toujours opaques)
    dom.alphaRow.hidden = state.sourceType === 'video';

    if (setVisible(dom.thresholdGroup, isBW && !isLines))  PX.fx.reveal(dom.thresholdGroup);
    if (setVisible(dom.ditherGroup, !isBW && !isLines))     PX.fx.reveal(dom.ditherGroup);
    if (setVisible(dom.linesDirGroup, isLines))             PX.fx.reveal(dom.linesDirGroup);
    if (setVisible(dom.distortionGroup, isLines))           PX.fx.reveal(dom.distortionGroup);

    if (setVisible(dom.paletteGroup, !isBW)) {
      // Le label puis les lignes en cascade, sinon le clip du parent
      // rognerait l'animation des enfants
      PX.fx.reveal(dom.paletteGroup.querySelector('.lbl'));
      PX.fx.revealPalette(dom.paletteList);
      PX.fx.reveal(dom.palAdd, state.palette.length * 45);
    }
  }

  function setMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    dom.btnBW.classList.toggle('is-active', mode === 'bw');
    dom.btnColor.classList.toggle('is-active', mode === 'color');
    updateVisibility();
    PX.render.trigger();
  }

  function setDir(dir) {
    if (state.linesDir === dir) return;
    state.linesDir = dir;
    dom.dirH.classList.toggle('is-active', dir === 'h');
    dom.dirV.classList.toggle('is-active', dir === 'v');
    PX.render.trigger();
  }

  function bindSlider(input, valEl, key) {
    input.addEventListener('input', () => {
      state[key] = parseInt(input.value, 10);
      valEl.textContent = state[key];
      PX.render.trigger();
    });
  }

  function init() {
    dom.algoSelect.addEventListener('change', () => {
      state.algorithm = dom.algoSelect.value;
      updateVisibility();
      PX.render.trigger();
    });

    // L'onde glitch part à chaque clic, même si le mode ne change pas :
    // le bouton doit répondre au doigt.
    dom.btnBW.addEventListener('click', () => {
      PX.fx.buttonGlitch(dom.btnBW, 'bw');
      setMode('bw');
    });
    dom.btnColor.addEventListener('click', () => {
      PX.fx.buttonGlitch(dom.btnColor, 'color');
      setMode('color');
    });
    dom.dirH.addEventListener('click', () => setDir('h'));
    dom.dirV.addEventListener('click', () => setDir('v'));

    dom.alphaCheck.addEventListener('change', () => {
      state.alpha = dom.alphaCheck.checked;
      dom.previewCanvas.classList.toggle('alpha-on', state.alpha);
      PX.render.trigger();
    });

    bindSlider(dom.sizeSlider, dom.sizeVal, 'size');
    bindSlider(dom.thresholdSlider, dom.thresholdVal, 'threshold');
    bindSlider(dom.ditherSlider, dom.ditherVal, 'ditherFactor');
    bindSlider(dom.distortionSlider, dom.distortionVal, 'distortion');

    updateVisibility();
  }

  return { init, updateVisibility, setMode, setDir };

})();
