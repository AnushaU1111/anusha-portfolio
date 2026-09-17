import type { Scene } from "@/content/schema";

/**
 * The header every project page opens with.
 *
 * One component rather than the five near-copies this replaces, because the
 * hierarchy is the thing most likely to be revised and it should be revised
 * once. The order is: where and when, then what the project is called, then
 * the claim it makes, then the sentence that sets up the rest.
 *
 * The project's name is the title and the claim is the subtitle beneath it.
 * The claim used to be the title, which read well in isolation but left every
 * page nameless: six pages of declarative sentences with nothing to call any
 * of them.
 *
 * Both display sizes are clamped rather than fixed. The copy column is 360px
 * at the `lg` breakpoint, and a fixed size large enough to look deliberate at
 * 1600px pushes a long single word like "Screening" straight through the
 * column's right edge at 1024px.
 *
 * The lede deliberately stays with each section rather than moving in here.
 * Neuraluna's lede is the first sentence of its first body paragraph, so the
 * shared project shell has always omitted it; hoisting it would print that
 * sentence twice on one page.
 */
export function SceneHead({ scene, className = "" }: { scene: Scene; className?: string }) {
  return (
    <header className={className}>
      <div className="font-mono text-[12.5px] uppercase tracking-[0.26em] text-rose">
        {scene.index} / 07 &middot; {scene.org} &middot; {scene.period}
      </div>
      <h2 className="mt-5 font-serif text-[clamp(40px,4vw,62px)] leading-[1.02] tracking-[-0.005em]">
        {scene.name}
      </h2>
      {/* The claim, roman rather than italic, and in the brighter ink: it is a
          subtitle doing real work, not a caption under the title. */}
      <p className="mt-4 max-w-[660px] font-serif text-[clamp(22px,1.85vw,27px)] font-light leading-[1.24] text-[#ded5ce]">
        {scene.headline[0]} {scene.headline[1]}
      </p>
    </header>
  );
}
