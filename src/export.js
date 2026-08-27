'use strict';
window.PX = window.PX || {};

PX.exporter = (function () {

  const { ipcRenderer } = require('electron');
  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  const state = PX.state;
  const dom = PX.dom;
  const progress = PX.modals.progress;

  // ── IMAGE → PNG pleine résolution ────────────────────────────────
  async function exportImage() {
    // Mêmes dimensions que la preview → le PNG est pixel pour pixel
    // ce que l'utilisateur voit à l'écran
    const { w: W, h: H } = PX.render.getRenderDims();

    progress.open('Processing full resolution…');
    progress.set(30);
    await new Promise(r => setTimeout(r, 30));

    try {
      const processed = await PX.render.renderAt(W, H);

      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      cv.getContext('2d').putImageData(processed, 0, 0);
      progress.set(70);

      const result = await ipcRenderer.invoke('save-file', {
        defaultName: 'pxsize_export.png',
        filters: [{ name: 'PNG Image', extensions: ['png'] }]
      });

      if (!result.canceled) {
        const base64 = cv.toDataURL('image/png').split(',')[1];
        const buf = Buffer.from(base64, 'base64');
        const wr = await ipcRenderer.invoke('write-file', {
          filePath: result.filePath,
          buffer: Array.from(buf)
        });
        if (!wr.success) throw new Error(wr.error);
        progress.set(100, 'Done');
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (err) {
      console.error('[PXSize] Export image :', err);
      progress.set(100, `Error: ${err.message}`);
      await new Promise(r => setTimeout(r, 1600));
    }

    progress.close();
  }

  // ── VIDÉO → MP4 H.264 ────────────────────────────────────────────
  async function exportVideo() {
    const vid = dom.sourceVideo;
    const dur = vid.duration;

    const result = await ipcRenderer.invoke('save-file', {
      defaultName: 'pxsize_export.mp4',
      filters: [{ name: 'MP4 Video', extensions: ['mp4'] }]
    });
    if (result.canceled) return;

    progress.open('Preparing…');

    // La boucle de preview relancerait un rendu à chaque seek : on la coupe
    PX.render.stopLoop();
    vid.pause();
    state.videoPlaying = false;
    dom.playPauseBtn.textContent = '▶';

    // Mêmes dimensions que la preview (déjà paires, requis par H.264)
    const { w: EW, h: EH } = PX.render.getRenderDims();

    const tempDir = path.join(os.tmpdir(), `pxsize_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const expCanvas = document.createElement('canvas');
    expCanvas.width = EW;
    expCanvas.height = EH;
    const expCtx = expCanvas.getContext('2d');

    const fps = 30;
    const frameTime = 1 / fps;
    const totalFrames = Math.ceil(dur * fps);
    let frame = 0;

    try {
      for (let t = 0; t <= dur; t += frameTime) {
        // Seek → on attend que la frame soit réellement décodée
        await new Promise(resolve => {
          vid.addEventListener('seeked', resolve, { once: true });
          vid.currentTime = t;
        });

        const imgData = await PX.render.renderAt(EW, EH);
        expCtx.putImageData(imgData, 0, 0);

        // JPEG et H.264 n'ont pas de canal alpha : on aplatit sur blanc,
        // sinon les zones transparentes ressortiraient en noir.
        if (state.alpha) {
          expCtx.globalCompositeOperation = 'destination-over';
          expCtx.fillStyle = '#fff';
          expCtx.fillRect(0, 0, EW, EH);
          expCtx.globalCompositeOperation = 'source-over';
        }

        // Écriture JPEG directe sur disque : pas d'IPC par frame
        const blob = await new Promise(r => expCanvas.toBlob(r, 'image/jpeg', 0.93));
        const buf = Buffer.from(await blob.arrayBuffer());
        fs.writeFileSync(path.join(tempDir, `frame_${String(frame).padStart(6, '0')}.jpg`), buf);

        frame++;
        progress.set(
          Math.min(78, Math.round((frame / totalFrames) * 78)),
          `Capturing ${frame} / ${totalFrames}`
        );
      }

      ipcRenderer.removeAllListeners('encode-progress');
      ipcRenderer.on('encode-progress', (_, pct) => {
        progress.set(80 + Math.round(pct * 0.19));
      });

      progress.set(80, 'Encoding MP4 (H.264)…');

      const conv = await ipcRenderer.invoke('encode-frames-to-mp4', {
        framesDir: tempDir,
        outputPath: result.filePath,
        fps,
        totalFrames: frame
      });

      ipcRenderer.removeAllListeners('encode-progress');

      if (!conv.success) throw new Error(conv.error);
      progress.set(100, 'Export complete');
      await new Promise(r => setTimeout(r, 600));

    } catch (err) {
      console.error('[PXSize] Export vidéo :', err);
      ipcRenderer.removeAllListeners('encode-progress');
      try { fs.rmSync(tempDir, { recursive: true }); } catch (_) {}
      progress.set(100, `Error: ${err.message}`);
      await new Promise(r => setTimeout(r, 2200));
    }

    progress.close();
    PX.render.startLoop();
  }

  function init() {
    dom.exportBtn.addEventListener('click', () => {
      if (!state.hasContent) return;
      if (state.sourceType === 'image') exportImage();
      else exportVideo();
    });
  }

  return { init, exportImage, exportVideo };

})();
