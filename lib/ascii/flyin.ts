import { mulberry32 } from "./noise";
import type { Grid } from "./types";

/**
 * Where every character starts before it has arrived.
 *
 * The cold open holds nothing at rest. As the page scrolls, the characters
 * come in from every edge and settle into the lily. So each filled cell needs
 * a starting offset from its home, far enough out to be off screen, and a
 * phase so they do not all land on the same frame.
 */
export interface FlyIn {
  /** Two floats per cell: the px offset from home at t = 0. */
  offsets: Float32Array;
  /** One per cell in [0, 1): when this cell takes its turn. */
  phase: Float32Array;
}

export interface FlyInOptions {
  cellW: number;
  cellH: number;
  /** How far out to throw a character, as a fraction of the viewport diagonal. */
  reach?: number;
  /** Radians of swirl, so the characters arc in rather than falling straight. */
  swirl?: number;
  seed?: number;
}

/** The middle of the ink, not the middle of the grid, so the flower radiates from itself. */
const centroidOf = (grid: Grid, cellW: number, cellH: number): { x: number; y: number } => {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if ((grid.cells[r * grid.cols + c] ?? 0) <= 0) continue;
      sx += c * cellW;
      sy += r * cellH;
      n++;
    }
  }
  if (n === 0) return { x: (grid.cols * cellW) / 2, y: (grid.rows * cellH) / 2 };
  return { x: sx / n, y: sy / n };
};

export const createFlyIn = (grid: Grid, opts: FlyInOptions): FlyIn => {
  const { cellW, cellH } = opts;
  const reach = opts.reach ?? 0.62;
  const swirl = opts.swirl ?? 0.5;
  const rnd = mulberry32(opts.seed ?? 20260916);
  const n = grid.cols * grid.rows;
  const offsets = new Float32Array(n * 2);
  const phase = new Float32Array(n);

  const centre = centroidOf(grid, cellW, cellH);
  const diag = Math.hypot(grid.cols * cellW, grid.rows * cellH);

  // The furthest any character sits from the centre, so the stagger can be
  // read as a fraction of the flower's own radius rather than of the screen.
  let maxR = 1;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if ((grid.cells[r * grid.cols + c] ?? 0) <= 0) continue;
      const d = Math.hypot(c * cellW - centre.x, r * cellH - centre.y);
      if (d > maxR) maxR = d;
    }
  }

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const i = r * grid.cols + c;
      if ((grid.cells[i] ?? 0) <= 0) continue;
      const hx = c * cellW;
      const hy = r * cellH;
      let dx = hx - centre.x;
      let dy = hy - centre.y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) {
        // A character sitting exactly on the centre still has to come from
        // somewhere, so it gets an arbitrary but deterministic direction.
        const a = rnd() * Math.PI * 2;
        dx = Math.cos(a);
        dy = Math.sin(a);
      } else {
        dx /= len;
        dy /= len;
      }
      // Swirl falls off toward the middle, so the outermost characters arc
      // furthest and the centre arrives almost straight.
      const a = swirl * (len / maxR) * (rnd() * 0.5 + 0.75);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const rx = dx * ca - dy * sa;
      const ry = dx * sa + dy * ca;
      const dist = diag * reach * (0.7 + rnd() * 0.6);
      offsets[i * 2] = rx * dist;
      offsets[i * 2 + 1] = ry * dist;
      // Inside out: the heart of the flower lands first and the petal tips
      // last, which reads as the shape resolving rather than a curtain.
      phase[i] = Math.min(0.999, (len / maxR) * 0.8 + rnd() * 0.2);
    }
  }
  return { offsets, phase };
};
