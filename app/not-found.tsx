import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col justify-center px-12">
      <div className="font-mono text-[12.5px] uppercase tracking-[0.26em] text-rose">404</div>
      <h1 className="mt-6 font-serif text-[clamp(44px,5.6vw,74px)] leading-[1.02]">
        Nothing resolves
        <br />
        here.
      </h1>
      <Link href="/" className="mt-8 inline-block font-mono text-[11.5px] uppercase tracking-[0.22em] text-mute hover:text-ink">&larr; Back to the start</Link>
    </main>
  );
}
