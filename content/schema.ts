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
