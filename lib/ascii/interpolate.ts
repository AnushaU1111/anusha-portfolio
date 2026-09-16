import type { Grid } from "./types";

/**
 * Decides when a given cell takes its turn in a transition, as a number in
 * [0, 1]. 0 means the cell moves first, 1 means it moves last. A phase that
 * ignores position gives a scatter; one that follows the column gives a sweep.
 */
export type Phase = (col: number, row: number, cols: number, rows: number) => number;

/** The default: position-independent scatter, deterministic per cell index. */
export const scatterPhase: Phase = (col, row, cols) => (((row * cols + col) * 7919) % 97) / 97;

/**
 * Interpolates between two grids of the same dimensions. Used by the field
 * to move from one scene's target to the next as scroll progresses, so the
 * characters of one figure appear to become the next rather than cutting.
 *
 * t = 0 returns a, t = 1 returns b. Cells are eased individually with a
 * per-cell phase offset so the transition sweeps rather than snaps.
 */
export const interpolateGrid = (a: Grid, b: Grid, t: number, phaseOf: Phase = scatterPhase): Grid => {
  if (a.cols !== b.cols || a.rows !== b.rows) {
    throw new Error("interpolateGrid: grids must share dimensions");
  }
  const n = a.cols * a.rows;
  const cells = new Array<number>(n);
  const tone = new Array<number>(n);
  // A literal character cannot be averaged, so it flips at the midpoint of
  // the cell's own eased ramp. Because each cell has its own phase, labels
  // arrive in the same sweep as the glyphs around them rather than all at once.
  const anyChars = a.chars !== undefined || b.chars !== undefined;
  const chars = anyChars ? new Array<string | null>(n).fill(null) : undefined;
  const clamped = Math.min(1, Math.max(0, t));
  const cols = a.cols;
  for (let i = 0; i < n; i++) {
    const phase = phaseOf(i % cols, (i / cols) | 0, cols, a.rows);
    // A cell's own move takes 65% of the transition, so the last cell to start
    // still finishes with the rest.
    const local = Math.min(1, Math.max(0, (clamped - phase * 0.35) / 0.65));
    const eased = local * local * (3 - 2 * local);
    const from = a.cells[i] ?? 0;
    const to = b.cells[i] ?? 0;
    cells[i] = Math.round(from + (to - from) * eased);
    const ta = a.tone?.[i] ?? from / 10;
    const tb = b.tone?.[i] ?? to / 10;
    tone[i] = ta + (tb - ta) * eased;
    if (chars) chars[i] = (eased >= 0.5 ? b.chars?.[i] : a.chars?.[i]) ?? null;
  }
  const out: Grid = { cols: a.cols, rows: a.rows, cells, tone };
  if (chars) out.chars = chars;
  return out;
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
