import { z } from "zod";

/**
 * Every number that appears on the site is declared here and validated at
 * build time. A figure and the caption beside it read from the same object,
 * so they cannot drift apart.
 */

export const Metric = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  accent: z.boolean().default(false),
});
export type Metric = z.infer<typeof Metric>;

export const Source = z.object({
  kind: z.enum(["report", "repository", "poster", "resume", "notes"]),
  note: z.string().min(1),
  url: z.string().url().optional(),
});
export type Source = z.infer<typeof Source>;

/**
 * Every generated figure declares its numbers here rather than inside the
 * generator, so the figure and the caption beside it read the same object.
 * Shape that is a drawing decision rather than a fact, a node's position or
 * a frequency band, stays in lib/ascii/figures and the scene says so in
 * `illustrative`.
 */
export const FigureSpec = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("pareto"),
    models: z.number().int().positive(),
    agents: z.number().int().positive(),
    /** Quality in [0, 1] and cost in dollars, for the two models the scene is about. */
    production: z.object({ quality: z.number(), cost: z.number(), p95: z.number() }),
    recommended: z.object({ quality: z.number(), cost: z.number(), p95: z.number() }),
    costAxis: z.array(z.number().positive()).min(2),
  }),
  z.object({
    kind: z.literal("pipeline"),
    inputs: z.array(z.string().min(1)).min(1),
    normalise: z.array(z.string().min(1)).min(1),
    indexes: z.array(z.string().min(1)).min(1),
    scorer: z.string().min(1),
    model: z.string().min(1),
    gate: z.string().min(1),
    outputs: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    kind: z.literal("graph"),
    nodeTypes: z.array(z.string().min(1)).min(1),
    edgeTypes: z.array(z.string().min(1)).min(1),
    /** The illustrative instance the entry figure draws. */
    nodes: z.number().int().positive(),
    edges: z.number().int().positive(),
    /**
     * What selecting a node shows: the sentence that produced it. Illustrative,
     * like the instance itself, and the scene says so. A node with no line here
     * shows its relations and nothing it cannot stand behind.
     */
    transcript: z
      .array(
        z.object({
          node: z.string().min(1),
          quote: z.string().min(1),
          at: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
          speaker: z.string().min(1),
          session: z.string().min(1),
        }),
      )
      .default([]),
  }),
  z.object({
    kind: z.literal("corpus"),
    posts: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("spectrogram"),
    frames: z.number().int().positive(),
    classes: z
      .array(
        z.object({
          name: z.string().min(1),
          support: z.number().int().positive(),
          precision: z.number(),
          recall: z.number(),
          f1: z.number(),
        }),
      )
      .min(2),
  }),
  z.object({
    kind: z.literal("contactSheet"),
    total: z.number().int().positive(),
    positive: z.number().int().positive(),
  }),
]);
export type FigureSpec = z.infer<typeof FigureSpec>;

/**
 * The second state of a scene: what the reader gets once the entry figure has
 * had its say. Only the Temple scene has one so far, which is why it is
 * optional rather than part of every scene.
 *
 * Weights and alpha are the system's defaults, not measured results, and the
 * scene's `illustrative` list says so on the page.
 */
export const SceneDetail = z.object({
  waysIn: z
    .array(
      z.object({
        key: z.string().min(1),
        what: z.string().min(1),
        how: z.string().min(1),
      }),
    )
    .min(1),
  retrieval: z
    .array(
      z.object({
        label: z.string().min(1),
        /** Share of the hybrid score, at the default setting. */
        weight: z.number().min(0).max(1),
        source: z.string().min(1),
      }),
    )
    .min(1),
  /** Where the keyword-to-semantic slider sits by default. 0 is all keyword. */
  hybridAlpha: z.number().min(0).max(1),
  assessed: z.array(z.string().min(1)).min(1),
  assessedNote: z.string().min(1),
  keeps: z.array(z.object({ label: z.string().min(1), note: z.string().min(1) })).min(1),
});
export type SceneDetail = z.infer<typeof SceneDetail>;

export const Scene = z.object({
  /** Two-digit scene number as shown in the eyebrow. */
  index: z.string().regex(/^\d{2}$/),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  org: z.string().min(1),
  period: z.string().min(1),
  /** Rendered with the last segment in italic. */
  headline: z.tuple([z.string(), z.string()]),
  lede: z.string().min(1),
  body: z.array(z.string().min(1)).min(1),
  pull: z.string().min(1),
  metrics: z.array(Metric).min(2).max(4),
  stack: z.array(z.string().min(1)).min(1),
  credit: z.string().optional(),
  /** Whether the scene pins for one viewport while its entry figure resolves. */
  pinned: z.boolean(),
  /** Which pre-built grid the entry figure uses. */
  entryGrid: z.string().min(1),
  /** The data the entry figure is generated from. */
  figure: FigureSpec,
  /** A second state, shown once the entry figure has resolved and given way. */
  detail: SceneDetail.optional(),
  /** Figures marked illustrative say so on the figure. */
  illustrative: z.array(z.string()).default([]),
  sources: z.array(Source).min(1),
});
export type Scene = z.infer<typeof Scene>;

export const Link = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  /** Shown on hover; never printed at rest. */
  reveal: z.string().min(1),
});
export type Link = z.infer<typeof Link>;

export const Profile = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  location: z.string().min(1),
  available: z.string().min(1),
  status: z.array(z.string().min(1)),
  now: z.string().min(1),
  recently: z.string().min(1),
  focus: z.string().min(1),
});
export type Profile = z.infer<typeof Profile>;
