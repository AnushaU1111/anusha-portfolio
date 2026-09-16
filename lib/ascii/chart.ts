import { paretoCloud, type MarkerKind, type ParetoSpec } from "./figures/pareto";

/**
 * The Pareto chart at the fine cell size, as somewhere for the portrait's
 * characters to land.
 *
 * The coarse version of this chart draws its own labels, because at 4.8 by 8
 * px a label is legible. Here a character is a pixel, so nothing legible can
 * be drawn out of them: the axis and the tooltips are real text, laid over the
 * canvas, and everything in the plot itself is a mark for a character to
 * occupy. That is the division the scene needs — a static axis, and a graph
 * built from what the picture came apart into.
 */
export interface ChartMark {
  /** Px from the chart box's top-left. */
  x: number;
  y: number;
  /** Ramp index, so brightness still comes from the glyph. */
  idx: number;
  /** Position along the palette. */
  tone: number;
  /** How present the mark is, independent of its hue. */
  alpha: number;
  /** Which model this mark belongs to, or -1 for the lattice and the curve. */
  model: number;
}

export interface ChartModel {
  label: string;
  kind: MarkerKind;
  quality: number;
  cost: number;
  p95: number;
  /** Centre, px from the chart box's top-left. */
  x: number;
  y: number;
  /** For the model in production: the frontier model that beats it outright. */
  dominatedBy?: string;
}

export interface ChartTick {
  label: string;
  /** Px from the chart box's left. */
  x: number;
}

export interface ParetoChart {
  marks: ChartMark[];
  models: ChartModel[];
  ticks: ChartTick[];
  /** The plot area inside the box, px. */
  plot: { left: number; top: number; width: number; height: number };
  width: number;
  height: number;
  /** Indices into models of the two the scene is actually about. */
  recommended: number;
  production: number;
}

export interface ChartOptions {
  width: number;
  height: number;
  cellW: number;
  cellH: number;
  /** Room at the bottom for the cost ticks, and at the left for the quality label. */
  padBottom?: number;
  padLeft?: number;
  /** Room at the top for the legend, which has to clear the site's nav. */
  padTop?: number;
  padRight?: number;
}

/**
 * Anonymised model ids. The scene declares the real names withheld, so these
 * are positional labels; the two the scene is about keep the ids the design
 * uses for them.
 */
const labelsFor = (count: number, recommended: number, production: number): string[] => {
  const id = (n: number) => `model-${String(n).padStart(2, "0")}`;
  const taken = new Set([9, 17]);
  const pool: number[] = [];
  for (let n = 1; n <= count + taken.size; n++) if (!taken.has(n)) pool.push(n);
  const out = new Array<string>(count);
  let p = 0;
  for (let i = 0; i < count; i++) {
    if (i === recommended) out[i] = id(9);
    else if (i === production) out[i] = id(17);
    else out[i] = id(pool[p++] ?? i + 1);
  }
  return out;
};

/**
 * The px a model's marker occupies, snapped to the cell grid.
 *
 * The coarse figure writes "(0)" and "X", which are legible at 4.8 by 8 px. At
 * 1.5 by 2.5 they are not, so the same distinction is carried by shape: a
 * frontier model is a filled disc, the model in production is a ring with a
 * cross through it, and a dominated model is a small plus. Offsets are measured
 * in px and then laid on the cell grid, so a marker is round on screen rather
 * than stretched by the cell being taller than it is wide.
 *
 * The radii are in px and not in cells, so they are the size they look on
 * screen regardless of how fine the cell is.
 */
const R: Record<MarkerKind, number> = { frontier: 7.5, dominated: 5.5, production: 12.5 };

const markOffsets = (kind: MarkerKind, cellW: number, cellH: number): { dx: number; dy: number }[] => {
  const out: { dx: number; dy: number }[] = [];
  const r = R[kind];
  const cols = Math.ceil(r / cellW);
  const rows = Math.ceil(r / cellH);
  const band = Math.max(cellW, cellH) * 1.1;
  for (let ry = -rows; ry <= rows; ry++) {
    for (let rx = -cols; rx <= cols; rx++) {
      const dx = rx * cellW;
      const dy = ry * cellH;
      const d = Math.hypot(dx, dy);
      const on =
        kind === "production"
          ? // A ring with a cross inside it: the X, at the size a pixel allows.
            Math.abs(d - r) <= band || (d <= r * 0.62 && Math.abs(Math.abs(dx) - Math.abs(dy)) <= cellW)
          : d <= r;
      if (on) out.push({ dx, dy });
    }
  }
  return out;
};

const TONE: Record<MarkerKind, number> = { frontier: 0.9, dominated: 0.62, production: 1 };
const ALPHA: Record<MarkerKind, number> = { frontier: 0.92, dominated: 0.78, production: 1 };
const IDX: Record<MarkerKind, number> = { frontier: 9, dominated: 8, production: 10 };

export const buildParetoChart = (spec: ParetoSpec, o: ChartOptions): ParetoChart => {
  const { width, height, cellW, cellH } = o;
  const padBottom = o.padBottom ?? 56;
  const padLeft = o.padLeft ?? 34;
  const padTop = o.padTop ?? 64;
  const padRight = o.padRight ?? 18;
  const plot = {
    left: padLeft,
    top: padTop,
    width: Math.max(1, width - padLeft - padRight),
    height: Math.max(1, height - padBottom - padTop),
  };

  const { points, kinds, scale, recommended, production } = paretoCloud(spec);
  const labels = labelsFor(points.length, recommended, production);

  const xOf = (cost: number) => plot.left + Math.min(1, Math.max(0, scale.uOf(cost))) * plot.width;
  const yOf = (quality: number) =>
    plot.top +
    (1 - (Math.min(scale.qHi, Math.max(scale.qLo, quality)) - scale.qLo) / (scale.qHi - scale.qLo)) * plot.height;

  const marks: ChartMark[] = [];

  // A faint lattice, so the empty half of the plot still reads as a plot.
  for (let y = plot.top; y < plot.top + plot.height; y += cellH * 7) {
    for (let x = plot.left; x < plot.left + plot.width; x += cellW * 10) {
      marks.push({ x, y, idx: 3, tone: 0.18, alpha: 0.38, model: -1 });
    }
  }
  // The ceiling traced across it, so the frontier is a shape before it is a
  // set of markers. Two cells thick, or at this cell size it is a hairline.
  for (let x = plot.left; x < plot.left + plot.width; x += cellW) {
    const u = (x - plot.left) / plot.width;
    const y = yOf(scale.ceiling(u));
    marks.push({ x, y, idx: 5, tone: 0.42, alpha: 0.62, model: -1 });
    marks.push({ x, y: y + cellH, idx: 4, tone: 0.34, alpha: 0.42, model: -1 });
  }

  const models: ChartModel[] = points.map((p, i) => ({
    label: labels[i] ?? `model-${i}`,
    kind: kinds[i] ?? "dominated",
    quality: p.quality,
    cost: p.cost,
    p95: p.p95,
    x: xOf(p.cost),
    y: yOf(p.quality),
  }));

  // What beats a dominated model: cheaper and better, and of those the best.
  // Checked rather than asserted, because domination is the scene's whole
  // claim — except for the model in production, where the swap the scene
  // actually made is the recommended model, so that is the one named.
  const rec = models[recommended];
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    if (!m || m.kind === "frontier") continue;
    if (i === production && rec && rec.quality > m.quality && rec.cost < m.cost) {
      m.dominatedBy = rec.label;
      continue;
    }
    let best: ChartModel | undefined;
    for (let j = 0; j < models.length; j++) {
      const q = models[j];
      if (!q || j === i) continue;
      if (q.quality > m.quality && q.cost < m.cost && (!best || q.quality > best.quality)) best = q;
    }
    if (best) m.dominatedBy = best.label;
  }

  const offsets: Record<MarkerKind, { dx: number; dy: number }[]> = {
    frontier: markOffsets("frontier", cellW, cellH),
    dominated: markOffsets("dominated", cellW, cellH),
    production: markOffsets("production", cellW, cellH),
  };
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    if (!m) continue;
    for (const c of offsets[m.kind]) {
      marks.push({
        x: m.x + c.dx,
        y: m.y + c.dy,
        idx: IDX[m.kind],
        tone: TONE[m.kind],
        alpha: ALPHA[m.kind],
        model: i,
      });
    }
  }

  const ticks: ChartTick[] = spec.costAxis.map((cost) => ({ label: `$${cost.toFixed(2)}`, x: xOf(cost) }));

  return { marks, models, ticks, plot, width, height, recommended, production };
};

/** The model under the cursor, or null. Distances are in px within the box. */
export const modelAt = (
  chart: ParetoChart,
  x: number,
  y: number,
  radius = 22,
): { index: number; model: ChartModel } | null => {
  let bestI = -1;
  let bestD = radius;
  for (let i = 0; i < chart.models.length; i++) {
    const m = chart.models[i];
    if (!m) continue;
    // A marker that is drawn large is easier to hit than a single character,
    // so the cursor does not get caught by a dominated dot it is only passing.
    const pull = m.kind === "dominated" ? 0 : 8;
    const d = Math.hypot(m.x - x, m.y - y) - pull;
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  }
  const model = bestI >= 0 ? chart.models[bestI] : undefined;
  return model ? { index: bestI, model } : null;
};
