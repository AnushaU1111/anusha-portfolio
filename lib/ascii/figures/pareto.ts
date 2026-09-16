import { mulberry32 } from "../noise";
import type { Grid } from "../types";
import { createCanvas } from "./canvas";
import { span, type FigureContext } from "./context";

export interface ParetoPoint {
  quality: number;
  cost: number;
  p95: number;
}

export interface ParetoSpec {
  models: number;
  agents: number;
  production: ParetoPoint;
  recommended: ParetoPoint;
  costAxis: number[];
}

export type MarkerKind = "frontier" | "dominated" | "production";

export interface PlottedModel extends ParetoPoint {
  kind: MarkerKind;
  col: number;
  row: number;
}

/**
 * A model is on the frontier when nothing else beats it on both axes at once:
 * higher quality for no more money. Everything else is dominated, which is
 * the whole argument of the scene, so it is computed rather than drawn in.
 */
export const frontierOf = (points: ParetoPoint[]): boolean[] =>
  points.map((p, i) =>
    points.every(
      (q, j) => i === j || !(q.quality >= p.quality && q.cost <= p.cost && (q.quality > p.quality || q.cost < p.cost)),
    ),
  );

/** The scale both renderings of this chart share. */
export interface ParetoScale {
  lo: number;
  hi: number;
  logLo: number;
  logSpan: number;
  qLo: number;
  qHi: number;
  /** Cost to a fraction of the axis. */
  uOf: (cost: number) => number;
  /** The saturating ceiling the frontier sits on. */
  ceiling: (u: number) => number;
}

export interface ParetoCloud {
  points: ParetoPoint[];
  kinds: MarkerKind[];
  scale: ParetoScale;
  /** Index into points of the two models the scene is actually about. */
  recommended: number;
  production: number;
}

/**
 * The cloud, generated once so the coarse figure, the fine chart and the
 * tooltips cannot disagree about a single number.
 *
 * The ceiling is fitted through the recommended model, which is what puts it
 * on the frontier rather than merely drawing it there: nothing cheaper can sit
 * above a curve that is monotone in cost.
 */
export const paretoCloud = (spec: ParetoSpec): ParetoCloud => {
  const rnd = mulberry32(32 * 8);
  const lo = Math.min(...spec.costAxis) * 0.72;
  const hi = Math.max(...spec.costAxis) * 1.14;
  const logLo = Math.log(lo);
  const logSpan = Math.log(hi) - logLo;
  const Q_LO = 0.22;
  const Q_HI = 1.0;
  const Q_FLOOR = 0.3;
  const Q_CEIL = 0.96;
  const uOf = (cost: number) => (Math.log(cost) - logLo) / logSpan;

  const uRec = uOf(spec.recommended.cost);
  const share = (spec.recommended.quality - Q_FLOOR) / (Q_CEIL - Q_FLOOR);
  const exponent =
    uRec > 0.02 && uRec < 0.98 && share > 0.02 && share < 0.98 ? Math.log(share) / Math.log(uRec) : 0.45;
  const ceiling = (u: number) => Q_FLOOR + (Q_CEIL - Q_FLOOR) * Math.max(0, u) ** exponent;

  const onCurve = Math.max(2, Math.round(spec.models * 0.34));
  const points: ParetoPoint[] = [spec.recommended, spec.production];
  for (let i = 0; i < onCurve; i++) {
    const u = Math.min(0.99, Math.max(0.01, (i + 0.5) / onCurve + (rnd() - 0.5) * 0.05));
    points.push({ quality: ceiling(u), cost: Math.exp(logLo + u * logSpan), p95: 1.2 + rnd() * 3.4 });
  }
  while (points.length < spec.models) {
    const u = rnd();
    const quality = ceiling(u) - (0.05 + rnd() ** 1.4 * 0.42);
    points.push({ quality, cost: Math.exp(logLo + u * logSpan), p95: 1.2 + rnd() * 3.4 });
  }

  const onFrontier = frontierOf(points);
  const kinds: MarkerKind[] = points.map((_, i) =>
    i === 1 ? "production" : onFrontier[i] === true ? "frontier" : "dominated",
  );
  return {
    points,
    kinds,
    scale: { lo, hi, logLo, logSpan, qLo: Q_LO, qHi: Q_HI, uOf, ceiling },
    recommended: 0,
    production: 1,
  };
};

/**
 * Scene 02, on entry. Quality against cost for one representative agent. The
 * scene declares the two models it is about; the rest of the cloud is drawn
 * deterministically, because the real scores are not published.
 */
export const paretoFigure = (spec: ParetoSpec, ctx: FigureContext): Grid => {
  const cols = span(ctx.cols, 0.66, 40, 240);
  const rows = span(ctx.rows, 0.62, 18, 80);
  const canvas = createCanvas(cols, rows);

  const axisRow = rows - 1;
  const plotRows = Math.max(4, axisRow - 2);
  const { points, kinds, scale } = paretoCloud(spec);
  const { logLo, logSpan, qLo: Q_LO, qHi: Q_HI, ceiling } = scale;

  const colOf = (cost: number) => Math.round(((Math.log(cost) - logLo) / logSpan) * (cols - 6)) + 3;
  const rowOf = (quality: number) =>
    Math.round((1 - (Math.min(Q_HI, Math.max(Q_LO, quality)) - Q_LO) / (Q_HI - Q_LO)) * (plotRows - 1));

  const plotted: PlottedModel[] = points.map((p, i) => ({
    ...p,
    kind: kinds[i] ?? "dominated",
    col: colOf(p.cost),
    row: rowOf(p.quality),
  }));

  // A faint lattice so the empty half of the plot still reads as a plot, and
  // the ceiling traced along it so the frontier is a shape before it is a set
  // of markers.
  for (let r = 0; r < plotRows; r += 3) {
    for (let c = 3; c < cols - 3; c += 4) canvas.put(c, r, 1, { tone: 0.07 });
  }
  for (let c = 3; c < cols - 3; c++) {
    const u = (c - 3) / Math.max(1, cols - 6);
    canvas.put(c, rowOf(ceiling(u)), 2, { tone: 0.2, over: true });
  }

  for (const m of plotted) {
    if (m.kind === "dominated") canvas.put(m.col, m.row, 7, { char: "o", tone: 0.42, over: true });
  }
  // A frontier marker is three cells wide, so one that would land on another
  // is dropped rather than drawn through it. The curve underneath already
  // carries the shape.
  const marked: { col: number; row: number }[] = [];
  for (const m of plotted) {
    if (m.kind !== "frontier") continue;
    if (marked.some((p) => p.row === m.row && Math.abs(p.col - m.col) < 4)) continue;
    canvas.text(m.col - 1, m.row, "(0)", 9, 0.88);
    marked.push({ col: m.col, row: m.row });
  }
  const prod = plotted[1];
  if (prod) canvas.put(prod.col, prod.row, 10, { char: "X", tone: 1, over: true });

  // Cost ticks sit under the plot, each one under the point it describes.
  for (const cost of spec.costAxis) {
    const label = `$${cost.toFixed(2)}`;
    canvas.text(Math.max(0, Math.min(cols - label.length, colOf(cost) - Math.floor(label.length / 2))), axisRow, label, 5, 0.34);
  }

  return canvas.toGrid();
};
