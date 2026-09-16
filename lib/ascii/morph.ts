import { mulberry32 } from "./noise";
import { theme } from "./ramp";
import type { GlyphMasks } from "./stamp";
import type { Grid } from "./types";

/**
 * The flower becoming the face.
 *
 * Two figures cannot be interpolated as grids here: they are different sizes,
 * in different places, and one is rose on black while the other is a colour
 * photograph. So this works on pairs instead. Every character in the face is
 * given a character in the flower to come from, and each pair carries both
 * ends: where it starts and lands, which glyph it is at each end, and what
 * colour. A frame is one number, and every character is somewhere along its
 * own path.
 *
 * The pairing walks both figures in reading order, stretched to fit, so the
 * flower folds into the face rather than scattering into it.
 */
export interface MorphPairs {
  count: number;
  /** Two px per pair, relative to the flower's own box. */
  src: Float32Array;
  /** Two px per pair, relative to the face's own box. */
  dst: Float32Array;
  srcIdx: Uint8Array;
  dstIdx: Uint8Array;
  /** Three bytes per pair. The flower's is the site palette; the face's is its own. */
  srcColor: Uint8Array;
  dstColor: Uint8Array;
  srcAlpha: Float32Array;
  /** Where a character waits before the flower has assembled, two px per pair. */
  fly: Float32Array;
  /** One per pair in [0, 1): when this character takes its turn. */
  phase: Float32Array;
}

export interface BuildPairsOptions {
  cellW: number;
  cellH: number;
  /** How far out a character starts, as a fraction of the flower's diagonal. */
  reach?: number;
  /** Keep one flower cell in N, so the flower still reads as characters. */
  thin?: number;
  seed?: number;
}

interface Lit {
  x: Float32Array;
  y: Float32Array;
  idx: Uint8Array;
  color: Uint8Array;
  alpha: Float32Array;
  count: number;
  cx: number;
  cy: number;
  diag: number;
}

/**
 * Collects a grid's inked cells into flat lists, in reading order.
 *
 * `thin` keeps one cell in N on an even diagonal pattern. The flower needs it:
 * at this cell size its glyphs would touch and it would read as a pink shape
 * rather than as characters, which is the whole point of it.
 */
const litCells = (grid: Grid, cellW: number, cellH: number, palette: boolean, thin = 1): Lit => {
  const keep = (c: number, r: number) => thin <= 1 || (c * 2 + r * 3) % thin === 0;
  let n = 0;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if ((grid.cells[r * grid.cols + c] ?? 0) > 0 && keep(c, r)) n++;
    }
  }
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const idx = new Uint8Array(n);
  const color = new Uint8Array(n * 3);
  const alpha = new Float32Array(n);
  const [lr, lg, lb] = theme.low;
  const [hr, hg, hb] = theme.high;
  let w = 0;
  let sx = 0;
  let sy = 0;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const i = r * grid.cols + c;
      const v = grid.cells[i] ?? 0;
      if (v <= 0 || !keep(c, r)) continue;
      const px = c * cellW;
      const py = r * cellH;
      x[w] = px;
      y[w] = py;
      idx[w] = v;
      sx += px;
      sy += py;
      const t = grid.tone?.[i] ?? v / 10;
      if (palette) {
        // The flower is the site's two-value ramp, so its colour comes from
        // the palette rather than from any image.
        color[w * 3] = lr + (hr - lr) * t;
        color[w * 3 + 1] = lg + (hg - lg) * t;
        color[w * 3 + 2] = lb + (hb - lb) * t;
        alpha[w] = theme.minAlpha + (theme.maxAlpha - theme.minAlpha) * t;
      } else {
        color[w * 3] = grid.color?.[i * 3] ?? 255;
        color[w * 3 + 1] = grid.color?.[i * 3 + 1] ?? 255;
        color[w * 3 + 2] = grid.color?.[i * 3 + 2] ?? 255;
        alpha[w] = 1;
      }
      w++;
    }
  }
  return {
    x, y, idx, color, alpha, count: n,
    cx: n ? sx / n : 0,
    cy: n ? sy / n : 0,
    diag: Math.hypot(grid.cols * cellW, grid.rows * cellH),
  };
};

export const buildPairs = (flower: Grid, face: Grid, opts: BuildPairsOptions): MorphPairs => {
  const { cellW, cellH } = opts;
  const reach = opts.reach ?? 0.55;
  const rnd = mulberry32(opts.seed ?? 916);
  const from = litCells(flower, cellW, cellH, true, opts.thin ?? 3);
  const to = litCells(face, cellW, cellH, false);
  const count = to.count;

  const src = new Float32Array(count * 2);
  const dst = new Float32Array(count * 2);
  const srcIdx = new Uint8Array(count);
  const dstIdx = new Uint8Array(count);
  const srcColor = new Uint8Array(count * 3);
  const dstColor = new Uint8Array(count * 3);
  const srcAlpha = new Float32Array(count);
  const fly = new Float32Array(count * 2);
  const phase = new Float32Array(count);

  // The face needs more characters than the flower has. Each flower character
  // carries the first face cell that claims it, and the rest fade in as the
  // face forms, so the flower is not drawn several times over on frame one.
  let lastJ = -1;
  for (let i = 0; i < count; i++) {
    // Reading order in one, stretched onto reading order in the other.
    const j = from.count === 0 ? 0 : Math.min(from.count - 1, ((i * from.count) / count) | 0);
    // A flower with nothing in it carries nothing, or one stray character
    // would sit fully lit at the origin.
    const carrier = from.count > 0 && j !== lastJ;
    lastJ = j;
    const fx = from.x[j] ?? 0;
    const fy = from.y[j] ?? 0;
    src[i * 2] = fx;
    src[i * 2 + 1] = fy;
    dst[i * 2] = to.x[i] ?? 0;
    dst[i * 2 + 1] = to.y[i] ?? 0;
    srcIdx[i] = from.idx[j] ?? 1;
    dstIdx[i] = to.idx[i] ?? 1;
    srcColor[i * 3] = from.color[j * 3] ?? 0;
    srcColor[i * 3 + 1] = from.color[j * 3 + 1] ?? 0;
    srcColor[i * 3 + 2] = from.color[j * 3 + 2] ?? 0;
    dstColor[i * 3] = to.color[i * 3] ?? 255;
    dstColor[i * 3 + 1] = to.color[i * 3 + 1] ?? 255;
    dstColor[i * 3 + 2] = to.color[i * 3 + 2] ?? 255;
    srcAlpha[i] = carrier ? (from.alpha[j] ?? 1) : 0;

    // Radiating out from the flower's own middle, thrown clear of it.
    let dx = fx - from.cx;
    let dy = fy - from.cy;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      const a = rnd() * Math.PI * 2;
      dx = Math.cos(a);
      dy = Math.sin(a);
    } else {
      dx /= len;
      dy /= len;
    }
    const dist = from.diag * reach * (0.7 + rnd() * 0.6);
    fly[i * 2] = dx * dist;
    fly[i * 2 + 1] = dy * dist;
    phase[i] = Math.min(0.999, rnd());
  }

  return { count, src, dst, srcIdx, dstIdx, srcColor, dstColor, srcAlpha, fly, phase };
};

export interface StampPairsOptions {
  cellW: number;
  cellH: number;
  /** Top-left of the flower's box, in canvas px. */
  srcOrigin: { x: number; y: number };
  /** Top-left of the face's box, in canvas px. */
  dstOrigin: { x: number; y: number };
  /** 0 = every character still off screen, 1 = the flower assembled. */
  flyT: number;
  /** 0 = the flower, 1 = the face. */
  morphT: number;
  /** Cursor in canvas px, and how strongly it is felt, for the flower only. */
  cursor?: { x: number; y: number } | null;
  cursorStrength?: number;
  cursorRadius?: number;
}

const ease = (u: number): number => u * u * (3 - 2 * u);

/**
 * Draws one frame of the morph into an RGBA buffer, by the same stamping the
 * portrait uses: each glyph was rasterised once, so a hundred thousand
 * characters cost a stamp each rather than a text layout each.
 */
export const stampPairs = (
  acc: Float32Array,
  out: Uint8ClampedArray,
  width: number,
  height: number,
  pairs: MorphPairs,
  glyphs: GlyphMasks,
  o: StampPairsOptions,
): void => {
  const { masks, mw, mh } = glyphs;
  const morph = Math.min(1, Math.max(0, o.morphT));
  const eMorph = ease(morph);
  const cursor = o.cursor ?? null;
  const strength = (o.cursorStrength ?? 0) * (1 - eMorph);
  const radius = o.cursorRadius ?? 90;
  acc.fill(0);

  for (let i = 0; i < pairs.count; i++) {
    // Each character has its own moment inside the morph, so the face arrives
    // as a wave rather than all at once.
    const local = (morph - (pairs.phase[i] ?? 0) * 0.4) / 0.6;
    const m = local <= 0 ? 0 : local >= 1 ? 1 : ease(local);

    const sx = (pairs.src[i * 2] ?? 0) + o.srcOrigin.x;
    const sy = (pairs.src[i * 2 + 1] ?? 0) + o.srcOrigin.y;
    const dx = (pairs.dst[i * 2] ?? 0) + o.dstOrigin.x;
    const dy = (pairs.dst[i * 2 + 1] ?? 0) + o.dstOrigin.y;
    let x = sx + (dx - sx) * m;
    let y = sy + (dy - sy) * m;

    if (o.flyT < 1) {
      const fl = (o.flyT - (pairs.phase[i] ?? 0) * 0.45) / 0.55;
      if (fl <= 0) continue;
      const away = 1 - (fl >= 1 ? 1 : ease(fl));
      x += (pairs.fly[i * 2] ?? 0) * away;
      y += (pairs.fly[i * 2 + 1] ?? 0) * away;
    }

    let idx = Math.round((pairs.srcIdx[i] ?? 1) + ((pairs.dstIdx[i] ?? 1) - (pairs.srcIdx[i] ?? 1)) * m);
    let alpha = (pairs.srcAlpha[i] ?? 1) + (1 - (pairs.srcAlpha[i] ?? 1)) * m;
    // A character the flower never carried is invisible until the face needs
    // it, and costs nothing until then.
    if (alpha < 0.004) continue;
    let R = (pairs.srcColor[i * 3] ?? 0) + ((pairs.dstColor[i * 3] ?? 0) - (pairs.srcColor[i * 3] ?? 0)) * m;
    let G = (pairs.srcColor[i * 3 + 1] ?? 0) + ((pairs.dstColor[i * 3 + 1] ?? 0) - (pairs.srcColor[i * 3 + 1] ?? 0)) * m;
    let B = (pairs.srcColor[i * 3 + 2] ?? 0) + ((pairs.dstColor[i * 3 + 2] ?? 0) - (pairs.srcColor[i * 3 + 2] ?? 0)) * m;

    if (strength > 0 && cursor) {
      const d = Math.hypot(x - cursor.x, y - cursor.y);
      if (d < radius) {
        const lift = (1 - d / radius) ** 2 * strength;
        idx = Math.min(masks.length - 1, idx + Math.round(lift * 3));
        alpha = Math.min(1, alpha + lift * 0.5);
        R += (255 - R) * lift * 0.35;
        G += (255 - G) * lift * 0.35;
        B += (255 - B) * lift * 0.35;
      }
    }

    const mask = masks[idx];
    if (!mask) continue;
    const px = x | 0;
    const py = y | 0;
    if (px <= -mw || py <= -mh || px >= width || py >= height) continue;

    for (let my = 0; my < mh; my++) {
      const yy = py + my;
      if (yy < 0 || yy >= height) continue;
      const mo = my * mw;
      for (let mx = 0; mx < mw; mx++) {
        const a = mask[mo + mx] ?? 0;
        if (a === 0) continue;
        const xx = px + mx;
        if (xx < 0 || xx >= width) continue;
        const f = (a / 255) * alpha;
        const off = (yy * width + xx) * 4;
        acc[off] = (acc[off] ?? 0) + R * f;
        acc[off + 1] = (acc[off + 1] ?? 0) + G * f;
        acc[off + 2] = (acc[off + 2] ?? 0) + B * f;
        acc[off + 3] = (acc[off + 3] ?? 0) + f;
      }
    }
  }

  const pixels = width * height;
  for (let p = 0; p < pixels; p++) {
    const off = p * 4;
    const A = acc[off + 3] ?? 0;
    if (A <= 0) {
      out[off] = 0;
      out[off + 1] = 0;
      out[off + 2] = 0;
      out[off + 3] = 0;
      continue;
    }
    // ImageData is not premultiplied, so the accumulated colour is divided by
    // the accumulated coverage before it goes out.
    const inv = 1 / (A < 1 ? A : 1);
    out[off] = (acc[off] ?? 0) * inv;
    out[off + 1] = (acc[off + 1] ?? 0) * inv;
    out[off + 2] = (acc[off + 2] ?? 0) * inv;
    out[off + 3] = A * 255;
  }
};
