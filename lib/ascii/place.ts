import type { Grid } from "./types";

/** Viewport dimensions in cells for a given cell size. */
export const viewportDims = (width: number, height: number, cellW: number, cellH: number) => ({
  cols: Math.max(1, Math.ceil(width / cellW)),
  rows: Math.max(1, Math.ceil(height / cellH)),
});

/**
 * Places a figure inside a viewport-sized grid at a cell offset. Every scene
 * target is produced this way so all targets share dimensions and can be
 * interpolated directly.
 */
export const placeGrid = (figure: Grid, cols: number, rows: number, atCol: number, atRow: number): Grid => {
  const cells = new Array<number>(cols * rows).fill(0);
  const tone = figure.tone ? new Array<number>(cols * rows).fill(0) : undefined;
  const chars = figure.chars ? new Array<string | null>(cols * rows).fill(null) : undefined;
  for (let r = 0; r < figure.rows; r++) {
    const rr = r + atRow;
    if (rr < 0 || rr >= rows) continue;
    for (let c = 0; c < figure.cols; c++) {
      const cc = c + atCol;
      if (cc < 0 || cc >= cols) continue;
      const src = r * figure.cols + c;
      const dst = rr * cols + cc;
      cells[dst] = figure.cells[src] ?? 0;
      if (tone && figure.tone) tone[dst] = figure.tone[src] ?? 0;
      if (chars && figure.chars) chars[dst] = figure.chars[src] ?? null;
    }
  }
  const out: Grid = { cols, rows, cells };
  if (tone) out.tone = tone;
  if (chars) out.chars = chars;
  return out;
};

export type Anchor = "left" | "right" | "center";

/** Column offset that anchors a figure horizontally with a margin in cells. */
export const anchorCol = (figureCols: number, viewportCols: number, anchor: Anchor, marginCols = 4): number => {
  if (anchor === "left") return marginCols;
  if (anchor === "right") return Math.max(0, viewportCols - figureCols - marginCols);
  return Math.max(0, Math.floor((viewportCols - figureCols) / 2));
};
