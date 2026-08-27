'use strict';
window.PX = window.PX || {};

PX.modals = (function () {

  const dom = PX.dom;

  // ── Barre de progression d'export ────────────────────────────────
  const progress = {
    open(label) {
      dom.progressLabel.textContent = label;
      dom.progressFill.style.width = '0%';
      dom.progressOverlay.classList.add('open');
    },
    set(pct, label) {
      dom.progressFill.style.width = `${pct}%`;
      if (label) dom.progressLabel.textContent = label;
    },
    close() {
      dom.progressOverlay.classList.remove('open');
      dom.progressFill.style.width = '0%';
    }
  };

  function init() {
    // Poubelle → confirmation
    dom.trashBtn.addEventListener('click', () => dom.confirmOverlay.classList.add('open'));
    dom.confirmNo.addEventListener('click', () => dom.confirmOverlay.classList.remove('open'));
    dom.confirmYes.addEventListener('click', () => {
      dom.confirmOverlay.classList.remove('open');
      PX.files.reset();
    });

    // Clic hors modale → fermeture (pas pour la progression)
    [dom.pickerOverlay, dom.confirmOverlay].forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
      });
    });

    // Échap ferme les modales fermables
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      dom.pickerOverlay.classList.remove('open');
      dom.confirmOverlay.classList.remove('open');
    });
  }

  return { init, progress };

})();
