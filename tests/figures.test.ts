import { describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { buildFigure, type FigureContext } from "@/lib/ascii/figures";
import { contactSheetFigure, imagesPerGlyph } from "@/lib/ascii/figures/contactSheet";
import { corpusFigure, postsPerGlyph } from "@/lib/ascii/figures/corpus";
import { EDGES, NODES } from "@/lib/ascii/figures/graph";
import { frontierOf, paretoFigure } from "@/lib/ascii/figures/pareto";
import { RAMP_MAX } from "@/lib/ascii/ramp";
import type { Grid } from "@/lib/ascii/types";

const DESKTOP: FigureContext = { cols: 300, rows: 113 };
const PHONE: FigureContext = { cols: 78, rows: 140 };

const scene = (slug: string) => {
  const p = projects.find((x) => x.slug === slug);
  if (!p) throw new Error(`no scene ${slug}`);
  return p;
};

describe("every figure", () => {
  for (const p of projects) {
    describe(p.slug, () => {
      const grid = buildFigure(p.figure, DESKTOP);

      it("declares a grid the length of its dimensions", () => {
        expect(grid.cells).toHaveLength(grid.cols * grid.rows);
        expect(grid.cols).toBeGreaterThan(0);
        expect(grid.rows).toBeGreaterThan(0);
      });

      it("stays inside the viewport it was given", () => {
        expect(grid.cols).toBeLessThanOrEqual(DESKTOP.cols);
        expect(grid.rows).toBeLessThanOrEqual(DESKTOP.rows);
      });

      it("only uses indices the ramp has", () => {
        for (const v of grid.cells) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(RAMP_MAX);
        }
      });

      // drawGrid skips a cell whose index is zero, so a literal character on
      // such a cell would silently never appear.
      it("gives every literal character a visible index", () => {
        grid.chars?.forEach((ch, i) => {
          if (ch !== null) expect(grid.cells[i]).toBeGreaterThan(0);
        });
      });

      it("is deterministic", () => {
        expect(buildFigure(p.figure, DESKTOP).cells).toEqual(grid.cells);
      });

      it("regenerates rather than crops at a phone width", () => {
        const small = buildFigure(p.figure, PHONE);
        expect(small.cols).toBeLessThanOrEqual(PHONE.cols);
        expect(small.rows).toBeLessThanOrEqual(PHONE.rows);
        expect(small.cells).toHaveLength(small.cols * small.rows);
      });
    });
  }
});

describe("pareto", () => {
  const p = scene("neuraluna");
  const spec = p.figure.kind === "pareto" ? p.figure : null;

  it("calls a point dominated only when something beats it on both axes", () => {
    const flags = frontierOf([
      { quality: 0.9, cost: 1, p95: 1 },
      { quality: 0.8, cost: 2, p95: 1 },
      { quality: 0.95, cost: 4, p95: 1 },
    ]);
    expect(flags).toEqual([true, false, true]);
  });

  it("puts the recommended model on the frontier and the production one under it", () => {
    if (!spec) throw new Error("neuraluna is not a pareto scene");
    expect(spec.recommended.quality).toBeGreaterThan(spec.production.quality);
    expect(spec.recommended.cost).toBeLessThan(spec.production.cost);
    expect(frontierOf([spec.recommended, spec.production])).toEqual([true, false]);
  });

  it("marks the model in production with its own glyph", () => {
    if (!spec) throw new Error("neuraluna is not a pareto scene");
    const grid = paretoFigure(spec, DESKTOP);
    expect(grid.chars?.filter((c) => c === "X")).toHaveLength(1);
    expect(grid.chars?.some((c) => c === "(")).toBe(true);
  });
});

describe("graph", () => {
  const p = scene("reqtrace");
  const spec = p.figure.kind === "graph" ? p.figure : null;

  it("draws the instance the scene declares", () => {
    if (!spec) throw new Error("reqtrace is not a graph scene");
    expect(NODES).toHaveLength(spec.nodes);
    expect(EDGES).toHaveLength(spec.edges);
  });

  it("uses every node type and every edge type the scene claims", () => {
    if (!spec) throw new Error("reqtrace is not a graph scene");
    expect(new Set(NODES.map((n) => n.id[0])).size).toBe(spec.nodeTypes.length);
    expect(new Set(EDGES.map(([, , kind]) => kind)).size).toBe(spec.edgeTypes.length);
  });

  it("joins only nodes it has", () => {
    const ids = new Set(NODES.map((n) => n.id));
    for (const [from, to] of EDGES) {
      expect(ids.has(from)).toBe(true);
      expect(ids.has(to)).toBe(true);
    }
  });
});

describe("contact sheet", () => {
  const p = scene("skin-cancer");
  const spec = p.figure.kind === "contactSheet" ? p.figure : null;

  it("holds one glyph per image at a desktop width", () => {
    if (!spec) throw new Error("skin-cancer is not a contact sheet scene");
    expect(imagesPerGlyph(spec.total, DESKTOP)).toBe(1);
    const grid = contactSheetFigure(spec, DESKTOP);
    const drawn = grid.cells.reduce((n, v) => (v > 0 ? n + 1 : n), 0);
    expect(drawn).toBe(spec.total);
  });

  it("draws the malignant cases in their own glyphs and in the right number", () => {
    if (!spec) throw new Error("skin-cancer is not a contact sheet scene");
    const grid = contactSheetFigure(spec, DESKTOP);
    const malignant = grid.cells.reduce((n, v) => (v >= 7 ? n + 1 : n), 0);
    expect(malignant).toBe(spec.positive);
  });

  it("says so when a glyph has to stand for more than one image", () => {
    if (!spec) throw new Error("skin-cancer is not a contact sheet scene");
    const per = imagesPerGlyph(spec.total, PHONE);
    expect(per).toBeGreaterThan(1);
    const grid = contactSheetFigure(spec, PHONE);
    expect(grid.rows * grid.cols * per).toBeGreaterThanOrEqual(spec.total);
  });
});

describe("corpus", () => {
  const p = scene("affordability");
  const spec = p.figure.kind === "corpus" ? p.figure : null;

  it("derives what a glyph stands for from the wall it drew", () => {
    if (!spec) throw new Error("affordability is not a corpus scene");
    const grid: Grid = corpusFigure(spec, DESKTOP);
    const per = postsPerGlyph(grid, spec.posts);
    const drawn = grid.cells.reduce((n, v) => (v > 0 ? n + 1 : n), 0);
    expect(per).toBeGreaterThan(0);
    expect(per * drawn).toBeGreaterThan(spec.posts * 0.9);
    expect(per * drawn).toBeLessThan(spec.posts * 1.1);
  });
});

describe("spectrogram", () => {
  const p = scene("acoustic");

  it("declares class supports that add up to the frame count", () => {
    if (p.figure.kind !== "spectrogram") throw new Error("acoustic is not a spectrogram scene");
    const sum = p.figure.classes.reduce((n, k) => n + k.support, 0);
    expect(sum).toBe(p.figure.frames);
  });
});
