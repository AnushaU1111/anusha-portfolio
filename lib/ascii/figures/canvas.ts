import { CELL_ASPECT } from "../ramp";
import type { Grid } from "../types";

/**
 * A small mutable buffer the generated figures draw into before handing back
 * a Grid. Nothing here knows what a chart is; it knows cells, literal
 * characters and straight runs between two points.
 *
 * Every write carries an index as well as an optional character, because the
 * index is where a cell's brightness comes from. A literal character says
 * what a cell is; it never says how bright it is.
 */
export interface FigureCanvas {
  readonly cols: number;
  readonly rows: number;
  /** Writes one cell. Skips occupied cells unless `over` is set. */
  put(col: number, row: number, index: number, opt?: CellOptions): void;
  /** Writes a string starting at col, row. Always overwrites. */
  text(col: number, row: number, value: string, index: number, tone?: number): void;
  /**
   * Draws a run between two cells using the character that best matches the
   * direction, corrected for the fact that a cell is taller than it is wide.
   * `every` thins the run: 2 draws every second cell, 3 every third.
   */
  run(from: Point, to: Point, index: number, opt?: RunOptions): void;
  /** True if the cell has been written to. */
  taken(col: number, row: number): boolean;
  toGrid(): Grid;
}

export interface CellOptions {
  /** Literal character for this cell, outside the ramp. */
  char?: string;
  /** Brightness in [0, 1]. Defaults to the index's own position on the ramp. */
  tone?: number;
  over?: boolean;
}

export interface RunOptions {
  /** Fixed character for the whole run, instead of one chosen by direction. */
  char?: string;
  tone?: number;
  /** Draw only every nth cell, for a dotted or dashed edge. */
  every?: number;
  /** Cells at each end left blank, so a run does not touch its labels. */
  gap?: number;
}

export interface Point {
  col: number;
  row: number;
}

/** The character that best represents a direction, given non-square cells. */
export const directionChar = (from: Point, to: Point): string => {
  const dc = (to.col - from.col) * CELL_ASPECT;
  const dr = to.row - from.row;
  if (Math.abs(dc) < 1e-9) return "|";
  const slope = dr / dc;
  if (Math.abs(slope) < 0.42) return "-";
  if (Math.abs(slope) > 2.4) return "|";
  return dr > 0 === dc > 0 ? "\\" : "/";
};

export const createCanvas = (cols: number, rows: number): FigureCanvas => {
  const n = cols * rows;
  const cells = new Array<number>(n).fill(0);
  const tone = new Array<number>(n).fill(0);
  const chars = new Array<string | null>(n).fill(null);

  const inside = (col: number, row: number) => col >= 0 && col < cols && row >= 0 && row < rows;
  const at = (col: number, row: number) => row * cols + col;

  const put: FigureCanvas["put"] = (col, row, index, opt) => {
    if (!inside(col, row)) return;
    const i = at(col, row);
    if (!opt?.over && (cells[i] ?? 0) !== 0) return;
    cells[i] = index;
    tone[i] = opt?.tone ?? index / 10;
    chars[i] = opt?.char ?? null;
  };

  const text: FigureCanvas["text"] = (col, row, value, index, t) => {
    for (let j = 0; j < value.length; j++) {
      const ch = value[j];
      if (ch === undefined || ch === " ") continue;
      put(col + j, row, index, { char: ch, over: true, ...(t === undefined ? {} : { tone: t }) });
    }
  };

  const run: FigureCanvas["run"] = (from, to, index, opt) => {
    const char = opt?.char ?? directionChar(from, to);
    const every = opt?.every ?? 1;
    const gap = opt?.gap ?? 0;
    // Oversampled so a steep run leaves no holes; duplicate cells are
    // harmless because put refuses to overwrite.
    const steps = Math.max(Math.abs(to.col - from.col), Math.abs(to.row - from.row)) * 4;
    if (steps === 0) return;
    for (let s = 1; s < steps; s++) {
      if (s % every !== 0) continue;
      const t = s / steps;
      const col = Math.round(from.col + (to.col - from.col) * t);
      const row = Math.round(from.row + (to.row - from.row) * t);
      if (gap > 0) {
        const dStart = Math.max(Math.abs(col - from.col) * CELL_ASPECT, Math.abs(row - from.row));
        const dEnd = Math.max(Math.abs(col - to.col) * CELL_ASPECT, Math.abs(row - to.row));
        if (dStart < gap || dEnd < gap) continue;
      }
      put(col, row, index, { char, ...(opt?.tone === undefined ? {} : { tone: opt.tone }) });
    }
  };

  return {
    cols,
    rows,
    put,
    text,
    run,
    taken: (col, row) => inside(col, row) && (cells[at(col, row)] ?? 0) !== 0,
    toGrid: () => ({ cols, rows, cells, tone, chars }),
  };
};
