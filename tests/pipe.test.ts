import { describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { buildPipe } from "@/lib/ascii/pipe";
import { buildRelay } from "@/lib/ascii/morph";
import type { PipelineSpec } from "@/lib/ascii/figures/pipeline";

const spec: PipelineSpec = (() => {
  const fig = projects.find((p) => p.slug === "temple-rag")?.figure;
  if (!fig || fig.kind !== "pipeline") throw new Error("no pipeline scene");
  return fig;
})();

const CELL_W = 1.5;
const CELL_H = 2.5;
const W = 1100;
const H = 860;
const pipe = buildPipe(spec, { width: W, height: H, cellW: CELL_W, cellH: CELL_H });

describe("buildPipe", () => {
  it("names every node the spec names, once each, and nothing else", () => {
    const names = pipe.nodes.map((n) => n.label);
    const wanted = [
      ...spec.inputs,
      ...spec.normalise,
      ...spec.indexes,
      spec.scorer,
      spec.model,
      spec.gate,
      ...spec.outputs,
    ].map((l) => `[${l}]`);
    expect(names).toHaveLength(wanted.length);
    expect(new Set(names)).toEqual(new Set(wanted));
  });

  it("spends no characters on the names, only on the runs between them", () => {
    // Every mark has to be a stroke. A label drawn out of 1.5 px cells would
    // not be legible, which is the whole reason the labels are text.
    expect(pipe.marks.length).toBeGreaterThan(500);
    for (const n of pipe.nodes) {
      const onLabel = pipe.marks.filter((m) => Math.abs(m.x - n.x) < 4 && Math.abs(m.y - n.y) < 4);
      expect(onLabel).toHaveLength(0);
    }
  });

  it("keeps every mark inside the box it was built for", () => {
    for (const m of pipe.marks) {
      expect(m.x).toBeGreaterThanOrEqual(-2);
      expect(m.y).toBeGreaterThanOrEqual(-2);
      expect(m.x).toBeLessThanOrEqual(W + 2);
      expect(m.y).toBeLessThanOrEqual(H + 2);
    }
  });

  it("reads left to right: in, normalise, retrieve, score, generate, out", () => {
    const xOf = (label: string) => pipe.nodes.find((n) => n.label === `[${label}]`)?.x ?? -1;
    const inputs = spec.inputs.map((l) => xOf(l));
    const gate = xOf(spec.gate);
    const outs = spec.outputs.map((l) => xOf(l));
    for (const x of inputs) {
      expect(x).toBeLessThan(xOf(spec.normalise[0] ?? ""));
    }
    expect(xOf(spec.normalise[0] ?? "")).toBeLessThan(xOf(spec.scorer));
    expect(xOf(spec.scorer)).toBeLessThan(xOf(spec.model));
    expect(xOf(spec.model)).toBeLessThan(gate);
    for (const x of outs) expect(x).toBeGreaterThan(gate);
  });

  it("puts one spine down the middle and fans the rest around it", () => {
    const spine = pipe.nodes.find((n) => n.label === `[${spec.scorer}]`)?.y ?? 0;
    expect(pipe.nodes.find((n) => n.label === `[${spec.model}]`)?.y).toBeCloseTo(spine, 5);
    expect(pipe.nodes.find((n) => n.label === `[${spec.gate}]`)?.y).toBeCloseTo(spine, 5);
    // The ways in spread above and below it.
    const ins = spec.inputs.map((l) => pipe.nodes.find((n) => n.label === `[${l}]`)?.y ?? 0);
    expect(Math.min(...ins)).toBeLessThan(spine);
    expect(Math.max(...ins)).toBeGreaterThan(spine);
  });

  it("leaves the top of the box clear, where the headline goes", () => {
    const highest = Math.min(...pipe.nodes.map((n) => n.y), ...pipe.marks.map((m) => m.y));
    expect(highest).toBeGreaterThan(H * 0.3);
  });

  it("scales with its box rather than assuming a size", () => {
    const small = buildPipe(spec, { width: 600, height: 500, cellW: CELL_W, cellH: CELL_H });
    expect(small.marks.length).toBeGreaterThan(100);
    for (const m of small.marks) {
      expect(m.x).toBeLessThanOrEqual(602);
      expect(m.y).toBeLessThanOrEqual(502);
    }
  });
});

describe("buildRelay", () => {
  const from = Array.from({ length: 4000 }, (_, i) => ({
    x: (i % 80) * 6,
    y: Math.floor(i / 80) * 9,
    idx: 8,
    tone: 0.8,
    alpha: 0.9,
  }));
  const to = pipe.marks.map((m) => ({ x: m.x, y: m.y, idx: m.idx, tone: m.tone, alpha: m.alpha }));
  const pairs = buildRelay(from, to, { cellW: CELL_W, cellH: CELL_H, seed: 7 });

  it("makes as many pairs as the larger of the two figures", () => {
    expect(pairs.count).toBe(Math.max(from.length, to.length));
  });

  it("draws the figure it came from at the start, once over", () => {
    let visible = 0;
    for (let i = 0; i < pairs.count; i++) if ((pairs.srcAlpha[i] ?? 0) > 0) visible++;
    expect(visible).toBe(Math.min(from.length, pairs.count));
  });

  it("draws the figure it is going to at the end, once over", () => {
    let arriving = 0;
    for (let i = 0; i < pairs.count; i++) if ((pairs.dstAlpha[i] ?? 0) > 0) arriving++;
    expect(arriving).toBe(Math.min(to.length, pairs.count));
  });

  it("lands every arriving character on a real mark of the destination", () => {
    // Positions are stored as float32, so they are compared to the nearest
    // pixel rather than exactly.
    const marks = new Set(to.map((m) => `${Math.round(m.x)},${Math.round(m.y)}`));
    let off = 0;
    for (let i = 0; i < pairs.count; i++) {
      if ((pairs.dstAlpha[i] ?? 0) === 0) continue;
      const x = Math.round(pairs.dst[i * 2] ?? 0);
      const y = Math.round(pairs.dst[i * 2 + 1] ?? 0);
      let found = false;
      for (let dy = -1; dy <= 1 && !found; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (marks.has(`${x + dx},${y + dy}`)) {
            found = true;
            break;
          }
        }
      }
      if (!found) off++;
    }
    expect(off).toBe(0);
  });

  it("measures a departing character's drift in its own figure's box", () => {
    let wrong = 0;
    for (let i = 0; i < pairs.count; i++) {
      const leaving = (pairs.dstAlpha[i] ?? 0) === 0;
      if ((pairs.dstLocal[i] === 1) !== leaving) wrong++;
    }
    expect(wrong).toBe(0);
  });

  it("works when the destination needs more characters than the source has", () => {
    const grown = buildRelay(to.slice(0, 200), to, { cellW: CELL_W, cellH: CELL_H, seed: 8 });
    expect(grown.count).toBe(to.length);
    let visible = 0;
    for (let i = 0; i < grown.count; i++) if ((grown.srcAlpha[i] ?? 0) > 0) visible++;
    // Only as many as the source can carry start out visible; the rest fade up
    // where they land rather than being drawn on top of each other.
    expect(visible).toBe(200);
  });
});
