/**
 * Figures size themselves from the viewport rather than to a fixed number of
 * columns, so a figure regenerates at a new column count on resize instead of
 * being scaled up. Mobile depends on this.
 */
export interface FigureContext {
  /** Viewport width in cells. */
  cols: number;
  /** Viewport height in cells. */
  rows: number;
}

/** A fraction of the viewport, clamped, rounded to whole cells. */
export const span = (total: number, fraction: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(total * fraction)));
