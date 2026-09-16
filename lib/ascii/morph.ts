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
  /**
   * Alpha at the far end. One for a character that arrives; zero for one the
   * destination has no room for, which is how the portrait comes apart into a
   * chart far smaller than it.
   */
  dstAlpha: Float32Array;
  /**
   * One byte per pair. Zero means `dst` is relative to the destination figure's
   * box, which is the normal case. One means it is relative to the *source's*
   * box: a character that the destination has no room for drifts away from
   * where it already is, rather than being flung at a box somewhere else on the
   * page as it fades.
   */
  dstLocal: Uint8Array;
  /**
   * What part of the destination figure this character belongs to, or -1 for
   * none. The dependency graph uses it: selecting a node means holding the
   * edges it is an end of and letting the rest recede, which is a question
   * about groups of characters rather than about where they are.
   */
  group: Int16Array;
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
 * `thin` keeps roughly one cell in N. The flower needs it: at this cell size
 * its glyphs would touch and it would read as a pink shape rather than as
 * characters, which is the whole point of it.
 *
 * The choice is hashed rather than periodic. Any linear pattern collapses at
 * some values of N: `(2c + 3r) % 2` is just "every even row", which draws
 * scan lines, and `% 3` is every third column. A hash of the coordinates
 * scatters evenly at any N and leaves no direction in the result.
 */
const litCells = (grid: Grid, cellW: number, cellH: number, palette: boolean, thin = 1): Lit => {
  const keep = (c: number, r: number) =>
    thin <= 1 || (((c * 73856093) ^ (r * 19349663)) >>> 0) % thin === 0;
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

/**
 * A grid's inked cells as marks, for a figure that is a destination rather
 * than a source.
 *
 * The site closes on the lily it opened with, and it has to be the same lily —
 * not one sampled again with slightly different settings. So the closing stage
 * reads its destination through this, with the same arguments the opening
 * pairing passes to the same collector, and the two cannot come out different.
 */
export const gridMarks = (
  grid: Grid,
  cellW: number,
  cellH: number,
  palette: boolean,
  thin = 1,
): DisperseMark[] => {
  const lit = litCells(grid, cellW, cellH, palette, thin);
  const out: DisperseMark[] = new Array<DisperseMark>(lit.count);
  for (let i = 0; i < lit.count; i++) {
    out[i] = {
      x: lit.x[i] ?? 0,
      y: lit.y[i] ?? 0,
      idx: lit.idx[i] ?? 1,
      // The palette tone is recovered from the ramp index, because that is
      // what a mark carries; the alpha it was collected with rides along.
      tone: (lit.idx[i] ?? 1) / 10,
      alpha: lit.alpha[i] ?? 1,
    };
  }
  return out;
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
  const dstAlpha = new Float32Array(count).fill(1);
  const dstLocal = new Uint8Array(count);
  const group = new Int16Array(count).fill(-1);
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

  return { count, src, dst, srcIdx, dstIdx, srcColor, dstColor, srcAlpha, dstAlpha, dstLocal, group, fly, phase };
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
  /**
   * Holds some groups and lets the rest recede. `keep[group]` of 1 stays at
   * full; everything else, including characters with no group, is multiplied
   * by `factor`. This is how selecting a node in the dependency graph keeps
   * its own edges and quiets the other twenty.
   */
  dim?: { keep: Uint8Array; factor: number } | null;
  /**
   * Pulls the figure apart sideways and fades it, as something else takes the
   * screen. `cx` is the line it parts around, in canvas px; a character travels
   * away from it in proportion to how far out it already sits, so the ends of
   * the figure leave first and the middle goes last.
   */
  part?: { t: number; cx: number; reach: number } | null;
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
  const dim = o.dim ?? null;
  const part = o.part && o.part.t > 0 ? o.part : null;
  // Cubed, so the parting starts as a drift and ends as a rush.
  const partE = part ? part.t ** 3 : 0;
  acc.fill(0);

  for (let i = 0; i < pairs.count; i++) {
    // Each character has its own moment inside the morph, so the face arrives
    // as a wave rather than all at once.
    const local = (morph - (pairs.phase[i] ?? 0) * 0.4) / 0.6;
    const m = local <= 0 ? 0 : local >= 1 ? 1 : ease(local);

    const sx = (pairs.src[i * 2] ?? 0) + o.srcOrigin.x;
    const sy = (pairs.src[i * 2 + 1] ?? 0) + o.srcOrigin.y;
    const staysPut = pairs.dstLocal[i] === 1;
    const dOx = staysPut ? o.srcOrigin.x : o.dstOrigin.x;
    const dOy = staysPut ? o.srcOrigin.y : o.dstOrigin.y;
    const dx = (pairs.dst[i * 2] ?? 0) + dOx;
    const dy = (pairs.dst[i * 2 + 1] ?? 0) + dOy;
    let x = sx + (dx - sx) * m;
    let y = sy + (dy - sy) * m;

    if (o.flyT < 1) {
      const fl = (o.flyT - (pairs.phase[i] ?? 0) * 0.45) / 0.55;
      if (fl <= 0) continue;
      const away = 1 - (fl >= 1 ? 1 : ease(fl));
      x += (pairs.fly[i * 2] ?? 0) * away;
      y += (pairs.fly[i * 2 + 1] ?? 0) * away;
    }

    if (part) {
      // Each character takes its own moment, so the figure frays rather than
      // sliding apart in two solid halves.
      const local = Math.min(1, partE * (0.55 + (pairs.phase[i] ?? 0) * 0.9));
      const off = x - part.cx;
      const side = off < 0 ? -1 : 1;
      const spread = Math.min(1, Math.abs(off) / (part.reach * 0.5));
      x += side * part.reach * (0.3 + spread * 0.7) * local;
      y += ((pairs.phase[i] ?? 0) - 0.5) * part.reach * 0.18 * local;
    }

    let idx = Math.round((pairs.srcIdx[i] ?? 1) + ((pairs.dstIdx[i] ?? 1) - (pairs.srcIdx[i] ?? 1)) * m);
    const a0 = pairs.srcAlpha[i] ?? 1;
    let alpha = a0 + ((pairs.dstAlpha[i] ?? 1) - a0) * m;
    if (dim) {
      const g = pairs.group[i] ?? -1;
      if (g < 0 || dim.keep[g] !== 1) alpha *= dim.factor;
    }
    if (part) alpha *= 1 - partE;
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

export interface DisperseMark {
  x: number;
  y: number;
  idx: number;
  /** Position along the palette, so a mark's hue still comes from the theme. */
  tone: number;
  /** How present the mark is. Defaults to the palette's alpha for its tone. */
  alpha?: number;
  /** Which part of the figure this mark belongs to, for selective dimming. */
  group?: number;
}

export interface DisperseOptions {
  cellW: number;
  cellH: number;
  /** How far a character with nowhere to go drifts as it fades, in px. */
  scatter?: number;
  seed?: number;
}

/**
 * The portrait coming apart into the chart.
 *
 * The chart needs a few thousand characters and the portrait has more than a
 * hundred thousand, so most of them have nowhere to land. Those drift and fade
 * instead of being crammed in, which is what makes it read as the picture
 * disintegrating rather than as one figure squeezing into another.
 *
 * Marks are taken in reading order against the portrait's reading order, so
 * the top of the picture supplies the top of the plot.
 */
export const buildDisperse = (face: Grid, marks: DisperseMark[], opts: DisperseOptions): MorphPairs => {
  const { cellW, cellH } = opts;
  const scatter = opts.scatter ?? 140;
  const rnd = mulberry32(opts.seed ?? 2026);
  const from = litCells(face, cellW, cellH, false);
  const count = from.count;
  const [lr, lg, lb] = theme.low;
  const [hr, hg, hb] = theme.high;

  const ordered = [...marks].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));

  const src = new Float32Array(count * 2);
  const dst = new Float32Array(count * 2);
  const srcIdx = new Uint8Array(count);
  const dstIdx = new Uint8Array(count);
  const srcColor = new Uint8Array(count * 3);
  const dstColor = new Uint8Array(count * 3);
  const srcAlpha = new Float32Array(count).fill(1);
  const dstAlpha = new Float32Array(count);
  const dstLocal = new Uint8Array(count);
  const group = new Int16Array(count).fill(-1);
  const fly = new Float32Array(count * 2);
  const phase = new Float32Array(count);

  let lastJ = -1;
  for (let i = 0; i < count; i++) {
    const fx = from.x[i] ?? 0;
    const fy = from.y[i] ?? 0;
    src[i * 2] = fx;
    src[i * 2 + 1] = fy;
    srcIdx[i] = from.idx[i] ?? 1;
    srcColor[i * 3] = from.color[i * 3] ?? 255;
    srcColor[i * 3 + 1] = from.color[i * 3 + 1] ?? 255;
    srcColor[i * 3 + 2] = from.color[i * 3 + 2] ?? 255;
    srcAlpha[i] = from.alpha[i] ?? 1;
    phase[i] = Math.min(0.999, rnd());

    const j = ordered.length === 0 ? -1 : Math.min(ordered.length - 1, ((i * ordered.length) / count) | 0);
    const mark = j !== lastJ ? ordered[j] : undefined;
    lastJ = j;

    if (mark) {
      dst[i * 2] = mark.x;
      dst[i * 2 + 1] = mark.y;
      dstIdx[i] = mark.idx;
      dstColor[i * 3] = lr + (hr - lr) * mark.tone;
      dstColor[i * 3 + 1] = lg + (hg - lg) * mark.tone;
      dstColor[i * 3 + 2] = lb + (hb - lb) * mark.tone;
      dstAlpha[i] = mark.alpha ?? theme.minAlpha + (theme.maxAlpha - theme.minAlpha) * mark.tone;
    } else {
      // Nowhere to land: drift outward from the middle of the picture and go.
      // Measured in the portrait's own box, not the chart's, so a character
      // that is leaving drifts off where it stood instead of being thrown at
      // the chart first.
      dstLocal[i] = 1;
      let dx = fx - from.cx;
      let dy = fy - from.cy;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const d = scatter * (0.5 + rnd());
      dst[i * 2] = fx + dx * d;
      dst[i * 2 + 1] = fy + dy * d;
      dstIdx[i] = 1;
      dstColor[i * 3] = srcColor[i * 3] ?? 0;
      dstColor[i * 3 + 1] = srcColor[i * 3 + 1] ?? 0;
      dstColor[i * 3 + 2] = srcColor[i * 3 + 2] ?? 0;
      dstAlpha[i] = 0;
    }
  }

  return { count, src, dst, srcIdx, dstIdx, srcColor, dstColor, srcAlpha, dstAlpha, dstLocal, group, fly, phase };
};

/** A mark's colour and alpha, from the palette, at a position on it. */
const paletteAt = (tone: number): { r: number; g: number; b: number; a: number } => {
  const [lr, lg, lb] = theme.low;
  const [hr, hg, hb] = theme.high;
  return {
    r: lr + (hr - lr) * tone,
    g: lg + (hg - lg) * tone,
    b: lb + (hb - lb) * tone,
    a: theme.minAlpha + (theme.maxAlpha - theme.minAlpha) * tone,
  };
};

/**
 * One figure of marks becoming another.
 *
 * `buildDisperse` starts from a photograph, where the characters are a grid.
 * From the second figure on there is no grid any more: what exists is the set
 * of marks the last figure was made of. This pairs those to the next set, so
 * the handover is exact — at progress zero it draws the figure it came from,
 * character for character.
 *
 * The two sets are rarely the same size. Whichever is shorter has its marks
 * carried by one character each; the surplus on the other side fades in where
 * it lands, or drifts off from where it stood.
 */
export const buildRelay = (from: DisperseMark[], to: DisperseMark[], opts: DisperseOptions): MorphPairs => {
  const scatter = opts.scatter ?? 140;
  const rnd = mulberry32(opts.seed ?? 4041);
  const order = (m: DisperseMark[]) => [...m].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
  const src0 = order(from);
  const dst0 = order(to);
  const F = src0.length;
  const T = dst0.length;
  const count = Math.max(F, T);

  let cx = 0;
  let cy = 0;
  for (const m of src0) {
    cx += m.x;
    cy += m.y;
  }
  if (F > 0) {
    cx /= F;
    cy /= F;
  }

  const src = new Float32Array(count * 2);
  const dst = new Float32Array(count * 2);
  const srcIdx = new Uint8Array(count);
  const dstIdx = new Uint8Array(count);
  const srcColor = new Uint8Array(count * 3);
  const dstColor = new Uint8Array(count * 3);
  const srcAlpha = new Float32Array(count);
  const dstAlpha = new Float32Array(count);
  const dstLocal = new Uint8Array(count);
  const group = new Int16Array(count).fill(-1);
  const fly = new Float32Array(count * 2);
  const phase = new Float32Array(count);

  let lastF = -1;
  let lastT = -1;
  for (let i = 0; i < count; i++) {
    phase[i] = Math.min(0.999, rnd());
    const fi = F === 0 ? -1 : Math.min(F - 1, ((i * F) / count) | 0);
    const ti = T === 0 ? -1 : Math.min(T - 1, ((i * T) / count) | 0);
    // Position comes from whichever side has a mark at this step; visibility
    // comes from whether this character is the one carrying it. A character
    // that is not a carrier sits, unseen, where its neighbour is, which is what
    // keeps the shorter figure from being drawn several times over.
    const home = fi >= 0 ? src0[fi] : ti >= 0 ? dst0[ti] : undefined;
    if (!home) continue;
    const carriesFrom = fi !== lastF;
    const carriesTo = ti !== lastT;
    lastF = fi;
    lastT = ti;
    const b = carriesTo && ti >= 0 ? dst0[ti] : undefined;

    const ca = paletteAt(home.tone);
    src[i * 2] = home.x;
    src[i * 2 + 1] = home.y;
    srcIdx[i] = home.idx;
    srcColor[i * 3] = ca.r;
    srcColor[i * 3 + 1] = ca.g;
    srcColor[i * 3 + 2] = ca.b;
    srcAlpha[i] = carriesFrom && fi >= 0 ? (home.alpha ?? ca.a) : 0;

    if (b) {
      const cb = paletteAt(b.tone);
      dst[i * 2] = b.x;
      dst[i * 2 + 1] = b.y;
      dstIdx[i] = b.idx;
      dstColor[i * 3] = cb.r;
      dstColor[i * 3 + 1] = cb.g;
      dstColor[i * 3 + 2] = cb.b;
      dstAlpha[i] = b.alpha ?? cb.a;
      group[i] = b.group ?? -1;
    } else {
      dstLocal[i] = 1;
      let ox = home.x - cx;
      let oy = home.y - cy;
      const len = Math.hypot(ox, oy) || 1;
      ox /= len;
      oy /= len;
      const d = scatter * (0.5 + rnd());
      dst[i * 2] = home.x + ox * d;
      dst[i * 2 + 1] = home.y + oy * d;
      dstIdx[i] = 1;
      dstColor[i * 3] = ca.r;
      dstColor[i * 3 + 1] = ca.g;
      dstColor[i * 3 + 2] = ca.b;
      dstAlpha[i] = 0;
    }
  }

  return { count, src, dst, srcIdx, dstIdx, srcColor, dstColor, srcAlpha, dstAlpha, dstLocal, group, fly, phase };
};
