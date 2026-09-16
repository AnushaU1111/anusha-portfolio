import { describe, expect, it } from "vitest";
import { createFlyIn } from "@/lib/ascii/flyin";
import { CELL_H, CELL_W } from "@/lib/ascii/ramp";
import type { Grid } from "@/lib/ascii/types";

/** A blob of ink sitting in the middle of a viewport-sized grid. */
const blob = (cols = 80, rows = 40): Grid => {
  const cells = new Array<number>(cols * rows).fill(0);
  for (let r = rows / 2 - 6; r < rows / 2 + 6; r++) {
    for (let c = cols / 2 - 10; c < cols / 2 + 10; c++) cells[Math.round(r) * cols + Math.round(c)] = 6;
  }
  return { cols, rows, cells };
};

const opts = { cellW: CELL_W, cellH: CELL_H };

describe("flyIn", () => {
  it("gives every inked cell somewhere to come from and leaves empty cells alone", () => {
    const g = blob();
    const f = createFlyIn(g, opts);
    let moved = 0;
    for (let i = 0; i < g.cells.length; i++) {
      const d = Math.hypot(f.offsets[i * 2] ?? 0, f.offsets[i * 2 + 1] ?? 0);
      if ((g.cells[i] ?? 0) > 0) {
        expect(d).toBeGreaterThan(0);
        moved++;
      } else {
        expect(d).toBe(0);
      }
    }
    expect(moved).toBe(g.cells.filter((v) => v > 0).length);
  });

  it("starts every character outside the viewport it will land in", () => {
    const g = blob();
    const f = createFlyIn(g, opts);
    const W = g.cols * CELL_W;
    const H = g.rows * CELL_H;
    let inside = 0;
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        const i = r * g.cols + c;
        if ((g.cells[i] ?? 0) <= 0) continue;
        const x = c * CELL_W + (f.offsets[i * 2] ?? 0);
        const y = r * CELL_H + (f.offsets[i * 2 + 1] ?? 0);
        if (x >= 0 && x <= W && y >= 0 && y <= H) inside++;
      }
    }
    expect(inside).toBe(0);
  });

  it("comes from every side rather than from one", () => {
    const g = blob();
    const f = createFlyIn(g, opts);
    const sides = { left: 0, right: 0, up: 0, down: 0 };
    for (let i = 0; i < g.cells.length; i++) {
      if ((g.cells[i] ?? 0) <= 0) continue;
      const dx = f.offsets[i * 2] ?? 0;
      const dy = f.offsets[i * 2 + 1] ?? 0;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) sides.left++;
        else sides.right++;
      } else if (dy < 0) sides.up++;
      else sides.down++;
    }
    for (const n of Object.values(sides)) expect(n).toBeGreaterThan(0);
  });

  it("brings the middle in before the edges", () => {
    const g = blob();
    const f = createFlyIn(g, opts);
    const mid = Math.round(g.rows / 2) * g.cols + Math.round(g.cols / 2);
    const edge = Math.round(g.rows / 2 - 5) * g.cols + Math.round(g.cols / 2 - 9);
    expect(f.phase[mid] ?? 1).toBeLessThan(f.phase[edge] ?? 0);
  });

  it("is deterministic, so a resize rebuilds the same arrival", () => {
    const g = blob();
    expect(Array.from(createFlyIn(g, opts).offsets)).toEqual(Array.from(createFlyIn(g, opts).offsets));
  });

  it("keeps every phase inside the range the renderer expects", () => {
    const f = createFlyIn(blob(), opts);
    for (const p of f.phase) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
});
