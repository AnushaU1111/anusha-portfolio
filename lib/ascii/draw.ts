import { RAMP, RAMP_MAX, theme, toTone } from "./ramp";
import type { Grid } from "./types";

export interface DrawOptions {
  cellW: number;
  cellH: number;
  /** 0 = site palette, 1 = neutral photographic palette. Used by the About resolve. */
  resolve?: number;
  /** Global alpha multiplier, for dimming a scene as the next one arrives. */
  alpha?: number;
  /** Cursor position in canvas px, or null. */
  cursor?: { x: number; y: number } | null;
  /**
   * Per-cell cursor influence in [0, 1], same length as the grid. The field
   * owns this and eases it, because the settling back is what makes the
   * flower feel alive rather than merely reactive; the renderer only reads it.
   */
  lift?: Float32Array | null;
  /** How much a fully lifted cell brightens. */
  liftTone?: number;
  /** How many ramp steps denser a fully lifted cell goes. */
  liftDensify?: number;
  /** How far in px a fully lifted cell drifts away from the cursor. */
  liftDrift?: number;
  /**
   * Characters arriving from off screen. At t = 0 nothing is drawn at all,
   * which is what makes the cold open empty until the page is scrolled.
   */
  fly?: { offsets: Float32Array; phase: Float32Array; t: number } | null;
  fontFamily?: string;
}

/** Smoothstep on a value already clamped to [0, 1]. */
const ease = (u: number): number => u * u * (3 - 2 * u);

const neutralLow: [number, number, number] = [60, 54, 56];
const neutralHigh: [number, number, number] = [236, 230, 224];

/**
 * Draws a grid onto a 2D context. Pure with respect to inputs; no state.
 * Kept separate from any component so the field and any standalone figure
 * share exactly one renderer.
 */
export const drawGrid = (ctx: CanvasRenderingContext2D, grid: Grid, o: DrawOptions): void => {
  const { cellW, cellH } = o;
  const resolve = o.resolve ?? 0;
  const gAlpha = o.alpha ?? 1;
  const font = o.fontFamily ?? '"JetBrains Mono", ui-monospace, monospace';
  ctx.font = `${(cellH * 0.82).toFixed(2)}px ${font}`;
  ctx.textBaseline = "top";
  const [lr, lg, lb] = theme.low;
  const [hr, hg, hb] = theme.high;
  const m = o.cursor ?? null;
  const lift = o.lift ?? null;
  const liftTone = o.liftTone ?? 0.6;
  const densify = o.liftDensify ?? 0;
  const drift = o.liftDrift ?? 0;
  const fly = o.fly ?? null;
  for (let r = 0; r < grid.rows; r++) {
    const y = r * cellH;
    for (let c = 0; c < grid.cols; c++) {
      const i = r * grid.cols + c;
      let idx = grid.cells[i] ?? 0;
      if (idx <= 0) continue;
      let t = grid.tone?.[i] ?? toTone(idx);
      let x = c * cellW;
      let yy = y;
      let arrival = 1;
      if (fly) {
        // Each cell waits its turn, then takes 55% of what is left to travel.
        const local = (fly.t - (fly.phase[i] ?? 0) * 0.45) / 0.55;
        if (local <= 0) continue;
        arrival = local >= 1 ? 1 : ease(local);
        const away = 1 - arrival;
        x += (fly.offsets[i * 2] ?? 0) * away;
        yy += (fly.offsets[i * 2 + 1] ?? 0) * away;
      }
      const l = lift ? (lift[i] ?? 0) : 0;
      if (l > 0.002) {
        t = Math.min(1, t + l * liftTone);
        // A lifted cell swaps up the ramp. A cell carrying a literal character
        // keeps it: its glyph is saying what the thing is, not how dense it is.
        if (densify > 0 && !grid.chars?.[i]) idx = Math.min(RAMP_MAX, idx + Math.round(l * densify));
        if (drift > 0 && m) {
          const dx = x + cellW * 0.5 - m.x;
          const dy = y + cellH * 0.5 - m.y;
          const len = Math.hypot(dx, dy) || 1;
          x += (dx / len) * l * drift;
          yy += (dy / len) * l * drift;
        }
      }
      const R = lr + (hr - lr) * t;
      const G = lg + (hg - lg) * t;
      const B = lb + (hb - lb) * t;
      const nR = neutralLow[0] + (neutralHigh[0] - neutralLow[0]) * t;
      const nG = neutralLow[1] + (neutralHigh[1] - neutralLow[1]) * t;
      const nB = neutralLow[2] + (neutralHigh[2] - neutralLow[2]) * t;
      const fr = Math.round(R + (nR - R) * resolve);
      const fg = Math.round(G + (nG - G) * resolve);
      const fb = Math.round(B + (nB - B) * resolve);
      // A character fades up as it arrives, so nothing pops into place.
      const A = (theme.minAlpha + (theme.maxAlpha - theme.minAlpha) * t) * gAlpha * arrival;
      ctx.fillStyle = `rgba(${fr},${fg},${fb},${A.toFixed(3)})`;
      // A cell with a literal character still carries an index, because the
      // index is where its brightness comes from. An index of zero is empty
      // whatever the chars layer says.
      ctx.fillText(grid.chars?.[i] ?? RAMP[idx] ?? " ", x, yy);
    }
  }
};
