import { describe, expect, it } from "vitest";
import { noiseFor, mulberry32 } from "@/lib/ascii/noise";
import { placeGrid, anchorCol, viewportDims } from "@/lib/ascii/place";

describe("noise", () => {
  it("is deterministic for a seed", () => {
    const a = mulberry32(7), b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("keeps the target's silhouette", () => {
    const target = { cols: 4, rows: 1, cells: [0, 0, 10, 10] };
    const n = noiseFor(target, 3, 1);
    expect(n.cells[2]).toBeGreaterThan(0);
    expect(n.cells[3]).toBeGreaterThan(0);
  });
});

describe("place", () => {
  it("places a figure at an offset inside a viewport grid", () => {
    const fig = { cols: 2, rows: 1, cells: [5, 6] };
    const g = placeGrid(fig, 4, 2, 1, 1);
    expect(g.cells).toEqual([0, 0, 0, 0, 0, 5, 6, 0]);
  });
  it("carries a figure's literal characters into the viewport grid", () => {
    const fig = { cols: 2, rows: 1, cells: [5, 6], chars: ["[", "]"] };
    expect(placeGrid(fig, 4, 2, 1, 1).chars).toEqual([null, null, null, null, null, "[", "]", null]);
  });
  it("leaves the chars layer off for a figure that has none", () => {
    expect(placeGrid({ cols: 2, rows: 1, cells: [5, 6] }, 2, 1, 0, 0).chars).toBeUndefined();
  });
  it("crops what falls outside", () => {
    const fig = { cols: 2, rows: 1, cells: [5, 6] };
    expect(placeGrid(fig, 2, 1, 1, 0).cells).toEqual([0, 5]);
  });
  it("anchors right with a margin", () => {
    expect(anchorCol(10, 100, "right", 4)).toBe(86);
    expect(anchorCol(10, 100, "left", 4)).toBe(4);
    expect(anchorCol(10, 100, "center")).toBe(45);
  });
  it("derives viewport cells from pixels", () => {
    expect(viewportDims(1440, 900, 4.8, 8)).toEqual({ cols: 300, rows: 113 });
  });
});
