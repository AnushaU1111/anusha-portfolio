import { spectrogramField, type SpectrogramSpec } from "./figures/spectrogram";
import { mulberry32 } from "./noise";

/**
 * The log-mel window at the fine cell size: what the model actually sees, as
 * somewhere for the topic clusters to land.
 *
 * Same division as the figures before it. The window is characters, because
 * energy per bin is exactly what a grid of characters is good at; the mel axis,
 * the caption and the per-class report beside it are text.
 *
 * The shape comes from `spectrogramField`, which the coarse figure reads too,
 * so there is one window and two renderings of it rather than two windows.
 */
export interface WaveMark {
  /** Px from the box's top-left. */
  x: number;
  y: number;
  idx: number;
  tone: number;
  alpha: number;
  group: number;
}

export interface Wave {
  marks: WaveMark[];
  width: number;
  height: number;
  /** Bins across and up, so a caption can say what the window is. */
  cols: number;
  rows: number;
}

export interface WaveOptions {
  width: number;
  height: number;
  cellW: number;
  cellH: number;
  /**
   * Cells per bin. Above one both because a full window of every cell is
   * expensive and because glyphs packed edge to edge stop being glyphs.
   */
  stepX?: number;
  stepY?: number;
}

export const buildWave = (spec: SpectrogramSpec, o: WaveOptions): Wave => {
  const { cellW, cellH, width, height } = o;
  const stepX = o.stepX ?? 3;
  const stepY = o.stepY ?? 2;
  const dx = cellW * stepX;
  const dy = cellH * stepY;
  const cols = Math.max(2, Math.floor(width / dx));
  const rows = Math.max(2, Math.floor(height / dy));

  const field = spectrogramField(spec, cols, rows, 0.96);
  const marks: WaveMark[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = field[r]?.[c] ?? 0;
      if (v <= 0.04) continue;
      marks.push({
        x: c * dx,
        y: r * dy,
        idx: Math.max(1, Math.min(10, Math.round(v * 10))),
        // Brightness is energy in that bin and nothing else, which is the one
        // place on this site where brightness carries the data.
        tone: 0.28 + v * 0.68,
        alpha: 0.3 + v * 0.68,
        group: -1,
      });
    }
  }
  return { marks, width, height, cols, rows };
};

/**
 * What the classification report adds up to.
 *
 * The class balance is derived, because the supports are exact frame counts and
 * a share of them is arithmetic. The aggregate scores are not: the per-class F1
 * scores are rounded to two places, so their mean is not the macro F1 that was
 * reported. Those come from the spec, and `macroFromRows` is here so a test can
 * check the reported figure against the rows it summarises.
 */
export interface Report {
  /** Share of all frames, per class, in the spec's own order. */
  balance: { name: string; share: number }[];
  frames: number;
  /** The smallest class, which is the one the scene's pull quote is about. */
  minority: { name: string; share: number };
}

export const reportOf = (spec: SpectrogramSpec): Report => {
  const frames = spec.classes.reduce((n, k) => n + k.support, 0);
  const balance = spec.classes.map((k) => ({ name: k.name, share: frames === 0 ? 0 : k.support / frames }));
  let minority = balance[0] ?? { name: "", share: 0 };
  for (const b of balance) if (b.share < minority.share) minority = b;
  return { balance, frames, minority };
};

/** The macro and weighted F1 the per-class rows imply, for checking against. */
export const f1FromRows = (spec: SpectrogramSpec): { macro: number; weighted: number } => {
  const frames = spec.classes.reduce((n, k) => n + k.support, 0);
  return {
    macro: spec.classes.length === 0 ? 0 : spec.classes.reduce((s, k) => s + k.f1, 0) / spec.classes.length,
    weighted: frames === 0 ? 0 : spec.classes.reduce((s, k) => s + k.f1 * k.support, 0) / frames,
  };
};

/**
 * An illustrative window of frames: what was said, and what the model called
 * it. The scene declares it illustrative and it is — but it is generated from
 * the report rather than drawn to look good, so the disagreements fall where
 * the report says the model is weak. A class recalled at 0.35 misses most of
 * its frames here, because it missed most of its frames there.
 */
export interface Timeline {
  truth: string[];
  predicted: string[];
  /** How many of the frames drawn the model called correctly. */
  agreement: number;
}

export const timelineOf = (spec: SpectrogramSpec, length: number, seed = 672_203): Timeline => {
  const rnd = mulberry32(seed);
  const total = spec.classes.reduce((n, k) => n + k.support, 0);
  const pickClass = () => {
    let at = rnd() * total;
    for (const k of spec.classes) {
      at -= k.support;
      if (at <= 0) return k;
    }
    return spec.classes[spec.classes.length - 1];
  };
  // Whichever class the model falls back to when it misses: the one it recalls
  // best, which is also the one that dominates the frames.
  const fallback = [...spec.classes].sort((a, b) => b.support - a.support)[0];

  const truth: string[] = [];
  const predicted: string[] = [];
  while (truth.length < length) {
    const k = pickClass();
    if (!k) break;
    // Events run for a stretch of frames rather than one at a time, which is
    // what the Viterbi pass is for.
    const run = Math.max(1, Math.round((0.01 + rnd() * 0.05) * length));
    const hit = rnd() < k.recall;
    for (let i = 0; i < run && truth.length < length; i++) {
      truth.push(k.glyph);
      predicted.push(hit ? k.glyph : (fallback?.glyph ?? k.glyph));
    }
  }
  let agreement = 0;
  for (let i = 0; i < truth.length; i++) if (truth[i] === predicted[i]) agreement++;
  return { truth, predicted, agreement: truth.length === 0 ? 0 : agreement / truth.length };
};
