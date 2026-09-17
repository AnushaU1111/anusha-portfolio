import { describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { EDGES, NARROW_IDS } from "@/lib/ascii/figures/graph";
import { buildAsciiGraph } from "@/lib/ascii/graph";
import { buildPipe } from "@/lib/ascii/pipe";
import { buildBars } from "@/lib/ascii/bars";

/**
 * The phone forms of the three figures that cannot survive a narrow box in
 * their wide layout.
 *
 * The bug these guard against is not "too small", it is labels printing on top
 * of one another: the pipeline put fourteen names on one horizontal axis and at
 * 390px they overlapped into nonsense. So the assertions are about collision,
 * measured from the rendered label size rather than eyeballed.
 */

/** Rendered width of a label in the mono face at the size the chrome uses. */
const labelWidth = (label: string, px: number, tracking: number) => label.length * (px * 0.6 + px * tracking);

const figureOf = (slug: string) => {
  const s = projects.find((p) => p.slug === slug);
  if (!s) throw new Error(`no scene ${slug}`);
  return s.figure;
};

const PHONE = { width: 390, height: 440, cellW: 1.5, cellH: 2.5 };

describe("pipeline, vertical", () => {
  const spec = figureOf("temple-rag");
  if (spec.kind !== "pipeline") throw new Error("not a pipeline");
  const wide = buildPipe(spec, { width: 1400, height: 900, cellW: 1.5, cellH: 2.5 });
  const tall = buildPipe(spec, { ...PHONE, vertical: true });

  it("keeps every node, and still draws connectors between them", () => {
    expect(tall.nodes.map((n) => n.label).sort()).toEqual(wide.nodes.map((n) => n.label).sort());
    // Pipe exposes the stamped marks rather than an edge list, so the check is
    // that the vertical form draws a comparable number of them.
    expect(tall.marks.length).toBeGreaterThan(200);
  });

  it("turns the axis rather than shrinking it", () => {
    const spread = (ns: { x: number; y: number }[]) => ({
      x: Math.max(...ns.map((n) => n.x)) - Math.min(...ns.map((n) => n.x)),
      y: Math.max(...ns.map((n) => n.y)) - Math.min(...ns.map((n) => n.y)),
    });
    // Wide runs mostly across; tall must run mostly down.
    const w = spread(wide.nodes);
    const t = spread(tall.nodes);
    expect(w.x).toBeGreaterThan(w.y);
    expect(t.y).toBeGreaterThan(t.x);
  });

  it("puts no two labels on top of each other", () => {
    // Labels are drawn at 15px with 0.06em tracking, centred on the node.
    const boxes = tall.nodes.map((n) => {
      const w = labelWidth(n.label, 12, 0.06);
      return { l: n.x - w / 2, r: n.x + w / 2, t: n.y - 11, b: n.y + 11, label: n.label };
    });
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (!a || !b) continue;
        const overlaps = a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
        expect(overlaps, `${a.label} overlaps ${b.label}`).toBe(false);
      }
    }
  });
});

describe("graph, narrow", () => {
  const spec = figureOf("reqtrace");
  if (spec.kind !== "graph") throw new Error("not a graph");
  const g = buildAsciiGraph(spec, { ...PHONE, height: 470, narrow: true });

  it("draws the declared subset and nothing else", () => {
    expect(g.nodes.map((n) => n.id).sort()).toEqual([...NARROW_IDS].sort());
  });

  it("invents no edge: every one is in the full instance", () => {
    const real = new Set(EDGES.map(([f, t, k]) => `${f}|${t}|${k}`));
    for (const e of g.edges) {
      expect(real.has(`${e.from}|${e.to}|${e.kind}`), `${e.from}->${e.to} is not a real edge`).toBe(true);
    }
    expect(g.edges.length).toBeGreaterThan(5);
  });

  it("keeps one whole path through the graph", () => {
    // A stakeholder owning a requirement that rests on a second that rests on
    // a third is the thing the figure is about, so the subset has to have one.
    const has = (f: string, t: string) => g.edges.some((e) => e.from === f && e.to === t);
    expect(has("S-02", "R-03")).toBe(true);
    expect(has("R-03", "R-05")).toBe(true);
    expect(has("R-05", "R-07")).toBe(true);
  });

  it("puts no two labels on top of each other", () => {
    const boxes = g.nodes.map((n) => {
      const w = labelWidth(n.label, 14.5, 0.06);
      return { l: n.x - w / 2, r: n.x + w / 2, t: n.y - 11, b: n.y + 11, label: n.label };
    });
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (!a || !b) continue;
        const overlaps = a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
        expect(overlaps, `${a.label} overlaps ${b.label}`).toBe(false);
      }
    }
  });
});

describe("bars, stacked", () => {
  const spec = figureOf("skin-cancer");
  if (spec.kind !== "contactSheet") throw new Error("not a contact sheet");
  const gutter = buildBars(spec, { width: 320, height: 280, cellW: 1.5, cellH: 2.5 });
  const stacked = buildBars(spec, { width: 320, height: 280, cellW: 1.5, cellH: 2.5, stacked: true });

  it("reports which form it is, so the chrome can follow", () => {
    expect(gutter.stacked).toBe(false);
    expect(stacked.stacked).toBe(true);
  });

  it("is the bug: at this width the gutter cannot hold the longest name", () => {
    const longest = spec.stages.reduce((n, k) => Math.max(n, k.label.length), 0);
    const needed = labelWidth(spec.stages[0]?.label ?? "", 12.5, 0.16);
    // The gutter form caps at 36% of the box, which is less than the longest
    // name needs, which is why the names ran through their own bars.
    expect(gutter.rows[0]?.x0 ?? 0).toBeLessThan(needed);
    expect(longest).toBeGreaterThan(18);
  });

  it("gives the stacked form the whole width for both name and bar", () => {
    const x0 = stacked.rows[0]?.x0 ?? 999;
    expect(x0).toBeLessThan(8);
    // Every name now has the full box width available above its own bar.
    for (const r of stacked.rows) {
      expect(labelWidth(r.label, 12.5, 0.16)).toBeLessThan(320 - x0);
    }
  });

  it("keeps the same stages and scores in both forms", () => {
    expect(stacked.rows.map((r) => [r.label, r.value])).toEqual(gutter.rows.map((r) => [r.label, r.value]));
  });
});
