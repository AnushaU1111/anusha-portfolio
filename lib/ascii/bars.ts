import type { ContactSheetSpec } from "./figures/contactSheet";

/**
 * What each stage bought, at the fine cell size: one run of characters per
 * stage, over the scale the scene declares.
 *
 * The last figure on the site, and the one the log-mel window comes apart into.
 * A bar is the plainest thing a grid of characters can be, which is the point —
 * after six figures that each needed a different reading, the argument here is
 * six numbers in a row.
 *
 * The scale matters and is declared rather than assumed: six scores between
 * 0.75 and 0.97 drawn from zero are six identical bars, and the difference
 * between the classical baseline and the ensemble is the whole figure.
 */
export interface BarMark {
  /** Px from the box's top-left. */
  x: number;
  y: number;
  idx: number;
  tone: number;
  alpha: number;
  /** Which stage this mark belongs to. */
  group: number;
}

export interface BarRow {
  label: string;
  value: number;
  /** Baseline of the run, px from the box's top-left. */
  y: number;
  /** Where the run starts and ends, px. */
  x0: number;
  x1: number;
  /** Whether this is the best stage, which the page names. */
  best: boolean;
}

export interface BarChart {
  marks: BarMark[];
  rows: BarRow[];
  width: number;
  height: number;
  /** The scale the runs are drawn over, so the caption can print it. */
  lo: number;
  hi: number;
  /** Where the scores print: past the end of the scale, not the end of a run. */
  valueX: number;
}

export interface BarOptions {
  width: number;
  height: number;
  cellW: number;
  cellH: number;
  /** Room at the left for the stage names and at the right for the scores. */
  padLeft?: number;
  padRight?: number;
  padTop?: number;
  padBottom?: number;
  /** Cells across the stroke of a run, and cells between marks along it. */
  thick?: number;
  step?: number;
}

export const buildBars = (spec: ContactSheetSpec, o: BarOptions): BarChart => {
  const { cellW, cellH, width, height } = o;
  const padLeft = o.padLeft ?? 196;
  const padRight = o.padRight ?? 76;
  const padTop = o.padTop ?? 16;
  const padBottom = o.padBottom ?? 16;
  // Five rows at less than a cell apart, so a run is a solid bar a few px
  // deep. Two rows a full cell apart read as a hairline at this cell size,
  // and the length of a run is the whole figure.
  const thick = o.thick ?? 5;
  // A run is solid, because a dotted run and the dotted rest of the scale
  // behind it read as the same thing, and the length of a run is the figure.
  const step = o.step ?? 1;

  const lo = Math.min(spec.scaleLo, spec.scaleHi);
  const hi = Math.max(spec.scaleLo, spec.scaleHi);
  const span = Math.max(1e-6, hi - lo);
  const x0 = padLeft;
  const full = Math.max(1, width - padLeft - padRight);
  const top = padTop;
  const usable = Math.max(1, height - padTop - padBottom);
  const count = Math.max(1, spec.stages.length);
  const pitch = usable / count;

  const best = spec.stages.reduce((b, k) => (k.rocAuc > b ? k.rocAuc : b), 0);

  const rows: BarRow[] = [];
  const marks: BarMark[] = [];
  for (let i = 0; i < spec.stages.length; i++) {
    const stage = spec.stages[i];
    if (!stage) continue;
    const u = Math.min(1, Math.max(0, (stage.rocAuc - lo) / span));
    const y = top + pitch * (i + 0.5);
    const x1 = x0 + u * full;
    const isBest = stage.rocAuc >= best;
    rows.push({ label: stage.label, value: stage.rocAuc, y, x0, x1, best: isBest });

    for (let x = x0; x <= x1; x += cellW * step) {
      for (let k = 0; k < thick; k++) {
        // Rows either side of the baseline, so a run reads as a bar rather
        // than as a line of dust.
        const side = k % 2 === 1 ? 1 : -1;
        const off = Math.ceil(k / 2);
        marks.push({
          x,
          y: y + side * off * cellH * 0.62,
          idx: isBest ? 9 : 8,
          tone: isBest ? 0.86 : 0.6,
          alpha: (isBest ? 0.95 : 0.72) / (1 + off * 0.22),
          group: i,
        });
      }
    }
    // The rest of the scale, dotted, so a run is read against where it could
    // have reached rather than against the run above it.
    for (let x = x1 + cellW * 6; x <= x0 + full; x += cellW * 6) {
      marks.push({ x, y, idx: 1, tone: 0.12, alpha: 0.17, group: i });
    }
  }

  return { marks, rows, width, height, lo, hi, valueX: x0 + full };
};

/**
 * What the held-out confusion matrix says. Recall, precision, F1 and accuracy
 * are arithmetic on four counts, so they are computed here rather than declared
 * a second time and allowed to drift.
 */
export interface Confusion {
  truePositive: number;
  falseNegative: number;
  falsePositive: number;
  trueNegative: number;
  actualMalignant: number;
  actualBenign: number;
  total: number;
  recall: number;
  precision: number;
  f1: number;
  accuracy: number;
}

export const confusionOf = (spec: ContactSheetSpec): Confusion => {
  const truePositive = spec.confusion.malignant.predMalignant;
  const falseNegative = spec.confusion.malignant.predBenign;
  const falsePositive = spec.confusion.benign.predMalignant;
  const trueNegative = spec.confusion.benign.predBenign;
  const actualMalignant = truePositive + falseNegative;
  const actualBenign = trueNegative + falsePositive;
  const total = actualMalignant + actualBenign;
  const recall = actualMalignant === 0 ? 0 : truePositive / actualMalignant;
  const precision = truePositive + falsePositive === 0 ? 0 : truePositive / (truePositive + falsePositive);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return {
    truePositive,
    falseNegative,
    falsePositive,
    trueNegative,
    actualMalignant,
    actualBenign,
    total,
    recall,
    precision,
    f1,
    accuracy: total === 0 ? 0 : (truePositive + trueNegative) / total,
  };
};
