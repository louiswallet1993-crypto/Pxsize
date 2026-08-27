'use strict';
/*
 * Client du moteur.
 * Fait tourner le dithering dans un Web Worker → l'UI ne peut jamais figer.
 * Si le worker ne démarre pas (importScripts bloqué, etc.), on bascule sur
 * un calcul synchrone dans le thread principal, comme la v1.
 *
 * Le worker est validé par une sonde 1×1 au démarrage : tant qu'il n'a pas
 * répondu, on reste en synchrone. On ne peut pas rejouer un job raté, car
 * postMessage détache le buffer transféré — d'où la sonde en amont.
 */
window.PX = window.PX || {};

PX.engine = (function () {

  let worker = null;
  let workerOk = false;
  let nextId = 1;
  const pending = new Map();

  function fail(reason) {
    if (worker) { try { worker.terminate(); } catch (_) {} }
    worker = null;
    workerOk = false;
    console.warn('[PXSize] Worker indisponible (' + reason + ') — rendu sur le thread principal.');
    for (const [id, job] of pending) { pending.delete(id); job.reject(new Error(reason)); }
  }

  function boot() {
    let w;
    try {
      w = new Worker('src/worker.js');
    } catch (err) {
      return fail(err.message);
    }

    w.onerror = () => fail('erreur de chargement');

    w.onmessage = (e) => {
      const { id, ok, W, H, buffer, error } = e.data;
      const job = pending.get(id);
      if (!job) return;
      pending.delete(id);
      if (ok) job.resolve(new ImageData(new Uint8ClampedArray(buffer), W, H));
      else job.reject(new Error(error));
    };

    // Sonde : un rendu 1×1 pour vérifier que le worker répond vraiment
    const probe = new ImageData(1, 1);
    const probeId = nextId++;
    pending.set(probeId, {
      resolve: () => { worker = w; workerOk = true; },
      reject: () => fail('sonde en échec')
    });
    w.postMessage({
      id: probeId, W: 1, H: 1, buffer: probe.data.buffer,
      params: { algorithm: 'bitmap', mode: 'bw', size: 1, threshold: 50, ditherFactor: 50, linesDir: 'h', palette: [] }
    }, [probe.data.buffer]);
  }

  boot();

  /**
   * @param {ImageData} imgData source (son buffer est transféré, ne plus s'en servir)
   * @param {object} params { algorithm, mode, size, threshold, ditherFactor, linesDir, palette }
   * @returns {Promise<ImageData>}
   */
  function render(imgData, params) {
    const W = imgData.width, H = imgData.height;

    if (!workerOk) {
      try {
        return Promise.resolve(PXEngine.render(imgData.data, W, H, params));
      } catch (err) {
        return Promise.reject(err);
      }
    }

    const id = nextId++;
    const buffer = imgData.data.buffer;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, W, H, buffer, params }, [buffer]);
    });
  }

  return { render, get usesWorker() { return workerOk; } };

})();
