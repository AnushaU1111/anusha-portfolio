import { describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { EDGES, NODES, type GraphSpec } from "@/lib/ascii/figures/graph";
import { buildAsciiGraph, neighbourhoodOf, nodeAt } from "@/lib/ascii/graph";
import { buildRelay, stampPairs } from "@/lib/ascii/morph";
import type { GlyphMasks } from "@/lib/ascii/stamp";

const figure = (() => {
  const s = projects.find((p) => p.slug === "reqtrace");
  if (!s || s.figure.kind !== "graph") throw new Error("no graph scene");
  return s.figure;
})();
const spec: GraphSpec = figure;

const CELL_W = 1.5;
const CELL_H = 2.5;
const W = 900;
const H = 760;
const graph = buildAsciiGraph(spec, { width: W, height: H, cellW: CELL_W, cellH: CELL_H });

describe("buildAsciiGraph", () => {
  it("draws the instance the scene declares, and the one the coarse figure draws", () => {
    expect(graph.nodes).toHaveLength(spec.nodes);
    expect(graph.edges).toHaveLength(spec.edges);
    expect(graph.nodes.map((n) => n.id)).toEqual(NODES.map((n) => n.id));
    expect(graph.edges.map((e) => [e.from, e.to, e.kind])).toEqual(EDGES.map((e) => [...e]));
  });

  it("puts each id in its type's brackets and nothing else", () => {
    const bracket: Record<string, string> = { S: "()", R: "[]", F: "<>", T: "{}" };
    for (const n of graph.nodes) {
      const b = bracket[n.kind];
      expect(n.label).toBe(`${b?.[0]}${n.id}${b?.[1]}`);
    }
  });

  it("spends no characters on the ids, only on the edges between them", () => {
    expect(graph.marks.length).toBeGreaterThan(400);
    for (const n of graph.nodes) {
      const onLabel = graph.marks.filter((m) => Math.abs(m.x - n.x) < 5 && Math.abs(m.y - n.y) < 5);
      expect(onLabel).toHaveLength(0);
    }
  });

  it("gives every mark the edge it belongs to", () => {
    for (const m of graph.marks) {
      expect(m.group).toBeGreaterThanOrEqual(0);
      expect(m.group).toBeLessThan(graph.edges.length);
    }
    // Every edge long enough to draw has at least one mark.
    const drawn = new Set(graph.marks.map((m) => m.group));
    expect(drawn.size).toBe(graph.edges.length);
  });

  it("keeps every mark inside the box it was built for", () => {
    for (const m of graph.marks) {
      expect(m.x).toBeGreaterThanOrEqual(-2);
      expect(m.y).toBeGreaterThanOrEqual(-2);
      expect(m.x).toBeLessThanOrEqual(W + 2);
      expect(m.y).toBeLessThanOrEqual(H + 2);
    }
  });

  it("tells the three relations apart by weight, not by colour", () => {
    const weight = (kind: string) => {
      const groups = graph.edges.map((e, i) => (e.kind === kind ? i : -1)).filter((i) => i >= 0);
      const marks = graph.marks.filter((m) => groups.includes(m.group));
      return marks.reduce((s, m) => s + m.alpha, 0) / Math.max(1, groups.length);
    };
    expect(weight("depends")).toBeGreaterThan(weight("validates"));
    expect(weight("validates")).toBeGreaterThan(weight("owns"));
  });

  it("scales with its box rather than assuming a size", () => {
    const small = buildAsciiGraph(spec, { width: 560, height: 520, cellW: CELL_W, cellH: CELL_H });
    expect(small.nodes).toHaveLength(spec.nodes);
    for (const m of small.marks) {
      expect(m.x).toBeLessThanOrEqual(562);
      expect(m.y).toBeLessThanOrEqual(522);
    }
  });
});

describe("nodeAt", () => {
  it("finds the node under the cursor", () => {
    const n = graph.nodes[5];
    if (!n) throw new Error("no node");
    expect(nodeAt(graph, n.x, n.y)?.node.id).toBe(n.id);
  });

  it("finds nothing in empty space", () => {
    expect(nodeAt(graph, 2, 2)).toBeNull();
  });
});

describe("neighbourhoodOf", () => {
  it("reads the selected node's relations off the edge list", () => {
    const near = neighbourhoodOf(graph, "R-03");
    expect(near.ownedBy).toEqual(["(S-02)"]);
    expect(near.validatedBy).toEqual(["{T-02}"]);
    expect(near.dependsOn).toEqual(["[R-05]"]);
    expect(near.feeds).toEqual(["[R-01]", "<F-02>"]);
  });

  it("holds exactly the edges the node is an end of", () => {
    const near = neighbourhoodOf(graph, "R-03");
    let held = 0;
    for (let i = 0; i < graph.edges.length; i++) {
      const e = graph.edges[i];
      const isEnd = e?.from === "R-03" || e?.to === "R-03";
      expect(near.edges[i] === 1).toBe(isEnd);
      if (isEnd) held++;
    }
    expect(held).toBe(5);
  });

  it("never claims a relation the graph does not draw", () => {
    for (const n of graph.nodes) {
      const near = neighbourhoodOf(graph, n.id);
      const all = [
        ...near.ownedBy,
        ...near.owns,
        ...near.validatedBy,
        ...near.validates,
        ...near.dependsOn,
        ...near.feeds,
      ];
      let ends = 0;
      for (const e of graph.edges) if (e.from === n.id || e.to === n.id) ends++;
      expect(all).toHaveLength(ends);
      for (const label of all) expect(graph.nodes.some((q) => q.label === label)).toBe(true);
    }
  });

  it("declares a transcript line for every requirement it lets you select", () => {
    const lines = new Set(figure.transcript.map((t) => t.node));
    for (const n of graph.nodes) {
      if (n.kind === "R") expect(lines.has(n.id)).toBe(true);
    }
  });
});

/** One flat 3x3 mask, so a stamped character covers a known patch. */
const masks = (): GlyphMasks => ({
  masks: Array.from({ length: 11 }, () => new Uint8Array(9).fill(255)),
  mw: 3,
  mh: 3,
});

describe("stampPairs dimming", () => {
  const marks = graph.marks.map((m) => ({ x: m.x, y: m.y, idx: m.idx, tone: m.tone, alpha: m.alpha, group: m.group }));
  const pairs = buildRelay(marks, marks, { cellW: CELL_W, cellH: CELL_H, seed: 2 });
  const ink = (dim: { keep: Uint8Array; factor: number } | null) => {
    const acc = new Float32Array(W * H * 4);
    const out = new Uint8ClampedArray(W * H * 4);
    stampPairs(acc, out, W, H, pairs, masks(), {
      cellW: CELL_W,
      cellH: CELL_H,
      srcOrigin: { x: 0, y: 0 },
      dstOrigin: { x: 0, y: 0 },
      flyT: 1,
      morphT: 1,
      dim,
    });
    let total = 0;
    for (let i = 3; i < out.length; i += 4) total += out[i] ?? 0;
    return total;
  };

  it("carries each character's group through the relay", () => {
    let grouped = 0;
    for (let i = 0; i < pairs.count; i++) if ((pairs.group[i] ?? -1) >= 0) grouped++;
    expect(grouped).toBeGreaterThan(pairs.count * 0.9);
  });

  it("holds the selected edges and quiets the rest", () => {
    const full = ink(null);
    const keep = neighbourhoodOf(graph, "R-03").edges;
    const dimmed = ink({ keep, factor: 0.2 });
    expect(dimmed).toBeLessThan(full * 0.55);
    // What is held has to survive: dimming everything would be the same bug
    // as dimming nothing, and both would pass a one-sided check.
    const none = ink({ keep: new Uint8Array(graph.edges.length), factor: 0.2 });
    expect(dimmed).toBeGreaterThan(none * 1.1);
  });
});

describe("graph instance data", () => {
  it("titles every node, distinctly", () => {
    for (const n of NODES) {
      expect(n.title.length, `${n.id} has no title`).toBeGreaterThan(2);
      // A title that is just the id back again would tell a reader nothing.
      expect(n.title).not.toContain(n.id);
    }
    expect(new Set(NODES.map((n) => n.title)).size).toBe(NODES.length);
  });

  it("carries the title onto the rendered node", () => {
    for (const n of graph.nodes) {
      expect(n.title).toBe(NODES.find((r) => r.id === n.id)?.title);
    }
  });

  it("only joins node types in the directions the system produces", () => {
    for (const [from, to, kind] of EDGES) {
      const a = from[0];
      const b = to[0];
      if (kind === "owns") {
        // Stakeholders own requirements. Nothing else owns anything.
        expect(`${a}->${b}`, `owns ${from}->${to}`).toBe("S->R");
      } else if (kind === "validates") {
        // Tests validate features, or a requirement directly.
        expect(a, `validates ${from}->${to}`).toBe("T");
        expect(["F", "R"]).toContain(b);
      } else {
        // A requirement rests on requirements; a feature satisfies them.
        expect(["R", "F"]).toContain(a);
        expect(b, `depends ${from}->${to}`).toBe("R");
      }
    }
  });

  it("leaves no node stranded", () => {
    const joined = new Set(EDGES.flatMap(([from, to]) => [from, to]));
    for (const n of NODES) expect(joined.has(n.id), `${n.id} has no edges`).toBe(true);
  });

  it("has no cycle among requirement dependencies", () => {
    // A requirement graph you can walk has to bottom out, or "depends on"
    // means nothing. Kahn's algorithm: a cycle leaves nodes unremovable.
    const deps = EDGES.filter(([f, t, k]) => k === "depends" && f.startsWith("R") && t.startsWith("R"));
    const ids = NODES.filter((n) => n.id.startsWith("R")).map((n) => n.id);
    const out = new Map(ids.map((id) => [id, deps.filter(([f]) => f === id).map(([, t]) => t)]));
    const seen = new Set<string>();
    const stack = new Set<string>();
    const walk = (id: string): boolean => {
      if (stack.has(id)) return false;
      if (seen.has(id)) return true;
      seen.add(id);
      stack.add(id);
      for (const next of out.get(id) ?? []) if (!walk(next)) return false;
      stack.delete(id);
      return true;
    };
    for (const id of ids) expect(walk(id), `cycle through ${id}`).toBe(true);
  });
});
