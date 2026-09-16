"use client";

import { useEffect, useRef } from "react";
import { buildPairs, stampPairs, type MorphPairs } from "@/lib/ascii/morph";
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

interface Props {
  flowerSrc: string;
  faceSrc: string;
  /** Element the face lands on. The flower starts centred in the viewport. */
  targetId: string;
}

/**
 * The cold open and the portrait, on one canvas at one cell size, because the
 * flower turning into the face has to be the same characters moving. The
 * shared field cannot do it: its cell is 4.8 by 8 px and this needs 1.5 by
 * 2.5, and two cell sizes have nothing to interpolate against each other.
 *
 * Fixed and full-viewport. The flower assembles centred as the hero scrolls;
 * then, over the About section's arrival, every character travels to its place
 * in the face, changing glyph and colour on the way. The face's box is read
 * from the target element each frame, so once it has landed it scrolls with
 * the section like any other content.
 */
export function MorphField({ flowerSrc, faceSrc, targetId }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let disposed = false;
    const alive = () => !disposed;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    interface Built {
      pairs: MorphPairs;
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

    const size = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    /** Where the face has to land, in viewport px. */
    const faceBox = (): { x: number; y: number } => {
      const el = document.getElementById(targetId);
      if (!el || !built) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      return {
        x: r.left + (r.width - built.faceW) / 2,
        y: r.top + (r.height - built.faceH) / 2,
      };
    };

    const render = () => {
      if (!built || !alive()) return;
      const vh = window.innerHeight || 1;
      const flyT = reduced ? 1 : Math.min(1, window.scrollY / (vh * FLY_COMPLETE));

      const target = document.getElementById(targetId);
      let morphT = 0;
      if (target) {
        const top = target.getBoundingClientRect().top;
        morphT = reduced ? 1 : Math.min(1, Math.max(0, (vh - top) / (vh * 0.85)));
      }

      stampPairs(built.acc, built.buf.data, canvas.width, canvas.height, built.pairs, built.glyphs, {
        cellW: CELL_W,
        cellH: CELL_H,
        srcOrigin: {
          x: (window.innerWidth - built.flowerW) / 2,
          y: (vh - built.flowerH) / 2,
        },
        dstOrigin: faceBox(),
        flyT,
        morphT,
        cursor,
        cursorStrength: reduced ? 0 : cursorStrength,
        cursorRadius: 90,
      });
      ctx.putImageData(built.buf, 0, 0);
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
        ? rgbaToPhotoGrid(data, cols, rows, { floor: 0.05, gamma: 0.9 })
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
        pairs: buildPairs(flower, face, { cellW: CELL_W, cellH: CELL_H, seed: 20260916 }),
        glyphs: buildGlyphMasks(CELL_W, CELL_H),
        acc: new Float32Array(canvas.width * canvas.height * 4),
        buf: ctx.createImageData(canvas.width, canvas.height),
        flowerW: flower.cols * CELL_W,
        flowerH: flower.rows * CELL_H,
        faceW: face.cols * CELL_W,
        faceH: face.rows * CELL_H,
      };
      render();
    };

    const onResize = () => {
      size();
      if (built) {
        built.acc = new Float32Array(canvas.width * canvas.height * 4);
        built.buf = ctx.createImageData(canvas.width, canvas.height);
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
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [flowerSrc, faceSrc, targetId]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0" aria-label="Anusha Upadhyay" role="img" />;
}
