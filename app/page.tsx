import { projects } from "@/content/projects";
import { about, contact } from "@/content/about";
import { profile } from "@/content/profile";
import { links } from "@/content/links";
import { Field } from "@/components/Field";
import { MorphField } from "@/components/MorphField";
import { AcousticSection } from "@/components/AcousticSection";
import { ScreeningSection } from "@/components/ScreeningSection";
import { CorpusSection } from "@/components/CorpusSection";
import { TempleSection } from "@/components/TempleSection";

/**
 * Phase 01 scaffold. Sections render their content from the model so the
 * information architecture and every number are already correct. Figures,
 * pinning and transitions arrive with the AsciiField scenes in phase 04.
 */
export default function Home() {
  // The Pareto chart is drawn on the fine canvas out of the portrait's own
  // characters, so it reads its numbers from the same scene the copy does.
  const pareto = projects.find((p) => p.figure.kind === "pareto")?.figure;
  const chart = pareto?.kind === "pareto" ? { chartTargetId: "chart-box", chartSpec: pareto } : {};
  // The Temple diagram is the chart's own characters again, travelling into the
  // runs between its nodes, so it reads the same scene the copy beside it does.
  const temple = projects.find((p) => p.slug === "temple-rag");
  const pipe =
    temple?.figure.kind === "pipeline"
      ? { pipeTargetId: "pipe-box", pipeSpec: temple.figure, pipeExitId: "temple-results" }
      : {};
  // And the pipeline's runs become the dependency graph's edges, so the whole
  // page is one set of characters from the flower onward.
  // And the edges arrive as the corpus's topic clusters, so the whole page is
  // one set of characters from the flower onward.
  const afford = projects.find((p) => p.figure.kind === "corpus");
  const corpus =
    afford?.figure.kind === "corpus"
      ? {
          clusterTargetId: "cluster-box",
          corpusSpec: afford.figure,
          clusterCueId: afford.slug,
        }
      : {};
  // And the clouds travel into the log-mel window the acoustic model sees.
  const acoustic = projects.find((p) => p.figure.kind === "spectrogram");
  const waves =
    acoustic?.figure.kind === "spectrogram"
      ? { waveTargetId: "wave-box", waveSpec: acoustic.figure, waveCueId: acoustic.slug }
      : {};
  // And the window comes apart into the last figure on the site.
  const screening = projects.find((p) => p.figure.kind === "contactSheet");
  const barsProps =
    screening?.figure.kind === "contactSheet"
      ? {
          barTargetId: "bar-box",
          barSpec: screening.figure,
          barCueId: screening.slug,
          flowerTargetId: "flower-box",
          flowerCueId: "contact",
        }
      : {};
  const reqtrace = projects.find((p) => p.slug === "reqtrace");
  const graph =
    reqtrace?.figure.kind === "graph"
      ? {
          graphTargetId: "graph-box",
          graphSpec: reqtrace.figure,
          transcript: reqtrace.figure.transcript,
        }
      : {};

  return (
    <main className="relative">
      <Field />
      {/* The cold open, the portrait and the chart share one fine-grid canvas,
          because each becoming the next has to be the same characters moving. */}
      <MorphField
        flowerSrc="/lily.png"
        faceSrc="/portrait-face.jpg"
        targetId="portrait-box"
        {...chart}
        {...pipe}
        {...graph}
        {...corpus}
        {...waves}
        {...barsProps}
      />
      <section id="top" className="relative z-10 flex min-h-dvh flex-col justify-end px-12 pb-24">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-rose">{profile.name} &middot; ML engineer</div>
        <h1 className="mt-6 font-serif text-[132px] font-light leading-[0.86] tracking-[-0.01em]">
          Signal
          <br />
          <em>from</em> noise.
        </h1>
        <p className="mt-8 max-w-[500px] font-serif text-[22px] text-[#bfb4ae]">{profile.role}</p>
        <p className="absolute bottom-8 left-12 font-mono text-[10px] uppercase tracking-[0.3em] text-mute before:mr-3.5 before:inline-block before:h-px before:w-8 before:bg-rose before:align-middle">
          Move the cursor
        </p>
      </section>

      {/* Both grids give their columns a zero floor and the copy a minimum, or
          the fixed first column plus the copy's own min-content width is wider
          than a narrow laptop window and the page scrolls sideways. */}
      <section id="about" className="relative z-10 grid min-h-dvh grid-cols-[minmax(0,660px)_minmax(380px,1fr)]">
        {/* Where the flower's characters land. MorphField reads this box every
            frame, so once the face has arrived it scrolls with the section. */}
        <div id="portrait-box" className="min-h-dvh" aria-hidden="true" />
        <div className="px-10 pt-24">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-rose">{about.index} &middot; Introduction</div>
          <h2 className="mt-6 font-serif text-[63px] leading-none">
            {about.headline[0]}
            <br />
            <em>{about.headline[1]}</em>
          </h2>
          {about.body.map((p) => (
            <p key={p} className="mt-4 max-w-[600px] text-[18.5px] leading-[1.6] text-[#a2958f]">{p}</p>
          ))}
          <p className="mt-6 max-w-[600px] border-l border-rose pl-6 text-[18.5px] leading-[1.6] text-[#ded5ce]">{about.pull}</p>
          <p className="mt-3 max-w-[600px] text-[14px] leading-[1.58] text-[#8d817c]">{about.throughLine}</p>
          <dl className="mt-7 flex flex-wrap gap-x-16 gap-y-6 border-t border-line pt-6">
            {[["Now", profile.now], ["Recently", profile.recently], ["Focus", profile.focus]].map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-mute">{k}</dt>
                <dd className="mt-3 text-[16px] text-[#ded5ce]">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div id="work">
        {projects.map((p) =>
          // The Temple scene is two states rather than one, so it owns its own
          // layout instead of the shared project shell.
          p.detail ? (
            <TempleSection key={p.slug} scene={p} detail={p.detail} />
          ) : p.figure.kind === "corpus" ? (
            <CorpusSection key={p.slug} scene={p} figure={p.figure} />
          ) : p.figure.kind === "spectrogram" ? (
            <AcousticSection key={p.slug} scene={p} figure={p.figure} />
          ) : p.figure.kind === "contactSheet" ? (
            <ScreeningSection key={p.slug} scene={p} figure={p.figure} />
          ) : (
          <section key={p.slug} id={p.slug} className="relative z-10 grid min-h-dvh grid-cols-[minmax(0,498px)_minmax(0,1fr)]">
            {/* The text column is opaque and the figure column is not, so the
                field shows through on the right and never behind the type. */}
            <div className="relative z-10 bg-bg px-12 pt-28">
              <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-rose">
                {p.index} / 07 &middot; {p.org} &middot; {p.period}
              </div>
              <h2 className="mt-6 font-serif text-[52px] leading-[1.04]">
                {p.headline[0]} <em>{p.headline[1]}</em>
              </h2>
              {p.body.map((t) => (
                <p key={t} className="mt-4 text-[16.5px] leading-[1.58] text-[#a2958f]">{t}</p>
              ))}
              <p className="mt-6 border-l border-rose pl-5 text-[16.5px] leading-[1.58] text-[#ded5ce]">{p.pull}</p>
              <dl className="mt-10 flex flex-wrap gap-x-9 gap-y-5 border-t border-line pt-6">
                {p.metrics.map((m) => (
                  <div key={m.label}>
                    <dd className={`font-serif text-[36px] leading-none ${m.accent ? "text-rose" : ""}`}>{m.value}</dd>
                    <dt className="mt-2 font-mono text-[8.5px] uppercase tracking-[0.22em] text-mute">{m.label}</dt>
                  </div>
                ))}
              </dl>
              <ul className="mt-7 flex flex-wrap gap-1.5">
                {p.stack.map((s) => (
                  <li key={s} className="border border-line px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8d817c]">{s}</li>
                ))}
              </ul>
              {p.credit && <p className="mt-5 font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#4a4042]">{p.credit}</p>}
            </div>
            <div data-entry-grid={p.entryGrid} aria-hidden="true">
              {/* Where the portrait's characters land. MorphField reads this box
                  every frame, so the plot sits in the column and the axis over
                  it follows. Full-bleed: the whole screen beside the copy, edge
                  to edge, with only enough padding inside for the labels. */}
              {p.slug === "neuraluna" && <div id="chart-box" className="h-dvh w-full" />}
              {p.slug === "reqtrace" && <div id="graph-box" className="h-dvh w-full" />}
            </div>
          </section>
          ),
        )}
      </div>

      <section id="contact" className="relative z-10 min-h-dvh px-12 pt-32">
        {/* Where the lily comes back. The bars on the last project page travel
            into it, so the site closes on the figure it opened with, at the
            same cell size and from the same grid. */}
        <div id="flower-box" className="absolute inset-y-0 right-0 w-[58%]" aria-hidden="true" />
        <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-rose">Contact</div>
        <h2 className="mt-6 max-w-[900px] font-serif text-[58px] leading-[1.04]">
          {contact.headline[0]}
          <br />
          <em>{contact.headline[1]}</em>
        </h2>
        <p className="mt-6 max-w-[470px] text-[17px] leading-[1.6] text-[#a2958f]">{contact.lede}</p>
        <ul className="mt-10 max-w-[620px] border-t border-line">
          {links.map((l) => (
            <li key={l.label} className="border-b border-line">
              <a href={l.href} className="group flex items-baseline gap-4 py-4 no-underline">
                <span className="font-serif text-[33px] font-light text-[#cfc4be] group-hover:text-[#f4ece6]">{l.label}</span>
                <span className="flex-1 font-mono text-[9px] tracking-[0.16em] text-transparent group-hover:text-[#8d817c]">{l.reveal}</span>
                <span className="font-mono text-[13px] text-[#4a4042] group-hover:text-rose">&rarr;</span>
              </a>
            </li>
          ))}
        </ul>
        <dl className="mt-8 flex max-w-[620px] flex-wrap gap-x-14 gap-y-5">
          {[["Based in", profile.location], ["Available", profile.available], ["Status", profile.status.join(" · ")]].map(([k, v]) => (
            <div key={k}>
              <dt className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-[#4a4042]">{k}</dt>
              <dd className="mt-2.5 text-[15px] leading-[1.5] text-[#c8bcb6]">{v}</dd>
            </div>
          ))}
        </dl>
        <footer className="absolute inset-x-12 bottom-6 flex justify-between border-t border-line pt-3.5 font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#3b3335]">
          <span>&copy; 2026 {profile.name}</span>
          <a href="/colophon" className="text-[#4a4042] hover:text-mute">Set in Cormorant and JetBrains Mono &middot; every figure drawn in characters</a>
          <span>Built in TypeScript</span>
        </footer>
      </section>
    </main>
  );
}
