import { mulberry32 } from "../noise";
import type { Grid } from "../types";
import { createCanvas } from "./canvas";
import { span, type FigureContext } from "./context";

export interface CorpusSpec {
  posts: number;
  /** Rows left once cleaning, deduplication and language filtering are done. */
  afterFiltering: number;
  sentimentModel: string;
  sentiment: { label: string; share: number }[];
  emotionModel: string;
  emotion: { label: string; share: number }[];
  /** Topics recovered, and how many the cluster map draws. */
  topics: number;
  topicsShown: number;
  topicModel: string;
}

/**
 * Scene 05, on entry. The corpus as it arrives: a wall of characters with no
 * structure in it yet, which the scrolled state resolves into distributions
 * and clusters.
 *
 * The wall is only ever this: density and an envelope that keeps it from
 * being a uniform block. It carries no categories, so it uses no literal
 * characters and no brightness beyond its own density.
 */
export const corpusFigure = (spec: CorpusSpec, ctx: FigureContext): Grid => {
  const cols = span(ctx.cols, 0.68, 40, 260);
  const rows = span(ctx.rows, 0.66, 18, 100);
  const canvas = createCanvas(cols, rows);
  const rnd = mulberry32(1_100_003);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Brighter toward the middle of the wall, with a slow diagonal beat so
      // the noise reads as a mass rather than as static.
      const across = Math.sin(Math.PI * Math.min(1, c / cols)) ** 0.35;
      const beat = 0.62 + 0.38 * Math.sin(r * 0.37 + c * 0.09);
      const v = Math.max(0, Math.min(1, rnd() * 0.62 + across * beat * 0.88 - 0.22));
      if (v <= 0.04) continue;
      canvas.put(c, r, Math.min(10, Math.floor(v * 10)), { tone: v });
    }
  }
  return canvas.toGrid();
};

/**
 * How many posts one glyph stands for, derived from the wall that was
 * actually drawn rather than declared. The caption reads this, so it cannot
 * claim a figure the grid does not support.
 */
export const postsPerGlyph = (grid: Grid, posts: number): number => {
  const filled = grid.cells.reduce((n, v) => (v > 0 ? n + 1 : n), 0);
  return filled === 0 ? 0 : Math.round(posts / filled);
};
