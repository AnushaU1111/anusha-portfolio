import { mulberry32 } from "../noise";
import type { Grid } from "../types";
import { createCanvas } from "./canvas";
import { span, type FigureContext } from "./context";

export interface SpectrogramClass {
  name: string;
  support: number;
}

export interface SpectrogramSpec {
  frames: number;
  classes: SpectrogramClass[];
}

/**
 * Each class's shape in the frequency axis. This is the drawing, not the
 * data: the scene declares it illustrative. What is not illustrative is how
 * often each class appears, which comes from the real class balance.
 */
const profileColumn = (name: string, freqs: number[]): number[] => {
  switch (name) {
    case "speech": {
      // A harmonic stack at the low end, normalised against its own peak, plus
      // the broad band a chest microphone picks up over the top of it.
      const raw = freqs.map((f) => {
        let v = 0;
        for (let h = 1; h <= 8; h++) v += Math.exp(-((f - 0.06 * h) ** 2) / 0.0009) / h ** 0.6;
        return v;
      });
      const peak = Math.max(...raw, 1e-6);
      return raw.map((v, i) => (v / peak) * 0.85 + Math.exp(-(((freqs[i] ?? 0) - 0.2) ** 2) / 0.05) * 0.3);
    }
    case "cough":
      return freqs.map((f) => (Math.exp(-((f - 0.34) ** 2) / 0.1) + 0.45) * 1.05);
    case "non-verbal":
      return freqs.map((f) => Math.exp(-((f - 0.1) ** 2) / 0.006) * 0.48);
    default:
      return freqs.map(
        (f) => (Math.exp(-((f - 0.05) ** 2) / 0.012) + 0.22 * Math.exp(-((f - 0.22) ** 2) / 0.1)) * 0.34,
      );
  }
};

/** Mean duration of one event of a class, as a fraction of the window. */
const DURATION: Record<string, [number, number]> = {
  speech: [0.06, 0.15],
  cough: [0.013, 0.03],
  "non-verbal": [0.021, 0.052],
  other: [0.052, 0.12],
};

/** The noise floor every bin starts at, before any event is added. */
const FLOOR = 0.17;

const convolve = (row: number[], kernel: number[]): number[] => {
  const half = Math.floor(kernel.length / 2);
  return row.map((_, i) => {
    let sum = 0;
    for (let k = 0; k < kernel.length; k++) {
      sum += (row[i + k - half] ?? 0) * (kernel[k] ?? 0);
    }
    return sum;
  });
};

const percentile = (values: number[], p: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.round(p * (sorted.length - 1));
  return sorted[Math.max(0, Math.min(sorted.length - 1, i))] ?? 1;
};

/**
 * Scene 06, on entry. A log-mel spectrogram: what the model actually sees.
 * Time runs left to right, mel frequency bottom to top, and brightness is
 * energy in that bin and nothing else.
 */
export const spectrogramFigure = (spec: SpectrogramSpec, ctx: FigureContext): Grid => {
  const cols = span(ctx.cols, 0.74, 40, 300);
  const rows = span(ctx.rows, 0.56, 16, 90);
  const rnd = mulberry32(672_203);

  const energy: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const line = new Array<number>(cols);
    for (let c = 0; c < cols; c++) line[c] = FLOOR + rnd() * 0.08;
    energy.push(line);
  }
  // Row 0 is the top of the figure and the top of the mel axis.
  const freqs = Array.from({ length: rows }, (_, r) => (rows === 1 ? 0 : 1 - r / (rows - 1)));
  const profiles = new Map<string, number[]>();
  for (const k of spec.classes) profiles.set(k.name, profileColumn(k.name, freqs));

  // Events are drawn in the proportions the classification report reports, so
  // the window looks like the data rather than like a pleasant arrangement.
  const totalSupport = spec.classes.reduce((n, k) => n + k.support, 0);
  let t = 0;
  while (t < cols) {
    let pick = rnd() * totalSupport;
    let name = spec.classes[0]?.name ?? "other";
    for (const k of spec.classes) {
      pick -= k.support;
      if (pick <= 0) {
        name = k.name;
        break;
      }
    }
    const [lo, hi] = DURATION[name] ?? [0.05, 0.1];
    const width = Math.max(2, Math.round((lo + rnd() * (hi - lo)) * cols));
    const end = Math.min(cols, t + width);
    const prof = profiles.get(name) ?? profileColumn(name, freqs);
    for (let c = t; c < end; c++) {
      // A single raised-sine envelope so an event swells and decays rather
      // than switching on. A cough is squared, which makes it the sharp
      // transient it is.
      const env = Math.sin((Math.PI * (c - t)) / Math.max(1, end - t)) ** 0.5;
      const shaped = name === "cough" ? env * env : env;
      for (let r = 0; r < rows; r++) {
        const line = energy[r];
        if (!line) continue;
        line[c] = (line[c] ?? 0) + (prof[r] ?? 0) * shaped;
      }
    }
    t = end;
  }

  const smoothed = energy.map((line) => convolve(line, [0.15, 0.25, 0.3, 0.2, 0.1]));
  for (let c = 0; c < cols; c++) {
    const column = smoothed.map((line) => line[c] ?? 0);
    const blurred = convolve(column, [0.25, 0.5, 0.25]);
    for (let r = 0; r < rows; r++) {
      const line = smoothed[r];
      if (line) line[c] = blurred[r] ?? 0;
    }
  }

  // Normalised over the range above the noise floor rather than from zero, so
  // the quiet part of the window stays quiet instead of hazing over. The floor
  // itself still shows, faintly, which is what a recording looks like.
  const ceiling = Math.max(percentile(smoothed.flat(), 0.993), FLOOR + 0.1);
  const canvas = createCanvas(cols, rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const above = ((smoothed[r]?.[c] ?? 0) - FLOOR) / (ceiling - FLOOR);
      const v = Math.min(1, Math.max(0, above)) ** 0.78;
      if (v <= 0.05) continue;
      canvas.put(c, r, Math.min(10, Math.floor(v * 10)), { tone: v });
    }
  }
  return canvas.toGrid();
};
