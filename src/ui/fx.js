'use strict';
window.PX = window.PX || {};

/*
 * Animations « glitch ».
 * Règle absolue : rien ici ne doit toucher au canvas de preview ni
 * relancer un rendu de dithering. Tout se passe sur des surfaces d'UI.
 */
PX.fx = (function () {

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Zone opaque des PNG de boutons (bbox mesurée dans le 162×132)
  const SRC = { x: 25, y: 28, w: 112, h: 76 };

  const tex = {};
  function preload(key, src) {
    const img = new Image();
    img.src = src;
    tex[key] = img;
  }
  preload('bw', 'ASSETS/IMG/BW_BUTTON.png');
  preload('color', 'ASSETS/IMG/COLOR_BUTTON.png');

  // ═══════════════════════════════════════════════════════════════════
  // 1. ONDE GLITCH SUR LES BOUTONS DE MODE
  // ═══════════════════════════════════════════════════════════════════
  /*
   * Une onde traverse le bouton de haut en bas. Sur son passage les
   * bandes sont décalées horizontalement, pixelisées, et doublées d'un
   * fantôme décalé — défaut de signal.
   */
  function buttonGlitch(btn, key) {
    if (reduced) return;
    const img = tex[key];
    if (!img || !img.complete || !img.naturalWidth) return;

    const w = btn.offsetWidth, h = btn.offsetHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let cv = btn.querySelector('canvas.fx-glitch');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.className = 'fx-glitch';
      btn.appendChild(cv);
    }
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);

    const ctx = cv.getContext('2d');
    const CW = cv.width, CH = cv.height;

    // Version basse résolution, source de la pixelisation
    const small = document.createElement('canvas');
    small.width = Math.max(4, Math.round(CW / 6));
    small.height = Math.max(3, Math.round(CH / 6));
    const sctx = small.getContext('2d');
    sctx.drawImage(img, SRC.x, SRC.y, SRC.w, SRC.h, 0, 0, small.width, small.height);

    const DUR = 320;
    const BAND = Math.max(3, Math.round(CH / 13));
    const start = performance.now();

    /* Base peinte tout de suite : si rAF tarde (fenêtre qui vient de
       reprendre le focus), le bouton ne doit pas être recouvert d'un
       canvas vide, même une seule frame. */
    ctx.drawImage(img, SRC.x, SRC.y, SRC.w, SRC.h, 0, 0, CW, CH);

    // Décalages figés par bande : l'onde est saccadée, pas ondulante
    const jitter = [];
    for (let i = 0; i * BAND < CH; i++) jitter.push((Math.random() - 0.5) * 2);

    if (btn._fxRaf) cancelAnimationFrame(btn._fxRaf);

    function frame(now) {
      const t = Math.min(1, (now - start) / DUR);
      const front = t * 1.35 - 0.18;   // entre puis sort du cadre

      ctx.clearRect(0, 0, CW, CH);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, SRC.x, SRC.y, SRC.w, SRC.h, 0, 0, CW, CH);
      ctx.imageSmoothingEnabled = false;

      for (let i = 0, y = 0; y < CH; i++, y += BAND) {
        const bh = Math.min(BAND, CH - y);
        const d = Math.abs((y + bh / 2) / CH - front);
        if (d > 0.24) continue;

        const k = 1 - d / 0.24;                       // intensité 0→1
        const step = 3;                               // décalages quantifiés
        const off = Math.round(jitter[i] * 22 * k / step) * step;

        // Bande repixelisée, prise dans la version basse résolution
        const sy = (y / CH) * small.height;
        const sh = (bh / CH) * small.height;
        ctx.clearRect(0, y, CW, bh);
        ctx.drawImage(small, 0, sy, small.width, sh, off, y, CW, bh);

        // Fantôme décalé en sens inverse
        if (k > 0.45) {
          ctx.globalAlpha = 0.4 * k;
          ctx.globalCompositeOperation = 'screen';
          ctx.drawImage(small, 0, sy, small.width, sh, -off * 0.6, y, CW, bh);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
        }
      }

      // Quelques blocs parasites
      const blocks = Math.round(5 * (1 - Math.abs(t - 0.45) * 2));
      for (let i = 0; i < blocks; i++) {
        const bw = 4 + Math.random() * 14;
        const bx = Math.random() * CW;
        const by = front * CH + (Math.random() - 0.5) * CH * 0.3;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
        ctx.fillRect(Math.round(bx), Math.round(by), Math.round(bw), 2);
        ctx.globalAlpha = 1;
      }

      if (t < 1) {
        btn._fxRaf = requestAnimationFrame(frame);
      } else {
        btn._fxRaf = null;
        cv.remove();
      }
    }

    btn._fxRaf = requestAnimationFrame(frame);

    /* Fenêtre en arrière-plan → Chromium suspend rAF et le canvas
       resterait posé sur le bouton. Filet de sécurité. */
    clearTimeout(btn._fxKill);
    btn._fxKill = setTimeout(() => {
      if (btn._fxRaf) { cancelAnimationFrame(btn._fxRaf); btn._fxRaf = null; }
      cv.remove();
    }, DUR + 250);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. APPARITION DES GROUPES DE CONTRÔLES
  // ═══════════════════════════════════════════════════════════════════
  /** Relance l'animation CSS d'apparition sur un élément. */
  function reveal(el, delay) {
    if (!el || reduced) return;
    el.classList.remove('fx-reveal');
    void el.offsetWidth;                   // force un reflow → rejoue l'anim
    el.style.animationDelay = delay ? `${delay}ms` : '';
    el.classList.add('fx-reveal');
  }

  /** Apparition en cascade des lignes de palette */
  function revealPalette(container) {
    if (!container || reduced) return;
    const rows = container.querySelectorAll('.pal-row');
    rows.forEach((row, i) => reveal(row, i * 45));
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. TRANSITION DE THÈME
  // ═══════════════════════════════════════════════════════════════════
  /*
   * Fondu court « lever / coucher de soleil » : l'écran se dissout en
   * blocs de pixels de l'ancienne et de la nouvelle couleur de fond,
   * le thème bascule au milieu, puis les blocs se résorbent.
   */
  let themeCv = null;
  let themeRaf = null;
  let themeKill = null;

  function themeTransition(applyTheme) {
    if (reduced) { applyTheme(); return; }

    const fromBg = getComputedStyle(document.body).backgroundColor;

    if (!themeCv) {
      themeCv = document.createElement('canvas');
      themeCv.className = 'fx-theme';
      document.body.appendChild(themeCv);
    }
    const W = themeCv.width = window.innerWidth;
    const H = themeCv.height = window.innerHeight;
    const ctx = themeCv.getContext('2d');

    const DUR = 420;
    const BLOCK = 14;
    const cols = Math.ceil(W / BLOCK);
    const rows = Math.ceil(H / BLOCK);
    const start = performance.now();

    let switched = false;
    let toBg = fromBg;

    themeCv.style.display = 'block';
    document.documentElement.classList.add('fx-theme-shift');
    if (themeRaf) cancelAnimationFrame(themeRaf);

    function frame(now) {
      const t = Math.min(1, (now - start) / DUR);

      // Bascule au milieu, sous le pic de couverture
      if (!switched && t >= 0.42) {
        switched = true;
        applyTheme();
        toBg = getComputedStyle(document.body).backgroundColor;
      }

      // Couverture : monte puis redescend
      const cover = t < 0.42 ? (t / 0.42) * 0.92 : (1 - (t - 0.42) / 0.58) * 0.92;

      ctx.clearRect(0, 0, W, H);
      for (let ry = 0; ry < rows; ry++) {
        // Le front avance par rangées : dissolution dirigée, pas uniforme
        const bias = 1 - Math.abs(ry / rows - t) * 1.1;
        for (let rx = 0; rx < cols; rx++) {
          if (Math.random() > cover * Math.max(0.25, bias)) continue;
          ctx.fillStyle = Math.random() > 0.5 ? fromBg : toBg;
          ctx.fillRect(rx * BLOCK, ry * BLOCK, BLOCK, BLOCK);
        }
      }

      if (t < 1) {
        themeRaf = requestAnimationFrame(frame);
      } else {
        finish();
      }
    }

    function finish() {
      if (themeRaf) { cancelAnimationFrame(themeRaf); themeRaf = null; }
      clearTimeout(themeKill);
      themeKill = null;
      if (!switched) { switched = true; applyTheme(); }   // ne jamais perdre la bascule
      themeCv.style.display = 'none';
      document.documentElement.classList.remove('fx-theme-shift');
    }

    themeRaf = requestAnimationFrame(frame);

    /* Si la fenêtre est en arrière-plan, rAF ne tourne pas : sans ce
       filet, le clic sur le toggle ne changerait tout simplement rien. */
    clearTimeout(themeKill);
    themeKill = setTimeout(finish, DUR + 250);
  }

  return { buttonGlitch, reveal, revealPalette, themeTransition };

})();
