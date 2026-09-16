import { describe, expect, it } from "vitest";
import { createLift } from "@/lib/ascii/lift";
import { scatterPhase } from "@/lib/ascii/interpolate";

const CELL_W = 4.8;
const CELL_H = 8;
const opts = { radius: 6, riseMs: 90, fallMs: 320 };
/** Where cell (col, row) sits in px, at its centre. */
const at = (col: number, row: number) => ({ x: col * CELL_W + CELL_W / 2, y: row * CELL_H + CELL_H / 2 });

describe("lift", () => {
  it("rises under the cursor and stays flat outside its reach", () => {
    const f = createLift(40, 20, opts);
    f.step(100, at(20, 10), CELL_W, CELL_H);
    const under = f.values[10 * 40 + 20] ?? 0;
    const far = f.values[10 * 40 + 2] ?? 0;
    expect(under).toBeGreaterThan(0.4);
    expect(far).toBe(0);
  });

  it("falls off with distance rather than stopping at a rim", () => {
    const f = createLift(40, 20, opts);
    f.step(200, at(20, 10), CELL_W, CELL_H);
    const near = f.values[10 * 40 + 21] ?? 0;
    const mid = f.values[10 * 40 + 23] ?? 0;
    const edge = f.values[10 * 40 + 25] ?? 0;
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(edge);
    expect(edge).toBeGreaterThanOrEqual(0);
  });

  it("settles back to nothing about a second after the cursor leaves", () => {
    const f = createLift(40, 20, { ...opts, fallMs: 220 });
    for (let i = 0; i < 12; i++) f.step(16, at(20, 10), CELL_W, CELL_H);
    const peak = f.values[10 * 40 + 20] ?? 0;
    expect(peak).toBeGreaterThan(0.8);

    // Most of the movement is early, and it is completely gone inside about a
    // second. Both halves matter: a settle that lingers reads as a bug.
    let elapsed = 0;
    let atHalfSecond = -1;
    while (elapsed < 2000 && f.step(16, null, CELL_W, CELL_H)) {
      elapsed += 16;
      if (atHalfSecond < 0 && elapsed >= 500) atHalfSecond = f.values[10 * 40 + 20] ?? 0;
    }
    expect(atHalfSecond).toBeLessThan(peak * 0.15);
    expect(elapsed).toBeLessThanOrEqual(1300);
    expect(f.values[10 * 40 + 20] ?? 0).toBe(0);
  });

  it("reports nothing changing once a parked cursor has settled, so the loop can idle", () => {
    const f = createLift(40, 20, opts);
    let guard = 0;
    while (f.step(16, at(20, 10), CELL_W, CELL_H) && guard < 400) guard++;
    expect(guard).toBeLessThan(400);
    expect(f.step(16, at(20, 10), CELL_W, CELL_H)).toBe(false);
  });

  // Cells are 4.8 by 8, so equal cell counts in each direction are not equal
  // distances on screen. The reach has to be a circle in pixels or the bright
  // patch reads as a vertical ellipse.
  it("reaches equally far in px horizontally and vertically", () => {
    const f = createLift(60, 40, opts);
    f.step(400, at(30, 20), CELL_W, CELL_H);
    const px = 3 * CELL_H; // same distance from the cursor, both ways
    const across = f.values[20 * 60 + (30 + Math.round(px / CELL_W))] ?? 0;
    const down = f.values[(20 + Math.round(px / CELL_H)) * 60 + 30] ?? 0;
    expect(across).toBeGreaterThan(0.05);
    expect(Math.abs(across - down)).toBeLessThan(0.03);
  });

  it("does not reach further sideways than it does down, in cells", () => {
    const f = createLift(60, 40, opts);
    f.step(400, at(30, 20), CELL_W, CELL_H);
    // Six cells across is 28.8px; six cells down is 48px, which is further,
    // so the cell six to the side must be the brighter of the two.
    const sixAcross = f.values[20 * 60 + 36] ?? 0;
    const sixDown = f.values[26 * 60 + 30] ?? 0;
    expect(sixAcross).toBeGreaterThan(sixDown);
  });
});

describe("phases", () => {
  it("scatters without favouring either side of the grid", () => {
    const cols = 50;
    const mean = (c0: number, c1: number) => {
      let s = 0;
      let n = 0;
      for (let c = c0; c < c1; c++) for (let r = 0; r < 20; r++) { s += scatterPhase(c, r, cols, 20); n++; }
      return s / n;
    };
    expect(Math.abs(mean(0, 10) - mean(40, 50))).toBeLessThan(0.15);
  });
});
