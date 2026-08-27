'use strict';
/*
 * PXSize — moteur de dithering
 * ════════════════════════════════════════════════════════════════════
 * Chargé dans DEUX contextes :
 *   - le Web Worker (via importScripts) → cas nominal
 *   - le thread principal (via <script>) → fallback si le worker échoue
 * Ne référence donc AUCUNE API DOM : uniquement OffscreenCanvas, qui
 * existe dans les deux.
 *
 * Portage à l'identique de la v1. Les seules différences sont des
 * optimisations qui ne changent pas le résultat :
 *   - palette pré-convertie une fois par rendu
 *   - canvas de travail mis en cache entre les frames
 *   - contextes en willReadFrequently
 */
(function (scope) {

  // ═══════════════════════════════════════════════════════════════════
  // UTILITAIRES
  // ═══════════════════════════════════════════════════════════════════
  function getLuma(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  /** Pseudo-aléatoire déterministe — mêmes caractères à chaque rendu */
  function seededRand(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return n - Math.floor(n);
  }

  function hexToRgb(hex) {
    const v = parseInt(hex.replace('#', ''), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  // ═══════════════════════════════════════════════════════════════════
  // PALETTE
  // ═══════════════════════════════════════════════════════════════════
  /*
   * v1 refaisait, POUR CHAQUE CELLULE : un reduce sur les poids, un
   * parcours de la palette, puis un parseInt de la chaîne hex.
   * Ici tout est préparé une seule fois par rendu.
   */
  function prepPalette(palette) {
    /*
     * L'ORDRE DE LA LISTE FAIT FOI — on ne trie pas.
     * 1re couleur = tons les plus CLAIRS, dernière = tons les plus SOMBRES.
     * (la v1 triait par luminance, ce qui ignorait purement et simplement
     * l'ordre choisi par l'utilisateur : ses couleurs atterrissaient là où
     * l'app en décidait.)
     */
    const list = palette;

    const n = list.length;
    const P = {
      n,
      r: new Uint8Array(n),
      g: new Uint8Array(n),
      b: new Uint8Array(n),
      cum: new Float64Array(n),   // poids cumulés
      hex: new Array(n),          // chaînes réutilisées telles quelles pour fillStyle
      total: 0
    };

    let acc = 0;
    for (let i = 0; i < n; i++) {
      const c = hexToRgb(list[i].color);
      P.r[i] = c[0]; P.g[i] = c[1]; P.b[i] = c[2];
      acc += list[i].weight;
      P.cum[i] = acc;
      P.hex[i] = list[i].color;
    }
    P.total = acc;
    return P;
  }

  /**
   * Index de la couleur correspondant à une luminosité [0..1].
   * brightness 1 (blanc) -> index 0 (1re couleur de la liste)
   * brightness 0 (noir)  -> dernier index
   * D'où l'inversion : la liste se lit du plus clair au plus sombre.
   * Le poids d'une couleur = la largeur de sa plage de tons (sa tolérance).
   */
  function palIndex(brightness, P) {
    const target = (1 - brightness) * P.total;
    for (let i = 0; i < P.n; i++) {
      if (P.cum[i] >= target) return i;
    }
    return P.n - 1;
  }

  // ═══════════════════════════════════════════════════════════════════
  // CANVAS DE TRAVAIL (mis en cache)
  // ═══════════════════════════════════════════════════════════════════
  /*
   * v1 créait un canvas neuf à chaque frame (trois pour Floyd-Steinberg).
   * On les garde et on ne les redimensionne que si les dimensions bougent.
   * Chaque algo repeint intégralement sa surface, donc pas besoin de clear.
   */
  const pool = Object.create(null);

  function scratch(key, w, h) {
    let s = pool[key];
    if (!s) {
      const cv = new OffscreenCanvas(w, h);
      s = pool[key] = { cv, ctx: cv.getContext('2d', { willReadFrequently: true }) };
    } else if (s.cv.width !== w || s.cv.height !== h) {
      s.cv.width = w;
      s.cv.height = h;
    }
    return s;
  }

  // ═══════════════════════════════════════════════════════════════════
  // ALGORITHMES
  // ═══════════════════════════════════════════════════════════════════

  // ─── HALFTONE ────────────────────────────────────────────────────
  function applyHalftone(data, W, H, p, P) {
    const { size, threshold, mode } = p;
    const { ctx: oc } = scratch('halftone', W, H);
    oc.fillStyle = '#fff';
    oc.fillRect(0, 0, W, H);

    const maxR = size * 0.52;
    const t = threshold / 100;
    let lastFill = null;   // évite de reparser la couleur à chaque cellule

    for (let cy = 0; cy < H; cy += size) {
      const yEnd = Math.min(cy + size, H);
      for (let cx = 0; cx < W; cx += size) {
        const xEnd = Math.min(cx + size, W);
        let sR = 0, sG = 0, sB = 0, n = 0;
        for (let py = cy; py < yEnd; py++) {
          for (let px = cx; px < xEnd; px++) {
            const i = (py * W + px) * 4;
            sR += data[i]; sG += data[i + 1]; sB += data[i + 2]; n++;
          }
        }
        const bright = getLuma(sR / n, sG / n, sB / n) / 255;

        const radius = maxR * (1 - bright);
        if (radius < 0.4) continue;

        let fill;
        if (mode === 'color') {
          fill = P.hex[palIndex(bright, P)];
        } else {
          if (bright > t + 0.1) continue;
          fill = '#000';
        }
        if (fill !== lastFill) { oc.fillStyle = fill; lastFill = fill; }

        oc.beginPath();
        oc.arc(cx + size / 2, cy + size / 2, Math.min(radius, maxR), 0, Math.PI * 2);
        oc.fill();
      }
    }

    return oc.getImageData(0, 0, W, H);
  }

  // ─── BITMAP (blocs pleins) ───────────────────────────────────────
  function applyBitmap(data, W, H, p, P) {
    const { size, threshold, mode } = p;
    const result = new Uint8ClampedArray(W * H * 4);
    const thresh = threshold * 2.55;

    for (let cy = 0; cy < H; cy += size) {
      const yEnd = Math.min(cy + size, H);
      for (let cx = 0; cx < W; cx += size) {
        const xEnd = Math.min(cx + size, W);
        let sR = 0, sG = 0, sB = 0, n = 0;
        for (let py = cy; py < yEnd; py++) {
          for (let px = cx; px < xEnd; px++) {
            const i = (py * W + px) * 4;
            sR += data[i]; sG += data[i + 1]; sB += data[i + 2]; n++;
          }
        }
        const luma = getLuma(sR / n, sG / n, sB / n);
        let nr, ng, nb;

        if (mode === 'color') {
          const k = palIndex(luma / 255, P);
          nr = P.r[k]; ng = P.g[k]; nb = P.b[k];
        } else {
          nr = ng = nb = luma < thresh ? 0 : 255;
        }

        for (let py = cy; py < yEnd; py++) {
          for (let px = cx; px < xEnd; px++) {
            const i = (py * W + px) * 4;
            result[i] = nr; result[i + 1] = ng; result[i + 2] = nb; result[i + 3] = 255;
          }
        }
      }
    }
    return new ImageData(result, W, H);
  }

  // ─── FLOYD-STEINBERG ─────────────────────────────────────────────
  function applyFloydSteinberg(data, W, H, p, P) {
    const { size, threshold, mode, ditherFactor } = p;
    const factor = ditherFactor / 100;
    const thresh = threshold * 2.55;

    // Downscale par `size` pour l'effet de pixelisation
    const dW = Math.max(1, Math.round(W / size));
    const dH = Math.max(1, Math.round(H / size));

    const tmp = scratch('fs-tmp', W, H);
    tmp.ctx.putImageData(new ImageData(data, W, H), 0, 0);

    const small = scratch('fs-small', dW, dH);
    // drawImage composite : il faut nettoyer, sinon une source à trous
    // laisserait apparaître la frame précédente (le canvas est réutilisé)
    small.ctx.clearRect(0, 0, dW, dH);
    small.ctx.drawImage(tmp.cv, 0, 0, dW, dH);

    const sd = small.ctx.getImageData(0, 0, dW, dH);
    const buf = new Float32Array(sd.data);
    const res = new Uint8ClampedArray(dW * dH * 4);

    for (let y = 0; y < dH; y++) {
      for (let x = 0; x < dW; x++) {
        const i = (y * dW + x) * 4;
        const oR = Math.max(0, Math.min(255, buf[i]));
        const oG = Math.max(0, Math.min(255, buf[i + 1]));
        const oB = Math.max(0, Math.min(255, buf[i + 2]));
        const luma = getLuma(oR, oG, oB);
        let nR, nG, nB;

        if (mode === 'color') {
          const k = palIndex(luma / 255, P);
          nR = P.r[k]; nG = P.g[k]; nB = P.b[k];
        } else {
          nR = nG = nB = luma < thresh ? 0 : 255;
        }

        res[i] = nR; res[i + 1] = nG; res[i + 2] = nB; res[i + 3] = 255;

        // Diffusion de l'erreur, pondérée par ditherFactor
        const eR = (oR - nR) * factor, eG = (oG - nG) * factor, eB = (oB - nB) * factor;
        const spread = (dx, dy, w) => {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= dW || ny < 0 || ny >= dH) return;
          const j = (ny * dW + nx) * 4;
          buf[j] += eR * w; buf[j + 1] += eG * w; buf[j + 2] += eB * w;
        };
        spread(1, 0, 7 / 16);
        spread(-1, 1, 3 / 16);
        spread(0, 1, 5 / 16);
        spread(1, 1, 1 / 16);
      }
    }

    // Upscale nearest-neighbor pour garder des pixels nets
    small.ctx.putImageData(new ImageData(res, dW, dH), 0, 0);
    const out = scratch('fs-out', W, H);
    out.ctx.imageSmoothingEnabled = false;
    out.ctx.clearRect(0, 0, W, H);
    out.ctx.drawImage(small.cv, 0, 0, W, H);
    return out.ctx.getImageData(0, 0, W, H);
  }

  // ─── BAYER (ordonné, cellule par cellule) ────────────────────────
  const BAYER = {
    bayer2: { n: 2, m: [[0, 2], [3, 1]] },
    bayer4: { n: 4, m: [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]] },
    bayer8: {
      n: 8, m: [
        [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
        [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
        [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
        [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]
      ]
    }
  };

  function applyBayer(data, W, H, p, P, key) {
    const { threshold, mode, ditherFactor, size } = p;
    const { n, m } = BAYER[key];
    const thresh = threshold / 100;
    const df = ditherFactor / 100;
    const result = new Uint8ClampedArray(W * H * 4);
    const maxVal = n * n;

    for (let cy = 0; cy < H; cy += size) {
      const yEnd = Math.min(cy + size, H);
      const mRow = m[Math.floor(cy / size) % n];
      for (let cx = 0; cx < W; cx += size) {
        const xEnd = Math.min(cx + size, W);

        // Luminosité moyenne de la cellule
        let sR = 0, sG = 0, sB = 0, count = 0;
        for (let py = cy; py < yEnd; py++) {
          for (let px = cx; px < xEnd; px++) {
            const i = (py * W + px) * 4;
            sR += data[i]; sG += data[i + 1]; sB += data[i + 2]; count++;
          }
        }
        const luma = getLuma(sR / count, sG / count, sB / count) / 255;

        // Seuil Bayer pour cette position de cellule
        const bv = (mRow[Math.floor(cx / size) % n] + 0.5) / maxVal;

        let nR, nG, nB;
        if (mode === 'color') {
          const adj = Math.max(0, Math.min(1, luma + (bv - 0.5) * df));
          const k = palIndex(adj, P);
          nR = P.r[k]; nG = P.g[k]; nB = P.b[k];
        } else {
          nR = nG = nB = (luma + (bv - 0.5) * (1 - thresh * 0.6)) > 0.5 ? 255 : 0;
        }

        for (let py = cy; py < yEnd; py++) {
          for (let px = cx; px < xEnd; px++) {
            const i = (py * W + px) * 4;
            result[i] = nR; result[i + 1] = nG; result[i + 2] = nB; result[i + 3] = 255;
          }
        }
      }
    }
    return new ImageData(result, W, H);
  }

  // ─── CARACTÈRES (chiffres aléatoires) ────────────────────────────
  /* Seul `digits` subsiste : Character + et Character × ont été retirés. */
  function getChar(cx, cy) {
    return String(Math.floor(seededRand(cx, cy) * 10));
  }

  function applyCharRenderer(data, W, H, p, P) {
    const { size, threshold, mode } = p;
    const { ctx: oc } = scratch('chars', W, H);
    oc.fillStyle = mode === 'color' ? '#000' : '#fff';
    oc.fillRect(0, 0, W, H);
    oc.textAlign = 'center';
    oc.textBaseline = 'middle';

    const minFontSize = 3;
    const t = threshold / 100;

    /* Affecter ctx.font reparse une chaîne de fonte, et ctx.fillStyle
       reparse une couleur : v1 le faisait pour CHAQUE cellule. On ne
       réaffecte que sur changement réel — résultat rigoureusement
       identique, mais les aplats ne paient plus le parsing. */
    let lastFont = null;
    let lastFill = null;

    for (let cy = 0; cy < H; cy += size) {
      const yEnd = Math.min(cy + size, H);
      for (let cx = 0; cx < W; cx += size) {
        const xEnd = Math.min(cx + size, W);
        let sR = 0, sG = 0, sB = 0, n = 0;
        for (let py = cy; py < yEnd; py++) {
          for (let px = cx; px < xEnd; px++) {
            const i = (py * W + px) * 4;
            sR += data[i]; sG += data[i + 1]; sB += data[i + 2]; n++;
          }
        }
        const bright = getLuma(sR / n, sG / n, sB / n) / 255;
        const dark = 1 - bright;

        let fill;
        if (mode === 'color') {
          if (dark < 0.04) continue;
          fill = P.hex[palIndex(bright, P)];
        } else {
          if (bright > t * 1.5) continue;
          fill = '#000';
        }
        if (fill !== lastFill) { oc.fillStyle = fill; lastFill = fill; }

        const font = `bold ${Math.max(minFontSize, size * dark * 1.1)}px monospace`;
        if (font !== lastFont) { oc.font = font; lastFont = font; }

        oc.fillText(getChar(cx, cy), cx + size / 2, cy + size / 2);
      }
    }
    return oc.getImageData(0, 0, W, H);
  }

  // ─── LINE WARP ───────────────────────────────────────────────────
  /*
   * Lignes de balayage déplacées perpendiculairement par la luminosité.
   * Le slider DISTORTION pilote l'amplitude — et à travers elle tout le
   * caractère du rendu :
   *
   *   amplitude faible  -> le déplacement reste sous l'espacement, les
   *                        lignes ne se croisent pas : ondulation sage.
   *   amplitude forte   -> jusqu'à 7 espacements, les lignes se croisent,
   *                        se tassent et se brisent en grain (contour /
   *                        flow-line dithering).
   *
   * L'épaisseur et le pas d'échantillonnage suivent la même commande : un
   * trait fin et un pas plus large sont indispensables pour que le grain
   * reste lisible en forte distorsion, alors qu'un trait épais et un
   * échantillonnage au pixel donnent la courbe la plus nette en faible.
   * C'est ce qui permet à UN seul slider de rester bon sur toute sa course.
   */
  function applyLines(data, W, H, p, P) {
    const { size, mode, distortion, linesDir } = p;
    const { ctx: oc } = scratch('lines', W, H);
    oc.fillStyle = '#000';
    oc.fillRect(0, 0, W, H);

    const spacing = Math.max(2, size);
    const d = distortion / 100;

    /* distortion 0 reproduit EXACTEMENT le Line Warp historique
       (amplitude 0.92 espacement, trait 0.32, échantillonnage au pixel) :
       le bas du slider reste donc utile au lieu d'effacer l'image. */
    const amp = spacing * (0.92 + d * 6);

    // Épais et net en faible distorsion -> fin et graineux en forte
    oc.lineWidth = Math.max(0.7, spacing * (0.32 - 0.18 * d));
    oc.lineJoin = 'round';
    oc.lineCap = 'round';

    const horizontal = linesDir !== 'v';
    const limit = horizontal ? H : W;
    const scan = horizontal ? W : H;

    /* Pas d'échantillonnage. ⚠️ Au pixel près, le grain naturel d'une photo
       se traduit en déplacement erratique et le rendu vire au bruit uniforme
       dès que l'amplitude monte : la forme devient illisible. Le pas ne
       s'ouvre donc qu'avec la distorsion — en faible, on reste au pixel. */
    const st = Math.max(1, Math.round((spacing / 3) * d));

    /* Déplacement CENTRÉ : le gris moyen ne bouge pas, le clair part d'un
       côté et le sombre de l'autre. Il porte dans les deux sens, donc des
       lignes hors cadre peuvent y entrer par l'un ou l'autre bord — d'où la
       boucle prolongée de `amp` de chaque côté, sans quoi une bande vide
       apparaît sur un bord. */
    for (let base = spacing / 2 - amp; base < limit + amp + spacing; base += spacing) {
      if (mode === 'bw') {
        oc.beginPath();
        oc.strokeStyle = '#fff';
        for (let s = 0; s <= scan - 1; s += st) {
          const q = Math.min(s, scan - 1);
          const px = horizontal ? q : Math.min(Math.floor(base), W - 1);
          const py = horizontal ? Math.min(Math.floor(base), H - 1) : q;
          const i = (py * W + px) * 4;
          const brightness = getLuma(data[i], data[i + 1], data[i + 2]) / 255;
          const disp = (brightness - 0.5) * amp;

          const cx = horizontal ? q : base - disp;
          const cy = horizontal ? base - disp : q;
          s === 0 ? oc.moveTo(cx, cy) : oc.lineTo(cx, cy);
        }
        oc.stroke();
      } else {
        let curColor = null;
        for (let s = 0; s <= scan; s += st) {
          const q = Math.min(s, scan - 1);
          const px = horizontal ? Math.min(q, W - 1) : Math.min(Math.floor(base), W - 1);
          const py = horizontal ? Math.min(Math.floor(base), H - 1) : Math.min(q, H - 1);
          const i = (py * W + px) * 4;
          const brightness = getLuma(data[i], data[i + 1], data[i + 2]) / 255;
          const newColor = brightness < 0.04 ? null : P.hex[palIndex(brightness, P)];
          const disp = (brightness - 0.5) * amp;

          const cx = horizontal ? q : base - disp;
          const cy = horizontal ? base - disp : q;

          if (newColor !== curColor || s + st > scan) {
            if (curColor !== null) oc.stroke();
            curColor = newColor;
            if (curColor !== null) { oc.beginPath(); oc.strokeStyle = curColor; oc.moveTo(cx, cy); }
          } else if (curColor !== null) {
            oc.lineTo(cx, cy);
          }
        }
      }
    }

    return oc.getImageData(0, 0, W, H);
  }

  // ═══════════════════════════════════════════════════════════════════
  // DISPATCH
  // ═══════════════════════════════════════════════════════════════════
  /**
   * @param {Uint8ClampedArray} data  RGBA de la source redimensionnée
   * @param {number} W @param {number} H
   * @param {object} p  { algorithm, mode, size, threshold, ditherFactor, linesDir, palette }
   * @returns {ImageData}
   */
  function render(data, W, H, p) {
    const P = p.mode === 'color' ? prepPalette(p.palette) : null;

    /*
     * ALPHA — traité ici, donc valable pour les 10 algorithmes sans toucher
     * à aucun d'eux (aucun risque qu'ils divergent).
     *
     * Deux temps :
     *  1. avant  : les pixels quasi transparents sont BLANCHIS. Sans ça ils
     *     valent (0,0,0,0), donc du noir pour le calcul de luminance, et les
     *     cellules de bord se chargent d'un halo sombre parasite. Blanc = clair
     *     = « rien à dessiner » dans la plupart des algos, c'est le neutre.
     *  2. après  : le canal alpha d'origine est réappliqué tel quel, donc les
     *     bords adoucis de la source le restent.
     *
     * Alpha désactivé → rien de tout ça ne s'exécute, sortie inchangée.
     */
    let mask = null;
    if (p.alpha) {
      mask = new Uint8ClampedArray(W * H);
      let hasTransparency = false;
      for (let i = 0, j = 0; j < mask.length; i += 4, j++) {
        const a = data[i + 3];
        mask[j] = a;
        if (a < 250) hasTransparency = true;
        if (a < 128) {
          data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
        }
      }
      // Source opaque : inutile de masquer, on évite un parcours complet
      if (!hasTransparency) mask = null;
    }

    const out = dispatch(data, W, H, p, P);

    if (mask) {
      const d = out.data;
      for (let i = 3, j = 0; j < mask.length; i += 4, j++) d[i] = mask[j];
    }
    return out;
  }

  function dispatch(data, W, H, p, P) {
    switch (p.algorithm) {
      case 'halftone': return applyHalftone(data, W, H, p, P);
      case 'bitmap':   return applyBitmap(data, W, H, p, P);
      case 'floyd':    return applyFloydSteinberg(data, W, H, p, P);
      case 'bayer2':   return applyBayer(data, W, H, p, P, 'bayer2');
      case 'bayer4':   return applyBayer(data, W, H, p, P, 'bayer4');
      case 'bayer8':   return applyBayer(data, W, H, p, P, 'bayer8');
      case 'digits':   return applyCharRenderer(data, W, H, p, P);
      case 'lines':    return applyLines(data, W, H, p, P);
      default:         return new ImageData(data, W, H);
    }
  }

  scope.PXEngine = { render, getLuma, hexToRgb, seededRand };

})(typeof self !== 'undefined' ? self : this);
