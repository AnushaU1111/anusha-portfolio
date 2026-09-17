import type { Grid } from "../types";
import { createCanvas } from "./canvas";
import { span, type FigureContext } from "./context";

export interface GraphSpec {
  nodeTypes: string[];
  edgeTypes: string[];
  nodes: number;
  edges: number;
}

type NodeKind = "S" | "R" | "F" | "T";
type EdgeKind = "owns" | "depends" | "validates";

/**
 * One requirements session, as ReqTrace would return it: nineteen nodes and
 * the twenty-four relations between them, each node titled as it was agreed.
 *
 * The instance is illustrative and the scene says so. What is not illustrative
 * is its shape — four node types joined by three edge types — which is what
 * the system actually produces, and the direction of the edges, which is what
 * makes the graph worth walking: a requirement depends on the ones it rests
 * on, a feature depends on the requirements it satisfies, a test validates
 * what it covers, and a stakeholder owns what they asked for.
 *
 * The session described is ReqTrace being specified, which is the one meeting
 * the team actually had a recording of.
 *
 * Positions are given on a 100 by 40 reference and scaled, so the layout
 * survives being regenerated at another column count.
 */
const REF_COLS = 100;
const REF_ROWS = 40;

export const NODES: { id: string; col: number; row: number; title: string }[] = [
  // Stakeholders: who in the room the requirement belongs to.
  { id: "S-01", col: 14, row: 10, title: "Product sponsor" },
  { id: "S-02", col: 18, row: 24, title: "QA lead" },
  { id: "S-03", col: 28, row: 37, title: "Research advisor" },
  // Requirements, titled as they were agreed. Each one has a transcript line
  // on the scene, and the two are written to say the same thing.
  { id: "R-01", col: 32, row: 6, title: "Nothing publishes until the upload is signed off" },
  { id: "R-02", col: 30, row: 16, title: "Each node names the stakeholder who asked for it" },
  { id: "R-03", col: 38, row: 22, title: "A dropped upload keeps the sessions already indexed" },
  { id: "R-04", col: 40, row: 32, title: "Every change links back to the meeting it came from" },
  { id: "R-05", col: 54, row: 30, title: "Exports carry their provenance with them" },
  { id: "R-06", col: 14, row: 32, title: "Extraction runs on the audio, never on the notes" },
  { id: "R-07", col: 56, row: 23, title: "Every node keeps a pointer to its source sentence" },
  // Features: what was built to satisfy them.
  { id: "F-01", col: 50, row: 4, title: "Sign-off gate" },
  { id: "F-02", col: 48, row: 13, title: "Node inspector" },
  { id: "F-03", col: 62, row: 33, title: "Meeting backlink" },
  { id: "F-04", col: 70, row: 26, title: "Graph export" },
  { id: "F-05", col: 76, row: 17, title: "Transcript anchor" },
  // Tests: what each one actually asserts.
  { id: "T-01", col: 68, row: 3, title: "Rejects an unsigned upload" },
  { id: "T-02", col: 66, row: 10, title: "Inspector renders on a partial index" },
  { id: "T-03", col: 86, row: 29, title: "Export round-trips through Neo4j" },
  { id: "T-04", col: 92, row: 14, title: "Anchor resolves to the right utterance" },
];

export const EDGES: [string, string, EdgeKind][] = [
  ["S-01", "R-01", "owns"],
  ["S-01", "R-02", "owns"],
  ["S-02", "R-03", "owns"],
  ["S-02", "R-04", "owns"],
  ["S-03", "R-05", "owns"],
  ["S-03", "R-06", "owns"],
  ["S-03", "R-07", "owns"],
  ["R-01", "R-03", "depends"],
  ["R-02", "R-04", "depends"],
  ["R-03", "R-05", "depends"],
  ["R-04", "R-07", "depends"],
  ["R-05", "R-07", "depends"],
  ["R-02", "R-06", "depends"],
  ["F-01", "R-01", "depends"],
  ["F-02", "R-02", "depends"],
  ["F-02", "R-03", "depends"],
  ["F-03", "R-04", "depends"],
  ["F-04", "R-05", "depends"],
  ["F-05", "R-07", "depends"],
  ["T-01", "F-01", "validates"],
  ["T-02", "F-02", "validates"],
  ["T-03", "F-04", "validates"],
  ["T-04", "F-05", "validates"],
  ["T-02", "R-03", "validates"],
];

/** The bracket is the node type. Nothing else carries it, brightness least of all. */
const BRACKETS: Record<NodeKind, [string, string]> = {
  S: ["(", ")"],
  R: ["[", "]"],
  F: ["<", ">"],
  T: ["{", "}"],
};

/** Requirements are what a visitor is looking for, so they sit brightest. */
const NODE_TONE: Record<NodeKind, number> = { S: 0.4, R: 0.86, F: 0.58, T: 0.44 };

const EDGE_STYLE: Record<EdgeKind, { every: number; tone: number; char?: string }> = {
  owns: { every: 2, tone: 0.16, char: "·" },
  depends: { every: 1, tone: 0.3 },
  validates: { every: 3, tone: 0.22, char: ":" },
};

export const graphFigure = (_spec: GraphSpec, ctx: FigureContext): Grid => {
  const cols = span(ctx.cols, 0.72, 50, 240);
  const rows = span(ctx.rows, 0.72, 20, 90);
  const canvas = createCanvas(cols, rows);

  const scaled = new Map<string, { col: number; row: number }>();
  for (const n of NODES) {
    scaled.set(n.id, {
      col: Math.round((n.col / REF_COLS) * (cols - 1)),
      row: Math.round((n.row / REF_ROWS) * (rows - 1)),
    });
  }

  for (const [from, to, kind] of EDGES) {
    const a = scaled.get(from);
    const b = scaled.get(to);
    if (!a || !b) continue;
    const style = EDGE_STYLE[kind];
    canvas.run(a, b, 4, {
      every: style.every,
      tone: style.tone,
      gap: 3,
      ...(style.char === undefined ? {} : { char: style.char }),
    });
  }

  for (const n of NODES) {
    const at = scaled.get(n.id);
    if (!at) continue;
    const kind = n.id[0] as NodeKind;
    const [open, close] = BRACKETS[kind];
    const label = `${open}${n.id}${close}`;
    const start = Math.max(0, Math.min(cols - label.length, at.col - Math.floor(label.length / 2)));
    canvas.text(start, at.row, label, 8, NODE_TONE[kind]);
  }

  return canvas.toGrid();
};
