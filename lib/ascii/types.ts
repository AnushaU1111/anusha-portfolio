/**
 * A Grid is the unit every figure on the site is made of. It is deliberately
 * flat and JSON-serialisable so that build-time conversion, runtime
 * interpolation and the canvas renderer all speak the same shape.
 */

/** Index into the ramp, 0 = empty. */
export type GlyphIndex = number;

export interface Grid {
  cols: number;
  rows: number;
  /** Row-major, length cols * rows. */
  cells: GlyphIndex[];
  /**
   * Optional per-cell emphasis in [0, 1]. Brightness only ever encodes
   * density or emphasis; category is always carried by the glyph itself.
   */
  tone?: number[];
}

/** A scene declares the grid it wants and the field interpolates toward it. */
export interface SceneTarget {
  id: string;
  grid: Grid;
  /** Where the grid sits inside the viewport, in CSS px. */
  origin: { x: number; y: number };
  cellW: number;
  cellH: number;
}

export interface FieldTheme {
  bg: string;
  /** rgb triplet for the darkest glyph. */
  low: [number, number, number];
  /** rgb triplet for the brightest glyph. */
  high: [number, number, number];
  minAlpha: number;
  maxAlpha: number;
}

export const gridIndex = (g: Grid, col: number, row: number): number => row * g.cols + col;

export const emptyGrid = (cols: number, rows: number): Grid => ({
  cols,
  rows,
  cells: new Array<GlyphIndex>(cols * rows).fill(0),
});
