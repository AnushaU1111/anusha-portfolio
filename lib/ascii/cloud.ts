import type { CorpusSpec } from "./figures/corpus";
import { mulberry32 } from "./noise";

/**
 * The Affordability corpus at the fine cell size: the clusters the 1.1 million
 * posts turned out to hold.
 *
 * Same division as every figure before it — the marks are characters, the
 * labels are text. What is different here is the direction of the chain: up to
 * now each figure needed fewer characters than the last, and the clusters need
 * more than the graph's edges have. So the edges dissolve into the clouds while
 * the rest of each cloud fades up where it lands, which is what a cluster
 * arriving looks like.
 *
 * The corpus itself was drawn here first, as a wall of characters standing for
 * the 1.1 million posts. At 1.5 by 2.5 px it could not be: thirty thousand
 * glyphs that close together stop being glyphs and become a haze. The clusters
 * arrive directly instead.
 */
export interface CloudMark {
  /** Px from the box's top-left. */
  x: number;
  y: number;
  idx: number;
  tone: number;
  alpha: number;
  /** Which cluster this mark belongs to, or -1 for the raw wall. */
  group: number;
}

export interface Cluster {
  /** Topic number as the map labels it. */
  id: number;
  label: string;
  /** Centre, px from the box's top-left. */
  x: number;
  y: number;
  /** Radius in px. Area stands for share of the corpus. */
  r: number;
  /** Whether this one is named on the map. */
  named: boolean;
}

export interface ClusterMap {
  marks: CloudMark[];
  clusters: Cluster[];
  width: number;
  height: number;
}

export interface ClusterOptions {
  width: number;
  height: number;
  cellW: number;
  cellH: number;
  padX?: number;
  padTop?: number;
  padBottom?: number;
}

/**
 * The clusters BERTopic recovered, laid out as the map draws them.
 *
 * Position comes from a UMAP projection, which means it carries no meaning
 * that can be read off an axis — the map's own caption says so. So the layout
 * here is a deterministic scatter rather than a claim, and what it does carry
 * honestly is area: a cluster's size stands for its share of the corpus, and
 * the shares fall off as a rank curve over the topics the scene declares.
 */
export const buildClusters = (spec: CorpusSpec, o: ClusterOptions): ClusterMap => {
  const { cellW, cellH, width, height } = o;
  const padX = o.padX ?? 40;
  const padTop = o.padTop ?? 28;
  const padBottom = o.padBottom ?? 34;
  const rnd = mulberry32(4_104_114);

  const left = padX;
  const spanX = Math.max(1, width - padX * 2);
  const top = padTop;
  const spanY = Math.max(1, height - padTop - padBottom);
  const shown = Math.max(1, Math.min(spec.topics, spec.topicsShown));

  // Share by rank, normalised over the clusters drawn, so the areas are in
  // proportion to each other even though only some of the topics are shown.
  const weight = (i: number) => 1 / (i + 1.6) ** 1.35;
  let total = 0;
  for (let i = 0; i < shown; i++) total += weight(i);

  const biggest = Math.min(spanX, spanY) * 0.27;
  const clusters: Cluster[] = [];
  for (let i = 0; i < shown; i++) {
    const share = weight(i) / total;
    // Area stands for share, so the radius goes as its square root.
    const r = Math.max(cellH * 2.5, biggest * Math.sqrt(share / (weight(0) / total)));
    // Rejection-sampled onto the box so clusters sit apart rather than on top
    // of one another. Deterministic: the same seed gives the same map.
    let x = 0;
    let y = 0;
    let ok = false;
    for (let tries = 0; tries < 220 && !ok; tries++) {
      x = left + r + rnd() * Math.max(1, spanX - r * 2);
      y = top + r + rnd() * Math.max(1, spanY - r * 2);
      ok = clusters.every((q) => Math.hypot(q.x - x, q.y - y) > (q.r + r) * 0.92);
    }
    // Topic numbers come from the whole set, not from the drawing order: this
    // map shows fourteen of forty-one, and saying so means the ids it prints
    // have to be scattered through the forty-one rather than counting up.
    const id = 1 + ((i * 7 + 3) % Math.max(1, spec.topics));
    clusters.push({
      id,
      label: `topic ${String(id).padStart(2, "0")}`,
      x,
      y,
      r,
      // The large ones are named; the tail is drawn and left unlabelled, which
      // is what "41 topics, 14 shown, labels withheld" means on the map.
      named: i < Math.min(6, shown),
    });
  }

  const marks: CloudMark[] = [];
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    if (!c) continue;
    const cols = Math.ceil(c.r / cellW);
    const rows = Math.ceil(c.r / cellH);
    for (let ry = -rows; ry <= rows; ry++) {
      for (let rx = -cols; rx <= cols; rx++) {
        const ox = rx * cellW;
        const oy = ry * cellH;
        const d = Math.hypot(ox, oy) / c.r;
        if (d > 1) continue;
        // Denser in the middle and ragged at the edge, because a cluster is a
        // density and not a disc.
        const v = (1 - d) ** 0.7;
        if (rnd() > 0.18 + v * 0.42) continue;
        marks.push({
          x: c.x + ox,
          y: c.y + oy,
          idx: Math.max(2, Math.min(10, Math.round(2 + v * 8))),
          tone: 0.3 + v * 0.55,
          alpha: 0.42 + v * 0.55,
          group: i,
        });
      }
    }
  }

  return { marks, clusters, width, height };
};
