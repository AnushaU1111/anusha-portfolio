import Link from "next/link";
import { projects } from "@/content/projects";
import { asset } from "@/lib/basePath";
import { about, contact } from "@/content/about";
import { profile } from "@/content/profile";
import { links } from "@/content/links";
import { Field } from "@/components/Field";
import { MorphField } from "@/components/MorphField";
import { AcousticSection } from "@/components/AcousticSection";
import { ScreeningSection } from "@/components/ScreeningSection";
import { CorpusSection } from "@/components/CorpusSection";
import { TempleSection } from "@/components/TempleSection";
import { SceneHead } from "@/components/SceneHead";
import { Timeline } from "@/components/Timeline";

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
        flowerSrc={asset("/lily.png")}
        faceSrc={asset("/portrait-face.jpg")}
        targetId="portrait-box"
        {...chart}
        {...pipe}
        {...graph}
        {...corpus}
        {...waves}
        {...barsProps}
      />
      {/* Bottom padding clears the centred scroll cue, which is absolutely
          positioned and so cannot push the copy up itself. */}
      <section id="top" className="relative z-10 flex min-h-dvh flex-col justify-end px-12 pb-36">
        {/* The name is the h1, because this is a portfolio: the visitor is
            here to find out whose it is. It is set in the display face rather
            than blown up in the mono eyebrow, where fifteen characters at this
            tracking would be wider than the window.

            Every size below it is clamped with a smaller vw factor and smaller
            bounds at both ends, so the name stays the largest thing on the
            screen at every width rather than only at one. */}
        <h1 className="font-serif text-[clamp(56px,6.6vw,104px)] font-light leading-[0.94] tracking-[-0.015em]">
          {profile.name}
        </h1>
        {/* Enough room that the descenders in "Upadhyay" clear this line: the
            name is set at 0.94 leading, so its box ends above its own tails. */}
        <div className="mt-7 font-mono text-[13.5px] uppercase tracking-[0.3em] text-rose">ML engineer</div>
        {/* Held back until the lily has assembled. See the lily-gated rule in
            globals.css: the flower's own progress drives it, so the statement
            arrives as the last characters land rather than on a timer that
            could disagree with what is on screen. */}
        <p className="lily-gated mt-9 max-w-[900px] font-serif text-[clamp(34px,3.6vw,56px)] font-light leading-[1.04] tracking-[-0.01em]">
          Signal from noise.
        </p>
        <p className="mt-6 max-w-[660px] font-serif text-[23px] text-[#bfb4ae]">{profile.role}</p>
        {/* Centred on the bottom edge, and a scroll cue rather than a cursor
            one: scrolling is what the whole page is built around, and it is
            also the only one of the two that works on a touch screen. */}
        <p className="absolute bottom-9 left-1/2 -translate-x-1/2 text-center font-mono text-[12px] uppercase tracking-[0.42em] text-mute after:mx-auto after:mt-3 after:block after:h-7 after:w-px after:bg-gradient-to-b after:from-rose after:to-transparent">
          Scroll
        </p>
      </section>

      {/* Both grids give their columns a zero floor and the copy a minimum, or
          the fixed first column plus the copy's own min-content width is wider
          than a narrow laptop window and the page scrolls sideways. */}
      <section id="about" className="relative z-10 pb-28">
        <div className="grid min-h-dvh grid-cols-[minmax(0,660px)_minmax(380px,1fr)]">
          {/* Where the flower's characters land. MorphField reads this box every
              frame, so once the face has arrived it scrolls with the section. */}
          <div id="portrait-box" className="min-h-dvh" aria-hidden="true" />
          <div className="px-10 pt-24">
            <div className="font-mono text-[12.5px] uppercase tracking-[0.3em] text-rose">{about.index} &middot; Introduction</div>
            <h2 className="mt-6 font-serif text-[clamp(42px,4.6vw,74px)] leading-[1.02]">
              {about.headline[0]}
              <br />
              {about.headline[1]}
            </h2>
            {/* Two columns once there is room, rather than one column of the
                same text with half the width left empty beside it. Widening a
                single measure to fill this column would put a line past a
                hundred and thirty characters; two columns fill it at about
                seventy each, which is inside the comfortable range. */}
            <div className="mt-6 grid gap-x-14 gap-y-5 2xl:grid-cols-2">
              {about.body.map((p) => (
                <p key={p} className="max-w-[640px] text-[20px] leading-[1.6] text-[#a2958f] 2xl:max-w-none">{p}</p>
              ))}
            </div>
            <div className="mt-9 grid gap-x-14 gap-y-7 2xl:grid-cols-2">
              <p className="max-w-[640px] border-l border-rose pl-6 text-[20px] leading-[1.6] text-[#ded5ce] 2xl:max-w-none">{about.pull}</p>
              <p className="max-w-[640px] text-[20px] leading-[1.6] text-[#a09490] 2xl:max-w-none">{about.throughLine}</p>
            </div>
            {/* The facts, moved up from the contact scene, where they sat under
                four links that already said how to get in touch. They belong
                with the introduction: a reader deciding whether to keep
                reading wants the location, the date and the work status, and
                the interests row is the same kind of statement, so the four
                are one block rather than a block and a stray line. Set at the
                paragraph size above them rather than the old caption size. */}
            <dl className="mt-12 grid gap-x-14 gap-y-8 border-t border-line pt-8 sm:grid-cols-2 2xl:grid-cols-4">
              {[
                ["Based in", profile.location],
                ["Available", profile.available],
                ["Status", profile.status.join(" \u00b7 ")],
                ["Away from the screen", about.interests.join(", ")],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-mono text-[12.5px] uppercase leading-[1.5] tracking-[0.2em] text-[#8b8083]">{k}</dt>
                  <dd className="mt-3 text-[20px] leading-[1.45] text-[#ded5ce]">{v}</dd>
                </div>
              ))}
            </dl>
            {/* The stack. Two columns of groups once there is room, which is
                what closes the gap this column used to leave between the copy
                and the timeline. Grouped, because the question a reader has is
                whether the shape of the toolkit fits the job, and only the
                grouping answers that. */}
            <div className="mt-14 border-t border-line pt-7">
              <div className="font-mono text-[11.5px] uppercase tracking-[0.2em] text-[#8b8083]">Stack</div>
              <dl className="mt-6 grid gap-x-14 gap-y-5 2xl:grid-cols-2">
                {about.stack.map((g) => (
                  <div key={g.label} className="grid grid-cols-[136px_minmax(0,1fr)] gap-x-5">
                    <dt className="pt-0.5 font-mono text-[11px] uppercase leading-[1.5] tracking-[0.14em] text-rose">
                      {g.label}
                    </dt>
                    <dd className="font-mono text-[12.5px] leading-[1.75] text-[#bfb4ae]">
                      {g.items.map((t, i) => (
                        <span key={t}>
                          {i > 0 && <span className="text-[#5b4d50]"> &middot; </span>}
                          {t}
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
        {/* Outside the two-column grid, so the timeline runs the width of the
            page rather than the width of the copy column. */}
        <Timeline items={about.timeline} />
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
          /* A tall track holding one sticky viewport, so the copy and the
             figure hold together while the page keeps scrolling. That gives
             the figure a dwell long enough to point at without a ScrollTrigger
             pin, which used to stop the page outright and, worse, froze the
             box position the figure reads its own arrival from.

             Both the track's extra height and the stickiness are conditional
             on the window being tall enough to show the whole copy column,
             which measures about 970px. Below that the section is a single
             viewport and scrolls normally: a dwell would either clip the end
             of the copy or leave the column empty underneath it. */
          <section
            key={p.slug}
            id={p.slug}
            className="relative z-10 min-h-dvh [@media(min-height:1020px)]:h-[175dvh]"
          >
            {/* Exactly a viewport tall only while it is stuck. Below the
                threshold it keeps a minimum instead, so a copy column taller
                than the window lengthens the row rather than being cut off by
                it. */}
            <div className="grid min-h-dvh grid-cols-[minmax(0,498px)_minmax(0,1fr)] [@media(min-height:1020px)]:sticky [@media(min-height:1020px)]:top-0 [@media(min-height:1020px)]:h-dvh">
            {/* The text column is opaque and the figure column is not, so the
                field shows through on the right and never behind the type.
                Clipped only while stuck, where the row is one viewport and the
                copy is known to fit inside it. */}
            <div className="relative z-10 bg-bg px-12 pt-24 [@media(min-height:1020px)]:overflow-hidden">
              <SceneHead scene={p} />
              {p.body.map((t) => (
                <p key={t} className="mt-4 text-[18px] leading-[1.58] text-[#a2958f]">{t}</p>
              ))}
              <p className="mt-6 border-l border-rose pl-5 text-[18px] leading-[1.58] text-[#ded5ce]">{p.pull}</p>
              <dl className="mt-10 flex flex-wrap gap-x-9 gap-y-5 border-t border-line pt-6">
                {p.metrics.map((m) => (
                  <div key={m.label}>
                    <dd className={`font-serif text-[39px] leading-none ${m.accent ? "text-rose" : ""}`}>{m.value}</dd>
                    <dt className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-mute">{m.label}</dt>
                  </div>
                ))}
              </dl>
              <ul className="mt-7 flex flex-wrap gap-1.5">
                {p.stack.map((s) => (
                  <li key={s} className="border border-line px-2.5 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.14em] text-[#a09490]">{s}</li>
                ))}
              </ul>
              {p.credit && <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#6b5d60]">{p.credit}</p>}
            </div>
            <div data-entry-grid={p.entryGrid} aria-hidden="true">
              {/* MorphField reads this box every frame, both to place the figure
                  and to know how far its arrival has got.

                  Short of a full viewport on purpose: the figure draws its axis
                  labels and its hint against the bottom of this box, and at the
                  exact viewport height they end a few pixels off the screen
                  edge, where any browser furniture covers them. */}
              {p.slug === "neuraluna" && <div id="chart-box" className="h-[calc(100dvh-34px)] w-full" />}
              {p.slug === "reqtrace" && <div id="graph-box" className="h-[calc(100dvh-34px)] w-full" />}
            </div>
            </div>
          </section>
          ),
        )}
      </div>

      <section id="contact" className="relative z-10 min-h-dvh px-12 pb-28 pt-32">
        {/* Where the lily comes back. The bars on the last project page travel
            into it, so the site closes on the figure it opened with, at the
            same cell size and from the same grid. */}
        <div id="flower-box" className="absolute inset-y-0 right-0 w-[58%]" aria-hidden="true" />
        <div className="font-mono text-[12.5px] uppercase tracking-[0.26em] text-rose">Contact</div>
        <h2 className="mt-6 max-w-[900px] font-serif text-[clamp(40px,4.4vw,68px)] leading-[1.04]">
          {contact.headline[0]}
          <br />
          {contact.headline[1]}
        </h2>
        <p className="mt-6 max-w-[470px] text-[18.5px] leading-[1.6] text-[#a2958f]">{contact.lede}</p>
        <ul className="mt-10 max-w-[620px] border-t border-line">
          {links.map((l) => (
            <li key={l.label} className="border-b border-line">
              {/* `download` is undefined on every link but the résumé, and
                  React omits the attribute entirely when it is. */}
              <a href={l.href} download={l.download} className="group flex items-baseline gap-4 py-4 no-underline">
                <span className="font-serif text-[36px] font-light text-[#cfc4be] group-hover:text-[#f4ece6]">{l.label}</span>
                <span className="flex-1 font-mono text-[11.5px] tracking-[0.16em] text-transparent group-hover:text-[#a09490]">{l.reveal}</span>
                <span className="font-mono text-[15px] text-[#6b5d60] group-hover:text-rose">&rarr;</span>
              </a>
            </li>
          ))}
        </ul>
        <footer className="absolute inset-x-12 bottom-6 flex justify-between border-t border-line pt-3.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#57494c]">
          <span>&copy; 2026 {profile.name}</span>
          {/* A Link rather than a raw anchor, so the router adds both the
              subpath the site is served from and the trailing slash. */}
          <Link href="/colophon" className="text-[#6b5d60] hover:text-mute">Set in Cormorant and JetBrains Mono &middot; every figure drawn in characters</Link>
          <span>Built in TypeScript</span>
        </footer>
      </section>
    </main>
  );
}
