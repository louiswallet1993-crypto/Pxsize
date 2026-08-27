'use strict';
window.PX = window.PX || {};

PX.video = (function () {

  const state = PX.state;
  const dom = PX.dom;

  function toggle() {
    const vid = dom.sourceVideo;
    if (state.videoPlaying) {
      vid.pause();
      state.videoPlaying = false;
      dom.playPauseBtn.textContent = '▶';
    } else {
      vid.play();
      state.videoPlaying = true;
      dom.playPauseBtn.textContent = '⏸';
    }
  }

  function init() {
    dom.playPauseBtn.addEventListener('click', e => {
      e.stopPropagation();
      toggle();
    });

    dom.videoTrack.addEventListener('click', e => {
      e.stopPropagation();
      const vid = dom.sourceVideo;
      const rect = dom.videoTrack.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      vid.currentTime = ratio * (vid.duration || 0);
    });
  }

  return { init, toggle };

})();
