import { toIndex } from "./ramp";
import type { Grid } from "./types";

export interface ImageToGridOptions {
  cols: number;
  /** Rows are derived from cols and the image aspect unless given. */
  rows?: number;
  gamma?: number;
  /** Cells below this luminance become empty. */
  floor?: number;
  /** Adds a fixed ordered dither so flat regions get texture. */
  dither?: number;
}

/**
 * Pure conversion from a luminance buffer to a Grid. The buffer is expected
 * to already be resized to (cols * sx) by (rows * sy) so that each cell
 * averages an sx by sy block. Used by the build script; kept dependency-free
 * so it is unit-testable.
 */
export const lumaToGrid = (
  luma: Uint8Array | number[],
  width: number,
  height: number,
  opts: ImageToGridOptions,
): Grid => {
  const cols = opts.cols;
  const rows = opts.rows ?? Math.max(1, Math.round(cols * (height / width) * 0.6));
  const sx = width / cols;
  const sy = height / rows;
  const gamma = opts.gamma ?? 1;
  const floor = opts.floor ?? 0.05;
  const dither = opts.dither ?? 0;
  const cells = new Array<number>(cols * rows).fill(0);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      let n = 0;
      const x0 = Math.floor(c * sx);
      const x1 = Math.max(x0 + 1, Math.floor((c + 1) * sx));
      const y0 = Math.floor(r * sy);
      const y1 = Math.max(y0 + 1, Math.floor((r + 1) * sy));
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          sum += luma[y * width + x] ?? 0;
          n++;
        }
      }
      let v = n ? sum / n / 255 : 0;
      if (v > 0.02 && dither > 0) v += (((r * 5 + c * 11) % 4) - 1.5) * dither;
      cells[r * cols + c] = v < floor ? 0 : toIndex(v, gamma);
    }
  }
  return { cols, rows, cells };
};
