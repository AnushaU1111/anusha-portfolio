"use client";

import { useEffect, useRef } from "react";
import { createFlyIn, type FlyIn } from "@/lib/ascii/flyin";
import { photoRows, rgbaToPhotoGrid } from "@/lib/ascii/photo";
import { CELL_ASPECT } from "@/lib/ascii/ramp";
import { buildGlyphMasks, stampGrid, type GlyphMasks } from "@/lib/ascii/stamp";
import type { Grid } from "@/lib/ascii/types";

interface Props {
  src: string;
  /** Characters across. 440 is where it stops reading as ASCII. */
  cols?: number;
  className?: string;
  /** Exposure and saturation, applied once at sample time. */
  gain?: number;
  saturation?: number;
}

/**
 * The portrait, drawn as characters acting as pixels.
 *
 * Every other figure on the site is the ramp and nothing else. This one is
 * the ramp carrying the light and the photograph's own colour carrying the
 * hue, at a cell size where a character is a pixel or two. It owns its own
 * canvas rather than joining the shared field, because the field's grid is
 * 4.8 by 8 px and this needs roughly 1.4 by 2.3, and two cell sizes cannot
 * be interpolated against each other.
 *
 * The characters arrive from every edge, the same way the lily does, so the
 * cold open handing over to this reads as the flower becoming the face.
 */
export function PhotoField({ src, cols = 440, className, gain = 1, saturation = 1.55 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let disposed = false;
    const alive = () => !disposed;
    let raf = 0;
    let running = false;
    let progress = 0;

    interface Built {
      grid: Grid;
      fly: FlyIn;
      glyphs: GlyphMasks;
      acc: Float32Array;
      buf: ImageData;
      cellW: number;
      cellH: number;
    }
    let built: Built | null = null;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** How far the section holding this canvas has come up the viewport. */
    const scrollProgress = (): number => {
      if (reduced) return 1;
      const host = canvas.parentElement ?? canvas;
      const rect = host.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Starts as the top edge enters and completes a little before the
      // section is fully up, so the face is resolved while it is being read.
      const travelled = vh - rect.top;
      return Math.min(1, Math.max(0, travelled / (vh * 0.85)));
    };

    const render = () => {
      if (!built) return;
      const t = reduced ? 1 : progress;
      stampGrid(built.acc, built.buf.data, canvas.width, canvas.height, built.grid, built.glyphs, {
        cellW: built.cellW,
        cellH: built.cellH,
        fly: { ...built.fly, t },
      });
      ctx.putImageData(built.buf, 0, 0);
    };

    const tick = () => {
      running = false;
      if (!alive()) return;
      const next = scrollProgress();
      if (next !== progress) {
        progress = next;
        render();
      }
    };
    const schedule = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    const build = async () => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      await img.decode();
      if (!alive()) return;
      await document.fonts.load('10px "JetBrains Mono"').catch(() => undefined);
      if (!alive()) return;

      const rows = photoRows(cols, img.naturalWidth, img.naturalHeight);
      // One source pixel per cell: let the browser do the downscale.
      const sampler = document.createElement("canvas");
      sampler.width = cols;
      sampler.height = rows;
      const sctx = sampler.getContext("2d", { willReadFrequently: true });
      if (!sctx) return;
      sctx.drawImage(img, 0, 0, cols, rows);
      const grid = rgbaToPhotoGrid(sctx.getImageData(0, 0, cols, rows).data, cols, rows, {
        saturation,
        gain,
        floor: 0.02,
      });

      // The canvas is sized from the cell, not the other way round, so a
      // character always lands on a whole pixel.
      const host = canvas.parentElement;
      const avail = host ? host.clientWidth : cols * 1.4;
      const cellW = Math.max(1, Math.round((avail / cols) * 100) / 100);
      const cellH = cellW / CELL_ASPECT;
      const w = Math.round(cols * cellW);
      const h = Math.round(rows * cellH);
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      built = {
        grid,
        fly: createFlyIn(grid, { cellW, cellH, reach: 0.5, swirl: 0.45, seed: 4402026 }),
        glyphs: buildGlyphMasks(cellW, cellH),
        acc: new Float32Array(w * h * 4),
        buf: ctx.createImageData(w, h),
        cellW,
        cellH,
      };
      progress = scrollProgress();
      render();
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    void build();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [src, cols, gain, saturation]);

  return <canvas ref={ref} className={className} aria-label="Anusha Upadhyay" role="img" />;
}
