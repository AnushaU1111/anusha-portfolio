import { describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { spectrogramField } from "@/lib/ascii/figures/spectrogram";
import { buildWave, f1FromRows, reportOf, timelineOf } from "@/lib/ascii/wave";

const figure = (() => {
  const s = projects.find((p) => p.slug === "acoustic");
  if (!s || s.figure.kind !== "spectrogram") throw new Error("no spectrogram scene");
  return s.figure;
})();

const CELL_W = 1.5;
const CELL_H = 2.5;
const W = 1040;
const H = 300;
const wave = buildWave(figure, { width: W, height: H, cellW: CELL_W, cellH: CELL_H });

describe("buildWave", () => {
  it("fills the box it was given and nothing outside it", () => {
    expect(wave.marks.length).toBeGreaterThan(2000);
    for (const m of wave.marks) {
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.y).toBeGreaterThanOrEqual(0);
      expect(m.x).toBeLessThan(W);
      expect(m.y).toBeLessThan(H);
    }
  });

  it("says how many bins it drew, so the caption cannot overstate the window", () => {
    const xs = new Set(wave.marks.map((m) => Math.round(m.x)));
    const ys = new Set(wave.marks.map((m) => Math.round(m.y)));
    expect(xs.size).toBeLessThanOrEqual(wave.cols);
    expect(ys.size).toBeLessThanOrEqual(wave.rows);
  });

  it("draws the same window the coarse figure does", () => {
    // One field, two renderings. If these drifted apart the site would be
    // showing two different spectrograms and calling both of them the data.
    const field = spectrogramField(figure, wave.cols, wave.rows, 0.96);
    for (const m of wave.marks.slice(0, 400)) {
      const c = Math.round(m.x / (CELL_W * 3));
      const r = Math.round(m.y / (CELL_H * 2));
      expect(field[r]?.[c] ?? 0).toBeGreaterThan(0.04);
    }
  });

  it("puts brightness on energy, which is the one figure that carries it", () => {
    const sorted = [...wave.marks].sort((a, b) => a.alpha - b.alpha);
    const quietest = sorted[0];
    const loudest = sorted.at(-1);
    expect(quietest && loudest).toBeTruthy();
    expect((loudest?.alpha ?? 0) - (quietest?.alpha ?? 0)).toBeGreaterThan(0.3);
    // Index and alpha move together, so a bright bin is a heavy glyph too.
    expect(loudest?.idx ?? 0).toBeGreaterThan(quietest?.idx ?? 10);
  });

  it("leaves glyphs apart rather than packing them into a haze", () => {
    const xs = [...new Set(wave.marks.map((m) => Math.round(m.x)))].sort((a, b) => a - b);
    expect((xs[1] ?? 0) - (xs[0] ?? 0)).toBeGreaterThanOrEqual(CELL_W * 2);
  });

  it("is the same window every time", () => {
    const again = buildWave(figure, { width: W, height: H, cellW: CELL_W, cellH: CELL_H });
    expect(again.marks.length).toBe(wave.marks.length);
    expect(again.cols).toBe(wave.cols);
  });
});

describe("reportOf", () => {
  const report = reportOf(figure);

  it("counts the frames the per-class supports account for", () => {
    expect(report.frames).toBe(figure.classes.reduce((n, k) => n + k.support, 0));
    // And that is the figure the scene puts at the top of the page.
    expect(report.frames).toBe(figure.frames);
  });

  it("derives the class balance from exact counts, not from a claim", () => {
    const total = report.balance.reduce((s, b) => s + b.share, 0);
    expect(total).toBeCloseTo(1, 6);
    for (let i = 0; i < figure.classes.length; i++) {
      const k = figure.classes[i];
      expect(report.balance[i]?.share).toBeCloseTo((k?.support ?? 0) / report.frames, 9);
    }
  });

  it("finds the smallest class, which is the one the pull quote is about", () => {
    expect(report.minority.name).toBe("non-verbal");
    expect(report.minority.share).toBeLessThan(0.04);
    // The pull quote says "under four percent", so the figure has to be.
    const scene = projects.find((p) => p.slug === "acoustic");
    expect(scene?.pull).toContain("under four percent");
  });
});

describe("the aggregate figures the page prints", () => {
  it("reports what the report said rather than a mean of rounded rows", () => {
    const rows = f1FromRows(figure);
    // The reported macro F1 is 0.78; the mean of the rounded per-class scores
    // is 0.785, which would print as 0.79. Declaring it is the honest move —
    // but it still has to agree with the rows to within that rounding.
    expect(Math.abs(figure.macroF1 - rows.macro)).toBeLessThan(0.011);
    expect(Math.abs(figure.weightedF1 - rows.weighted)).toBeLessThan(0.011);
  });

  it("keeps macro below weighted, which is what the minority class costs", () => {
    expect(figure.macroF1).toBeLessThan(figure.weightedF1);
  });

  it("prints the same figures the copy beside it claims", () => {
    const scene = projects.find((p) => p.slug === "acoustic");
    const macro = scene?.metrics.find((m) => m.label === "macro f1")?.value;
    const acc = scene?.metrics.find((m) => m.label === "accuracy")?.value;
    expect(macro).toBe(figure.macroF1.toFixed(2));
    expect(acc).toBe(figure.accuracy.toFixed(2));
  });

  it("holds out the subjects the headline says it held out", () => {
    expect(figure.trainSubjects).toBe(10);
    expect(figure.heldOutSubjects).toBe(3);
  });

  it("gives every class its own character, and no two the same", () => {
    const glyphs = figure.classes.map((k) => k.glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });
});

describe("timelineOf", () => {
  const line = timelineOf(figure, 96);

  it("draws as many frames as it was asked for, truth and prediction alike", () => {
    expect(line.truth).toHaveLength(96);
    expect(line.predicted).toHaveLength(96);
  });

  it("uses only the classes' own characters", () => {
    const glyphs = new Set(figure.classes.map((k) => k.glyph));
    for (const g of [...line.truth, ...line.predicted]) expect(glyphs.has(g)).toBe(true);
  });

  it("disagrees where the report says the model is weak", () => {
    // Every frame whose truth is the worst-recalled class and which the model
    // got right is a frame this window is being kind about.
    const worst = [...figure.classes].sort((a, b) => a.recall - b.recall)[0];
    if (!worst) throw new Error("no classes");
    let seen = 0;
    let hit = 0;
    for (let i = 0; i < line.truth.length; i++) {
      if (line.truth[i] !== worst.glyph) continue;
      seen++;
      if (line.predicted[i] === worst.glyph) hit++;
    }
    if (seen > 0) expect(hit / seen).toBeLessThan(0.7);
  });

  it("agrees on most frames, because the model is mostly right", () => {
    expect(line.agreement).toBeGreaterThan(0.5);
    expect(line.agreement).toBeLessThan(1);
  });

  it("runs events in stretches rather than one frame at a time", () => {
    let switches = 0;
    for (let i = 1; i < line.truth.length; i++) if (line.truth[i] !== line.truth[i - 1]) switches++;
    expect(switches).toBeLessThan(line.truth.length / 3);
  });

  it("is the same window every time", () => {
    expect(timelineOf(figure, 96).truth.join("")).toBe(line.truth.join(""));
  });
});
