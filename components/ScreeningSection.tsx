import { confusionOf } from "@/lib/ascii/bars";
import type { ContactSheetSpec } from "@/lib/ascii/figures/contactSheet";
import type { Scene } from "@/content/schema";
import { SceneHead } from "@/components/SceneHead";

/**
 * The Screening scene, on one page: what each stage bought, what the threshold
 * cost, and what it beat.
 *
 * The bars are characters on the fine canvas, drawn out of the log-mel window
 * that came apart into them — the last figure in the chain, and the plainest.
 * Their names and scores are text laid over the canvas; everything below them
 * is type.
 *
 * Recall, precision, F1 and accuracy are arithmetic on the four counts in the
 * confusion matrix, so they are computed here. The one number on the page that
 * is a judgement rather than a calculation is the threshold, and the scene says
 * so in its own words.
 */

const three = (v: number) => v.toFixed(3);
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const signed = (v: number, places = 1) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(places)}`;

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

export function ScreeningSection({ scene, figure }: { scene: Scene; figure: ContactSheetSpec }) {
  const m = confusionOf(figure);
  const after = { rocAuc: figure.rocAuc, recall: m.recall, precision: m.precision, f1: m.f1, accuracy: m.accuracy };
  const rows = [
    { label: "roc-auc", was: figure.baseline.rocAuc, now: after.rocAuc, scale: 1, places: 3 },
    { label: "recall", was: figure.baseline.recall, now: after.recall, scale: 100, places: 1 },
    { label: "precision", was: figure.baseline.precision, now: after.precision, scale: 100, places: 1 },
    { label: "f1", was: figure.baseline.f1, now: after.f1, scale: 100, places: 1 },
    { label: "accuracy", was: figure.baseline.accuracy, now: after.accuracy, scale: 100, places: 1 },
  ];

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
            {scene.metrics.map((k) => (
              <div key={k.label}>
                <dd className={`font-serif text-[39px] leading-none ${k.accent ? "text-rose" : ""}`}>{k.value}</dd>
                <dt className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-mute">{k.label}</dt>
              </div>
            ))}
          </dl>
          <ul className="mt-7 flex flex-wrap gap-1.5">
            {scene.stack.map((t) => (
              <li key={t} className="border border-line px-2.5 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.14em] text-[#a09490]">{t}</li>
            ))}
          </ul>
          {scene.credit && (
            <p className="mt-6 max-w-[420px] font-mono text-[11px] uppercase leading-[1.7] tracking-[0.2em] text-[#6b5d60]">
              {scene.credit}
            </p>
          )}
        </div>

        <div className="px-12 pt-1 lg:pl-0">
          <section>
            <Head
              fig={`${scene.index}A`}
              title="What each stage bought"
              sub="Validation roc-auc"
              aside={`${figure.stages.length} stages`}
            />
            {/* Where the log-mel window lands. MorphField reads this box every
                frame and draws the runs into it; the names and scores are the
                overlay's, because they are read and not looked at. */}
            <div id="bar-box" className="mb-6 mt-7 h-[34dvh] min-h-[210px]" aria-hidden="true" />
          </section>

          <section className="mt-9">
            <Head
              fig={`${scene.index}B`}
              title="Confusion matrix"
              sub={`Ensemble at threshold ${figure.threshold.toFixed(2)}`}
              aside={`n = ${m.total.toLocaleString()} test images`}
            />
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[420px] font-mono text-[13.5px]">
                <thead>
                  <tr className="text-[11.5px] uppercase tracking-[0.18em] text-[#7c6e71]">
                    <th className="w-28 pb-3 text-left font-normal" />
                    <th className="pb-3 text-right font-normal">Pred. benign</th>
                    <th className="pb-3 text-right font-normal">Pred. malignant</th>
                    <th className="pb-3 text-right font-normal">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className="py-2 text-left text-[12.5px] font-normal uppercase tracking-[0.16em] text-[#bfb4ae]">
                      Benign
                    </th>
                    <td className="py-2 text-right text-[#ded5ce]">{m.trueNegative.toLocaleString()}</td>
                    <td className="py-2 text-right text-[#a09490]">{m.falsePositive.toLocaleString()}</td>
                    <td className="py-2 text-right text-[#8b8083]">{m.actualBenign.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <th className="py-2 text-left text-[12.5px] font-normal uppercase tracking-[0.16em] text-[#bfb4ae]">
                      Malignant
                    </th>
                    {/* The one cell on this page that matters most: cancers
                        called benign. */}
                    <td className="py-2 text-right text-rose">{m.falseNegative.toLocaleString()}</td>
                    <td className="py-2 text-right text-[#ded5ce]">{m.truePositive.toLocaleString()}</td>
                    <td className="py-2 text-right text-[#8b8083]">{m.actualMalignant.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-9">
            <Head
              fig={`${scene.index}C`}
              title="The threshold"
              sub="Two options, one chosen"
              aside="Screening beats scoring"
            />
            <dl className="mt-5">
              {[
                {
                  at: figure.threshold,
                  tag: "chosen",
                  recall: pct(m.recall),
                  f1: figure.f1AtThreshold.toFixed(2),
                  why: "clinical screening",
                  chosen: true,
                },
                {
                  at: figure.bestF1Threshold,
                  tag: "best f1",
                  recall: "lower",
                  f1: figure.f1AtBestF1.toFixed(2),
                  why: "trades off recall",
                  chosen: false,
                },
              ].map((o) => (
                <div key={o.tag} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-1.5">
                  <dt
                    className={`flex shrink-0 items-baseline gap-3 font-mono text-[13.5px] tracking-[0.06em] ${
                      o.chosen ? "text-rose" : "text-[#a09490]"
                    }`}
                  >
                    <span>{o.at.toFixed(2)}</span>
                    <span className="text-[12px] uppercase tracking-[0.18em]">{o.tag}</span>
                  </dt>
                  <dd className="shrink-0 font-mono text-[12.5px] uppercase tracking-[0.14em] text-[#8b8083]">
                    recall <span className="text-[#ded5ce]">{o.recall}</span>
                  </dd>
                  <dd className="shrink-0 font-mono text-[12.5px] uppercase tracking-[0.14em] text-[#8b8083]">
                    f1 <span className="text-[#ded5ce]">{o.f1}</span>
                  </dd>
                  <dd className="min-w-0 truncate font-mono text-[12px] uppercase tracking-[0.16em] text-[#7c6e71]">
                    {o.why}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-l border-rose pl-5 font-mono text-[12.5px] leading-[1.7] tracking-[0.04em] text-[#a09490]">
              {m.falseNegative} malignant {m.falseNegative === 1 ? "case" : "cases"} missed out of{" "}
              {m.actualMalignant}. The {figure.bestF1Threshold.toFixed(2)} threshold would have scored better and caught
              fewer.
            </p>
          </section>

          <section className="mt-9">
            <Head
              fig={`${scene.index}D`}
              title="Against a classical baseline"
              sub={figure.baseline.label}
              aside="Same test set"
            />
            <dl className="mt-5">
              {rows.map((r) => {
                const delta = (r.now - r.was) * r.scale;
                return (
                  <div key={r.label} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-1">
                    <dt className="w-24 shrink-0 text-right font-mono text-[12.5px] uppercase tracking-[0.16em] text-[#bfb4ae]">
                      {r.label}
                    </dt>
                    <dd className="w-16 shrink-0 font-mono text-[13.5px] text-[#a09490]">
                      {r.scale === 1 ? three(r.was) : pct(r.was)}
                    </dd>
                    <dd className="shrink-0 font-mono text-[12.5px] text-[#6b5d60]">&rarr;</dd>
                    <dd className="w-16 shrink-0 font-mono text-[13.5px] text-[#ded5ce]">
                      {r.scale === 1 ? three(r.now) : pct(r.now)}
                    </dd>
                    <dd
                      className={`shrink-0 font-mono text-[12.5px] tracking-[0.06em] ${
                        delta >= 0 ? "text-rose" : "text-[#8b8083]"
                      }`}
                    >
                      {signed(delta, r.places)}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="mt-4 border-l border-rose pl-5 font-mono text-[12.5px] leading-[1.7] tracking-[0.04em] text-[#a09490]">
              Precision is the one figure that went down. That is the threshold, not the model: buying{" "}
              {signed((after.recall - figure.baseline.recall) * 100)} points of recall on a screening task is worth
              giving back {Math.abs((after.precision - figure.baseline.precision) * 100).toFixed(1)}.
            </p>
          </section>

          <p className="mt-9 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-line pt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#6b5d60]">
            <span>
              {figure.positive.toLocaleString()} malignant of {figure.total.toLocaleString()}
            </span>
            <span className="ml-auto text-right">
              Glyph density encodes count <span className="text-[#4e4245]">&middot;</span> {figure.citation}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
