/**
 * The site's entire visual alphabet, darkest to brightest. Index 0 is empty.
 * Every figure, the flower and the portrait are drawn from these eleven.
 */
export const RAMP = [" ", ".", "·", ":", "-", "=", "+", "o", "8", "O", "@"] as const;
export type RampChar = (typeof RAMP)[number];
export const RAMP_MAX = RAMP.length - 1;

/** Map a luminance in [0, 1] to a ramp index, with optional gamma. */
export const toIndex = (v: number, gamma = 1): number => {
  const c = Math.min(1, Math.max(0, v)) ** gamma;
  return Math.round(c * RAMP_MAX);
};

export const toTone = (i: number): number => i / RAMP_MAX;

/** Glyph width divided by line height for a typical monospace at the sizes we use. */
export const CELL_ASPECT = 0.6;

export const theme = {
  bg: "#0b0708",
  low: [150, 72, 84] as [number, number, number],
  high: [240, 140, 150] as [number, number, number],
  minAlpha: 0.18,
  maxAlpha: 0.95,
} as const;
