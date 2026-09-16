import type { PipelineSpec } from "./figures/pipeline";

/**
 * The pipeline diagram at the fine cell size, as somewhere for the chart's
 * characters to land.
 *
 * The coarse figure draws the whole thing — nodes, labels and the hatched runs
 * between them — because at 4.8 by 8 px "[detect lang]" is legible. Here a
 * character is a pixel, so the division is the one the chart already uses: the
 * connectors are made of characters and the labels are real text laid over the
 * canvas at a size worth reading.
 *
 * The geometry is the coarse figure's, in px rather than cells: four ways in,
 * one spine, two ways out. Shape is a drawing decision and the scene says so
 * in `illustrative`; every name comes from the spec.
 */
export interface PipeMark {
  /** Px from the box's top-left. */
  x: number;
  y: number;
  idx: number;
  tone: number;
  alpha: number;
}

export type PipeNodeKind = "input" | "normalise" | "index" | "spine" | "model" | "output";

export interface PipeNode {
  label: string;
  kind: PipeNodeKind;
  /** Centre, px from the box's top-left. */
  x: number;
  y: number;
  /** Which side the label reads from, so it never sits on its own connector. */
  align: "left" | "center" | "right";
}

export interface Pipe {
  marks: PipeMark[];
  nodes: PipeNode[];
  width: number;
  height: number;
}

export interface PipeOptions {
  width: number;
  height: number;
  cellW: number;
  cellH: number;
  padX?: number;
  /** Room above the diagram, where the headline sits on entry. */
  padTop?: number;
  padBottom?: number;
  /** Half-width of the gap a label keeps clear, px per character of its name. */
  charW?: number;
}

/** Fan a set of nodes down a column, inset from the top and bottom. */
const fan = (count: number, top: number, bottom: number): number[] => {
  if (count <= 1) return [(top + bottom) / 2];
  return Array.from({ length: count }, (_, i) => top + ((bottom - top) * i) / (count - 1));
};

interface Edge {
  a: PipeNode;
  b: PipeNode;
  /** How present the run is. The spine reads stronger than the fans. */
  tone: number;
  alpha: number;
  idx: number;
  /** Cells across the stroke. The spine is drawn heavier than the fans. */
  thick: number;
}

/**
 * Samples a straight run between two nodes, two cells thick, stopping clear of
 * each end's label. Drawn every cellW along its own length, so a diagonal is as
 * dense as a horizontal rather than dashed by the cell grid.
 */
const run = (edge: Edge, cellW: number, cellH: number, gapA: number, gapB: number, out: PipeMark[]): void => {
  const dx = edge.b.x - edge.a.x;
  const dy = edge.b.y - edge.a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  const from = Math.min(len * 0.45, gapA);
  const to = Math.max(len * 0.55, len - gapB);
  // Perpendicular, so the second row of the stroke thickens the line rather
  // than lengthening it.
  const px = -uy;
  const py = ux;
  for (let t = from; t <= to; t += cellW) {
    const x = edge.a.x + ux * t;
    const y = edge.a.y + uy * t;
    out.push({ x, y, idx: edge.idx, tone: edge.tone, alpha: edge.alpha });
    // Rows either side of the centre, falling off, so a one-pixel line reads
    // as a line rather than as a row of dust.
    for (let k = 1; k < edge.thick; k++) {
      const s = k % 2 === 1 ? 1 : -1;
      const step = Math.ceil(k / 2);
      const fade = 1 / (1 + step);
      out.push({
        x: x + px * cellW * step * s,
        y: y + py * cellH * 0.6 * step * s,
        idx: Math.max(1, edge.idx - 1 - step),
        tone: edge.tone * (1 - 0.15 * step),
        alpha: edge.alpha * fade,
      });
    }
  }
};

export const buildPipe = (spec: PipelineSpec, o: PipeOptions): Pipe => {
  const { cellW, cellH } = o;
  const padX = o.padX ?? 96;
  // The headline and the lede sit above the diagram on entry, so the runs
  // start well down the box.
  const padTop = o.padTop ?? Math.round(o.height * 0.47);
  const padBottom = o.padBottom ?? Math.round(o.height * 0.11);
  const charW = o.charW ?? 7.4;
  const width = o.width;
  const height = o.height;

  const left = padX;
  const right = Math.max(left + 1, width - padX);
  const spanX = right - left;
  const x = (f: number) => left + f * spanX;
  const top = padTop;
  const bottom = Math.max(top + 1, height - padBottom);
  const spine = (top + bottom) / 2;

  const node = (label: string, kind: PipeNodeKind, nx: number, ny: number, align: PipeNode["align"]): PipeNode => ({
    label: `[${label}]`,
    kind,
    x: nx,
    y: ny,
    align,
  });

  const inputRows = fan(spec.inputs.length, top, bottom);
  const inputs = spec.inputs.map((l, i) => node(l, "input", x(0), inputRows[i] ?? spine, "left"));

  const normalise = spec.normalise.map((l, i) =>
    node(l, "normalise", x(0.17 + i * 0.13), spine, "center"),
  );

  const indexRows = fan(spec.indexes.length, top + (bottom - top) * 0.16, bottom - (bottom - top) * 0.16);
  const indexes = spec.indexes.map((l, i) => node(l, "index", x(0.46), indexRows[i] ?? spine, "center"));
  const mid = indexes[Math.floor(indexes.length / 2)];
  if (mid) mid.y = spine;

  const scorer = node(spec.scorer, "spine", x(0.63), spine, "center");
  const model = node(spec.model, "model", x(0.77), spine, "center");
  const gate = node(spec.gate, "model", x(0.89), spine, "center");

  const outputRows = fan(spec.outputs.length, top + (bottom - top) * 0.22, bottom - (bottom - top) * 0.22);
  const outputs = spec.outputs.map((l, i) => node(l, "output", x(1), outputRows[i] ?? spine, "right"));

  const first = normalise[0];
  const last = normalise[normalise.length - 1];
  const edges: Edge[] = [];
  const fanEdge = (a: PipeNode, b: PipeNode): Edge => ({ a, b, tone: 0.4, alpha: 0.7, idx: 5, thick: 3 });
  const spineEdge = (a: PipeNode, b: PipeNode): Edge => ({ a, b, tone: 0.62, alpha: 0.9, idx: 7, thick: 4 });

  if (first) for (const n of inputs) edges.push(fanEdge(n, first));
  for (let i = 1; i < normalise.length; i++) {
    const a = normalise[i - 1];
    const b = normalise[i];
    if (a && b) edges.push(spineEdge(a, b));
  }
  if (last) for (const n of indexes) edges.push(fanEdge(last, n));
  for (const n of indexes) edges.push(fanEdge(n, scorer));
  edges.push(spineEdge(scorer, model), spineEdge(model, gate));
  for (const n of outputs) edges.push(fanEdge(gate, n));

  const marks: PipeMark[] = [];
  // Clearance along the run, not around the label: a run arriving steeply
  // needs less of it than one arriving flat, and too much of it leaves the
  // fans as stubs rather than as lines.
  const gapOf = (n: PipeNode) => n.label.length * charW * 0.42 + 7;
  for (const e of edges) run(e, cellW, cellH, gapOf(e.a), gapOf(e.b), marks);

  const nodes = [...inputs, ...normalise, ...indexes, scorer, model, gate, ...outputs];
  return { marks, nodes, width, height };
};
