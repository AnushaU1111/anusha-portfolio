/**
 * Converts source images in assets/ into character grids in public/grids/.
 * Runs before `next build`. Data-driven figures (Pareto, graph, corpus,
 * spectrogram, contact sheet) are generated from the content model at
 * runtime; only photographic sources go through this script.
 *
 * Usage: pnpm grids
 */
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { lumaToGrid } from "../lib/ascii/imageToGrid";

interface Job {
  src: string;
  out: string;
  cols: number;
  gamma?: number;
  floor?: number;
  dither?: number;
  /** Optional alpha mask; where the mask is dark the cell is empty. */
  mask?: string;
}

const jobs: Job[] = [
  { src: "assets/lily.png", out: "lily", cols: 142, gamma: 0.9, floor: 0.05, dither: 0.02 },
  { src: "assets/portrait.png", out: "portrait", cols: 170, gamma: 1.12, floor: 0.04, dither: 0.02, mask: "assets/portrait-mask.png" },
];

const exists = async (p: string) => access(p).then(() => true, () => false);

const run = async () => {
  await mkdir("public/grids", { recursive: true });
  for (const job of jobs) {
    if (!(await exists(job.src))) {
      console.warn(`skip ${job.out}: ${job.src} not present`);
      continue;
    }
    const img = sharp(await readFile(job.src)).grayscale();
    const meta = await img.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    let luma = new Uint8Array(await img.raw().toBuffer());
    if (job.mask && (await exists(job.mask))) {
      const m = new Uint8Array(await sharp(await readFile(job.mask)).grayscale().resize(width, height).raw().toBuffer());
      luma = luma.map((v, i) => Math.round(v * ((m[i] ?? 0) / 255)));
    }
    const grid = lumaToGrid(luma, width, height, {
      cols: job.cols,
      ...(job.gamma !== undefined && { gamma: job.gamma }),
      ...(job.floor !== undefined && { floor: job.floor }),
      ...(job.dither !== undefined && { dither: job.dither }),
    });
    await writeFile(path.join("public/grids", `${job.out}.json`), JSON.stringify(grid));
    console.log(`wrote ${job.out}.json (${grid.cols}x${grid.rows})`);
  }
};

run().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
