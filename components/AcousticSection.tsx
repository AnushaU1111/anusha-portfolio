import type { SpectrogramSpec } from "@/lib/ascii/figures/spectrogram";
import { reportOf, timelineOf } from "@/lib/ascii/wave";
import type { Scene } from "@/content/schema";
import { SceneHead } from "@/components/SceneHead";

/**
 * The Acoustic scene, on one page: the window the model sees, and the report on
 * what it did with it, together.
 *
 * The log-mel window is characters on the fine canvas, drawn out of the topic
 * clusters that travelled into it. Everything beside it is type — and every
 * figure in it is computed from the per-class report in `content`, not declared
 * twice, so the summary cannot disagree with the rows above it.
 */

/** A bar drawn in the ramp, so a score is still made of characters. */
const bar = (v: number, slots: number): string => {
  const filled = Math.max(0, Math.min(slots, Math.round(v * slots)));
  return "8".repeat(filled) + "·".repeat(slots - filled);
};

const two = (v: number) => v.toFixed(2);
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function Head({ fig, title, sub, aside }: { fig: string; title: string; sub: string; aside: string }) {
  return (
    <header className="flex items-baseline gap-3 overflow-hidden border-b border-line pb-2 font-mono text-[12px] uppercase tracking-[0.2em] text-[#8b8083]">
      <span className="whitespace-nowrap">Fig. {fig}</span>
      <span className="text-[#6b5d60]">&middot;</span>
      <span className="whitespace-nowrap text-[#ded5ce]">{title}</span>
      <span className="text-[#6b5d60]">/</span>
      <span className="truncate">{sub}</span>
      <span className="ml-auto whitespace-nowrap text-[#7c6e71]">{aside}</span>
    </header>
  );
}

/** One score: the glyph bar and the number it stands for. */
function Score({ v, slots = 12 }: { v: number; slots?: number }) {
  return (
    <span className="flex shrink-0 items-baseline gap-2">
      <span className="font-mono text-[12.5px] tracking-[0.04em] text-rose">{bar(v, slots)}</span>
      <span className="w-8 font-mono text-[13.5px] text-[#ded5ce]">{two(v)}</span>
    </span>
  );
}

export function AcousticSection({ scene, figure }: { scene: Scene; figure: SpectrogramSpec }) {
  const report = reportOf(figure);
  const timeline = timelineOf(figure, 96);
  const glyphs = figure.classes.map((k) => `${k.glyph} ${k.name}`).join("   ");

  return (
    <section id={scene.slug} className="relative z-10">
      <div className="grid min-h-dvh grid-cols-1 gap-x-10 gap-y-14 pb-24 pt-24 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,470px)_minmax(0,1fr)]">
        <div className="relative z-10 bg-bg px-12">
          <SceneHead scene={scene} />
          <p className="mt-6 max-w-[640px] text-[18.5px] leading-[1.6] text-[#bfb4ae]">{scene.lede}</p>
          {scene.body.map((t) => (
            <p key={t} className="mt-4 max-w-[640px] text-[18px] leading-[1.58] text-[#a2958f]">{t}</p>
          ))}
          <p className="mt-6 max-w-[640px] border-l border-rose pl-5 text-[18px] leading-[1.58] text-[#ded5ce]">
            {scene.pull}
          </p>
          <dl className="mt-9 flex flex-wrap gap-x-9 gap-y-5 border-t border-line pt-6">
            {scene.metrics.map((m) => (
              <div key={m.label}>
                <dd className={`font-serif text-[39px] leading-none ${m.accent ? "text-rose" : ""}`}>{m.value}</dd>
                <dt className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-mute">{m.label}</dt>
              </div>
            ))}
          </dl>
          <ul className="mt-7 flex flex-wrap gap-1.5">
            {scene.stack.map((s) => (
              <li key={s} className="border border-line px-2.5 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.14em] text-[#a09490]">{s}</li>
            ))}
          </ul>
          <p className="mt-6 font-mono text-[11px] uppercase leading-[1.7] tracking-[0.2em] text-[#6b5d60]">
            {figure.trainSubjects} subjects trained on <span className="text-[#4e4245]">&middot;</span>{" "}
            {figure.heldOutSubjects} held out{" "}
            <span className="text-[#4e4245]">&middot;</span> {figure.trainSubjects + figure.heldOutSubjects} in total
          </p>
        </div>

        <div className="px-12 pt-1 lg:pl-0">
          <section>
            <Head
              fig={`${scene.index}A`}
              title="Log-mel spectrogram"
              sub="What the model actually sees"
              aside={`${report.frames.toLocaleString()} frames · ${figure.trainSubjects + figure.heldOutSubjects} subjects`}
            />
            {/* Where the clusters land. MorphField reads this box every frame
                and draws the window into it; the axes are text. */}
            <div id="wave-box" className="mb-7 mt-5 h-[40dvh] min-h-[240px]" aria-hidden="true" />
          </section>

          <section className="mt-9">
            <Head
              fig={`${scene.index}B`}
              title="Per-class report"
              sub="Held-out subjects"
              aside={`n = ${report.frames.toLocaleString()} frames`}
            />
            <div className="mt-4 hidden gap-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[#7c6e71] lg:flex">
              <span className="w-24" />
              <span className="w-[136px]">Precision</span>
              <span className="w-[136px]">Recall</span>
              <span className="w-[136px]">F1</span>
              <span>Support</span>
            </div>
            <dl className="mt-1">
              {figure.classes.map((k) => (
                <div key={k.name} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-1.5">
                  <dt className="flex w-24 shrink-0 items-baseline justify-end gap-2 font-mono text-[12.5px] uppercase tracking-[0.16em] text-[#bfb4ae]">
                    <span>{k.name}</span>
                  </dt>
                  <dd className="shrink-0 font-mono text-[13.5px] text-rose">{k.glyph}</dd>
                  <Score v={k.precision} />
                  <Score v={k.recall} />
                  <Score v={k.f1} />
                  <dd className="shrink-0 font-mono text-[12.5px] tracking-[0.06em] text-[#a09490]">
                    {k.support.toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-9">
            <Head
              fig={`${scene.index}C`}
              title="Class balance"
              sub="Frames per class"
              aside={`${pct(report.minority.share)} minority class`}
            />
            {/* One line, in the proportions the report reports: the argument in
                the pull quote is that the smallest class is too small. */}
            <p className="mt-4 overflow-hidden font-mono text-[12.5px] leading-none tracking-[0.04em] text-rose">
              {figure.classes
                .map((k, i) => {
                  const share = report.balance[i]?.share ?? 0;
                  return k.glyph.repeat(Math.max(1, Math.round(share * 90)));
                })
                .join("")}
            </p>
            <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[12px] uppercase tracking-[0.16em] text-[#a09490]">
              {figure.classes.map((k, i) => (
                <span key={k.name} className="whitespace-nowrap">
                  <span className="text-rose">{k.glyph}</span> {k.name}{" "}
                  <span className="text-[#ded5ce]">{pct(report.balance[i]?.share ?? 0)}</span>
                </span>
              ))}
            </p>
          </section>

          <section className="mt-9">
            <Head
              fig={`${scene.index}D`}
              title="Aggregate"
              sub="The same model, three ways"
              aside="Held-out subjects"
            />
            <dl className="mt-4">
              {[
                { label: "macro f1", v: figure.macroF1, note: "every class counts once" },
                { label: "weighted f1", v: figure.weightedF1, note: "every frame counts once" },
                { label: "accuracy", v: figure.accuracy, note: "frames called correctly" },
              ].map((row) => (
                <div key={row.label} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-1">
                  <dt className="w-28 shrink-0 text-right font-mono text-[12.5px] uppercase tracking-[0.16em] text-[#bfb4ae]">
                    {row.label}
                  </dt>
                  <dd className="shrink-0 font-mono text-[12.5px] tracking-[0.04em] text-rose">{bar(row.v, 34)}</dd>
                  <dd className="w-10 shrink-0 font-mono text-[13.5px] text-[#ded5ce]">{two(row.v)}</dd>
                  <dd className="min-w-0 truncate font-mono text-[12px] uppercase tracking-[0.16em] text-[#8b8083]">
                    {row.note}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-l border-rose pl-5 font-mono text-[12.5px] leading-[1.7] tracking-[0.04em] text-[#a09490]">
              Macro F1 gives the {report.minority.name} class the same weight as the other three, which is why it sits{" "}
              {two(figure.weightedF1 - figure.macroF1)} below the weighted figure.
            </p>
          </section>

          <section className="mt-9">
            <Head
              fig={`${scene.index}E`}
              title="Frame timeline"
              sub="Truth against prediction"
              aside="Illustrative window"
            />
            <dl className="mt-4">
              {[
                { label: "truth", row: timeline.truth },
                { label: "predicted", row: timeline.predicted },
              ].map((r) => (
                <div key={r.label} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-1">
                  <dt className="w-20 shrink-0 text-right font-mono text-[12px] uppercase tracking-[0.16em] text-[#8b8083]">
                    {r.label}
                  </dt>
                  <dd className="overflow-hidden whitespace-nowrap font-mono text-[13.5px] leading-none tracking-[0.06em] text-rose">
                    {r.row.join("")}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-l border-rose pl-5 font-mono text-[12.5px] leading-[1.7] tracking-[0.04em] text-[#a09490]">
              Viterbi decoding with per-class offset tuning smooths frame-level predictions into contiguous events. In
              this window {Math.round(timeline.agreement * 100)}% of frames agree, and the misses are the classes the
              report recalls worst.
            </p>
          </section>

          <p className="mt-9 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-line pt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#6b5d60]">
            <span>{glyphs}</span>
            <span className="ml-auto text-right">
              Glyph encodes class <span className="text-[#4e4245]">&middot;</span> brightness encodes energy, and only in
              the window
            </span>
          </p>
          {scene.illustrative.length > 0 && (
            <p className="mt-3 text-right font-mono text-[11px] uppercase tracking-[0.2em] text-[#6b5d60]">
              {scene.illustrative.join(" · ")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
