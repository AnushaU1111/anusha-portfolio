import { describe, expect, it } from "vitest";
import { photoRows, rgbaToPhotoGrid } from "@/lib/ascii/photo";
import { stampGrid, type GlyphMasks } from "@/lib/ascii/stamp";
import { RAMP_MAX } from "@/lib/ascii/ramp";

/** Four pixels: black, mid grey, white, saturated red. */
const pixels = () => {
  const d = new Uint8ClampedArray(4 * 4);
  const set = (i: number, r: number, g: number, b: number) => {
    d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
  };
  set(0, 0, 0, 0);
  set(1, 128, 128, 128);
  set(2, 255, 255, 255);
  set(3, 200, 60, 60);
  return d;
};

describe("rgbaToPhotoGrid", () => {
  it("maps luminance to the ramp and keeps the pixel's own colour", () => {
    const g = rgbaToPhotoGrid(pixels(), 4, 1);
    expect(g.cells[0]).toBe(0);
    expect(g.cells[2]).toBe(RAMP_MAX);
    expect(g.cells[1]).toBeGreaterThan(0);
    expect(g.cells[1]).toBeLessThan(RAMP_MAX);
    expect(Array.from(g.color?.slice(9, 12) ?? [])).toEqual([200, 60, 60]);
  });

  it("leaves a cell empty below the floor, colour included", () => {
    const g = rgbaToPhotoGrid(pixels(), 4, 1, { floor: 0.6 });
    expect(g.cells[1]).toBe(0);
    expect(g.cells[2]).toBe(RAMP_MAX);
    expect(Array.from(g.color?.slice(3, 6) ?? [])).toEqual([0, 0, 0]);
  });

  it("pivots saturation on luminance, so a lift does not move the grey", () => {
    const plain = rgbaToPhotoGrid(pixels(), 4, 1);
    const punchy = rgbaToPhotoGrid(pixels(), 4, 1, { saturation: 1.6 });
    // Grey has no chroma to stretch.
    expect(Array.from(punchy.color?.slice(3, 6) ?? [])).toEqual(Array.from(plain.color?.slice(3, 6) ?? []));
    // Red does, and it stretches away from its own luminance.
    expect(punchy.color?.[9] ?? 0).toBeGreaterThan(plain.color?.[9] ?? 0);
    expect(punchy.color?.[10] ?? 255).toBeLessThan(plain.color?.[10] ?? 0);
  });

  it("lifts exposure toward white without clipping past it", () => {
    const lifted = rgbaToPhotoGrid(pixels(), 4, 1, { gain: 2 });
    expect(lifted.color?.[3] ?? 0).toBeGreaterThan(128);
    for (const v of lifted.color ?? []) expect(v).toBeLessThanOrEqual(255);
  });

  it("derives rows from the image aspect and the cell aspect", () => {
    expect(photoRows(440, 560, 600)).toBe(283);
    expect(photoRows(100, 100, 100, 0.6)).toBe(60);
  });
});

/** A single fully opaque pixel per glyph, so coverage maths is easy to read. */
const solidMask = (): GlyphMasks => ({
  masks: Array.from({ length: RAMP_MAX + 1 }, (_, i) => new Uint8Array([i === 0 ? 0 : 255])),
  mw: 1,
  mh: 1,
});

describe("stampGrid", () => {
  const run = (grid: Parameters<typeof stampGrid>[4], w = 2, h = 1, fly = null) => {
    const acc = new Float32Array(w * h * 4);
    const out = new Uint8ClampedArray(w * h * 4);
    stampGrid(acc, out, w, h, grid, solidMask(), { cellW: 1, cellH: 1, fly });
    return out;
  };

  it("writes the cell's colour unpremultiplied, so the canvas does not darken it twice", () => {
    const grid = { cols: 2, rows: 1, cells: [10, 0], color: new Uint8Array([200, 100, 50, 0, 0, 0]) };
    const out = run(grid);
    expect([out[0], out[1], out[2], out[3]]).toEqual([200, 100, 50, 255]);
  });

  it("leaves a cell with no ink fully transparent", () => {
    const grid = { cols: 2, rows: 1, cells: [0, 0], color: new Uint8Array(6) };
    expect(Array.from(run(grid))).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("falls back to white when a grid carries no colour at all", () => {
    const out = run({ cols: 1, rows: 1, cells: [10] }, 1, 1);
    expect([out[0], out[1], out[2]]).toEqual([255, 255, 255]);
  });

  it("draws nothing at all before a character's turn has come", () => {
    const grid = { cols: 1, rows: 1, cells: [10], color: new Uint8Array([255, 255, 255]) };
    const acc = new Float32Array(4);
    const out = new Uint8ClampedArray(4);
    const fly = { offsets: new Float32Array([0, 0]), phase: new Float32Array([0.9]), t: 0 };
    stampGrid(acc, out, 1, 1, grid, solidMask(), { cellW: 1, cellH: 1, fly });
    expect(out[3]).toBe(0);
    stampGrid(acc, out, 1, 1, grid, solidMask(), { cellW: 1, cellH: 1, fly: { ...fly, t: 1 } });
    expect(out[3]).toBe(255);
  });

  it("skips a character still parked outside the buffer", () => {
    const grid = { cols: 1, rows: 1, cells: [10], color: new Uint8Array([255, 255, 255]) };
    const acc = new Float32Array(4);
    const out = new Uint8ClampedArray(4);
    stampGrid(acc, out, 1, 1, grid, solidMask(), {
      cellW: 1, cellH: 1,
      fly: { offsets: new Float32Array([500, 500]), phase: new Float32Array([0]), t: 0.2 },
    });
    expect(out[3]).toBe(0);
  });
});
