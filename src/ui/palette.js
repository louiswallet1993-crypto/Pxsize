'use strict';
window.PX = window.PX || {};

PX.palette = (function () {

  const state = PX.state;
  const dom = PX.dom;

  function renderList() {
    dom.paletteList.innerHTML = '';

    state.palette.forEach((c, i) => {
      const row = document.createElement('div');
      row.className = 'pal-row';

      const swatch = document.createElement('button');
      swatch.className = 'pal-swatch';
      swatch.style.background = c.color;
      swatch.title = c.color.toUpperCase();
      swatch.addEventListener('click', () => PX.picker.open(i));

      const weight = document.createElement('input');
      weight.type = 'range';
      weight.className = 'pal-weight';
      weight.min = '1';
      weight.max = '10';
      weight.value = String(c.weight);

      const val = document.createElement('span');
      val.className = 'pal-val';
      val.textContent = c.weight;

      weight.addEventListener('input', () => {
        state.palette[i].weight = parseInt(weight.value, 10);
        val.textContent = weight.value;
        PX.render.trigger();
      });

      const del = document.createElement('button');
      del.className = 'pal-del';
      del.innerHTML = '&times;';
      del.title = 'Remove';
      del.addEventListener('click', () => {
        if (state.palette.length <= 1) return;
        state.palette.splice(i, 1);
        renderList();
        PX.render.trigger();
      });

      row.append(swatch, weight, val, del);
      dom.paletteList.appendChild(row);
    });

    dom.palAdd.style.display = state.palette.length >= PX.MAX_PALETTE ? 'none' : '';
  }

  function init() {
    dom.palAdd.addEventListener('click', () => {
      if (state.palette.length >= PX.MAX_PALETTE) return;
      const hue = Math.floor(Math.random() * 360);
      const [r, g, b] = PX.utils.hsvToRgb(hue, 70, 80);
      state.palette.push({ color: PX.utils.rgbToHex(r, g, b), weight: 4 });
      renderList();
      PX.fx.reveal(dom.paletteList.lastElementChild);   // la nouvelle ligne apparaît
      PX.render.trigger();
    });

    renderList();
  }

  return { init, renderList };

})();
