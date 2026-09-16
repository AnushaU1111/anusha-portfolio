import { describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { buildBars, confusionOf } from "@/lib/ascii/bars";
import { buildWave } from "@/lib/ascii/wave";

const figure = (() => {
  const s = projects.find((p) => p.slug === "skin-cancer");
  if (!s || s.figure.kind !== "contactSheet") throw new Error("no contact-sheet scene");
  return s.figure;
})();

const CELL_W = 1.5;
const CELL_H = 2.5;
const W = 980;
const H = 240;
const chart = buildBars(figure, { width: W, height: H, cellW: CELL_W, cellH: CELL_H });

describe("buildBars", () => {
  it("draws one run per stage the scene declares", () => {
    expect(chart.rows).toHaveLength(figure.stages.length);
    expect(chart.rows.map((r) => r.label)).toEqual(figure.stages.map((s) => s.label));
    expect(chart.rows.map((r) => r.value)).toEqual(figure.stages.map((s) => s.rocAuc));
  });

  it("draws over the declared scale, not from zero", () => {
    expect(chart.lo).toBe(figure.scaleLo);
    expect(chart.hi).toBe(figure.scaleHi);
    // Six scores between 0.75 and 0.97 drawn from zero would be six bars the
    // eye cannot tell apart; over this scale the baseline is visibly shorter.
    const worst = chart.rows.reduce((a, b) => (a.value < b.value ? a : b));
    const best = chart.rows.reduce((a, b) => (a.value > b.value ? a : b));
    const worstLen = worst.x1 - worst.x0;
    const bestLen = best.x1 - best.x0;
    expect(worstLen).toBeLessThan(bestLen * 0.4);
  });

  it("orders run lengths by score", () => {
    const sorted = [...chart.rows].sort((a, b) => a.value - b.value);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]?.x1 ?? 0).toBeGreaterThanOrEqual((sorted[i - 1]?.x1 ?? 0) - 0.001);
    }
  });

  it("names exactly one best stage, and it is the highest score", () => {
    const best = chart.rows.filter((r) => r.best);
    expect(best).toHaveLength(1);
    expect(best[0]?.value).toBe(Math.max(...chart.rows.map((r) => r.value)));
  });

  it("keeps every mark inside the box, and off the label and score columns", () => {
    for (const m of chart.marks) {
      expect(m.x).toBeGreaterThanOrEqual((chart.rows[0]?.x0 ?? 0) - 1);
      expect(m.x).toBeLessThanOrEqual(chart.valueX + 1);
      expect(m.y).toBeGreaterThanOrEqual(-1);
      expect(m.y).toBeLessThanOrEqual(H + 1);
    }
  });

  it("gives every mark the stage it belongs to", () => {
    const seen = new Set<number>();
    for (const m of chart.marks) {
      expect(m.group).toBeGreaterThanOrEqual(0);
      expect(m.group).toBeLessThan(chart.rows.length);
      seen.add(m.group);
    }
    expect(seen.size).toBe(chart.rows.length);
  });

  it("needs fewer characters than the window it comes from", () => {
    // Six runs against a spectrogram. If the bars needed more marks than the
    // window has, the window would fade out and the bars fade in rather than
    // the one becoming the other — so this is the behaviour, not a detail.
    const acoustic = projects.find((p) => p.slug === "acoustic");
    if (!acoustic || acoustic.figure.kind !== "spectrogram") throw new Error("no window");
    const window = buildWave(acoustic.figure, { width: W, height: 300, cellW: CELL_W, cellH: CELL_H });
    expect(chart.marks.length).toBeLessThan(window.marks.length);
  });

  it("scales with its box", () => {
    const small = buildBars(figure, { width: 620, height: 180, cellW: CELL_W, cellH: CELL_H });
    expect(small.rows).toHaveLength(figure.stages.length);
    for (const m of small.marks) expect(m.x).toBeLessThanOrEqual(small.valueX + 1);
  });
});

describe("confusionOf", () => {
  const m = confusionOf(figure);

  it("counts the test set the scene says it tested on", () => {
    expect(m.total).toBe(figure.testImages);
  });

  it("derives recall, precision, F1 and accuracy from the four counts", () => {
    expect(m.recall).toBeCloseTo(275 / 293, 6);
    expect(m.precision).toBeCloseTo(275 / (275 + 185), 6);
    expect(m.accuracy).toBeCloseTo((1025 + 275) / 1503, 6);
    expect(m.f1).toBeCloseTo((2 * m.precision * m.recall) / (m.precision + m.recall), 9);
  });

  it("agrees with the figures the copy beside it claims", () => {
    const scene = projects.find((p) => p.slug === "skin-cancer");
    expect(scene?.metrics.find((k) => k.label === "recall")?.value).toBe(`${(m.recall * 100).toFixed(1)}%`);
    expect(scene?.metrics.find((k) => k.label === "missed of 293")?.value).toBe(String(m.falseNegative));
    expect(scene?.metrics.find((k) => k.label === "roc-auc")?.value).toBe(figure.rocAuc.toFixed(3));
    // And with the pull quote, which names both counts.
    expect(scene?.pull).toContain(`${m.truePositive} of ${m.actualMalignant}`);
  });

  it("holds the threshold trade the scene argues for", () => {
    // Recall is bought and precision is given up: if that were not true the
    // page's whole argument for the lower threshold would be decoration.
    expect(m.recall).toBeGreaterThan(figure.baseline.recall);
    expect(m.precision).toBeLessThan(figure.baseline.precision);
    expect(figure.threshold).toBeLessThan(figure.bestF1Threshold);
    expect(figure.f1AtThreshold).toBeLessThan(figure.f1AtBestF1);
  });

  it("has the ensemble beat the baseline on what screening cares about", () => {
    expect(figure.rocAuc).toBeGreaterThan(figure.baseline.rocAuc);
    expect(m.accuracy).toBeGreaterThan(figure.baseline.accuracy);
  });

  it("finds fewer malignant images in the test set than in the whole dataset", () => {
    expect(m.actualMalignant).toBeLessThan(figure.positive);
    expect(m.total).toBeLessThan(figure.total);
  });
});
