import { projects } from "@/content/projects";
import { about, contact } from "@/content/about";
import { profile } from "@/content/profile";
import { links } from "@/content/links";

/**
 * Phase 01 scaffold. Sections render their content from the model so the
 * information architecture and every number are already correct. Figures,
 * pinning and transitions arrive with the AsciiField scenes in phase 04.
 */
export default function Home() {
  return (
    <main>
      <section id="top" className="flex min-h-dvh flex-col justify-end px-12 pb-24">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-rose">{profile.name} &middot; ML engineer</div>
        <h1 className="mt-6 font-serif text-[132px] font-light leading-[0.86] tracking-[-0.01em]">
          Signal
          <br />
          <em>from</em> noise.
        </h1>
        <p className="mt-8 max-w-[500px] font-serif text-[22px] text-[#bfb4ae]">{profile.role}</p>
      </section>

      <section id="about" className="grid min-h-dvh grid-cols-[660px_1fr] border-t border-line">
        <div aria-hidden="true" />
        <div className="border-l border-line px-10 pt-24">
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
          <dl className="mt-7 flex gap-16 border-t border-line pt-6">
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
        {projects.map((p) => (
          <section key={p.slug} id={p.slug} className="grid min-h-dvh grid-cols-[498px_1fr] border-t border-line">
            <div className="px-12 pt-28">
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
              <dl className="mt-10 flex gap-9 border-t border-line pt-6">
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
            <div className="border-l border-line" data-entry-grid={p.entryGrid} aria-hidden="true" />
          </section>
        ))}
      </div>

      <section id="contact" className="relative min-h-dvh border-t border-line px-12 pt-32">
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
        <dl className="mt-8 flex max-w-[620px] gap-14">
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
