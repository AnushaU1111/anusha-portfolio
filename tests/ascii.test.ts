import { describe, expect, it } from "vitest";
import { lumaToGrid } from "@/lib/ascii/imageToGrid";
import { interpolateGrid, fitGrid } from "@/lib/ascii/interpolate";
import { RAMP, toIndex } from "@/lib/ascii/ramp";

describe("ramp", () => {
  it("has eleven steps with an empty zero", () => {
    expect(RAMP).toHaveLength(11);
    expect(RAMP[0]).toBe(" ");
  });
  it("maps luminance to the full range", () => {
    expect(toIndex(0)).toBe(0);
    expect(toIndex(1)).toBe(10);
  });
});

describe("lumaToGrid", () => {
  it("averages blocks and honours the floor", () => {
    const w = 4, h = 4;
    const luma = new Uint8Array(w * h).fill(0);
    luma[0] = 255; luma[1] = 255; luma[4] = 255; luma[5] = 255; // bright 2x2 block top-left
    const g = lumaToGrid(luma, w, h, { cols: 2, rows: 2, floor: 0.1 });
    expect(g.cols).toBe(2);
    expect(g.cells[0]).toBe(10);
    expect(g.cells[1]).toBe(0);
    expect(g.cells[3]).toBe(0);
  });
});

describe("interpolateGrid", () => {
  const a = { cols: 2, rows: 1, cells: [0, 10] };
  const b = { cols: 2, rows: 1, cells: [10, 0] };
  it("returns a at t=0 and b at t=1", () => {
    expect(interpolateGrid(a, b, 0).cells).toEqual(a.cells);
    expect(interpolateGrid(a, b, 1).cells).toEqual(b.cells);
  });
  it("rejects mismatched dimensions", () => {
    expect(() => interpolateGrid(a, { cols: 3, rows: 1, cells: [0, 0, 0] }, 0.5)).toThrow();
  });
  it("fitGrid pads and crops", () => {
    expect(fitGrid(a, 3, 1).cells).toEqual([0, 10, 0]);
    expect(fitGrid(a, 1, 1).cells).toEqual([0]);
  });
});
