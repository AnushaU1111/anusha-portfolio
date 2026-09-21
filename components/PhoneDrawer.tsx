import type { ReactNode } from "react";

/**
 * A project's paragraphs, collapsed behind a tap on a phone and open on
 * everything else.
 *
 * Six projects of full prose is twenty-two thousand pixels of phone, which is
 * twenty-six screens of scrolling to reach the contact details. The paragraphs
 * are what that length is made of, so they are what folds away — and only
 * they. The scene's name, its claim, its numbers and its figure stay on the
 * page, because those are what someone skimming on a phone is deciding on, and
 * a number behind a tap is a number nobody reads.
 *
 * Rendered as `<details open>`, which matters three times over. The content is
 * in the document whether it is showing or not, so it is still findable and
 * still there for a reader who wants the page printed or read aloud. Opening
 * and closing it needs no JavaScript. And `open` in the markup means the one
 * thing a phone with no JavaScript gets is the whole page, which is the right
 * way round.
 *
 * What does need JavaScript is closing them in the first place, which
 * <PhoneCollapse> does on a narrow viewport only. Above `md` the summary is
 * display:none and every drawer stays open, so the laptop layout is the same
 * markup it always was with one element in it that draws nothing.
 */
export function PhoneDrawer({
  /** Whether this drawer starts open on a phone. The first project does. */
  start = "closed",
  children,
}: {
  start?: "open" | "closed";
  children: ReactNode;
}) {
  return (
    <details open data-phone-drawer={start} className="group">
      {/* `hidden` rather than a `max-md:` block, so the row is absent on a
          laptop instead of being a laptop element that happens to be
          invisible. The marker is suppressed both ways round: `list-none` for
          Firefox, the pseudo-element for WebKit. */}
      {/* A rule above and none below: the block underneath the drawer, the
          metrics, draws its own, and two rules forty pixels apart read as a
          mistake. */}
      <summary className="hidden list-none items-center gap-3 border-t border-line py-3.5 font-mono text-[12.5px] uppercase tracking-[0.18em] text-[#a09490] max-md:mt-7 max-md:flex [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Read more</span>
        <span className="hidden group-open:inline">Show less</span>
        <span
          aria-hidden="true"
          className="ml-auto text-[15px] leading-none text-rose transition-transform duration-200 group-open:rotate-180"
        >
          &#9662;
        </span>
      </summary>
      {children}
    </details>
  );
}
