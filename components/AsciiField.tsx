"use client";

import { useEffect, useRef } from "react";
import { RAMP, theme, toTone } from "@/lib/ascii/ramp";
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

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${cellH * 0.82}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textBaseline = "top";
      const m = mouse.current;
      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          const i = r * grid.cols + c;
          const idx = grid.cells[i] ?? 0;
          if (idx === 0) continue;
          let t = grid.tone?.[i] ?? toTone(idx);
          if (m && hoverRadius > 0) {
            const dx = (c * cellW - m.x) / cellW;
            const dy = (r * cellH - m.y) / cellH;
            const d = Math.hypot(dx * 0.6, dy);
            if (d < hoverRadius) t = Math.min(1, t + (1 - d / hoverRadius) * 0.6);
          }
          const [lr, lg, lb] = theme.low;
          const [hr, hg, hb] = theme.high;
          const R = Math.round(lr + (hr - lr) * t);
          const G = Math.round(lg + (hg - lg) * t);
          const B = Math.round(lb + (hb - lb) * t);
          const A = theme.minAlpha + (theme.maxAlpha - theme.minAlpha) * t;
          ctx.fillStyle = `rgba(${R},${G},${B},${A.toFixed(3)})`;
          ctx.fillText(RAMP[idx] ?? " ", c * cellW, r * cellH);
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };
    const onLeave = () => {
      mouse.current = null;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
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
