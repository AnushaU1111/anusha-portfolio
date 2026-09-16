import { RAMP } from "./ramp";
import type { Grid } from "./types";

/**
 * Drawing a photograph out of characters means drawing a hundred thousand of
 * them, and `fillText` cannot: measured, 118,000 coloured glyphs costs 248ms
 * a frame, four frames a second.
 *
 * At the cell size a photographic figure is rendered at, a character covers
 * one or two pixels. So each of the eleven glyphs is rendered once into a
 * tiny alpha mask and then stamped into a pixel buffer, which costs 12ms for
 * the same hundred thousand characters. The glyph is still a glyph, drawn by
 * the same font; it is only rasterised once instead of a hundred thousand
 * times.
 */
export interface GlyphMasks {
  /** One alpha mask per ramp index, row-major, mw by mh. */
  masks: Uint8Array[];
  mw: number;
  mh: number;
}

/** Rasterises the ramp once at a given cell size. Needs a document. */
export const buildGlyphMasks = (
  cellW: number,
  cellH: number,
  fontFamily = '"JetBrains Mono", ui-monospace, monospace',
): GlyphMasks => {
  const mw = Math.ceil(cellW) + 2;
  const mh = Math.ceil(cellH) + 2;
  const canvas = document.createElement("canvas");
  canvas.width = mw;
  canvas.height = mh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const masks: Uint8Array[] = [];
  for (const glyph of RAMP) {
    const mask = new Uint8Array(mw * mh);
    if (ctx) {
      ctx.clearRect(0, 0, mw, mh);
      ctx.font = `${(cellH * 0.9).toFixed(2)}px ${fontFamily}`;
      ctx.textBaseline = "top";
      ctx.fillStyle = "#fff";
      ctx.fillText(glyph, 0, 0);
      const d = ctx.getImageData(0, 0, mw, mh).data;
      for (let p = 0; p < mw * mh; p++) mask[p] = d[p * 4 + 3] ?? 0;
    }
    masks.push(mask);
  }
  return { masks, mw, mh };
};

export interface StampOptions {
  cellW: number;
  cellH: number;
  /** Characters arriving from off screen, as the fly-in describes them. */
  fly?: { offsets: Float32Array; phase: Float32Array; t: number } | null;
}

/** Smoothstep on a value already clamped to [0, 1]. */
const ease = (u: number): number => u * u * (3 - 2 * u);

/**
 * Stamps a grid into an RGBA buffer. `acc` is scratch the caller owns and
 * reuses across frames, four floats per pixel; `out` is the ImageData bytes.
 *
 * Coverage accumulates premultiplied and is divided out at the end, because
 * ImageData is not premultiplied and writing colour that is would let the
 * canvas attenuate it a second time.
 */
export const stampGrid = (
  acc: Float32Array,
  out: Uint8ClampedArray,
  width: number,
  height: number,
  grid: Grid,
  glyphs: GlyphMasks,
  opts: StampOptions,
): void => {
  const { cellW, cellH } = opts;
  const fly = opts.fly ?? null;
  const { masks, mw, mh } = glyphs;
  acc.fill(0);

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const i = r * grid.cols + c;
      const idx = grid.cells[i] ?? 0;
      if (idx <= 0) continue;
      const mask = masks[idx];
      if (!mask) continue;

      let x = c * cellW;
      let y = r * cellH;
      if (fly) {
        const local = (fly.t - (fly.phase[i] ?? 0) * 0.45) / 0.55;
        if (local <= 0) continue;
        const away = 1 - (local >= 1 ? 1 : ease(local));
        x += (fly.offsets[i * 2] ?? 0) * away;
        y += (fly.offsets[i * 2 + 1] ?? 0) * away;
      }
      const px = x | 0;
      const py = y | 0;
      if (px <= -mw || py <= -mh || px >= width || py >= height) continue;

      const R = grid.color?.[i * 3] ?? 255;
      const G = grid.color?.[i * 3 + 1] ?? 255;
      const B = grid.color?.[i * 3 + 2] ?? 255;

      for (let my = 0; my < mh; my++) {
        const yy = py + my;
        if (yy < 0 || yy >= height) continue;
        const mo = my * mw;
        for (let mx = 0; mx < mw; mx++) {
          const a = mask[mo + mx] ?? 0;
          if (a === 0) continue;
          const xx = px + mx;
          if (xx < 0 || xx >= width) continue;
          const f = a / 255;
          const o = (yy * width + xx) * 4;
          acc[o] = (acc[o] ?? 0) + R * f;
          acc[o + 1] = (acc[o + 1] ?? 0) + G * f;
          acc[o + 2] = (acc[o + 2] ?? 0) + B * f;
          acc[o + 3] = (acc[o + 3] ?? 0) + f;
        }
      }
    }
  }

  const pixels = width * height;
  for (let p = 0; p < pixels; p++) {
    const o = p * 4;
    const A = acc[o + 3] ?? 0;
    if (A <= 0) {
      out[o] = 0;
      out[o + 1] = 0;
      out[o + 2] = 0;
      out[o + 3] = 0;
      continue;
    }
    const inv = 1 / (A < 1 ? A : 1);
    out[o] = (acc[o] ?? 0) * inv;
    out[o + 1] = (acc[o + 1] ?? 0) * inv;
    out[o + 2] = (acc[o + 2] ?? 0) * inv;
    out[o + 3] = A * 255;
  }
};
