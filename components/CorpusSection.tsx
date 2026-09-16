import type { CorpusSpec } from "@/lib/ascii/figures/corpus";
import type { Scene } from "@/content/schema";

/**
 * The Affordability scene.
 *
 * One state, not two. The corpus itself was drawn here as a wall of characters
 * on entry, and at this cell size it could not be: thirty thousand glyphs at
 * 1.5 by 2.5 px stop being glyphs and become a haze over the headline. So the
 * clusters arrive directly instead — the dependency graph's edges dissolve
 * straight into them as this section comes up.
 *
 * The distributions are type and rule. The cluster map is still characters, so
 * this section leaves its figure column clear for the canvas to show through
 * rather than covering it over.
 */

/** A bar drawn in the ramp, so a share is still made of characters. */
const bar = (share: number, slots = 30): string => {
  const filled = Math.max(0, Math.min(slots, Math.round(share * slots * 1.6)));
  return "8".repeat(filled) + "·".repeat(slots - filled);
};

const pct = (share: number) => `${Math.round(share * 100)}%`;

function Head({ fig, title, sub, aside }: { fig: string; title: string; sub: string; aside: string }) {
  return (
    <header className="flex items-baseline gap-3 overflow-hidden border-b border-line pb-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#6d6265]">
      <span className="whitespace-nowrap">Fig. {fig}</span>
      <span className="text-[#4a4042]">&middot;</span>
      <span className="whitespace-nowrap text-[#ded5ce]">{title}</span>
      <span className="text-[#4a4042]">/</span>
      <span className="truncate">{sub}</span>
      <span className="ml-auto whitespace-nowrap text-[#5a4e51]">{aside}</span>
    </header>
  );
}

function Distribution({ rows }: { rows: { label: string; share: number }[] }) {
  return (
    <dl className="mt-4">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-0.5">
          <dt className="w-24 shrink-0 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-[#bfb4ae]">
            {r.label}
          </dt>
          <dd className="shrink-0 font-mono text-[10px] tracking-[0.04em] text-rose">{bar(r.share)}</dd>
          <dd className="w-10 shrink-0 font-mono text-[11px] text-[#ded5ce]">{pct(r.share)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CorpusSection({ scene, figure }: { scene: Scene; figure: CorpusSpec }) {
  return (
    <section id={scene.slug} className="relative z-10">
      <div className="grid min-h-dvh grid-cols-1 gap-x-10 gap-y-14 pb-24 pt-24 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,470px)_minmax(0,1fr)]">
        <div className="relative z-10 bg-bg px-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-rose">
            {scene.index} / 07 &middot; {scene.org} &middot; {scene.period}
          </div>
          <h2 className="mt-6 font-serif text-[44px] leading-[1.06]">
            {scene.headline[0]}
            <br />
            <em>{scene.headline[1]}</em>
          </h2>
          <p className="mt-6 max-w-[640px] text-[17px] leading-[1.6] text-[#bfb4ae]">{scene.lede}</p>
          {scene.body.map((t) => (
            <p key={t} className="mt-4 max-w-[640px] text-[16.5px] leading-[1.58] text-[#a2958f]">{t}</p>
          ))}
          <p className="mt-6 max-w-[640px] border-l border-rose pl-5 text-[16.5px] leading-[1.58] text-[#ded5ce]">
            {scene.pull}
          </p>
          <dl className="mt-9 flex flex-wrap gap-x-9 gap-y-5 border-t border-line pt-6">
            {scene.metrics.map((m) => (
              <div key={m.label}>
                <dd className={`font-serif text-[36px] leading-none ${m.accent ? "text-rose" : ""}`}>{m.value}</dd>
                <dt className="mt-2 font-mono text-[8.5px] uppercase tracking-[0.22em] text-mute">{m.label}</dt>
              </div>
            ))}
          </dl>
          <ul className="mt-7 flex flex-wrap gap-1.5">
            {scene.stack.map((s) => (
              <li key={s} className="border border-line px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8d817c]">{s}</li>
            ))}
          </ul>
          {scene.credit && (
            <p className="mt-6 max-w-[420px] font-mono text-[8.5px] uppercase leading-[1.7] tracking-[0.2em] text-[#4a4042]">
              {scene.credit}
            </p>
          )}
        </div>

        <div className="px-12 pt-1 lg:pl-0">
          <section>
            <Head
              fig={`${scene.index}A`}
              title="Sentiment"
              sub={figure.sentimentModel}
              aside={`n = ${figure.afterFiltering.toLocaleString()}`}
            />
            <Distribution rows={figure.sentiment} />
          </section>

          <section className="mt-9">
            <Head fig={`${scene.index}B`} title="Emotion" sub={figure.emotionModel} aside="Share of corpus" />
            <Distribution rows={figure.emotion} />
          </section>

          <section className="mt-9">
            <Head
              fig={`${scene.index}C`}
              title="Topic clusters"
              sub={figure.topicModel}
              aside={`${figure.topics} topics · ${figure.topicsShown} shown`}
            />
            {/* Where the graph's edges land. MorphField reads this box every
                frame and draws the clusters into it; only the labels are text. */}
            <div id="cluster-box" className="mt-4 h-[54dvh] min-h-[340px]" aria-hidden="true" />
            <p className="mt-3 border-t border-line pt-3 text-right font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#4a4042]">
              Cluster area &asymp; share of corpus <span className="text-[#332b2d]">&middot;</span> position from umap, not
              meaning <span className="text-[#332b2d]">&middot;</span> labels withheld
            </p>
          </section>

          {scene.illustrative.length > 0 && (
            <p className="mt-6 text-right font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#4a4042]">
              {scene.illustrative.join(" · ")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
