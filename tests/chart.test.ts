import { describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { buildParetoChart, modelAt } from "@/lib/ascii/chart";
import { buildDisperse } from "@/lib/ascii/morph";
import type { ParetoSpec } from "@/lib/ascii/figures/pareto";
import type { Grid } from "@/lib/ascii/types";

const spec = (() => {
  const fig = projects.find((p) => p.figure.kind === "pareto")?.figure;
  if (!fig || fig.kind !== "pareto") throw new Error("no pareto scene");
  return fig satisfies ParetoSpec;
})();

const CELL_W = 1.5;
const CELL_H = 2.5;
const chart = buildParetoChart(spec, { width: 760, height: 820, cellW: CELL_W, cellH: CELL_H });

describe("buildParetoChart", () => {
  it("plots one model per model in the scene", () => {
    expect(chart.models).toHaveLength(spec.models);
  });

  it("keeps every mark inside the box it was built for", () => {
    for (const m of chart.marks) {
      expect(m.x).toBeGreaterThanOrEqual(-1);
      expect(m.y).toBeGreaterThanOrEqual(-1);
      expect(m.x).toBeLessThanOrEqual(chart.width + 1);
      expect(m.y).toBeLessThanOrEqual(chart.height + 1);
    }
  });

  it("carries the scene's own numbers for the two models it is about", () => {
    const rec = chart.models[chart.recommended];
    const prod = chart.models[chart.production];
    expect(rec?.quality).toBe(spec.recommended.quality);
    expect(rec?.cost).toBe(spec.recommended.cost);
    expect(rec?.p95).toBe(spec.recommended.p95);
    expect(prod?.quality).toBe(spec.production.quality);
    expect(prod?.cost).toBe(spec.production.cost);
    expect(prod?.p95).toBe(spec.production.p95);
  });

  it("names the two the way the design does, and uses each label once", () => {
    expect(chart.models[chart.recommended]?.label).toBe("model-09");
    expect(chart.models[chart.production]?.label).toBe("model-17");
    expect(new Set(chart.models.map((m) => m.label)).size).toBe(chart.models.length);
  });

  it("puts the recommended model on the frontier and the one in production under it", () => {
    expect(chart.models[chart.recommended]?.kind).toBe("frontier");
    expect(chart.models[chart.production]?.kind).toBe("production");
  });

  it("says the model in production is dominated by the recommended one, and means it", () => {
    const prod = chart.models[chart.production];
    const rec = chart.models[chart.recommended];
    expect(prod?.dominatedBy).toBe(rec?.label);
    // The claim on the card has to be true of the numbers on the card.
    expect(rec?.quality).toBeGreaterThan(prod?.quality ?? 1);
    expect(rec?.cost).toBeLessThan(prod?.cost ?? 0);
    expect(rec?.p95).toBeLessThan(prod?.p95 ?? 0);
  });

  it("only claims domination where it holds", () => {
    for (const m of chart.models) {
      if (!m.dominatedBy) continue;
      const by = chart.models.find((q) => q.label === m.dominatedBy);
      expect(by).toBeDefined();
      expect(by?.quality).toBeGreaterThan(m.quality);
      expect(by?.cost).toBeLessThan(m.cost);
    }
  });

  it("never marks a frontier model as dominated", () => {
    for (const m of chart.models) {
      if (m.kind === "frontier") expect(m.dominatedBy).toBeUndefined();
    }
  });

  it("higher quality is higher up and more expensive is further right", () => {
    const sorted = [...chart.models].sort((a, b) => a.cost - b.cost);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]?.x ?? 0).toBeGreaterThanOrEqual((sorted[i - 1]?.x ?? 0) - 0.001);
    }
    const byQ = [...chart.models].sort((a, b) => a.quality - b.quality);
    for (let i = 1; i < byQ.length; i++) {
      expect(byQ[i]?.y ?? 0).toBeLessThanOrEqual((byQ[i - 1]?.y ?? 0) + 0.001);
    }
  });

  it("puts a tick under the point it describes", () => {
    expect(chart.ticks).toHaveLength(spec.costAxis.length);
    for (let i = 1; i < chart.ticks.length; i++) {
      expect(chart.ticks[i]?.x ?? 0).toBeGreaterThan(chart.ticks[i - 1]?.x ?? 0);
    }
  });

  it("draws the two models the scene is about larger than the rest", () => {
    const count = (i: number) => chart.marks.filter((m) => m.model === i).length;
    const dominated = chart.models.findIndex((m) => m.kind === "dominated");
    expect(count(chart.recommended)).toBeGreaterThan(count(dominated));
    expect(count(chart.production)).toBeGreaterThan(count(chart.recommended));
  });
});

describe("modelAt", () => {
  it("finds the model under the cursor", () => {
    const prod = chart.models[chart.production];
    if (!prod) throw new Error("no production model");
    expect(modelAt(chart, prod.x, prod.y)?.index).toBe(chart.production);
  });

  it("finds nothing in empty space", () => {
    // Bottom-left: cheap and terrible, where the cloud never goes.
    expect(modelAt(chart, chart.plot.left + 2, chart.plot.top + chart.plot.height - 2)).toBeNull();
  });
});

/** A solid photograph-like grid, every cell inked and coloured. */
const face = (cols: number, rows: number): Grid => ({
  cols,
  rows,
  cells: new Array<number>(cols * rows).fill(7),
  color: new Uint8Array(cols * rows * 3).fill(190),
});

describe("buildDisperse", () => {
  const marks = chart.marks.map((m) => ({ x: m.x, y: m.y, idx: m.idx, tone: m.tone, alpha: m.alpha }));
  // The real portrait's size at this cell, because the whole behaviour under
  // test is what happens when the picture has far more characters than the
  // chart has room for.
  const COLS = 440;
  const ROWS = 283;
  const pairs = buildDisperse(face(COLS, ROWS), marks, { cellW: CELL_W, cellH: CELL_H, seed: 3 });

  it("makes one pair per character in the picture, not per mark", () => {
    expect(pairs.count).toBe(COLS * ROWS);
  });

  it("starts with the whole picture visible", () => {
    let unseen = 0;
    for (let i = 0; i < pairs.count; i++) if ((pairs.srcAlpha[i] ?? 0) <= 0) unseen++;
    expect(unseen).toBe(0);
  });

  it("lands no more characters than the chart has marks, and fades the rest", () => {
    let arriving = 0;
    for (let i = 0; i < pairs.count; i++) if ((pairs.dstAlpha[i] ?? 0) > 0) arriving++;
    expect(arriving).toBeGreaterThan(0);
    expect(arriving).toBeLessThanOrEqual(marks.length);
    // Most of the picture has to be leaving rather than being crammed in, or
    // it would read as one figure squeezing into another.
    expect(arriving).toBeLessThan(pairs.count * 0.15);
  });

  it("keeps a departing character in the picture's own box, not the chart's", () => {
    let wrong = 0;
    let local = 0;
    for (let i = 0; i < pairs.count; i++) {
      const leaving = (pairs.dstAlpha[i] ?? 0) === 0;
      if ((pairs.dstLocal[i] === 1) !== leaving) wrong++;
      if (leaving) local++;
    }
    expect(wrong).toBe(0);
    expect(local).toBeGreaterThan(0);
  });

  it("sends every departing character somewhere other than where it stood", () => {
    let stationary = 0;
    for (let i = 0; i < pairs.count; i++) {
      if ((pairs.dstAlpha[i] ?? 0) > 0) continue;
      const dx = (pairs.dst[i * 2] ?? 0) - (pairs.src[i * 2] ?? 0);
      const dy = (pairs.dst[i * 2 + 1] ?? 0) - (pairs.src[i * 2 + 1] ?? 0);
      if (Math.hypot(dx, dy) <= 0) stationary++;
    }
    expect(stationary).toBe(0);
  });

  it("takes the top of the plot from the top of the picture", () => {
    let prev = -Infinity;
    let backwards = 0;
    for (let i = 0; i < pairs.count; i++) {
      if ((pairs.dstAlpha[i] ?? 0) === 0) continue;
      const y = pairs.dst[i * 2 + 1] ?? 0;
      if (y < prev) backwards++;
      prev = y;
    }
    expect(backwards).toBe(0);
  });
});
