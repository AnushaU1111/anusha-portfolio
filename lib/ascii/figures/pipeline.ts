import type { Grid } from "../types";
import { createCanvas, type Point } from "./canvas";
import { span, type FigureContext } from "./context";

export interface PipelineSpec {
  inputs: string[];
  normalise: string[];
  indexes: string[];
  scorer: string;
  model: string;
  gate: string;
  outputs: string[];
}

interface Node extends Point {
  label: string;
  tone: number;
}

/** Fan a set of nodes down one column, inset from the top and bottom edges. */
const fan = (count: number, rows: number, inset: number): number[] => {
  if (count === 1) return [Math.round((rows - 1) / 2)];
  const top = inset;
  const bottom = rows - 1 - inset;
  return Array.from({ length: count }, (_, i) => Math.round(top + ((bottom - top) * i) / (count - 1)));
};

/**
 * Scene 03, on entry. Every way a question can arrive, and the one retrieval
 * they all normalise into. The shape is the argument: four ways in, one
 * spine, two ways out.
 */
export const pipelineFigure = (spec: PipelineSpec, ctx: FigureContext): Grid => {
  // Narrow enough that the leftmost nodes clear the text column beside it.
  const cols = span(ctx.cols, 0.62, 50, 200);
  const rows = span(ctx.rows, 0.54, 14, 56);
  const canvas = createCanvas(cols, rows);

  const x = (f: number) => Math.round(f * (cols - 1));
  const spine = Math.round((rows - 1) / 2);
  const inset = Math.max(1, Math.round(rows * 0.06));

  const inputRows = fan(spec.inputs.length, rows, inset);
  const inputs: Node[] = spec.inputs.map((label, i) => ({
    col: x(0.05),
    row: inputRows[i] ?? spine,
    label: `[${label}]`,
    tone: 0.72,
  }));

  const normalise: Node[] = spec.normalise.map((label, i) => ({
    col: x(0.19 + i * 0.12),
    row: spine,
    label: `[${label}]`,
    tone: 0.62,
  }));

  // The indexes fan around the spine: the middle one sits on it, the others
  // above and below, which is what makes the retrieval read as a widening.
  const indexRows = fan(spec.indexes.length, rows, Math.round(rows * 0.16));
  const indexes: Node[] = spec.indexes.map((label, i) => ({
    col: x(0.44 + (i % 2 === 0 ? 0.01 : 0)),
    row: indexRows[i] ?? spine,
    label: `[${label}]`,
    tone: 0.7,
  }));
  const middle = indexes[Math.floor(indexes.length / 2)];
  if (middle) middle.row = spine;

  const scorer: Node = { col: x(0.63), row: spine, label: `[${spec.scorer}]`, tone: 0.72 };
  const model: Node = { col: x(0.75), row: spine, label: `[${spec.model}]`, tone: 0.95 };
  const gate: Node = { col: x(0.86), row: spine, label: `[${spec.gate}]`, tone: 0.95 };

  const outputRows = fan(spec.outputs.length, rows, Math.round(rows * 0.2));
  const outputs: Node[] = spec.outputs.map((label, i) => ({
    col: x(0.96),
    row: outputRows[i] ?? spine,
    label: `[${label}]`,
    tone: 0.8,
  }));

  const first = normalise[0];
  const last = normalise[normalise.length - 1];
  const edges: [Node, Node][] = [];
  if (first) for (const n of inputs) edges.push([n, first]);
  for (let i = 1; i < normalise.length; i++) {
    const a = normalise[i - 1];
    const b = normalise[i];
    if (a && b) edges.push([a, b]);
  }
  if (last) for (const n of indexes) edges.push([last, n]);
  for (const n of indexes) edges.push([n, scorer]);
  edges.push([scorer, model], [model, gate]);
  for (const n of outputs) edges.push([gate, n]);

  // Edges first, so a label always wins the cells it needs.
  for (const [a, b] of edges) {
    const half = Math.ceil(a.label.length / 2) + 1;
    const halfB = Math.ceil(b.label.length / 2) + 1;
    canvas.run(a, b, 4, { tone: 0.24, gap: Math.max(half, halfB) * 0.6 });
  }

  const label = (n: Node) => {
    const start = Math.max(0, Math.min(cols - n.label.length, n.col - Math.floor(n.label.length / 2)));
    canvas.text(start, n.row, n.label, 7, n.tone);
  };
  [...inputs, ...normalise, ...indexes, scorer, model, gate, ...outputs].forEach(label);

  return canvas.toGrid();
};
