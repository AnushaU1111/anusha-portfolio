"use client";

import { useEffect, useRef } from "react";
import { drawGrid } from "@/lib/ascii/draw";
import { createLift } from "@/lib/ascii/lift";
import type { Grid } from "@/lib/ascii/types";

interface Props {
  grid: Grid;
  cellW: number;
  cellH: number;
  className?: string;
  /** Radius in cells within which the cursor brightens glyphs. 0 disables. */
  hoverRadius?: number;
}

/**
 * Renders a Grid to a canvas. Kept intentionally small: it draws whatever
 * grid it is given and does nothing else. Scene logic, scroll and
 * interpolation live above it, so this component can be tested by handing it
 * a fixed grid.
 */
export function AsciiField({ grid, cellW, cellH, className, hoverRadius = 0 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouse = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = grid.cols * cellW;
    const h = grid.rows * cellH;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lift = createLift(grid.cols, grid.rows, {
      radius: hoverRadius,
      riseMs: reduced ? 1 : 90,
      fallMs: reduced ? 1 : 220,
    });

    let raf = 0;
    let running = false;
    let lastT = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      drawGrid(ctx, grid, {
        cellW,
        cellH,
        cursor: mouse.current,
        lift: hoverRadius > 0 ? lift.values : null,
        liftDensify: reduced ? 0 : 3,
        liftDrift: reduced ? 0 : 5,
      });
    };
    // Same loop as the field: run while the influence is still settling, then
    // stop, so a figure sitting on a page costs nothing.
    const tick = (t: number) => {
      const dt = lastT === 0 ? 16 : Math.min(64, t - lastT);
      lastT = t;
      const busy = lift.step(dt, mouse.current, cellW, cellH);
      draw();
      if (busy) raf = requestAnimationFrame(tick);
      else {
        running = false;
        lastT = 0;
      }
    };
    const kick = () => {
      if (running) return;
      running = true;
      lastT = 0;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      kick();
    };
    const onLeave = () => {
      mouse.current = null;
      kick();
    };

    draw();
    if (hoverRadius > 0) {
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);
    }
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [grid, cellW, cellH, hoverRadius]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
