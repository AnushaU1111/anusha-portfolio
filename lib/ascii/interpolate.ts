import type { Grid } from "./types";

/**
 * Interpolates between two grids of the same dimensions. Used by the field
 * to move from one scene's target to the next as scroll progresses, so the
 * characters of one figure appear to become the next rather than cutting.
 *
 * t = 0 returns a, t = 1 returns b. Cells are eased individually with a
 * per-cell phase offset so the transition sweeps rather than snaps.
 */
export const interpolateGrid = (a: Grid, b: Grid, t: number): Grid => {
  if (a.cols !== b.cols || a.rows !== b.rows) {
    throw new Error("interpolateGrid: grids must share dimensions");
  }
  const n = a.cols * a.rows;
  const cells = new Array<number>(n);
  const tone = new Array<number>(n);
  const clamped = Math.min(1, Math.max(0, t));
  for (let i = 0; i < n; i++) {
    const phase = ((i * 7919) % 97) / 97; // deterministic per-cell offset
    const local = Math.min(1, Math.max(0, (clamped - phase * 0.35) / 0.65));
    const eased = local * local * (3 - 2 * local);
    const from = a.cells[i] ?? 0;
    const to = b.cells[i] ?? 0;
    cells[i] = Math.round(from + (to - from) * eased);
    const ta = a.tone?.[i] ?? from / 10;
    const tb = b.tone?.[i] ?? to / 10;
    tone[i] = ta + (tb - ta) * eased;
  }
  return { cols: a.cols, rows: a.rows, cells, tone };
};

/** Pads or crops a grid to the given dimensions, anchored top-left. */
export const fitGrid = (g: Grid, cols: number, rows: number): Grid => {
  const cells = new Array<number>(cols * rows).fill(0);
  for (let r = 0; r < Math.min(rows, g.rows); r++) {
    for (let c = 0; c < Math.min(cols, g.cols); c++) {
      cells[r * cols + c] = g.cells[r * g.cols + c] ?? 0;
    }
  }
  return { cols, rows, cells };
};
