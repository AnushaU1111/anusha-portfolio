/**
 * The cursor's influence over the field, per cell, with memory.
 *
 * The brightening on its own is a lookup: where the cursor is, glyphs are
 * brighter. What makes the flower feel like a material rather than a hover
 * state is that the influence takes time to leave, so characters drift out
 * and settle back after the cursor has gone. That decay is state, so it lives
 * here rather than in the renderer, which stays pure.
 */
export interface LiftOptions {
  /** Radius of the cursor's reach, in cells. */
  radius: number;
  /** Time constant for influence arriving, in ms. Short: it should feel immediate. */
  riseMs: number;
  /** Time constant for it leaving. Longer: this is the settling back. */
  fallMs: number;
}

export interface LiftField {
  readonly values: Float32Array;
  readonly cols: number;
  readonly rows: number;
  /**
   * Advances the field by dt milliseconds toward the influence implied by the
   * cursor, or toward nothing when the cursor has left. Returns true while
   * values are still changing, which is what keeps the render loop awake. A
   * cursor parked still settles and then reports false, so a motionless page
   * stops redrawing.
   */
  step(dt: number, cursor: { x: number; y: number } | null, cellW: number, cellH: number): boolean;
  /** Drops everything to zero, for a resize or a scene that takes no cursor. */
  clear(): void;
}

/** 1 at the cursor, 0 at the edge of its reach, with no hard rim. */
const falloff = (d: number, radius: number): number => {
  if (d >= radius) return 0;
  const u = 1 - d / radius;
  return u * u * (3 - 2 * u);
};

export const createLift = (cols: number, rows: number, opts: LiftOptions): LiftField => {
  const values = new Float32Array(cols * rows);

  const step: LiftField["step"] = (dt, cursor, cellW, cellH) => {
    const rise = 1 - Math.exp(-dt / Math.max(1, opts.riseMs));
    const fall = 1 - Math.exp(-dt / Math.max(1, opts.fallMs));
    // A cell is wider than it is tall by CELL_ASPECT, so a reach counted in
    // cells would be an ellipse on screen. Horizontal distance is converted
    // into units of cell height, which makes the reach a circle in pixels.
    // The radius is given in cells and read as cell heights.
    const aspect = cellW / cellH;
    // Measured from cell centres, which is where drawGrid takes the drift
    // direction from, so the brightening and the displacement agree.
    const cx = cursor ? cursor.x / cellW - 0.5 : 0;
    const cy = cursor ? cursor.y / cellH - 0.5 : 0;
    const r = opts.radius;
    const rCols = r / Math.max(0.0001, aspect);
    const c0 = cursor ? Math.max(0, Math.floor(cx - rCols)) : 0;
    const c1 = cursor ? Math.min(cols - 1, Math.ceil(cx + rCols)) : -1;
    const r0 = cursor ? Math.max(0, Math.floor(cy - r)) : 0;
    const r1 = cursor ? Math.min(rows - 1, Math.ceil(cy + r)) : -1;

    let changed = false;
    for (let row = 0; row < rows; row++) {
      const inRowBand = row >= r0 && row <= r1;
      const base = row * cols;
      for (let col = 0; col < cols; col++) {
        const i = base + col;
        const v = values[i] ?? 0;
        let target = 0;
        if (inRowBand && col >= c0 && col <= c1) {
          target = falloff(Math.hypot((col - cx) * aspect, row - cy), r);
        }
        if (v === 0 && target === 0) continue;
        const next = v + (target - v) * (target > v ? rise : fall);
        // Snap the tail to zero rather than easing into it forever. The cutoff
        // sits above the change threshold below, so the snap itself registers
        // as a change and the field actually comes to rest.
        values[i] = next < 0.012 && target === 0 ? 0 : next;
        if (Math.abs((values[i] ?? 0) - v) > 0.0008) changed = true;
      }
    }
    return changed;
  };

  return {
    values,
    cols,
    rows,
    step,
    clear: () => { values.fill(0); },
  };
};
