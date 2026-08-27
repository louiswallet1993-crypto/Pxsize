'use strict';
window.PX = window.PX || {};

/*
 * Palette par défaut — mêmes couleurs que la v1, mais rangées du plus CLAIR
 * au plus SOMBRE, l'ordre étant devenu la donnée qui pilote le rendu.
 * Cet ordre reproduit exactement ce que l'ancien tri par luminance faisait,
 * donc le rendu par défaut est inchangé — il est juste devenu lisible.
 */
PX.DEFAULT_PALETTE = [
  { color: '#f5d0a9', weight: 10 },   // sable    — hautes lumières
  { color: '#FF8C00', weight: 10 },   // orange
  { color: '#4169E1', weight: 10 },   // bleu
  { color: '#FF1493', weight: 10 },   // rose
  { color: '#8B4513', weight: 10 }    // brun     — ombres
];

PX.MAX_PALETTE = 8;

PX.state = {
  mode: 'bw',            // 'bw' | 'color'
  algorithm: 'halftone',
  size: 31,              // 2–60
  threshold: 50,         // 0–100 (B&W)
  ditherFactor: 50,      // 0–100 (Color)
  palette: PX.DEFAULT_PALETTE.map(c => ({ ...c })),

  sourceType: null,      // 'image' | 'video'
  sourceImg: null,
  hasContent: false,

  videoPlaying: false,
  videoLastTime: -1,

  editingColorIndex: -1,
  linesDir: 'h',         // 'h' | 'v'
  distortion: 50,        // 0–100 (Line Warp : amplitude du déplacement)
  alpha: false,          // conserver la transparence de la source
  picker: { h: 30, s: 80, v: 85 },

  theme: 'bright'        // 'bright' | 'dark'
};

/* Persistance : uniquement le thème, cf. §15 du CLAUDE.md */
PX.prefs = {
  KEY: 'pxsize.theme',
  loadTheme() {
    try {
      const v = localStorage.getItem(this.KEY);
      return v === 'dark' || v === 'bright' ? v : 'bright';
    } catch (_) {
      return 'bright';
    }
  },
  saveTheme(theme) {
    try { localStorage.setItem(this.KEY, theme); } catch (_) {}
  }
};
