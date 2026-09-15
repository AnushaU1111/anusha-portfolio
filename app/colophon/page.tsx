import type { Metadata } from "next";
import { RAMP } from "@/lib/ascii/ramp";

export const metadata: Metadata = { title: "Colophon" };

const rows: [string, string][] = [
  ["type", "Cormorant for display and body. JetBrains Mono for figures, labels and anything that is a number."],
  ["colour", "Three values and nothing else. A near-black with a warm cast, a bone white for text, and one rose for emphasis and data."],
  ["figures", "Every figure is a grid of characters, not an image. The portrait and the lily are converted at build time by sampling luminance into the eleven-step ramp. The charts, graphs and fields are generated directly from the content model, so the figure and the number it shows come from the same source."],
  ["motion", "One persistent canvas owns every figure. Scenes declare a target grid and scroll interpolates between them, so the characters of one figure become the next. With reduced motion on, nothing pins and every figure renders resolved."],
  ["stack", "Next.js, TypeScript strict, Tailwind, GSAP ScrollTrigger, Lenis, Zod for the content schema, Vitest and Playwright, deployed on Vercel."],
  ["source", "The site is open. The repository includes the build-time conversion script and the AsciiField renderer."],
];

export default function Colophon() {
  return (
    <main className="grid min-h-dvh grid-cols-[520px_1fr] gap-24 px-12 pt-28">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-rose">Colophon</div>
        <h1 className="mt-6 font-serif text-[54px] leading-[1.05]">
          Every figure on this site
          <br />
          is <em>text.</em>
        </h1>
        <p className="mt-6 max-w-[440px] text-[16.5px] leading-[1.6] text-[#a2958f]">
          No images were used for the flower, the portrait or any chart. Each one is a grid of characters, drawn from the eleven below, rendered to a canvas.
        </p>
        <div className="mt-11 border-b border-line pb-2 font-mono text-[8.5px] uppercase tracking-[0.24em] text-[#4a4042]">The ramp &middot; darkest to brightest</div>
        <ol className="mt-4 flex gap-1.5">
          {RAMP.map((ch, i) => (
            <li key={i} className="flex w-[38px] flex-col items-center gap-2">
              <span className="font-mono text-[22px] leading-none text-rose" style={{ opacity: 0.2 + 0.8 * (i / (RAMP.length - 1)) }}>
                {ch === " " ? " " : ch}
              </span>
              <span className="font-mono text-[7.5px] text-[#3f3638]">{String(i).padStart(2, "0")}</span>
            </li>
          ))}
        </ol>
      </div>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-5 border-b border-line py-4">
            <dt className="w-[90px] pt-1 font-mono text-[8.5px] uppercase tracking-[0.2em] text-rose">{k}</dt>
            <dd className="flex-1 text-[14.5px] leading-[1.58] text-[#9a8e8a]">{v}</dd>
          </div>
        ))}
        <a href="https://github.com/AnushaU1111" className="mt-6 inline-block border-b border-rose pb-1 font-mono text-[9px] uppercase tracking-[0.22em] text-[#c8bcb6]">
          View the repository &rarr;
        </a>
      </dl>
    </main>
  );
}
