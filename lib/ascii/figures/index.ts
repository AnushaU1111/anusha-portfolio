import type { FigureSpec } from "@/content/schema";
import type { Grid } from "../types";
import type { FigureContext } from "./context";
import { contactSheetFigure } from "./contactSheet";
import { corpusFigure } from "./corpus";
import { graphFigure } from "./graph";
import { paretoFigure } from "./pareto";
import { pipelineFigure } from "./pipeline";
import { spectrogramFigure } from "./spectrogram";

export type { FigureContext } from "./context";

/**
 * The one place a scene's figure data turns into a grid. Adding a figure means
 * adding a variant to FigureSpec and a case here, so a scene can never declare
 * a figure the site cannot draw.
 */
export const buildFigure = (spec: FigureSpec, ctx: FigureContext): Grid => {
  switch (spec.kind) {
    case "pareto":
      return paretoFigure(spec, ctx);
    case "pipeline":
      return pipelineFigure(spec, ctx);
    case "graph":
      return graphFigure(spec, ctx);
    case "corpus":
      return corpusFigure(spec, ctx);
    case "spectrogram":
      return spectrogramFigure(spec, ctx);
    case "contactSheet":
      return contactSheetFigure(spec, ctx);
  }
};
