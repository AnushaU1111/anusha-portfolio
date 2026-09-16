import { describe, expect, it } from "vitest";
import { buildPairs } from "@/lib/ascii/morph";
import type { Grid } from "@/lib/ascii/types";

/** A solid block of ink, cols by rows, every cell at the given index. */
const block = (cols: number, rows: number, idx = 6, color?: number): Grid => {
  const cells = new Array<number>(cols * rows).fill(idx);
  const g: Grid = { cols, rows, cells };
  if (color !== undefined) g.color = new Uint8Array(cols * rows * 3).fill(color);
  return g;
};

const opts = { cellW: 1.5, cellH: 2.5, thin: 3, seed: 1 };

describe("buildPairs", () => {
  it("makes one pair per character in the face, not in the flower", () => {
    const pairs = buildPairs(block(20, 20), block(40, 40, 8, 200), opts);
    expect(pairs.count).toBe(40 * 40);
    expect(pairs.dst).toHaveLength(pairs.count * 2);
    expect(pairs.srcIdx).toHaveLength(pairs.count);
  });

  it("gives every face character a real destination and a real glyph", () => {
    const face = block(30, 30, 9, 180);
    const pairs = buildPairs(block(20, 20), face, opts);
    for (let i = 0; i < pairs.count; i++) {
      expect(pairs.dstIdx[i]).toBe(9);
      expect(pairs.dstColor[i * 3]).toBe(180);
    }
  });

  it("only lets as many characters be visible at the start as the flower has", () => {
    // Thinning keeps one flower cell in three, so most pairs must start unseen
    // or the flower would be drawn several times over on the first frame.
    const pairs = buildPairs(block(30, 30), block(60, 60, 8, 200), opts);
    let visible = 0;
    for (let i = 0; i < pairs.count; i++) if ((pairs.srcAlpha[i] ?? 0) > 0) visible++;
    expect(visible).toBeGreaterThan(0);
    expect(visible).toBeLessThan(pairs.count / 2);
  });

  it("walks both figures in the same order, so the flower folds in rather than scattering", () => {
    const pairs = buildPairs(block(20, 20), block(40, 40, 8, 200), opts);
    // Sources advance monotonically down the flower as destinations advance
    // down the face.
    let prev = -1;
    let backwards = 0;
    for (let i = 0; i < pairs.count; i++) {
      const y = pairs.src[i * 2 + 1] ?? 0;
      if (y < prev) backwards++;
      prev = y;
    }
    expect(backwards).toBe(0);
  });

  it("throws every character clear of the flower before it assembles", () => {
    const pairs = buildPairs(block(40, 40), block(40, 40, 8, 200), opts);
    for (let i = 0; i < pairs.count; i++) {
      expect(Math.hypot(pairs.fly[i * 2] ?? 0, pairs.fly[i * 2 + 1] ?? 0)).toBeGreaterThan(0);
    }
  });

  it("is deterministic, so a resize rebuilds the same morph", () => {
    const a = buildPairs(block(20, 20), block(30, 30, 8, 200), opts);
    const b = buildPairs(block(20, 20), block(30, 30, 8, 200), opts);
    expect(Array.from(a.fly)).toEqual(Array.from(b.fly));
    expect(Array.from(a.srcAlpha)).toEqual(Array.from(b.srcAlpha));
  });

  it("survives a flower with no ink in it at all", () => {
    const empty: Grid = { cols: 4, rows: 4, cells: new Array<number>(16).fill(0) };
    const pairs = buildPairs(empty, block(10, 10, 8, 200), opts);
    expect(pairs.count).toBe(100);
    for (let i = 0; i < pairs.count; i++) expect(pairs.srcAlpha[i]).toBe(0);
  });
});
