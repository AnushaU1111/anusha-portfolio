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
  /**
   * Run the flow down the box instead of across it.
   *
   * The wide form is a left-to-right spine with the inputs fanned down the
   * left edge, which needs about nine hundred pixels: fourteen labels sharing
   * one horizontal axis. Below that they collide, and on a phone they print
   * on top of each other into nonsense.
   *
   * Vertical keeps every stage but turns the axis, so each stage is a row of
   * two to four labels and the stages flow downward. The widest row is the
   * spine at about two hundred and eighty pixels, so it fits a phone with
   * room to spare, and the structure the diagram is about — four ways in, one
   * spine, two ways out — survives the turn.
   */
  vertical?: boolean;
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
  // The vertical form needs the full width for its rows; 96px of margin each
  // side left 198px of a 390px box to seat four labels in, which is where the
  // first attempt still collided.
  const padX = o.padX ?? (o.vertical ? 8 : 96);
  // Wide: the headline and the lede sit over the diagram on entry, so the runs
  // start almost half way down the box.
  //
  // Vertical: the header is in normal flow above the box instead, so the whole
  // height is the diagram's. Keeping the desktop padding here left 185px of a
  // 440px box for five stages, which is what made the first vertical attempt
  // spread wider than it was tall.
  const padTop = o.padTop ?? (o.vertical ? 64 : Math.round(o.height * 0.47));
  const padBottom = o.padBottom ?? (o.vertical ? 26 : Math.round(o.height * 0.11));
  const charW = o.charW ?? 7.4;
  const width = o.width;
  const height = o.height;

  const vertical = o.vertical ?? false;
  const left = padX;
  const right = Math.max(left + 1, width - padX);
  const spanX = right - left;
  const x = (f: number) => left + f * spanX;
  const top = padTop;
  const bottom = Math.max(top + 1, height - padBottom);
  const spine = (top + bottom) / 2;
  /** Down the box, for the vertical form: 0 is the first stage, 1 the last. */
  const y = (f: number) => top + f * Math.max(1, bottom - top);
  /** Spread a stage's nodes across the width, inset so the ends have margin. */
  const across = (count: number): number[] => {
    if (count <= 1) return [x(0.5)];
    const inset = 0.5 / count;
    return Array.from({ length: count }, (_, i) => x(inset + ((1 - 2 * inset) * i) / (count - 1)));
  };
  /**
   * Vertical offset for one node in a row. Four of the input labels are wider
   * together than a phone is, so a row of more than three alternates above and
   * below its line: the labels may overlap across but never touch, because
   * they no longer share a baseline.
   */
  const stagger = (count: number, i: number): number =>
    count > 3 ? (i % 2 === 0 ? -1 : 1) * Math.max(1, bottom - top) * 0.05 : 0;

  const node = (label: string, kind: PipeNodeKind, nx: number, ny: number, align: PipeNode["align"]): PipeNode => ({
    label: `[${label}]`,
    kind,
    x: nx,
    y: ny,
    align,
  });

  // Five stages down the box. The gaps are uneven on purpose: the spine row
  // carries three long labels and wants the most room above it.
  const ROW = { inputs: 0, normalise: 0.24, indexes: 0.5, spine: 0.76, outputs: 1 };

  const inputRows = fan(spec.inputs.length, top, bottom);
  const inputCols = across(spec.inputs.length);
  const inputs = spec.inputs.map((l, i) =>
    vertical
      ? node(l, "input", inputCols[i] ?? x(0.5), y(ROW.inputs) + stagger(spec.inputs.length, i), "center")
      : node(l, "input", x(0), inputRows[i] ?? spine, "left"),
  );

  const normCols = across(spec.normalise.length);
  const normalise = spec.normalise.map((l, i) =>
    vertical
      ? node(l, "normalise", normCols[i] ?? x(0.5), y(ROW.normalise), "center")
      : node(l, "normalise", x(0.17 + i * 0.13), spine, "center"),
  );

  const indexRows = fan(spec.indexes.length, top + (bottom - top) * 0.16, bottom - (bottom - top) * 0.16);
  const indexCols = across(spec.indexes.length);
  const indexes = spec.indexes.map((l, i) =>
    vertical
      ? node(l, "index", indexCols[i] ?? x(0.5), y(ROW.indexes) + stagger(spec.indexes.length, i), "center")
      : node(l, "index", x(0.46), indexRows[i] ?? spine, "center"),
  );
  if (!vertical) {
    const mid = indexes[Math.floor(indexes.length / 2)];
    if (mid) mid.y = spine;
  }

  const spineCols = across(3);
  const scorer = vertical
    ? node(spec.scorer, "spine", spineCols[0] ?? x(0.5), y(ROW.spine), "center")
    : node(spec.scorer, "spine", x(0.63), spine, "center");
  const model = vertical
    ? node(spec.model, "model", spineCols[1] ?? x(0.5), y(ROW.spine), "center")
    : node(spec.model, "model", x(0.77), spine, "center");
  const gate = vertical
    ? node(spec.gate, "model", spineCols[2] ?? x(0.5), y(ROW.spine), "center")
    : node(spec.gate, "model", x(0.89), spine, "center");

  const outputRows = fan(spec.outputs.length, top + (bottom - top) * 0.22, bottom - (bottom - top) * 0.22);
  const outputCols = across(spec.outputs.length);
  const outputs = spec.outputs.map((l, i) =>
    vertical
      ? node(l, "output", outputCols[i] ?? x(0.5), y(ROW.outputs), "center")
      : node(l, "output", x(1), outputRows[i] ?? spine, "right"),
  );

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
