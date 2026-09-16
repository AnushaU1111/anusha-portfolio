import { mulberry32 } from "../noise";
import type { Grid } from "../types";
import { createCanvas } from "./canvas";
import { span, type FigureContext } from "./context";

export interface ContactSheetSpec {
  total: number;
  positive: number;
}

/** Malignant and benign carry different glyphs, so the class is legible without colour. */
const MALIGNANT = [8, 9, 8, 7];
const BENIGN = [2, 3, 2, 1, 4];

/**
 * Scene 07, on entry. One glyph per image in HAM10000, laid out in reading
 * order after a deterministic shuffle. The grid is sized from the count, so
 * the sheet holds exactly as many cells as there are images and the caption's
 * "one glyph = one image" is true rather than decorative.
 */
/**
 * How many images one glyph stands for at this viewport size. One, wherever
 * the sheet fits, which is what the caption claims on a desktop. Where it
 * cannot fit, the sheet stays a sheet and the number goes up, so the caption
 * reads from here rather than asserting something the grid cannot support.
 */
export const imagesPerGlyph = (total: number, ctx: FigureContext): number => {
  const cols = sheetCols(ctx);
  return Math.max(1, Math.ceil(total / (cols * ctx.rows)));
};

const sheetCols = (ctx: FigureContext) => span(ctx.cols, 0.62, 30, 240);

export const contactSheetFigure = (spec: ContactSheetSpec, ctx: FigureContext): Grid => {
  const cols = sheetCols(ctx);
  const perGlyph = imagesPerGlyph(spec.total, ctx);
  const glyphs = Math.ceil(spec.total / perGlyph);
  const positives = Math.round(spec.positive / perGlyph);
  const rows = Math.ceil(glyphs / cols);
  const canvas = createCanvas(cols, rows);
  const rnd = mulberry32(10_015);

  // Fisher-Yates over a flat array of labels, so the malignant cases scatter
  // the way they do in the dataset rather than clustering at the top.
  const labels = new Array<boolean>(glyphs);
  for (let i = 0; i < glyphs; i++) labels[i] = i < positives;
  for (let i = glyphs - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const a = labels[i] ?? false;
    labels[i] = labels[j] ?? false;
    labels[j] = a;
  }

  for (let i = 0; i < glyphs; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    if (labels[i] === true) {
      const g = MALIGNANT[Math.floor(rnd() * MALIGNANT.length)] ?? 8;
      canvas.put(col, row, g, { tone: 0.62 + rnd() * 0.33 });
    } else {
      const g = BENIGN[Math.floor(rnd() * BENIGN.length)] ?? 2;
      canvas.put(col, row, g, { tone: 0.22 + rnd() * 0.22 });
    }
  }
  return canvas.toGrid();
};
