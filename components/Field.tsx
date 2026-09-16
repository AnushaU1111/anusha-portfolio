"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { drawGrid } from "@/lib/ascii/draw";
import { interpolateGrid, scatterPhase } from "@/lib/ascii/interpolate";
import { createLift, type LiftField } from "@/lib/ascii/lift";
import { viewportDims } from "@/lib/ascii/place";
import { CELL_H, CELL_W } from "@/lib/ascii/ramp";
import { prepareScenes, prepareScene, scenes, type PreparedScene } from "@/lib/ascii/scenes";
import type { Grid } from "@/lib/ascii/types";

/**
 * The share of the cold open's pinned scroll spent bringing the characters in.
 * The rest is the flower held complete before the page moves on.
 */
const FLY_COMPLETE = 0.82;
/** How far a fully lifted glyph drifts away from the cursor, in px. */
const DRIFT_PX = 5;
/** How many ramp steps denser a fully lifted glyph goes. */
const DENSIFY = 3;

interface Frame {
  grid: Grid;
  resolve: number;
  lift: boolean;
  fly: { offsets: Float32Array; phase: Float32Array; t: number } | null;
}

interface State {
  prepared: PreparedScene[];
  /** Scroll progress per scene, 0 to 1. */
  progress: number[];
  /**
   * How far a pinned section is from arriving, 0 to 1. A pinned section only
   * starts its own progress once it reaches the top of the viewport, which is
   * long after its copy is on screen, so the handoff into it runs on this.
   */
  lead: number[];
  cursor: { x: number; y: number } | null;
  lift: LiftField;
  reduced: boolean;
}

/**
 * One fixed canvas that owns every figure. Sections in the page are the
 * scroll triggers; the field reads their progress and interpolates between
 * scene targets so glyphs move rather than cut.
 */
export function Field() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dims = viewportDims(window.innerWidth, window.innerHeight, CELL_W, CELL_H);
    const state: State = {
      prepared: [],
      progress: scenes.map(() => 0),
      lead: scenes.map(() => 0),
      cursor: null,
      // Reduced motion keeps the brightening and loses the settling, so the
      // influence arrives and leaves in a frame.
      lift: createLift(dims.cols, dims.rows, { radius: 14, riseMs: reduced ? 1 : 90, fallMs: reduced ? 1 : 220 }),
      reduced,
    };
    let raf = 0;
    let disposed = false;
    // Read through a call so narrowing does not decide this is always false.
    const alive = () => !disposed;
    const triggers: ScrollTrigger[] = [];
    let lenis: Lenis | null = null;

    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /**
     * A scene's own sense of how far along it is. An unpinned section starts
     * as it comes into view, so its trigger is the whole story. A pinned one
     * arrives first and pins second, so the approach is worth half and the
     * pinned hold the other half.
     */
    const sceneProgress = (i: number): number => {
      const prog = state.progress[i] ?? 0;
      // The first section has no approach to run: it is already at the top of
      // the page on load. Its own pinned progress is the whole story, which is
      // what lets the cold open sit empty until the page is scrolled.
      if (i === 0) return prog;
      if (scenes[i]?.pinned !== true) return prog;
      const lead = state.lead[i] ?? 0;
      // The approach is worth exactly the resolve, so a pinned figure finishes
      // arriving at the moment its section pins, and the held viewport is
      // spent on the figure resolved rather than on it still assembling.
      return lead < 1 ? lead * 0.6 : 0.6 + prog * 0.4;
    };

    /**
     * The last scene that has begun is the one drawn, and it holds until the
     * next one begins. Beginning means arriving on screen, not reaching the
     * top, so a figure hands over while its own copy is still being read.
     */
    const activeIndex = (): number => {
      let active = 0;
      for (let i = 0; i < state.prepared.length; i++) if (sceneProgress(i) > 0) active = i;
      return active;
    };

    /** The scene in view, drawn from its entry state toward its target. */
    const frame = (): Frame | null => {
      const p = state.prepared;
      if (p.length === 0) return null;
      const active = activeIndex();
      const cur = p[active];
      if (!cur) return null;
      const prog = sceneProgress(active);
      const canLift = (cur.spec.hoverRadius ?? 0) > 0;

      // A scene that flies in does not morph out of anything: its characters
      // travel in from off screen to the grid they already belong to. At
      // progress zero none of them have set off, so the page starts empty.
      if (cur.fly) {
        const t = state.reduced ? 1 : Math.min(1, prog / FLY_COMPLETE);
        return { grid: cur.target, resolve: 0, lift: canLift && t > 0.98, fly: { ...cur.fly, t } };
      }

      // Entry -> target over the first 60% of the scene's progress, then hold.
      // A handoff is simply the next scene entering from this one's target,
      // so it only happens when that section actually arrives.
      const entryGrid = cur.spec.entry === "noise" ? cur.noise : (p[active - 1]?.target ?? cur.noise);
      const grid = interpolateGrid(entryGrid, cur.target, Math.min(1, prog / 0.6), scatterPhase);
      const resolve = cur.spec.resolvesToNeutral ? Math.min(1, prog / 0.6) : 0;
      return { grid, resolve, lift: canLift, fly: null };
    };

    const render = () => {
      if (disposed) return;
      const f = frame();
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (!f) return;
      drawGrid(ctx, f.grid, {
        cellW: CELL_W,
        cellH: CELL_H,
        resolve: f.resolve,
        cursor: state.cursor,
        fly: f.fly,
        lift: f.lift ? state.lift.values : null,
        liftTone: 0.6,
        // Reduced motion gets the brightening and nothing that moves.
        liftDensify: state.reduced ? 0 : DENSIFY,
        liftDrift: state.reduced ? 0 : DRIFT_PX,
      });
    };

    let running = false;
    let lastT = 0;
    let dirty = true;

    /**
     * Runs only while something is actually animating, which now means the
     * cursor's influence arriving and settling. Everything else is driven by
     * scroll, which marks the field dirty and paints one frame.
     */
    const tick = (t: number) => {
      if (disposed) return;
      const dt = lastT === 0 ? 16 : Math.min(64, t - lastT);
      lastT = t;
      let busy = false;

      const wantsCursor = activeIndex() === 0 ? state.cursor : null;
      if (state.lift.step(dt, wantsCursor, CELL_W, CELL_H)) busy = true;

      if (busy || dirty) {
        render();
        dirty = false;
      }
      if (busy) raf = requestAnimationFrame(tick);
      else {
        running = false;
        lastT = 0;
      }
    };

    const schedule = () => {
      dirty = true;
      if (running) return;
      running = true;
      lastT = 0;
      raf = requestAnimationFrame(tick);
    };

    const setup = async () => {
      size();
      await document.fonts.load('11px "JetBrains Mono"').catch(() => undefined);
      if (!alive()) return;

      // The cold open goes up on its own first. Building all nine figures takes
      // long enough to be visible, and paying for eight of them before the
      // first paint is what made the flower appear already finished.
      const first = scenes[0];
      if (first) {
        state.prepared = [await prepareScene(first, 0, dims.cols, dims.rows)];
        if (!alive()) return;
        schedule();
        await new Promise((r) => { setTimeout(r, 0); });
      }
      const all = await prepareScenes(scenes, dims.cols, dims.rows);
      if (!alive()) return;
      state.prepared = all;

      if (!reduced) {
        gsap.registerPlugin(ScrollTrigger);
        lenis = new Lenis({ lerp: 0.1 });
        lenis.on("scroll", () => { ScrollTrigger.update(); });
        gsap.ticker.add((t) => lenis?.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);

        scenes.forEach((spec, i) => {
          const el = document.getElementById(spec.sectionId);
          if (!el) return;
          if (spec.pinned) {
            // Runs from the section appearing to the moment it pins, and does
            // no pinning of its own.
            triggers.push(
              ScrollTrigger.create({
                trigger: el,
                start: "top 45%",
                end: "top top",
                scrub: true,
                onUpdate: (self) => {
                  state.lead[i] = self.progress;
                  schedule();
                },
              }),
            );
          }
          triggers.push(
            ScrollTrigger.create({
              trigger: el,
              // A scene takes over when its section is about half on screen,
              // not when it first appears, so a figure stays with its own copy
              // for as long as that copy is what is being read. Pinned scenes
              // then hold one viewport with the figure already resolved. A
              // scene sharing a window with something outside the field says so.
              start: spec.trigger?.start ?? (spec.pinned ? "top top" : "top 45%"),
              end: spec.trigger?.end ?? (spec.pinned ? "+=100%" : "top top"),
              pin: spec.pinned,
              pinSpacing: true,
              scrub: true,
              onUpdate: (self) => {
                state.progress[i] = self.progress;
                schedule();
              },
            }),
          );
        });

      } else {
        state.progress = scenes.map((_, i) => (i === 0 ? 0.6 : 0));
        state.lead = scenes.map((_, i) => (i === 0 ? 1 : 0));
      }
      schedule();
    };

    const onMove = (e: PointerEvent) => {
      state.cursor = { x: e.clientX, y: e.clientY };
      schedule();
    };
    const onLeave = () => {
      state.cursor = null;
      schedule();
    };
    // Generated figures are rebuilt at the new column count rather than
    // scaled, so a resize is real work and is debounced. The canvas itself
    // resizes immediately, so the page never shows a stretched figure.
    let resizeTimer = 0;
    let rebuild = 0;
    const onResize = () => {
      size();
      dims = viewportDims(window.innerWidth, window.innerHeight, CELL_W, CELL_H);
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const token = ++rebuild;
        void prepareScenes(scenes, dims.cols, dims.rows).then((p) => {
          if (disposed || token !== rebuild) return;
          state.prepared = p;
          // The influence field is indexed by cell, so it is rebuilt with the
          // grid rather than carried across two different geometries.
          state.lift = createLift(dims.cols, dims.rows, {
            radius: 14,
            riseMs: state.reduced ? 1 : 90,
            fallMs: state.reduced ? 1 : 220,
          });
          ScrollTrigger.refresh();
          schedule();
        });
      }, 160);
      schedule();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);
    void setup();

    return () => {
      disposed = true;
      window.clearTimeout(resizeTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
      triggers.forEach((t) => { t.kill(); });
      lenis?.destroy();
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" />;
}
