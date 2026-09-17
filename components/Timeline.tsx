import type { Milestone } from "@/content/schema";

/**
 * The education, work and project history as one sequence, newest first.
 *
 * Two forms of the same list, chosen by window width rather than by device:
 *
 * Wide enough, and it is a horizontal rail with nine markers, entries
 * alternating above and below it. Alternating is what makes nine fit: each
 * entry gets the full column width for its own text and only has to clear its
 * neighbours' markers, not their wrapped titles.
 *
 * Narrower, and nine columns cannot hold a title at any readable size — at
 * 1280px each column is barely a hundred pixels — so it falls back to the
 * vertical rail, which reads perfectly well and was the earlier design.
 *
 * The cut is Tailwind's own `2xl` (1536px), which is about where a column
 * still holds the longest date string, "Expected Dec 2026", on one line.
 *
 * Both variants are written out as literal class strings. Tailwind emits a
 * class only when it can see it spelled out in the source, so building
 * `${WIDE}:grid` from a constant compiles to a class that does not exist and
 * silently leaves the horizontal form hidden at every width.
 */

function Entry({ m, className = "" }: { m: Milestone; className?: string }) {
  return (
    <div className={className}>
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-rose">{m.kind}</div>
      <div className="mt-1.5 font-mono text-[11.5px] uppercase tracking-[0.1em] text-[#8b8083]">{m.when}</div>
      <div className="mt-2 text-[15.5px] leading-[1.3] text-[#ded5ce]">{m.what}</div>
      <div className="mt-1.5 font-mono text-[11px] uppercase leading-[1.5] tracking-[0.12em] text-[#928587]">
        {m.where}
      </div>
    </div>
  );
}

export function Timeline({ items }: { items: Milestone[] }) {
  return (
    <div className="px-12">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-line pb-3 font-mono text-[11.5px] uppercase tracking-[0.2em] text-[#8b8083]">
        <span>Timeline</span>
        <span className="text-[#7c6e71]">Newest first &middot; study, work and coursework in one line</span>
      </div>

      {/* The horizontal form. The rail is one absolutely positioned rule rather
          than a border per column, so it does not break at the gaps. */}
      <ol className="relative mt-12 hidden grid-cols-9 gap-x-5 2xl:grid">
        <span
          className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#2b1e22]"
          aria-hidden="true"
        />
        {items.map((m, i) => {
          const above = i % 2 === 0;
          return (
            <li key={`${m.when}-${m.what}`} className="relative grid h-[272px] grid-rows-2">
              {above ? (
                <>
                  <Entry m={m} className="flex flex-col justify-end pb-6" />
                  <div />
                </>
              ) : (
                <>
                  <div />
                  <Entry m={m} className="pt-6" />
                </>
              )}
              <span
                className="absolute left-0 top-1/2 size-[6px] -translate-y-1/2 rounded-full bg-rose"
                aria-hidden="true"
              />
            </li>
          );
        })}
      </ol>

      {/* The vertical form, below the cut. Same rail trick as before: the left
          border lives on the content cell so it runs through the row's own
          bottom padding, and the last row's is cleared from the list. */}
      <ol className="mt-9 2xl:hidden [&>li:last-child>span:last-child]:border-transparent">
        {items.map((m) => (
          <li key={`${m.when}-${m.what}`} className="grid grid-cols-[142px_minmax(0,1fr)] gap-x-6">
            <span className="pt-0.5 font-mono text-[11.5px] uppercase leading-[1.55] tracking-[0.1em] text-[#8b8083]">
              {m.when}
            </span>
            <span className="relative border-l border-[#2b1e22] pb-7 pl-6 before:absolute before:-left-[3px] before:top-[9px] before:size-[5px] before:rounded-full before:bg-rose">
              <span className="block text-[17px] leading-[1.35] text-[#ded5ce]">{m.what}</span>
              <span className="mt-1.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-[#928587]">
                {m.where} <span className="text-[#5b4d50]">&middot;</span> {m.kind}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
