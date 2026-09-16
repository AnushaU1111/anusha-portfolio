import { RAMP_MAX } from "./ramp";
import type { Grid } from "./types";

export interface PhotoGridOptions {
  /** Saturation multiplier around each cell's own luminance. 1 leaves it alone. */
  saturation?: number;
  /** Exposure lift toward white. 1 leaves it alone. */
  gain?: number;
  /** Cells at or below this luminance are left empty. */
  floor?: number;
  /** Tone curve applied before the ramp. Below 1 lifts the mid-tones. */
  gamma?: number;
}

/** Rec. 709 luminance, the same weighting a camera meters with. */
const luma = (r: number, g: number, b: number): number => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const clamp255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);

/**
 * Turns a photograph into a grid where the glyph carries the light and the
 * colour carries the hue.
 *
 * This is the one figure on the site that is not drawn from the ramp alone.
 * At the cell size it is rendered at, a character is one or two pixels wide,
 * so the ramp is doing the job of a luminance channel and the cell's own
 * colour is doing the rest. Expects rgba already scaled to cols by rows, one
 * source pixel per cell, which is what a canvas drawImage gives for free.
 */
export const rgbaToPhotoGrid = (
  rgba: Uint8ClampedArray | Uint8Array,
  cols: number,
  rows: number,
  opts: PhotoGridOptions = {},
): Grid => {
  const sat = opts.saturation ?? 1;
  const gain = opts.gain ?? 1;
  const floor = opts.floor ?? 0;
  const gamma = opts.gamma ?? 1;
  const n = cols * rows;
  const cells = new Array<number>(n).fill(0);
  const tone = new Array<number>(n).fill(0);
  const color = new Uint8Array(n * 3);

  for (let i = 0; i < n; i++) {
    const r = rgba[i * 4] ?? 0;
    const g = rgba[i * 4 + 1] ?? 0;
    const b = rgba[i * 4 + 2] ?? 0;
    const L = luma(r, g, b);
    if (L <= floor) continue;
    const curved = gamma === 1 ? L : Math.min(1, Math.max(0, L)) ** gamma;
    cells[i] = Math.round(Math.min(1, Math.max(0, curved)) * RAMP_MAX);
    tone[i] = curved;
    // Saturation pivots on luminance so a lift does not shift the hue, and
    // the gain pulls toward white rather than scaling, which keeps highlights
    // from clipping to flat patches.
    const Lv = L * 255;
    let R = Lv + (r - Lv) * sat;
    let G = Lv + (g - Lv) * sat;
    let B = Lv + (b - Lv) * sat;
    if (gain !== 1) {
      R = 255 - (255 - R) / gain;
      G = 255 - (255 - G) / gain;
      B = 255 - (255 - B) / gain;
    }
    color[i * 3] = clamp255(R);
    color[i * 3 + 1] = clamp255(G);
    color[i * 3 + 2] = clamp255(B);
  }
  return { cols, rows, cells, tone, color };
};

/** Rows that keep a photo's aspect once cells are taller than they are wide. */
export const photoRows = (cols: number, imageW: number, imageH: number, cellAspect = 0.6): number =>
  Math.max(1, Math.round(cols * (imageH / imageW) * cellAspect));
