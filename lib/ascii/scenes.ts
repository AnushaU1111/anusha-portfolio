import { projects } from "@/content/projects";
import type { Scene } from "@/content/schema";
import { buildFigure, type FigureContext } from "./figures";
import { createFlyIn, type FlyIn } from "./flyin";
import { noiseFor } from "./noise";
import { CELL_H, CELL_W } from "./ramp";
import { placeGrid, anchorCol, type Anchor } from "./place";
import { emptyGrid, type Grid } from "./types";

/**
 * A scene tells the field three things: which figure to show, where to put
 * it, and how the figure should look before it resolves. The field handles
 * pinning, scroll progress and interpolation; scenes stay declarative.
 */
export interface SceneSpec {
  id: string;
  /** DOM id of the section that drives this scene's scroll progress. */
  sectionId: string;
  /**
   * Loads the resolved figure at the current viewport size. Photographic
   * grids come from public/grids and ignore the context; generated ones size
   * themselves from it, so a resize regenerates rather than scales.
   */
  figure: (ctx: FigureContext) => Promise<Grid>;
  anchor: Anchor;
  /** Vertical offset in cells from the top of the viewport, or centred. */
  top: number | "center";
  /** Whether the section pins for one viewport while the figure resolves. */
  pinned: boolean;
  /** How the figure looks at progress 0. */
  entry: "noise" | "previous";
  /**
   * Whether the palette shifts toward neutral as progress goes 0 to 1. Used by
   * About, where the characters resolve toward the photograph.
   */
  resolvesToNeutral?: boolean;
  /** Cursor brightening radius in cells. */
  hoverRadius?: number;
  /**
   * Characters arrive from every edge rather than resolving in place. The
   * cold open uses this: it holds nothing until the page is scrolled.
   */
  flyIn?: boolean;
  /**
   * Overrides when this scene's progress runs, in ScrollTrigger terms. Used
   * where a scene has to share a window with something outside the field, so
   * the two cannot drift apart.
   */
  trigger?: { start: string; end: string };
}

const loadGrid = (name: string) => async (): Promise<Grid> => {
  const res = await fetch(`/grids/${name}.json`);
  if (!res.ok) throw new Error(`grid ${name} missing; run npm run grids`);
  return (await res.json()) as Grid;
};

/**
 * Where each project's entry figure sits, in cells from the top of the
 * viewport. Figures alternate nothing here: every project section puts its
 * text in a fixed left column, so every project figure is anchored right and
 * only its height changes.
 */
const TOP: Record<string, number> = {
  neuraluna: 12,
  "temple-rag": 24,
  reqtrace: 14,
  affordability: 9,
  acoustic: 10,
  "skin-cancer": 6,
};

/**
 * Scenes whose figure lives on MorphField instead, at a cell a fifth this
 * size. The shared field draws nothing for them; the scene stays so the
 * section still pins and the chain of entries is unbroken.
 */
const ON_MORPH_FIELD = new Set(["neuraluna", "temple-rag", "reqtrace"]);

/**
 * How long a pinned section holds, where a full viewport is too long. Neuraluna
 * is one: its chart has finished arriving by the moment the section pins, so
 * the default hold is a whole viewport of scrolling in which nothing happens.
 */
const HOLD: Record<string, string> = { neuraluna: "+=35%", reqtrace: "+=55%" };

const projectScene = (p: Scene): SceneSpec => {
  const spec: SceneSpec = {
    id: p.slug,
    sectionId: p.slug,
    // Generated from the scene's own figure data, so the figure and the numbers
    // beside it cannot disagree.
    figure: ON_MORPH_FIELD.has(p.slug)
      ? () => Promise.resolve(emptyGrid(1, 1))
      : (ctx) => Promise.resolve(buildFigure(p.figure, ctx)),
    anchor: "right",
    top: TOP[p.slug] ?? 10,
    pinned: p.pinned,
    // Every project figure enters out of the one before it. The handoff between
    // two scenes is the previous target coming apart into this one.
    entry: "previous",
  };
  const hold = HOLD[p.slug];
  if (p.pinned && hold !== undefined) spec.trigger = { start: "top top", end: hold };
  return spec;
};

export const scenes: SceneSpec[] = [
  // The flower lives on MorphField now, at a cell a fifth this size, so the
  // shared field draws nothing here. The scene stays so the hero still pins
  // for a viewport while the flower assembles.
  { id: "cold-open", sectionId: "top", figure: () => Promise.resolve(emptyGrid(1, 1)), anchor: "center", top: "center", pinned: true, entry: "noise" },
  // The portrait has its own canvas at its own cell size, so the shared field
  // has nothing to draw here. It still gets a scene: the lily comes apart into
  // this empty grid while the face arrives, which is the handover.
  //
  // The window is the same one PhotoField reads from the section's rect, from
  // the top edge entering the viewport to it being nearly all the way up, so
  // the flower starts disintegrating on the frame the face starts arriving.
  {
    id: "about",
    sectionId: "about",
    figure: () => Promise.resolve(emptyGrid(1, 1)),
    anchor: "left",
    top: 4,
    pinned: false,
    entry: "previous",
    trigger: { start: "top bottom", end: "top 15%" },
  },
  ...projects.map(projectScene),
  { id: "contact", sectionId: "contact", figure: loadGrid("lily"), anchor: "right", top: -8, pinned: false, entry: "previous" },
];

export interface PreparedScene {
  spec: SceneSpec;
  /** The figure placed in a viewport-sized grid. */
  target: Grid;
  /** What the field shows at progress 0 if entry is noise. */
  noise: Grid;
  /** Where each character starts, for a scene that flies in. */
  fly?: FlyIn;
}

/** Cell offset that centres a figure vertically, or the offset it asked for. */
const topRow = (spec: SceneSpec, figureRows: number, rows: number): number =>
  spec.top === "center" ? Math.max(0, Math.round((rows - figureRows) / 2)) : spec.top;

/**
 * Builds and places one scene. The field uses this to get the cold open up
 * before it pays for the other eight figures.
 */
export const prepareScene = async (
  spec: SceneSpec,
  index: number,
  cols: number,
  rows: number,
): Promise<PreparedScene> => {
  const fig = await spec.figure({ cols, rows }).catch((err: unknown) => {
    console.error(`scene ${spec.id}:`, err);
    return { cols: 1, rows: 1, cells: [0] } satisfies Grid;
  });
  const target = placeGrid(fig, cols, rows, anchorCol(fig.cols, cols, spec.anchor), topRow(spec, fig.rows, rows));
  const prepared: PreparedScene = { spec, target, noise: noiseFor(target, index + 1) };
  if (spec.flyIn) prepared.fly = createFlyIn(target, { cellW: CELL_W, cellH: CELL_H });
  return prepared;
};

/** Places every scene's figure into a shared viewport grid. */
export const prepareScenes = async (
  specs: SceneSpec[],
  cols: number,
  rows: number,
): Promise<PreparedScene[]> => {
  const ctx: FigureContext = { cols, rows };
  // One figure that fails to load must not take the other eight with it: a
  // missing pre-built grid leaves its own scene empty and the generated
  // scenes carry on.
  const figures = await Promise.all(
    specs.map((s) =>
      s.figure(ctx).catch((err: unknown) => {
        console.error(`scene ${s.id}:`, err);
        return { cols: 1, rows: 1, cells: [0] } satisfies Grid;
      }),
    ),
  );
  return specs.map((spec, i) => {
    const fig = figures[i] ?? { cols: 1, rows: 1, cells: [0] };
    const target = placeGrid(fig, cols, rows, anchorCol(fig.cols, cols, spec.anchor), topRow(spec, fig.rows, rows));
    const prepared: PreparedScene = { spec, target, noise: noiseFor(target, i + 1) };
    if (spec.flyIn) prepared.fly = createFlyIn(target, { cellW: CELL_W, cellH: CELL_H });
    return prepared;
  });
};
