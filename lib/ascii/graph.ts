import { EDGES, NODES, type GraphSpec } from "./figures/graph";

/**
 * The ReqTrace dependency graph at the fine cell size, as somewhere for the
 * pipeline's runs to land.
 *
 * Same division as the chart and the pipeline before it: the edges are made of
 * characters, and anything that has to be read — the node ids, the transcript
 * card — is real text laid over the canvas.
 *
 * The layout, the nineteen nodes and the twenty-four edges are the ones the
 * coarse figure already draws, read from the same lists, so the two renderings
 * of this graph cannot disagree about a single edge.
 */
export type NodeKind = "S" | "R" | "F" | "T";
export type EdgeKind = "owns" | "depends" | "validates";

export interface GraphMark {
  /** Px from the box's top-left. */
  x: number;
  y: number;
  idx: number;
  tone: number;
  alpha: number;
  /** Which edge this mark belongs to, so a selection can hold its own. */
  group: number;
}

export interface GraphNode {
  id: string;
  kind: NodeKind;
  /** The id in its type's brackets. The bracket is the type; nothing else is. */
  label: string;
  /** Centre, px from the box's top-left. */
  x: number;
  y: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: EdgeKind;
}

export interface AsciiGraph {
  marks: GraphMark[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

export interface GraphOptions {
  width: number;
  height: number;
  cellW: number;
  cellH: number;
  padX?: number;
  padTop?: number;
  padBottom?: number;
  /** Half-width of the gap a label keeps clear, px per character of its id. */
  charW?: number;
}

/** The bracket is the node type. Nothing else carries it, brightness least of all. */
const BRACKETS: Record<NodeKind, [string, string]> = {
  S: ["(", ")"],
  R: ["[", "]"],
  F: ["<", ">"],
  T: ["{", "}"],
};

/**
 * How each relation is drawn. The three edge types have to be told apart
 * without colour, so they differ in weight and in how solid the run is —
 * `owns` is a sparse dotted trail, `depends` a continuous line, `validates` a
 * dashed one.
 */
const EDGE_STYLE: Record<EdgeKind, { step: number; idx: number; tone: number; alpha: number; thick: number }> = {
  owns: { step: 2.4, idx: 3, tone: 0.24, alpha: 0.5, thick: 1 },
  depends: { step: 1, idx: 6, tone: 0.5, alpha: 0.78, thick: 2 },
  validates: { step: 1.8, idx: 5, tone: 0.36, alpha: 0.62, thick: 1 },
};

/** The reference frame the node positions are given on. */
const REF_COLS = 100;
const REF_ROWS = 40;

export const buildAsciiGraph = (_spec: GraphSpec, o: GraphOptions): AsciiGraph => {
  const { cellW, cellH, width, height } = o;
  const padX = o.padX ?? 72;
  const padTop = o.padTop ?? 78;
  const padBottom = o.padBottom ?? 66;
  const charW = o.charW ?? 7.4;

  const left = padX;
  const spanX = Math.max(1, width - padX * 2);
  const top = padTop;
  const spanY = Math.max(1, height - padTop - padBottom);

  const nodes: GraphNode[] = NODES.map((n) => {
    const kind = (n.id[0] ?? "R") as NodeKind;
    const [open, close] = BRACKETS[kind];
    return {
      id: n.id,
      kind,
      label: `${open}${n.id}${close}`,
      x: left + (n.col / REF_COLS) * spanX,
      y: top + (n.row / REF_ROWS) * spanY,
    };
  });
  const at = new Map(nodes.map((n) => [n.id, n]));

  const marks: GraphMark[] = [];
  const edges: GraphEdge[] = [];
  for (const [from, to, kind] of EDGES) {
    const a = at.get(from);
    const b = at.get(to);
    if (!a || !b) continue;
    const group = edges.length;
    edges.push({ from, to, kind });

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const ux = dx / len;
    const uy = dy / len;
    const gapA = a.label.length * charW * 0.5 + 5;
    const gapB = b.label.length * charW * 0.5 + 5;
    const start = Math.min(len * 0.45, gapA);
    const end = Math.max(len * 0.55, len - gapB);
    const s = EDGE_STYLE[kind];
    // Perpendicular, so extra rows thicken the run rather than lengthen it.
    const px = -uy;
    const py = ux;
    for (let t = start; t <= end; t += cellW * s.step) {
      const x = a.x + ux * t;
      const y = a.y + uy * t;
      marks.push({ x, y, idx: s.idx, tone: s.tone, alpha: s.alpha, group });
      if (s.thick > 1) {
        marks.push({
          x: x + px * cellW,
          y: y + py * cellH * 0.6,
          idx: Math.max(1, s.idx - 2),
          tone: s.tone * 0.8,
          alpha: s.alpha * 0.5,
          group,
        });
      }
    }
  }

  return { marks, nodes, edges, width, height };
};

/** The node under the cursor, or null. Distances are in px within the box. */
export const nodeAt = (
  graph: AsciiGraph,
  x: number,
  y: number,
  radius = 26,
): { index: number; node: GraphNode } | null => {
  let bestI = -1;
  let bestD = radius;
  for (let i = 0; i < graph.nodes.length; i++) {
    const n = graph.nodes[i];
    if (!n) continue;
    const d = Math.hypot(n.x - x, n.y - y);
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  }
  const node = bestI >= 0 ? graph.nodes[bestI] : undefined;
  return node ? { index: bestI, node } : null;
};

export interface Neighbourhood {
  /** One byte per edge: 1 for the edges this node is an end of. */
  edges: Uint8Array;
  /** Nodes at the other end, by what the relation means for this one. */
  ownedBy: string[];
  owns: string[];
  validatedBy: string[];
  validates: string[];
  dependsOn: string[];
  feeds: string[];
}

/**
 * What holds when a node is selected: the edges it is an end of, and the nodes
 * at the other end of each, grouped by what the relation means for it.
 *
 * Every edge in the list names its actor first — `[S-01, R-01, owns]` is S-01
 * owning R-01, `[T-01, F-01, validates]` is T-01 validating F-01, and so
 * `[R-03, R-05, depends]` is R-03 depending on R-05. The card is read off that
 * rather than declared, so it cannot claim a relation the graph does not draw.
 */
export const neighbourhoodOf = (graph: AsciiGraph, id: string): Neighbourhood => {
  const out: Neighbourhood = {
    edges: new Uint8Array(graph.edges.length),
    ownedBy: [],
    owns: [],
    validatedBy: [],
    validates: [],
    dependsOn: [],
    feeds: [],
  };
  const labelOf = (nid: string) => graph.nodes.find((n) => n.id === nid)?.label ?? nid;
  for (let i = 0; i < graph.edges.length; i++) {
    const e = graph.edges[i];
    if (!e) continue;
    if (e.from !== id && e.to !== id) continue;
    out.edges[i] = 1;
    const actor = e.from === id;
    const label = labelOf(actor ? e.to : e.from);
    if (e.kind === "owns") (actor ? out.owns : out.ownedBy).push(label);
    else if (e.kind === "validates") (actor ? out.validates : out.validatedBy).push(label);
    else (actor ? out.dependsOn : out.feeds).push(label);
  }
  return out;
};
