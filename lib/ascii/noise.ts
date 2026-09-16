import type { Grid } from "./types";

/** Small deterministic PRNG so noise is stable between server and client. */
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * A noise grid shaped like a target grid: cells that are empty in the target
 * stay mostly empty, cells that are filled get random glyphs. Used as the
 * "before" state so the cold open assembles from noise rather than from a
 * uniform wall.
 */
export const noiseFor = (target: Grid, seed = 1, density = 0.9): Grid => {
  const rnd = mulberry32(seed);
  const cells = target.cells.map((v) => {
    if (v === 0) return rnd() < 0.03 ? 1 + Math.floor(rnd() * 3) : 0;
    return rnd() < density ? 1 + Math.floor(rnd() * 10) : 0;
  });
  return { cols: target.cols, rows: target.rows, cells };
};
