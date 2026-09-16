import { describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { buildClusters } from "@/lib/ascii/cloud";

const figure = (() => {
  const s = projects.find((p) => p.slug === "affordability");
  if (!s || s.figure.kind !== "corpus") throw new Error("no corpus scene");
  return s.figure;
})();

const CELL_W = 1.5;
const CELL_H = 2.5;
const CW = 900;
const CH = 420;
const map = buildClusters(figure, { width: CW, height: CH, cellW: CELL_W, cellH: CELL_H });

describe("buildClusters", () => {
  it("draws as many clusters as the scene says it shows", () => {
    expect(map.clusters).toHaveLength(figure.topicsShown);
    expect(figure.topicsShown).toBeLessThan(figure.topics);
  });

  it("numbers them from the whole set, not from the drawing order", () => {
    const ids = map.clusters.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(figure.topics);
    }
    // Fourteen of forty-one that happened to be 1..14 would be a claim the
    // scene does not make.
    expect(Math.max(...ids)).toBeGreaterThan(figure.topicsShown);
  });

  it("makes area stand for share, so the ranking is readable off the map", () => {
    for (let i = 1; i < map.clusters.length; i++) {
      expect(map.clusters[i]?.r ?? 0).toBeLessThanOrEqual((map.clusters[i - 1]?.r ?? 0) + 0.001);
    }
    expect(map.clusters[0]?.r ?? 0).toBeGreaterThan((map.clusters.at(-1)?.r ?? 0) * 1.5);
  });

  it("names only the few it can name, and leaves the tail withheld", () => {
    const named = map.clusters.filter((c) => c.named);
    expect(named.length).toBeGreaterThan(0);
    expect(named.length).toBeLessThan(map.clusters.length);
    // The named ones are the large ones, so a label always has a cluster big
    // enough to hang it on.
    const smallestNamed = Math.min(...named.map((c) => c.r));
    const largestUnnamed = Math.max(...map.clusters.filter((c) => !c.named).map((c) => c.r));
    expect(smallestNamed).toBeGreaterThanOrEqual(largestUnnamed);
  });

  it("keeps every cluster and every mark inside the box", () => {
    for (const c of map.clusters) {
      expect(c.x - c.r).toBeGreaterThanOrEqual(-1);
      expect(c.x + c.r).toBeLessThanOrEqual(CW + 1);
      expect(c.y - c.r).toBeGreaterThanOrEqual(-1);
      expect(c.y + c.r).toBeLessThanOrEqual(CH + 1);
    }
    for (const m of map.marks) {
      expect(m.x).toBeGreaterThanOrEqual(-2);
      expect(m.y).toBeGreaterThanOrEqual(-2);
      expect(m.x).toBeLessThanOrEqual(CW + 2);
      expect(m.y).toBeLessThanOrEqual(CH + 2);
    }
  });

  it("gives every mark the cluster it belongs to", () => {
    const seen = new Set<number>();
    for (const m of map.marks) {
      expect(m.group).toBeGreaterThanOrEqual(0);
      expect(m.group).toBeLessThan(map.clusters.length);
      seen.add(m.group);
    }
    expect(seen.size).toBe(map.clusters.length);
  });

  it("needs more characters than the graph's edges have, so the clouds fade up", () => {
    // The edges are a few thousand marks. A cluster map that needed fewer than
    // that would arrive by travel alone, and the clouds would not read as
    // appearing — which is the whole behaviour this stage is for.
    expect(map.marks.length).toBeGreaterThan(6000);
  });

  it("is the same map every time, so it does not reshuffle on a resize", () => {
    const again = buildClusters(figure, { width: CW, height: CH, cellW: CELL_W, cellH: CELL_H });
    expect(again.clusters).toEqual(map.clusters);
    expect(again.marks.length).toBe(map.marks.length);
  });
});

describe("the corpus scene's own numbers", () => {
  it("keeps fewer rows than it ingested", () => {
    expect(figure.afterFiltering).toBeLessThan(figure.posts);
  });

  it("has distributions that account for the corpus, near enough to round", () => {
    const total = (rows: { share: number }[]) => rows.reduce((s, r) => s + r.share, 0);
    expect(total(figure.sentiment)).toBeCloseTo(1, 1);
    expect(total(figure.emotion)).toBeCloseTo(1, 1);
    expect(figure.emotion).toHaveLength(7);
  });

  it("prints the same figures the copy beside it claims", () => {
    const scene = projects.find((p) => p.slug === "affordability");
    const after = scene?.metrics.find((m) => m.label === "after filtering")?.value;
    const topics = scene?.metrics.find((m) => m.label === "topics")?.value;
    expect(after).toBe(`${Math.round(figure.afterFiltering / 1000)}K`);
    expect(topics).toBe(String(figure.topics));
  });
});
