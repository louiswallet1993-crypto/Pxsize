'use strict';
window.PX = window.PX || {};

/*
 * Color picker HSV — repris de la v1.
 *   canvas principal 220×180 : X = teinte 0→360°, Y = saturation
 *   strip 20×180             : valeur (blanc en haut → noir en bas)
 */
PX.picker = (function () {

  const state = PX.state;
  const dom = PX.dom;
  const U = PX.utils;

  const specCtx = dom.spectrumCanvas.getContext('2d');
  const brtCtx = dom.brightnessCanvas.getContext('2d');

  let spectrumDragging = false;
  let brightnessDragging = false;

  function drawSpectrum() {
    const W = 220, H = 180;

    // X : arc-en-ciel complet
    const hueGrad = specCtx.createLinearGradient(0, 0, W, 0);
    for (let i = 0; i <= 6; i++) hueGrad.addColorStop(i / 6, `hsl(${i * 60}, 100%, 50%)`);
    specCtx.fillStyle = hueGrad;
    specCtx.fillRect(0, 0, W, H);

    // Y : saturation, blanc en bas
    const satGrad = specCtx.createLinearGradient(0, 0, 0, H);
    satGrad.addColorStop(0, 'rgba(255,255,255,0)');
    satGrad.addColorStop(1, 'rgba(255,255,255,1)');
    specCtx.fillStyle = satGrad;
    specCtx.fillRect(0, 0, W, H);

    const cx = (state.picker.h / 360) * W;
    const cy = (1 - state.picker.s / 100) * H;
    specCtx.strokeStyle = '#fff';
    specCtx.lineWidth = 2;
    specCtx.beginPath();
    specCtx.arc(cx, cy, 7, 0, Math.PI * 2);
    specCtx.stroke();
    specCtx.strokeStyle = 'rgba(0,0,0,0.5)';
    specCtx.lineWidth = 1;
    specCtx.beginPath();
    specCtx.arc(cx, cy, 8, 0, Math.PI * 2);
    specCtx.stroke();
  }

  function drawBrightness() {
    const W = 20, H = 180;
    const grad = brtCtx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#000000');
    brtCtx.fillStyle = grad;
    brtCtx.fillRect(0, 0, W, H);

    const cy = (1 - state.picker.v / 100) * H;
    brtCtx.strokeStyle = cy > H * 0.55 ? '#fff' : '#000';
    brtCtx.lineWidth = 2;
    brtCtx.beginPath();
    brtCtx.moveTo(0, cy);
    brtCtx.lineTo(W, cy);
    brtCtx.stroke();
  }

  function draw() {
    drawSpectrum();
    drawBrightness();
    const [r, g, b] = U.hsvToRgb(state.picker.h, state.picker.s, state.picker.v);
    const hex = U.rgbToHex(r, g, b).toUpperCase();
    dom.hexInput.value = hex;
    dom.colorPreview.style.background = hex;
  }

  function fromSpectrum(e) {
    const rect = dom.spectrumCanvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    state.picker.h = Math.round((x / rect.width) * 360);
    state.picker.s = Math.round(100 - (y / rect.height) * 100);
    draw();
  }

  function fromBrightness(e) {
    const rect = dom.brightnessCanvas.getBoundingClientRect();
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    state.picker.v = Math.round(100 - (y / rect.height) * 100);
    draw();
  }

  function open(index) {
    state.editingColorIndex = index;
    const [r, g, b] = U.hexToRgb(state.palette[index].color);
    const [h, s, v] = U.rgbToHsv(r, g, b);
    state.picker = { h, s, v };
    draw();
    dom.pickerOverlay.classList.add('open');
  }

  function close() {
    dom.pickerOverlay.classList.remove('open');
  }

  function init() {
    dom.spectrumCanvas.addEventListener('mousedown', e => { spectrumDragging = true; fromSpectrum(e); });
    dom.brightnessCanvas.addEventListener('mousedown', e => { brightnessDragging = true; fromBrightness(e); });

    document.addEventListener('mousemove', e => {
      if (spectrumDragging) fromSpectrum(e);
      if (brightnessDragging) fromBrightness(e);
    });
    document.addEventListener('mouseup', () => {
      spectrumDragging = false;
      brightnessDragging = false;
    });

    dom.hexInput.addEventListener('input', () => {
      const val = dom.hexInput.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        const [r, g, b] = U.hexToRgb(val);
        const [h, s, v] = U.rgbToHsv(r, g, b);
        state.picker = { h, s, v };
        draw();
      }
    });
    dom.hexInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') dom.pickerApply.click();
    });

    dom.pickerCancel.addEventListener('click', close);
    dom.pickerApply.addEventListener('click', () => {
      if (state.editingColorIndex >= 0) {
        const [r, g, b] = U.hsvToRgb(state.picker.h, state.picker.s, state.picker.v);
        state.palette[state.editingColorIndex].color = U.rgbToHex(r, g, b);
        PX.palette.renderList();
        PX.render.trigger();
      }
      close();
    });

    draw();
  }

  return { init, open, close, draw };

})();
