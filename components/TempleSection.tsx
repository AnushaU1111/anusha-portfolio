import type { Scene, SceneDetail } from "@/content/schema";
import { SceneHead } from "@/components/SceneHead";

/**
 * The Temple scene, which is two states rather than one.
 *
 * On entry: the headline, the lede, and the diagram, full width, drawn on the
 * fine canvas out of the characters the Pareto chart came apart into. The
 * section holds there for most of a viewport.
 *
 * Then the results panel arrives — how the system was configured and what was
 * measured — on its own opaque background, which is what takes the diagram off
 * the screen. Nothing here is a canvas: the panel is type and rule, and the
 * bars are drawn from the same eleven characters as everything else.
 */

/** A bar drawn in the ramp, so a proportion is still made of characters. */
const bar = (filled: number, slots = 24): string =>
  "8".repeat(Math.max(0, Math.min(slots, filled))) + "·".repeat(Math.max(0, slots - filled));

/** The keyword-to-semantic slider: a block sitting where the default is. */
const slider = (alpha: number, slots = 30, width = 8): string => {
  const centre = Math.round(alpha * slots);
  const from = Math.max(0, Math.min(slots - width, centre - Math.floor(width / 2)));
  return "·".repeat(from) + "8".repeat(width) + "·".repeat(Math.max(0, slots - from - width));
};

function Block({
  fig,
  title,
  sub,
  aside,
  children,
}: {
  fig: string;
  title: string;
  sub: string;
  aside: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9 first:mt-0">
      <header className="flex items-baseline gap-3 overflow-hidden border-b border-line pb-2 font-mono text-[12px] uppercase tracking-[0.2em] text-[#8b8083]">
        <span className="whitespace-nowrap">Fig. {fig}</span>
        <span className="text-[#6b5d60]">&middot;</span>
        <span className="whitespace-nowrap text-[#ded5ce]">{title}</span>
        <span className="text-[#6b5d60]">/</span>
        <span className="truncate">{sub}</span>
        <span className="ml-auto whitespace-nowrap text-[#7c6e71]">{aside}</span>
      </header>
      {children}
    </section>
  );
}

export function TempleSection({ scene, detail }: { scene: Scene; detail: SceneDetail }) {
  const configs = scene.metrics.find((m) => m.label === "llm configs")?.value;

  return (
    <section id={scene.slug} className="relative z-10">
      {/* The diagram's own hold. One viewport of it is sticky, and the rest of
          this block is the scroll spent looking at it. */}
      <div className="h-[170dvh]">
        <div className="sticky top-0 h-dvh">
          <div className="absolute left-12 top-[9dvh] max-w-[760px]">
            <SceneHead scene={scene} />
            <p className="mt-5 max-w-[520px] text-[17.5px] leading-[1.6] text-[#a2958f]">{scene.lede}</p>
          </div>
          {/* Where the chart's characters land. MorphField reads this box every
              frame; the diagram's own top and bottom padding keep it clear of
              the headline above it. */}
          <div id="pipe-box" className="absolute inset-0" aria-hidden="true" />
          <div className="absolute bottom-8 right-12 text-right font-mono text-[12px] uppercase leading-[1.8] tracking-[0.2em] text-[#7c6e71]">
            <div>
              Fig. {scene.index}A <span className="text-[#6b5d60]">&middot;</span> request path
            </div>
            <div>
              {detail.waysIn.length} ways in <span className="text-[#6b5d60]">&middot;</span>{" "}
              {scene.figure.kind === "pipeline" ? scene.figure.outputs.length : 2} ways out
            </div>
          </div>
        </div>
      </div>

      {/* The results. Opaque, so arriving is what takes the diagram away. */}
      <div id="temple-results" className="relative bg-bg">
        {/* The copy column gives way before the figure blocks do: they carry
            fixed-width bars and cannot usefully shrink, so below a laptop
            width the panel becomes one column and reads down instead. */}
        <div className="grid min-h-dvh grid-cols-1 gap-x-10 gap-y-14 px-12 pb-24 pt-20 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,470px)_minmax(0,1fr)]">
          <div>
            {/* The results state restates the header, because it arrives as
                its own screen and the entry state has scrolled away by then. */}
            <SceneHead scene={scene} />
            {scene.body.map((t) => (
              <p key={t} className="mt-4 max-w-[640px] text-[18px] leading-[1.58] text-[#a2958f]">{t}</p>
            ))}
            <p className="mt-6 max-w-[640px] border-l border-rose pl-5 text-[18px] leading-[1.58] text-[#ded5ce]">{scene.pull}</p>
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
            {scene.credit && (
              <p className="mt-6 max-w-[420px] font-mono text-[11px] uppercase leading-[1.7] tracking-[0.2em] text-[#6b5d60]">
                {scene.credit}
              </p>
            )}
          </div>

          <div className="pt-1">
            <Block
              fig={`${scene.index}B`}
              title="Ways in"
              sub="Each path normalises to one english query"
              aside={`${detail.waysIn.length} modes`}
            >
              <dl className="mt-3">
                {detail.waysIn.map((w) => (
                  <div key={w.key} className="flex flex-wrap items-baseline gap-x-5 gap-y-1 py-1.5">
                    <dt className="w-16 shrink-0 font-mono text-[12px] uppercase tracking-[0.2em] text-rose">{w.key}</dt>
                    <dd className="min-w-0 text-[17.5px] text-[#ded5ce]">{w.what}</dd>
                    <dd className="ml-auto pl-6 text-right font-mono text-[12px] uppercase tracking-[0.16em] text-[#8b8083]">
                      {w.how}
                    </dd>
                  </div>
                ))}
              </dl>
            </Block>

            <Block
              fig={`${scene.index}C`}
              title="Retrieval"
              sub={`${detail.retrieval.length} indexes, weighted at runtime`}
              aside="Weights adjustable in the ui"
            >
              <dl className="mt-4">
                {detail.retrieval.map((r) => (
                  <div key={r.label} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-1">
                    <dt className="w-40 shrink-0 text-right font-mono text-[12.5px] uppercase tracking-[0.16em] text-[#bfb4ae]">
                      {r.label}
                    </dt>
                    <dd className="shrink-0 font-mono text-[12.5px] tracking-[0.04em] text-rose">
                      {bar(Math.round(r.weight * 36))}
                    </dd>
                    <dd className="w-10 shrink-0 font-mono text-[13.5px] text-[#ded5ce]">{r.weight.toFixed(2)}</dd>
                    <dd className="min-w-0 truncate font-mono text-[12px] uppercase tracking-[0.16em] text-[#8b8083]">
                      {r.source}
                    </dd>
                  </div>
                ))}
                <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <dt className="w-40 shrink-0 text-right font-mono text-[12px] uppercase tracking-[0.2em] text-[#8b8083]">
                    Hybrid alpha
                  </dt>
                  <dd className="flex flex-wrap items-baseline gap-x-3 font-mono text-[12.5px] uppercase tracking-[0.16em] text-[#8b8083]">
                    <span className="shrink-0">keyword</span>
                    <span className="shrink-0 tracking-[0.04em] text-rose">{slider(detail.hybridAlpha)}</span>
                    <span className="shrink-0">semantic</span>
                  </dd>
                </div>
              </dl>
            </Block>

            <Block
              fig={`${scene.index}D`}
              title="What was assessed"
              sub={`${configs ? `${configs} configurations, ` : ""}${detail.retrieval.length} source databases`}
              aside="Local via ollama"
            >
              <ul className="mt-4 flex flex-wrap gap-2">
                {detail.assessed.map((a) => (
                  <li key={a} className="border border-line px-3 py-2 font-mono text-[12px] uppercase tracking-[0.16em] text-[#bfb4ae]">
                    {a}
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-l border-rose pl-5 font-mono text-[12.5px] leading-[1.7] tracking-[0.04em] text-[#a09490]">
                {detail.assessedNote}
              </p>
            </Block>

            <Block
              fig={`${scene.index}E`}
              title="What it keeps"
              sub="Memory, and the ability to discard it"
              aside="Session scoped"
            >
              <dl className="mt-3">
                {detail.keeps.map((k) => (
                  <div key={k.label} className="flex flex-wrap items-baseline gap-x-5 gap-y-1 py-1.5">
                    <dt className="w-40 shrink-0 font-mono text-[12px] uppercase tracking-[0.2em] text-rose">{k.label}</dt>
                    <dd className="min-w-0 text-[17.5px] text-[#ded5ce]">{k.note}</dd>
                  </div>
                ))}
              </dl>
            </Block>

            {scene.illustrative.length > 0 && (
              <p className="mt-10 border-t border-line pt-3 text-right font-mono text-[11px] uppercase tracking-[0.2em] text-[#6b5d60]">
                {scene.illustrative.join(" · ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
