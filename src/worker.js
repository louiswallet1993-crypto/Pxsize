'use strict';
/*
 * Worker de dithering.
 * Reçoit l'ImageData source, rend, renvoie le résultat.
 * Les buffers sont transférés dans les deux sens → zéro copie.
 */
importScripts('engine.js');

self.onmessage = (e) => {
  const { id, W, H, buffer, params } = e.data;

  try {
    const data = new Uint8ClampedArray(buffer);
    const out = self.PXEngine.render(data, W, H, params);
    self.postMessage(
      { id, ok: true, W: out.width, H: out.height, buffer: out.data.buffer },
      [out.data.buffer]
    );
  } catch (err) {
    self.postMessage({ id, ok: false, error: err.message });
  }
};
