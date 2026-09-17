"use client";

import { useEffect, useRef, useState } from "react";
import { buildParetoChart, modelAt, type ChartModel, type ParetoChart } from "@/lib/ascii/chart";
import type { ParetoSpec } from "@/lib/ascii/figures/pareto";
import type { GraphSpec } from "@/lib/ascii/figures/graph";
import type { PipelineSpec } from "@/lib/ascii/figures/pipeline";
import {
  buildAsciiGraph,
  neighbourhoodOf,
  nodeAt,
  type AsciiGraph,
  type GraphNode,
  type Neighbourhood,
  type NodeKind,
} from "@/lib/ascii/graph";
import { buildClusters, type Cluster, type ClusterMap } from "@/lib/ascii/cloud";
import type { CorpusSpec } from "@/lib/ascii/figures/corpus";
import type { SpectrogramSpec } from "@/lib/ascii/figures/spectrogram";
import type { ContactSheetSpec } from "@/lib/ascii/figures/contactSheet";
import { buildBars, type BarChart } from "@/lib/ascii/bars";
import { buildWave, type Wave } from "@/lib/ascii/wave";
import { buildDisperse, buildPairs, buildRelay, gridMarks, stampPairs, type MorphPairs } from "@/lib/ascii/morph";
import { buildPipe, type Pipe, type PipeNode } from "@/lib/ascii/pipe";
import { photoRows, rgbaToPhotoGrid } from "@/lib/ascii/photo";
import { CELL_ASPECT } from "@/lib/ascii/ramp";
import { buildGlyphMasks, type GlyphMasks } from "@/lib/ascii/stamp";
import type { Grid } from "@/lib/ascii/types";

/** One cell on this canvas, in CSS px. Fine enough that a glyph is a pixel or two. */
const CELL_W = 1.5;
const CELL_H = CELL_W / CELL_ASPECT;
/** Characters across each figure. */
const FLOWER_COLS = 520;
const FACE_COLS = 440;
/** The share of the hero's scroll spent assembling the flower. */
const FLY_COMPLETE = 0.82;
/**
 * The share of the flower's assembly after which the hero's statement fades
 * in. The line is meant to arrive as the last characters land, so it waits
 * until the figure is nearly whole and is fully there when it is.
 */
const LILY_FORMED = 0.85;
/**
 * How far into the chart's arrival the markers stop moving enough to be worth
 * pointing at. Below this the cursor would be picking models out of a cloud
 * that is still in flight.
 */
const CHART_LIVE = 0.92;
const CARD_W = 292;
const CARD_H = 82;
/** Same idea for the graph: nothing is selectable until it has settled. */
const GRAPH_LIVE = 0.9;
/** How far the rest of the graph recedes while one node is selected. */
const GRAPH_DIM = 0.2;
/**
 * Below this the figures are laid out for a narrow box: the pipeline runs down
 * instead of across, the dependency graph draws its eight-node subset, and the
 * bar names sit above their bars. Same number as Tailwind's `md`, which every
 * `max-md:` rule in the layout is keyed to, so the canvas and the DOM agree
 * about where the phone form starts.
 */
const NARROW_AT_PX = 768;
const isNarrow = () => window.innerWidth < NARROW_AT_PX;

interface Props {
  flowerSrc: string;
  faceSrc: string;
  /** Element the face lands on. The flower starts centred in the viewport. */
  targetId: string;
  /** Element the chart is drawn in, in the Neuraluna section. */
  chartTargetId?: string;
  chartSpec?: ParetoSpec;
  /** Element the pipeline diagram is drawn in, in the Temple section. */
  pipeTargetId?: string;
  pipeSpec?: PipelineSpec;
  /**
   * Element whose arrival pulls the pipeline apart. The Temple results panel is
   * one: as it rises the diagram parts sideways and goes, rather than simply
   * being covered over.
   */
  pipeExitId?: string;
  /** Element the dependency graph is drawn in, in the ReqTrace section. */
  graphTargetId?: string;
  graphSpec?: GraphSpec;
  /** The illustrative sentence behind each node, for the selection card. */
  transcript?: TranscriptLine[];
  /** Element the topic clusters land in, in the Affordability section. */
  clusterTargetId?: string;
  corpusSpec?: CorpusSpec;
  /**
   * Element whose arrival brings the clusters in. The section itself, rather
   * than the map's own box: the box sits low in the column, so cueing off it
   * would assemble the clusters off the bottom of the screen.
   */
  clusterCueId?: string;
  /** Element the log-mel window fills, in the Acoustic section. */
  waveTargetId?: string;
  waveSpec?: SpectrogramSpec;
  /** Element whose arrival brings the window in. */
  waveCueId?: string;
  /** Element the stage bars are drawn in, in the Screening section. */
  barTargetId?: string;
  barSpec?: ContactSheetSpec;
  /** Element whose arrival brings the bars in. */
  barCueId?: string;
  /**
   * Element the lily returns to, on the contact page. The site closes on the
   * figure it opened with, and it is the same figure: the same grid, sampled
   * once, collected with the same arguments as the opening pairing.
   */
  flowerTargetId?: string;
  flowerCueId?: string;
}

export interface TranscriptLine {
  node: string;
  quote: string;
  at: string;
  speaker: string;
  session: string;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
/** How far a box is into its arrival: 0 as its top edge enters, 1 near the top. */
const arrival = (top: number, vh: number) => clamp01((vh - top) / (vh * 0.85));
/** Strips a figure's marks down to what the morph needs from them. */
const plain = (marks: { x: number; y: number; idx: number; tone: number; alpha: number; group?: number }[]) =>
  marks.map((m) => ({ x: m.x, y: m.y, idx: m.idx, tone: m.tone, alpha: m.alpha, group: m.group ?? -1 }));

/**
 * The cold open, the portrait and the Pareto chart, on one canvas at one cell
 * size, because each becoming the next has to be the same characters moving.
 * The shared field cannot do it: its cell is 4.8 by 8 px and this needs 1.5 by
 * 2.5, and two cell sizes have nothing to interpolate against each other.
 *
 * Fixed and full-viewport. The flower assembles centred as the hero scrolls;
 * over the About section's arrival every character travels to its place in the
 * face; over the Neuraluna section's arrival the face comes apart, a few
 * thousand characters flying into the plot and the rest drifting off, because
 * the chart needs far fewer characters than the picture has; and over the
 * Temple section's arrival the plot's own characters travel again, into the
 * runs between the nodes of the pipeline.
 *
 * Only the figures themselves are made of characters. Axes, ticks, tooltips
 * and node labels are real text laid over the canvas: at this cell size a
 * character is a pixel, so nothing legible can be built out of them.
 */
export function MorphField({
  flowerSrc,
  faceSrc,
  targetId,
  chartTargetId,
  chartSpec,
  pipeTargetId,
  pipeSpec,
  pipeExitId,
  graphTargetId,
  graphSpec,
  transcript,
  clusterTargetId,
  corpusSpec,
  clusterCueId,
  waveTargetId,
  waveSpec,
  waveCueId,
  barTargetId,
  barSpec,
  barCueId,
  flowerTargetId,
  flowerCueId,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const pipeOverlay = useRef<HTMLDivElement>(null);
  const graphOverlay = useRef<HTMLDivElement>(null);
  const cloudOverlay = useRef<HTMLDivElement>(null);
  const waveOverlay = useRef<HTMLDivElement>(null);
  const barOverlay = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<ParetoChart | null>(null);
  const [pipe, setPipe] = useState<Pipe | null>(null);
  const [graph, setGraph] = useState<AsciiGraph | null>(null);
  const [clusters, setClusters] = useState<ClusterMap | null>(null);
  const [wave, setWave] = useState<Wave | null>(null);
  const [bars, setBars] = useState<BarChart | null>(null);
  const [hover, setHover] = useState(-1);
  const [picked, setPicked] = useState(-1);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let disposed = false;
    const alive = () => !disposed;
    /** Last value published to --lily-in, so the root is not restyled per frame. */
    let lastFormed = -1;
    // Presence of the attribute is what arms the gate. Until this runs — no
    // JS, a failed mount, the server-rendered first paint — the hero statement
    // stays visible, because a missing flower must not cost the page its copy.
    const root = document.documentElement;
    root.dataset.lily = "gated";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    interface Built {
      /** The flower becoming the face. */
      toFace: MorphPairs;
      /** The face coming apart into the chart, or null if there is no chart. */
      toChart: MorphPairs | null;
      chart: ParetoChart | null;
      /** The chart's own characters travelling into the pipeline's runs. */
      toPipe: MorphPairs | null;
      pipe: Pipe | null;
      /** The pipeline's runs travelling into the graph's edges. */
      toGraph: MorphPairs | null;
      graph: AsciiGraph | null;
      /** The graph's edges arriving as the corpus's topic clusters. */
      toClusters: MorphPairs | null;
      clusters: ClusterMap | null;
      /** The clusters travelling into the log-mel window. */
      toWave: MorphPairs | null;
      wave: Wave | null;
      /** And the window coming apart into the last figure on the site. */
      toBars: MorphPairs | null;
      bars: BarChart | null;
      /** And the bars becoming the lily again, which is where the site ends. */
      toFlower: MorphPairs | null;
      flowerW2: number;
      flowerH2: number;
      /** Kept so a resize can rebuild the later stages against the new boxes. */
      face: Grid;
      flowerGrid: Grid;
      glyphs: GlyphMasks;
      acc: Float32Array;
      buf: ImageData;
      flowerW: number;
      flowerH: number;
      faceW: number;
      faceH: number;
    }
    let built: Built | null = null;
    let raf = 0;
    let running = false;
    let cursor: { x: number; y: number } | null = null;
    let cursorStrength = 0;
    let lastT = 0;
    let hovered = -1;
    let selected = -1;
    /** One byte per graph edge: the edges the selected node is an end of. */
    let keep: Uint8Array | null = null;

    const size = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    const boxOf = (id: string | undefined): Box | null => {
      if (!id) return null;
      const el = document.getElementById(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    };

    /** Where a figure of this size sits inside a box, in viewport px. */
    const centred = (box: Box, w: number, h: number) => ({
      x: box.x + (box.w - w) / 2,
      y: box.y + (box.h - h) / 2,
    });

    /** Builds the chart and the pairing that lands on it, for a given box. */
    const buildChart = (b: Built, box: Box) => {
      if (!chartSpec) return;
      const width = Math.round(box.w);
      const height = Math.round(box.h);
      if (width < 120 || height < 120) {
        b.chart = null;
        b.toChart = null;
        return;
      }
      const c = buildParetoChart(chartSpec, { width, height, cellW: CELL_W, cellH: CELL_H });
      b.chart = c;
      b.toChart = buildDisperse(b.face, plain(c.marks), {
        cellW: CELL_W,
        cellH: CELL_H,
        scatter: 190,
        seed: 20260916,
      });
      setChart(c);
    };

    /**
     * The pipeline, and the pairing from the chart's marks onto its runs. It
     * has to be built from the same list the chart stage ended on, or the
     * fourth stage would start from something other than what is on screen.
     */
    const buildPipeline = (b: Built, box: Box) => {
      if (!pipeSpec || !b.chart) return;
      const width = Math.round(box.w);
      const height = Math.round(box.h);
      if (width < 200 || height < 160) {
        b.pipe = null;
        b.toPipe = null;
        return;
      }
      const p = buildPipe(pipeSpec, { width, height, cellW: CELL_W, cellH: CELL_H, vertical: isNarrow() });
      b.pipe = p;
      b.toPipe = buildRelay(plain(b.chart.marks), plain(p.marks), {
        cellW: CELL_W,
        cellH: CELL_H,
        scatter: 220,
        seed: 40417,
      });
      setPipe(p);
    };

    /**
     * The dependency graph, and the pairing from the pipeline's runs onto its
     * edges. Built from the list the pipeline stage ends on, for the same
     * reason: the fifth stage has to start from what is on screen.
     */
    const buildGraphStage = (b: Built, box: Box) => {
      if (!graphSpec || !b.pipe) return;
      const width = Math.round(box.w);
      const height = Math.round(box.h);
      if (width < 200 || height < 200) {
        b.graph = null;
        b.toGraph = null;
        return;
      }
      const g = buildAsciiGraph(graphSpec, { width, height, cellW: CELL_W, cellH: CELL_H, narrow: isNarrow() });
      b.graph = g;
      b.toGraph = buildRelay(plain(b.pipe.marks), plain(g.marks), {
        cellW: CELL_W,
        cellH: CELL_H,
        scatter: 240,
        seed: 51026,
      });
      setGraph(g);
    };

    /**
     * The clusters, and the pairing from the graph's edges into them. This is
     * the one stage where the destination needs more characters than the source
     * has: the edges dissolve into the clouds while the rest of each cloud
     * fades up where it lands.
     */
    const buildClusterStage = (b: Built, box: Box) => {
      if (!corpusSpec || !b.graph) return;
      const width = Math.round(box.w);
      const height = Math.round(box.h);
      if (width < 200 || height < 140) {
        b.clusters = null;
        b.toClusters = null;
        return;
      }
      const c = buildClusters(corpusSpec, { width, height, cellW: CELL_W, cellH: CELL_H });
      b.clusters = c;
      b.toClusters = buildRelay(plain(b.graph.marks), plain(c.marks), {
        cellW: CELL_W,
        cellH: CELL_H,
        scatter: 200,
        seed: 71248,
      });
      setClusters(c);
    };

    /**
     * The log-mel window, and the pairing from the clusters into it. The window
     * wants more characters than the clouds have, so the clouds travel into it
     * and the rest of it fills in around them.
     */
    const buildWaveStage = (b: Built, box: Box) => {
      if (!waveSpec || !b.clusters) return;
      const width = Math.round(box.w);
      const height = Math.round(box.h);
      if (width < 200 || height < 140) {
        b.wave = null;
        b.toWave = null;
        return;
      }
      const w = buildWave(waveSpec, { width, height, cellW: CELL_W, cellH: CELL_H });
      b.wave = w;
      b.toWave = buildRelay(plain(b.clusters.marks), plain(w.marks), {
        cellW: CELL_W,
        cellH: CELL_H,
        scatter: 220,
        seed: 82359,
      });
      setWave(w);
    };

    /**
     * The stage bars, and the pairing from the window into them. Six runs need
     * a fraction of what a spectrogram does, so most of the window drifts off
     * and what lands is the argument reduced to six numbers.
     */
    const buildBarStage = (b: Built, box: Box) => {
      if (!barSpec || !b.wave) return;
      const width = Math.round(box.w);
      const height = Math.round(box.h);
      if (width < 300 || height < 100) {
        b.bars = null;
        b.toBars = null;
        return;
      }
      const c = buildBars(barSpec, { width, height, cellW: CELL_W, cellH: CELL_H, stacked: isNarrow() });
      b.bars = c;
      b.toBars = buildRelay(plain(b.wave.marks), plain(c.marks), {
        cellW: CELL_W,
        cellH: CELL_H,
        scatter: 240,
        seed: 96471,
      });
      setBars(c);
    };

    /**
     * The lily again. Built once the bars exist, from the flower grid already
     * sampled for the opening — so the last figure on the site is the first
     * one, character for character, and not a second sampling of the same
     * photograph that might differ.
     */
    const buildClosing = (b: Built, flower: Grid) => {
      if (!b.bars) return;
      b.toFlower = buildRelay(plain(b.bars.marks), gridMarks(flower, CELL_W, CELL_H, true, 2), {
        cellW: CELL_W,
        cellH: CELL_H,
        scatter: 260,
        seed: 10_916,
      });
    };

    const render = () => {
      if (!built || !alive()) return;
      const vh = window.innerHeight || 1;
      const vw = window.innerWidth || 1;
      const flyT = reduced ? 1 : clamp01(window.scrollY / (vh * FLY_COMPLETE));
      // Hand the flower's own progress to the hero copy, which fades in on it.
      // Under reduced motion flyT is already 1, so the line is simply there.
      const formed = clamp01((flyT - LILY_FORMED) / (1 - LILY_FORMED));
      if (Math.abs(formed - lastFormed) > 0.004) {
        lastFormed = formed;
        document.documentElement.style.setProperty("--lily-in", formed.toFixed(3));
      }

      const faceTarget = boxOf(targetId);
      const faceOrigin = faceTarget
        ? centred(faceTarget, built.faceW, built.faceH)
        : { x: (vw - built.faceW) / 2, y: (vh - built.faceH) / 2 };
      const morphT = faceTarget ? (reduced ? 1 : arrival(faceTarget.y, vh)) : 0;

      const chartBox = built.toChart ? boxOf(chartTargetId) : null;
      const chartT = chartBox ? (reduced ? (chartBox.y < vh * 0.9 ? 1 : 0) : arrival(chartBox.y, vh)) : 0;

      const pipeBox = built.toPipe ? boxOf(pipeTargetId) : null;
      const pipeT = pipeBox ? (reduced ? (pipeBox.y < vh * 0.9 ? 1 : 0) : arrival(pipeBox.y, vh)) : 0;

      // What the pipeline is making way for. Its arrival is the parting.
      const exit = pipeExitId ? document.getElementById(pipeExitId) : null;
      const partT = exit && !reduced ? arrival(exit.getBoundingClientRect().top, vh) : 0;

      const graphBox = built.toGraph ? boxOf(graphTargetId) : null;
      const graphT = graphBox ? (reduced ? (graphBox.y < vh * 0.9 ? 1 : 0) : arrival(graphBox.y, vh)) : 0;

      // The clusters land in a box low in the column, but they are cued by the
      // section: they have to be arriving while the reader is on this page, not
      // once they have scrolled down to the map itself.
      const clusterBox = built.toClusters ? boxOf(clusterTargetId) : null;
      const cue = clusterCueId ? document.getElementById(clusterCueId) : null;
      const clusterT =
        clusterBox && cue ? (reduced ? 1 : arrival(cue.getBoundingClientRect().top, vh)) : 0;

      // The pipeline's runs have to cross the Temple results panel to reach the
      // graph, and that panel is opaque. So for the crossing the canvas is
      // lifted above the page's own content and put back down once the graph
      // has arrived in its own column. It stays under the nav either way.
      canvas.style.zIndex = graphT > 0.002 && graphT < 0.82 ? "20" : "0";

      const flowerOrigin = {
        x: (vw - built.flowerW) / 2,
        y: (vh - built.flowerH) / 2,
      };

      const waveBox = built.toWave ? boxOf(waveTargetId) : null;
      const waveCue = waveCueId ? document.getElementById(waveCueId) : null;
      const waveT =
        waveBox && waveCue ? (reduced ? 1 : arrival(waveCue.getBoundingClientRect().top, vh)) : 0;

      const barBox = built.toBars ? boxOf(barTargetId) : null;
      const barCue = barCueId ? document.getElementById(barCueId) : null;
      const barT = barBox && barCue ? (reduced ? 1 : arrival(barCue.getBoundingClientRect().top, vh)) : 0;

      const closeTarget = built.toFlower ? boxOf(flowerTargetId) : null;
      const closeCue = flowerCueId ? document.getElementById(flowerCueId) : null;
      const closeT =
        closeTarget && closeCue ? (reduced ? 1 : arrival(closeCue.getBoundingClientRect().top, vh)) : 0;
      const closeOrigin = closeTarget
        ? centred(closeTarget, built.flowerW2, built.flowerH2)
        : { x: 0, y: 0 };

      if (closeT > 0 && built.toFlower && closeTarget && barBox) {
        // Back to the lily, centred in its box the way the cold open centres
        // it in the viewport.
        stampPairs(built.acc, built.buf.data, canvas.width, canvas.height, built.toFlower, built.glyphs, {
          cellW: CELL_W,
          cellH: CELL_H,
          srcOrigin: { x: barBox.x, y: barBox.y },
          dstOrigin: closeOrigin,
          flyT: 1,
          morphT: closeT,
          cursor,
          cursorStrength: reduced ? 0 : cursorStrength * closeT,
          cursorRadius: 90,
        });
      } else if (barT > 0 && built.toBars && barBox && waveBox) {
        // The window reduced to what each stage bought.
        stampPairs(built.acc, built.buf.data, canvas.width, canvas.height, built.toBars, built.glyphs, {
          cellW: CELL_W,
          cellH: CELL_H,
          srcOrigin: { x: waveBox.x, y: waveBox.y },
          dstOrigin: { x: barBox.x, y: barBox.y },
          flyT: 1,
          morphT: barT,
          cursor: null,
          cursorStrength: 0,
        });
      } else if (waveT > 0 && built.toWave && waveBox && clusterBox) {
        // The clouds travelling into what the model actually hears.
        stampPairs(built.acc, built.buf.data, canvas.width, canvas.height, built.toWave, built.glyphs, {
          cellW: CELL_W,
          cellH: CELL_H,
          srcOrigin: { x: clusterBox.x, y: clusterBox.y },
          dstOrigin: { x: waveBox.x, y: waveBox.y },
          flyT: 1,
          morphT: waveT,
          cursor: null,
          cursorStrength: 0,
        });
      } else if (clusterT > 0 && built.toClusters && clusterBox && graphBox) {
        // The edges arriving as the clouds the corpus turned out to hold.
        stampPairs(built.acc, built.buf.data, canvas.width, canvas.height, built.toClusters, built.glyphs, {
          cellW: CELL_W,
          cellH: CELL_H,
          srcOrigin: { x: graphBox.x, y: graphBox.y },
          dstOrigin: { x: clusterBox.x, y: clusterBox.y },
          flyT: 1,
          morphT: clusterT,
          cursor: null,
          cursorStrength: 0,
        });
      } else if (graphT > 0 && built.toGraph && graphBox && pipeBox) {
        // The runs travelling into the graph's edges. Selecting a node holds
        // the edges it is an end of and lets the other twenty recede.
        stampPairs(built.acc, built.buf.data, canvas.width, canvas.height, built.toGraph, built.glyphs, {
          cellW: CELL_W,
          cellH: CELL_H,
          srcOrigin: { x: pipeBox.x, y: pipeBox.y },
          dstOrigin: { x: graphBox.x, y: graphBox.y },
          flyT: 1,
          morphT: graphT,
          cursor: null,
          cursorStrength: 0,
          dim: keep ? { keep, factor: GRAPH_DIM } : null,
        });
      } else if (pipeT > 0 && built.toPipe && pipeBox && chartBox) {
        // The plot's own characters travelling into the runs between nodes. At
        // the seam this draws the chart exactly as the stage before left it.
        stampPairs(built.acc, built.buf.data, canvas.width, canvas.height, built.toPipe, built.glyphs, {
          cellW: CELL_W,
          cellH: CELL_H,
          srcOrigin: { x: chartBox.x, y: chartBox.y },
          dstOrigin: { x: pipeBox.x, y: pipeBox.y },
          flyT: 1,
          morphT: pipeT,
          cursor: null,
          cursorStrength: 0,
          part: partT > 0 ? { t: partT, cx: pipeBox.x + pipeBox.w / 2, reach: vw * 0.8 } : null,
        });
      } else if (chartT > 0 && built.toChart && chartBox) {
        // The picture coming apart. At the seam this is the resolved face, so
        // the two stages hand over on the same frame without a jump.
        stampPairs(built.acc, built.buf.data, canvas.width, canvas.height, built.toChart, built.glyphs, {
          cellW: CELL_W,
          cellH: CELL_H,
          srcOrigin: faceOrigin,
          dstOrigin: { x: chartBox.x, y: chartBox.y },
          flyT: 1,
          morphT: chartT,
          cursor: null,
          cursorStrength: 0,
        });
      } else {
        stampPairs(built.acc, built.buf.data, canvas.width, canvas.height, built.toFace, built.glyphs, {
          cellW: CELL_W,
          cellH: CELL_H,
          srcOrigin: flowerOrigin,
          dstOrigin: faceOrigin,
          flyT,
          morphT,
          cursor,
          cursorStrength: reduced ? 0 : cursorStrength,
          cursorRadius: 90,
        });
      }
      ctx.putImageData(built.buf, 0, 0);

      // The axis and the tooltips travel with the box, imperatively, so a
      // scroll does not cost a React render.
      const el = overlay.current;
      if (el) {
        if (chartBox && built.chart && chartT > 0 && pipeT < 0.06) {
          el.style.transform = `translate3d(${Math.round(chartBox.x)}px, ${Math.round(chartBox.y)}px, 0)`;
          el.style.width = `${built.chart.width}px`;
          el.style.height = `${built.chart.height}px`;
          el.style.opacity = clamp01((chartT - 0.2) / 0.5).toFixed(3);
        } else {
          el.style.opacity = "0";
        }
      }

      // The node labels are static text: they arrive with the runs and then
      // stay put, because a name is for reading and not for animating.
      const pel = pipeOverlay.current;
      if (pel) {
        if (pipeBox && built.pipe && pipeT > 0 && graphT < 0.06) {
          pel.style.transform = `translate3d(${Math.round(pipeBox.x)}px, ${Math.round(pipeBox.y)}px, 0)`;
          pel.style.width = `${built.pipe.width}px`;
          pel.style.height = `${built.pipe.height}px`;
          pel.style.opacity = (clamp01((pipeT - 0.45) / 0.35) * (1 - partT ** 2)).toFixed(3);
        } else {
          pel.style.opacity = "0";
        }
      }

      const bel = barOverlay.current;
      if (bel) {
        if (barBox && built.bars && barT > 0 && closeT < 0.06) {
          bel.style.transform = `translate3d(${Math.round(barBox.x)}px, ${Math.round(barBox.y)}px, 0)`;
          bel.style.width = `${built.bars.width}px`;
          bel.style.height = `${built.bars.height}px`;
          bel.style.opacity = clamp01((barT - 0.5) / 0.32).toFixed(3);
        } else {
          bel.style.opacity = "0";
        }
      }

      const ael = waveOverlay.current;
      if (ael) {
        if (waveBox && built.wave && waveT > 0 && barT < 0.06) {
          ael.style.transform = `translate3d(${Math.round(waveBox.x)}px, ${Math.round(waveBox.y)}px, 0)`;
          ael.style.width = `${built.wave.width}px`;
          ael.style.height = `${built.wave.height}px`;
          ael.style.opacity = clamp01((waveT - 0.5) / 0.32).toFixed(3);
        } else {
          ael.style.opacity = "0";
        }
      }

      const cel = cloudOverlay.current;
      if (cel) {
        if (clusterBox && built.clusters && clusterT > 0.35 && waveT < 0.06) {
          cel.style.transform = `translate3d(${Math.round(clusterBox.x)}px, ${Math.round(clusterBox.y)}px, 0)`;
          cel.style.width = `${built.clusters.width}px`;
          cel.style.height = `${built.clusters.height}px`;
          cel.style.opacity = clamp01((clusterT - 0.55) / 0.3).toFixed(3);
        } else {
          cel.style.opacity = "0";
        }
      }

      const gel = graphOverlay.current;
      if (gel) {
        if (graphBox && built.graph && graphT > 0 && clusterT < 0.06) {
          gel.style.transform = `translate3d(${Math.round(graphBox.x)}px, ${Math.round(graphBox.y)}px, 0)`;
          gel.style.width = `${built.graph.width}px`;
          gel.style.height = `${built.graph.height}px`;
          gel.style.zIndex = canvas.style.zIndex;
          gel.style.opacity = clamp01((graphT - 0.5) / 0.32).toFixed(3);
        } else {
          gel.style.opacity = "0";
        }
      }

      // Hit-testing waits until the cloud has settled, so the cursor cannot
      // pick a model out of something still in flight.
      let nextHover = -1;
      if (cursor && chartBox && built.chart && chartT >= CHART_LIVE && pipeT < 0.06) {
        const hit = modelAt(built.chart, cursor.x - chartBox.x, cursor.y - chartBox.y);
        nextHover = hit ? hit.index : -1;
      }
      if (nextHover !== hovered) {
        hovered = nextHover;
        setHover(nextHover);
      }

      let nextPick = -1;
      if (cursor && graphBox && built.graph && graphT >= GRAPH_LIVE && clusterT < 0.06) {
        const hit = nodeAt(built.graph, cursor.x - graphBox.x, cursor.y - graphBox.y);
        nextPick = hit ? hit.index : -1;
      }
      if (nextPick !== selected) {
        selected = nextPick;
        const node = nextPick >= 0 ? built.graph?.nodes[nextPick] : undefined;
        keep = node && built.graph ? neighbourhoodOf(built.graph, node.id).edges : null;
        setPicked(nextPick);
      }
    };

    const tick = (t: number) => {
      running = false;
      if (!alive()) return;
      const dt = lastT === 0 ? 16 : Math.min(64, t - lastT);
      lastT = t;
      // The cursor's influence eases in and out, so the flower settles rather
      // than snapping back the moment the pointer leaves.
      const want = cursor ? 1 : 0;
      const k = 1 - Math.exp(-dt / (want > cursorStrength ? 90 : 220));
      const next = cursorStrength + (want - cursorStrength) * k;
      const settling = Math.abs(next - cursorStrength) > 0.002;
      cursorStrength = next;
      render();
      if (settling) schedule();
    };
    const schedule = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    /** Samples an image into a grid at one source pixel per cell. */
    const sample = async (src: string, cols: number, palette: boolean): Promise<Grid> => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      await img.decode();
      const rows = photoRows(cols, img.naturalWidth, img.naturalHeight);
      const c = document.createElement("canvas");
      c.width = cols;
      c.height = rows;
      const cx = c.getContext("2d", { willReadFrequently: true });
      if (!cx) throw new Error("no 2d context");
      cx.drawImage(img, 0, 0, cols, rows);
      const data = cx.getImageData(0, 0, cols, rows).data;
      return palette
        ? rgbaToPhotoGrid(data, cols, rows, { floor: 0.05, gamma: 0.8 })
        : rgbaToPhotoGrid(data, cols, rows, { floor: 0.02, saturation: 1.55 });
    };

    const build = async () => {
      size();
      await document.fonts.load('10px "JetBrains Mono"').catch(() => undefined);
      if (!alive()) return;
      const [flower, face] = await Promise.all([
        sample(flowerSrc, FLOWER_COLS, true),
        sample(faceSrc, FACE_COLS, false),
      ]);
      if (!alive()) return;
      built = {
        toFace: buildPairs(flower, face, { cellW: CELL_W, cellH: CELL_H, thin: 2, seed: 20260916 }),
        toChart: null,
        chart: null,
        toPipe: null,
        pipe: null,
        toGraph: null,
        graph: null,
        toClusters: null,
        clusters: null,
        toWave: null,
        wave: null,
        toBars: null,
        bars: null,
        toFlower: null,
        flowerW2: flower.cols * CELL_W,
        flowerH2: flower.rows * CELL_H,
        face,
        flowerGrid: flower,
        glyphs: buildGlyphMasks(CELL_W, CELL_H),
        acc: new Float32Array(canvas.width * canvas.height * 4),
        buf: ctx.createImageData(canvas.width, canvas.height),
        flowerW: flower.cols * CELL_W,
        flowerH: flower.rows * CELL_H,
        faceW: face.cols * CELL_W,
        faceH: face.rows * CELL_H,
      };
      const box = boxOf(chartTargetId);
      if (box) buildChart(built, box);
      const pbox = boxOf(pipeTargetId);
      if (pbox) buildPipeline(built, pbox);
      const gbox = boxOf(graphTargetId);
      if (gbox) buildGraphStage(built, gbox);
      const cbox = boxOf(clusterTargetId);
      if (cbox) buildClusterStage(built, cbox);
      const abox = boxOf(waveTargetId);
      if (abox) buildWaveStage(built, abox);
      const bbox = boxOf(barTargetId);
      if (bbox) buildBarStage(built, bbox);
      buildClosing(built, flower);
      render();
    };

    /** A figure's marks are px inside its own box, so a resized box needs them again. */
    const stale = (figure: { width: number; height: number } | null, box: Box) =>
      !figure || Math.abs(figure.width - Math.round(box.w)) > 1 || Math.abs(figure.height - Math.round(box.h)) > 1;

    const onResize = () => {
      size();
      if (built) {
        built.acc = new Float32Array(canvas.width * canvas.height * 4);
        built.buf = ctx.createImageData(canvas.width, canvas.height);
        const box = boxOf(chartTargetId);
        const pbox = boxOf(pipeTargetId);
        const gbox = boxOf(graphTargetId);
        // Each stage pairs off the marks of the one before it, so a rebuild
        // cascades forward whether the later boxes moved or not.
        const chartRebuilt = box !== null && stale(built.chart, box);
        if (box && chartRebuilt) buildChart(built, box);
        const pipeRebuilt = pbox !== null && (chartRebuilt || stale(built.pipe, pbox));
        if (pbox && pipeRebuilt) buildPipeline(built, pbox);
        const graphRebuilt = gbox !== null && (pipeRebuilt || stale(built.graph, gbox));
        if (gbox && graphRebuilt) buildGraphStage(built, gbox);
        const cbox = boxOf(clusterTargetId);
        const clusterRebuilt = cbox !== null && (graphRebuilt || stale(built.clusters, cbox));
        if (cbox && clusterRebuilt) buildClusterStage(built, cbox);
        const abox = boxOf(waveTargetId);
        const waveRebuilt = abox !== null && (clusterRebuilt || stale(built.wave, abox));
        if (abox && waveRebuilt) buildWaveStage(built, abox);
        const bbox = boxOf(barTargetId);
        if (bbox && (waveRebuilt || stale(built.bars, bbox))) {
          buildBarStage(built, bbox);
          buildClosing(built, built.flowerGrid);
        }
      }
      schedule();
    };
    const onMove = (e: PointerEvent) => {
      cursor = { x: e.clientX, y: e.clientY };
      schedule();
    };
    const onLeave = () => {
      cursor = null;
      schedule();
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    void build();

    return () => {
      disposed = true;
      delete root.dataset.lily;
      root.style.removeProperty("--lily-in");
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [
    flowerSrc,
    faceSrc,
    targetId,
    chartTargetId,
    chartSpec,
    pipeTargetId,
    pipeSpec,
    pipeExitId,
    graphTargetId,
    graphSpec,
    clusterTargetId,
    corpusSpec,
    clusterCueId,
    waveTargetId,
    waveSpec,
    waveCueId,
    barTargetId,
    barSpec,
    barCueId,
    flowerTargetId,
    flowerCueId,
  ]);

  return (
    <>
      <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0" aria-label="Anusha Upadhyay" role="img" />
      <div
        ref={overlay}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-0 opacity-0"
        style={{ willChange: "transform, opacity" }}
      >
        {chart && <Chrome chart={chart} hover={hover} />}
      </div>
      <div
        ref={pipeOverlay}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-0 opacity-0"
        style={{ willChange: "transform, opacity" }}
      >
        {pipe && <PipeChrome pipe={pipe} />}
      </div>
      <div
        ref={graphOverlay}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-0 opacity-0"
        style={{ willChange: "transform, opacity" }}
      >
        {graph && <GraphChrome graph={graph} picked={picked} transcript={transcript ?? []} />}
      </div>
      <div
        ref={cloudOverlay}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-0 opacity-0"
        style={{ willChange: "transform, opacity" }}
      >
        {clusters && <ClusterChrome map={clusters} />}
      </div>
      <div
        ref={barOverlay}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-0 opacity-0"
        style={{ willChange: "transform, opacity" }}
      >
        {bars && <BarChrome chart={bars} />}
      </div>
      <div
        ref={waveOverlay}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-0 opacity-0"
        style={{ willChange: "transform, opacity" }}
      >
        {wave && (
          <div className="absolute inset-0 font-mono">
            {/* The mel axis. Brightness is energy in the bin here, which is the
                one place on this site where it carries the data, so the axis
                has to say which way the frequency runs. */}
            <span
              className="absolute whitespace-nowrap text-[12px] uppercase tracking-[0.22em] text-[#8b8083]"
              style={{
                left: -8,
                top: "50%",
                transform: "rotate(-90deg) translate(-50%, -100%)",
                transformOrigin: "left top",
              }}
            >
              Mel frequency &uarr;
            </span>
            <span className="absolute bottom-[-18px] left-0 whitespace-nowrap text-[12px] uppercase tracking-[0.2em] text-[#8b8083]">
              Time &rarr;
            </span>
            <span className="absolute bottom-[-18px] right-0 whitespace-nowrap text-[12px] uppercase tracking-[0.2em] text-[#7c6e71]">
              {wave.cols.toLocaleString()} &times; {wave.rows} bins &middot; brightness is energy
            </span>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * The pipeline's names. Static, and at a size worth reading: the runs between
 * them are the thing made of characters, and a name drawn out of 1.5px cells
 * would not be a name.
 */
const NODE_CLASS: Record<PipeNode["kind"], string> = {
  input: "text-[#cfc4be]",
  normalise: "text-[#a2958f]",
  index: "text-[#cfc4be]",
  spine: "text-[#cfc4be]",
  model: "text-rose",
  output: "text-[#ded5ce]",
};

function PipeChrome({ pipe }: { pipe: Pipe }) {
  return (
    <div className="absolute inset-0 font-mono">
      {pipe.nodes.map((n) => (
        <span
          key={`${n.kind}-${n.label}`}
          className={`absolute whitespace-nowrap text-[15px] max-md:text-[12px] tracking-[0.06em] ${NODE_CLASS[n.kind]}`}
          style={{
            left: n.x,
            top: n.y,
            transform: `translate(${n.align === "left" ? "0" : n.align === "right" ? "-100%" : "-50%"}, -50%)`,
          }}
        >
          {n.label}
        </span>
      ))}
    </div>
  );
}

/** The part of the chart that has to stay legible: axis, ticks, tooltips. */
function Chrome({ chart, hover }: { chart: ParetoChart; hover: number }) {
  const { plot } = chart;
  const hovered = hover >= 0 ? chart.models[hover] : undefined;
  const dominator = hovered?.dominatedBy
    ? chart.models.find((m) => m.label === hovered.dominatedBy)
    : undefined;

  return (
    <div className="absolute inset-0 font-mono">
      {/* The axis is the one thing here that is not made of characters. */}
      <div
        className="absolute border-b border-l border-[#4e4245]"
        style={{ left: plot.left, top: plot.top, width: plot.width, height: plot.height }}
      />
      {/* A tick under each labelled cost, so the axis has a scale and not just
          a direction. */}
      {chart.ticks.map((t) => (
        <span key={t.label}>
          <span
            className="absolute w-px bg-[#4e4245]"
            style={{ left: t.x, top: plot.top + plot.height, height: 6 }}
          />
          <span
            className="absolute -translate-x-1/2 text-[13.5px] tracking-[0.14em] text-[#ab9f9b]"
            style={{ left: t.x, top: plot.top + plot.height + 12 }}
          >
            {t.label}
          </span>
        </span>
      ))}
      <span
        className="absolute whitespace-nowrap text-[13px] uppercase tracking-[0.22em] text-[#ab9f9b]"
        style={{
          left: plot.left - 10,
          top: plot.top + plot.height / 2,
          transform: "rotate(-90deg) translate(-50%, -100%)",
          transformOrigin: "left top",
        }}
      >
        Quality score &uarr;
      </span>
      <span
        className="absolute whitespace-nowrap text-[13px] uppercase tracking-[0.2em] text-[#ab9f9b]"
        style={{ left: plot.left, top: plot.top + plot.height + 30 }}
      >
        Cost per thousand calls &rarr;
      </span>
      {/* Inside the plot, top left: the cheap-and-excellent corner is the one
          corner nothing can occupy, and above the plot it would run into the
          site's nav on a narrow window. */}
      <div
        className="absolute flex gap-6 whitespace-nowrap text-[12.5px] uppercase tracking-[0.2em] text-[#ab9f9b] max-md:flex-col max-md:gap-1 max-md:text-[11px] max-md:tracking-[0.12em]"
        style={{ left: plot.left + 16, top: plot.top + 14 }}
      >
        <span className="text-rose">&#9679; frontier</span>
        <span>&#9675; in production</span>
        <span>&middot; dominated</span>
      </div>

      {hovered && <Ring model={hovered} strong />}
      {dominator && <Ring model={dominator} strong={false} />}
      {placeCards(chart, hover, hovered, dominator).map((c) => (
        <Card key={c.model.label} chart={chart} model={c.model} index={c.index} note={c.note} left={c.left} top={c.top} />
      ))}
      {/* The hint belongs with the chrome, not in the plot: on the axis label's
          own line, at the far end of it. */}
      {hover < 0 && (
        <span
          className="absolute -translate-x-full whitespace-nowrap text-[12.5px] uppercase tracking-[0.24em] text-[#928587] before:mr-3 before:inline-block before:h-px before:w-8 before:bg-rose before:align-middle [@media(hover:none)]:hidden"
          style={{ left: plot.left + plot.width - 8, top: plot.top + plot.height + 30 }}
        >
          Point at a model
        </span>
      )}
    </div>
  );
}

interface Placed {
  model: ChartModel;
  index: number;
  note: string;
  left: number;
  top: number;
}

/**
 * Where the cards go. The point of hovering a dominated model is reading it
 * against the one that beats it, so the two cards are shown together and must
 * not land on each other: the second is pushed clear of the first, away from
 * it, rather than overlapping and hiding half of what it says.
 */
const placeCards = (
  chart: ParetoChart,
  hover: number,
  hovered: ChartModel | undefined,
  dominator: ChartModel | undefined,
): Placed[] => {
  const wanted: { model: ChartModel; index: number; note: string }[] = [];
  if (hovered) wanted.push({ model: hovered, index: hover, note: noteFor(hovered) });
  if (dominator) {
    wanted.push({ model: dominator, index: chart.models.indexOf(dominator), note: noteFor(dominator, hovered) });
  }

  const out: Placed[] = [];
  for (const c of wanted) {
    const toRight = c.model.x < chart.plot.left + chart.plot.width * 0.55;
    const below = c.model.y < chart.plot.top + chart.plot.height * 0.5;
    const left = clamp(
      toRight ? c.model.x + 22 : c.model.x - 22 - CARD_W,
      4,
      Math.max(4, chart.width - CARD_W - 4),
    );
    let top = clamp(below ? c.model.y + 18 : c.model.y - 18 - CARD_H, 4, Math.max(4, chart.height - CARD_H - 4));
    for (const q of out) {
      if (Math.abs(q.left - left) < CARD_W && Math.abs(q.top - top) < CARD_H + 10) {
        top = clamp(
          top < q.top ? q.top - CARD_H - 12 : q.top + CARD_H + 12,
          4,
          Math.max(4, chart.height - CARD_H - 4),
        );
      }
    }
    out.push({ ...c, left, top });
  }
  return out;
};

/**
 * What this model is doing in the argument. `against` is the model it beats,
 * when it is on screen as somebody's dominator — and the comparison is made
 * rather than assumed, so the line on the card is true of the numbers on the
 * card even where latency does not go the same way as the other two.
 */
const noteFor = (m: ChartModel, against?: ChartModel): string => {
  if (against) {
    const better = m.quality > against.quality && m.cost < against.cost;
    if (better && m.p95 < against.p95) return "better on all three axes";
    return better ? "better on quality and cost" : "on the frontier above it";
  }
  if (m.dominatedBy) return `dominated by ${m.dominatedBy}`;
  return "nothing beats it on both axes";
};

const roleFor = (chart: ParetoChart, index: number, m: ChartModel): string => {
  if (index === chart.recommended) return "recommended";
  if (index === chart.production) return "currently in production";
  return m.kind === "frontier" ? "on the frontier" : "dominated";
};

function Ring({ model, strong }: { model: ChartModel; strong: boolean }) {
  const r = strong ? 22 : 19;
  return (
    <div
      className={`absolute rounded-full border ${strong ? "border-rose" : "border-[#7d6a6d]"}`}
      style={{ left: model.x - r, top: model.y - r, width: r * 2, height: r * 2 }}
    />
  );
}

function Card({
  chart,
  model,
  index,
  note,
  left,
  top,
}: {
  chart: ParetoChart;
  model: ChartModel;
  index: number;
  note: string;
  left: number;
  top: number;
}) {
  const glyph = index === chart.production ? "✕" : model.kind === "frontier" ? "(0)" : "·";
  return (
    <div
      className="absolute border-l-2 border-rose bg-[#0b0708]/94 px-4 py-2.5"
      style={{ left, top, width: CARD_W }}
    >
      <div className="whitespace-nowrap text-[14px] uppercase tracking-[0.14em] text-[#ded5ce]">
        <span className="text-rose">{glyph}</span> {model.label}
        <span className="text-[#a09490]"> &middot; {roleFor(chart, index, model)}</span>
      </div>
      <div className="mt-2 flex gap-4 whitespace-nowrap text-[13.5px] tracking-[0.08em] text-[#bfb4ae]">
        <span>quality {model.quality.toFixed(2)}</span>
        <span>cost ${model.cost.toFixed(2)}</span>
        <span>p95 {model.p95.toFixed(1)}s</span>
      </div>
      <div className="mt-1.5 whitespace-nowrap text-[12.5px] uppercase tracking-[0.16em] text-[#a09490]">{note}</div>
    </div>
  );
}

/**
 * The graph's ids, the legend, and what selecting a node shows.
 *
 * The edges are the thing made of characters. Everything here is text, for the
 * same reason as the chart's axis: a bracketed id at 1.5 px cells would not be
 * an id. The bracket is the node type, so type survives even when a node is
 * dimmed down to almost nothing.
 */
const GRAPH_CARD_W = 420;
const GRAPH_CARD_H = 300;
/** How each node type is named in the card's header. */
const KIND_NAME: Record<NodeKind, string> = {
  S: "stakeholder",
  R: "requirement",
  F: "feature",
  T: "test",
};

const NODE_TONE: Record<NodeKind, string> = {
  S: "text-[#a09490]",
  R: "text-[#ded5ce]",
  F: "text-[#a2958f]",
  T: "text-[#a09490]",
};

function GraphChrome({
  graph,
  picked,
  transcript,
}: {
  graph: AsciiGraph;
  picked: number;
  transcript: TranscriptLine[];
}) {
  const node = picked >= 0 ? graph.nodes[picked] : undefined;
  const near = node ? neighbourhoodOf(graph, node.id) : null;
  // A node stays lit if it is the selection or at the other end of one of its
  // edges, so the neighbourhood holds and the rest recedes.
  const lit = new Set<string>();
  if (node && near) {
    lit.add(node.label);
    for (const l of [...near.ownedBy, ...near.owns, ...near.validatedBy, ...near.validates, ...near.dependsOn, ...near.feeds]) {
      lit.add(l);
    }
  }
  const line = node ? transcript.find((t) => t.node === node.id) : undefined;

  return (
    <div className="absolute inset-0 font-mono">
      {graph.nodes.map((n, i) => (
        <span
          key={n.id}
          className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[14.5px] tracking-[0.06em] transition-opacity duration-200 ${
            i === picked ? "text-rose" : NODE_TONE[n.kind]
          }`}
          style={{ left: n.x, top: n.y, opacity: node ? (lit.has(n.label) ? 1 : 0.22) : 1 }}
        >
          {n.label}
        </span>
      ))}
      {node && (
        <div
          className="absolute rounded-full border border-rose"
          style={{ left: node.x - 17, top: node.y - 17, width: 34, height: 34 }}
        />
      )}

      <div className="absolute inset-x-0 bottom-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 px-1 text-[11.5px] uppercase tracking-[0.16em] text-[#8b8083]">
        <span>( ) stakeholder</span>
        <span className="text-[#bfb4ae]">[ ] requirement</span>
        <span>&lt; &gt; feature</span>
        <span>{"{ }"} test</span>
        <span>&middot;&middot;&middot; owns</span>
        <span>&mdash; depends</span>
        <span>::: validates</span>
        {!node && <span className="ml-auto pr-2 text-[#7c6e71] [@media(hover:none)]:hidden">Point at a node</span>}
      </div>

      {node && near && <GraphCard node={node} near={near} line={line} graph={graph} />}
    </div>
  );
}

/**
 * One relation, and what is at the other end of it. The label is the id, which
 * is what the canvas draws and so what the eye can find; the title beside it is
 * what makes the row mean something without hunting for that id on screen.
 */
function Relation({ label, ids, titles }: { label: string; ids: string[]; titles: Map<string, string> }) {
  if (ids.length === 0) return null;
  return (
    <div className="flex gap-2.5">
      <span className="w-[76px] shrink-0 text-right text-[11px] uppercase tracking-[0.12em] text-[#8b8083]">{label}</span>
      <span className="min-w-0 flex-1">
        {ids.map((id) => (
          <span key={id} className="block leading-[1.5]">
            <span className="text-rose">{id}</span>{" "}
            <span className="text-[#bfb4ae]">{titles.get(id) ?? ""}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

function GraphCard({
  node,
  near,
  line,
  graph,
}: {
  node: GraphNode;
  near: Neighbourhood;
  line: TranscriptLine | undefined;
  graph: AsciiGraph;
}) {
  // Beside the node, on whichever side actually has room for it, so the card
  // never has to be clamped back over the node it is describing.
  const right = graph.width - node.x > node.x;
  const below = node.y < graph.height * 0.5;
  const left = clamp(
    right ? node.x + 26 : node.x - 26 - GRAPH_CARD_W,
    4,
    Math.max(4, graph.width - GRAPH_CARD_W - 4),
  );
  const top = clamp(
    below ? node.y + 22 : node.y - 22 - GRAPH_CARD_H,
    4,
    Math.max(4, graph.height - GRAPH_CARD_H - 4),
  );
  // Every relation list is a list of labels, so the card needs one lookup from
  // label back to title rather than a search per row.
  const titles = new Map(graph.nodes.map((n) => [n.label, n.title]));
  return (
    <div className="absolute border border-line bg-[#0b0708]/95 px-6 py-5" style={{ left, top, width: GRAPH_CARD_W }}>
      <div className="text-[12.5px] uppercase tracking-[0.2em]">
        <span className="text-rose">{node.label}</span>
        <span className="text-[#6b5d60]"> &middot; </span>
        <span className="text-[#8b8083]">{KIND_NAME[node.kind]}</span>
      </div>
      {/* What the node is. The id is the handle, this is the content. */}
      <p className="mt-3 font-serif text-[21px] leading-[1.28] text-[#ede4de]">{node.title}</p>
      {line && (
        <>
          {/* Provenance: the sentence the node was extracted from, which is the
              whole argument of the project. */}
          <p className="mt-4 border-l border-rose pl-4 font-serif text-[17.5px] italic leading-[1.45] text-[#bfb4ae]">
            &ldquo;{line.quote}&rdquo;
          </p>
          <div className="mt-3 text-[11.5px] tracking-[0.12em] text-[#a09490]">
            {line.at} <span className="text-[#6b5d60]">&middot;</span> {line.speaker}{" "}
            <span className="text-[#6b5d60]">&middot;</span> {line.session}
          </div>
        </>
      )}
      <div className="mt-4 space-y-1.5 border-t border-line pt-3.5 text-[12.5px] tracking-[0.04em]">
        <Relation label="owned by" ids={near.ownedBy} titles={titles} />
        <Relation label="owns" ids={near.owns} titles={titles} />
        <Relation label="depends on" ids={near.dependsOn} titles={titles} />
        <Relation label="feeds" ids={near.feeds} titles={titles} />
        <Relation label="validated by" ids={near.validatedBy} titles={titles} />
        <Relation label="validates" ids={near.validates} titles={titles} />
      </div>
    </div>
  );
}

/**
 * The cluster map's labels. Only the largest few are named, because the scene
 * withholds the topic labels: the map's job is to show that the corpus has
 * structure and roughly how it is distributed, not to publish findings.
 */
function ClusterChrome({ map }: { map: ClusterMap }) {
  return (
    <div className="absolute inset-0 font-mono">
      {map.clusters
        .filter((c) => c.named)
        .map((c: Cluster) => (
          <span
            key={c.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[12.5px] uppercase tracking-[0.18em] text-[#ded5ce]"
            style={{ left: c.x, top: c.y - c.r - 9 }}
          >
            {c.label}
          </span>
        ))}
    </div>
  );
}

/**
 * The bars' names and scores. The runs are characters; a stage name and a
 * score to three places are not, so they sit over the canvas at the row
 * positions the chart gives them.
 */
function BarChrome({ chart }: { chart: BarChart }) {
  return (
    <div className="absolute inset-0 font-mono">
      {chart.rows.map((r) => (
        <span key={r.label}>
          {/* Stacked: the name on its own line above the bar, the score
              right-aligned on that same line, so neither can reach the bar. */}
          <span
            className={`absolute whitespace-nowrap text-[12.5px] uppercase tracking-[0.16em] ${
              chart.stacked ? "" : "-translate-y-1/2 text-right"
            } ${r.best ? "text-rose" : "text-[#bfb4ae]"}`}
            style={
              chart.stacked
                ? { left: r.x0, top: r.y - 26 }
                : { right: chart.width - r.x0 + 14, top: r.y, width: Math.max(90, r.x0 - 20) }
            }
          >
            {r.label}
          </span>
          <span
            className={`absolute whitespace-nowrap text-[13.5px] tracking-[0.06em] ${
              chart.stacked ? "text-right" : "-translate-y-1/2"
            } ${r.best ? "text-[#f4ece6]" : "text-[#ded5ce]"}`}
            style={
              chart.stacked
                ? { right: 2, top: r.y - 26 }
                : { left: chart.valueX + 14, top: r.y }
            }
          >
            {r.value.toFixed(3)}
          </span>
        </span>
      ))}
      <span className="absolute right-0 top-[-20px] whitespace-nowrap text-[11.5px] uppercase tracking-[0.18em] text-[#7c6e71]">
        Scale {chart.lo.toFixed(2)} &rarr; {chart.hi.toFixed(2)}
      </span>
    </div>
  );
}
