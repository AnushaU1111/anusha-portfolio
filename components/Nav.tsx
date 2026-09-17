"use client";

import { useRef, useState } from "react";
import { ContactDrawer } from "./ContactDrawer";

export function Nav() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const item = "font-mono text-[12.5px] uppercase tracking-[0.28em] text-mute hover:text-ink";
  return (
    <>
      <nav
        className="fixed right-12 top-6 z-30 flex gap-9 max-md:inset-x-0 max-md:top-0 max-md:justify-end max-md:gap-6 max-md:border-b max-md:border-line max-md:bg-bg/95 max-md:px-5 max-md:py-3.5 max-md:backdrop-blur-sm"
        aria-label="Primary"
      >
        <a className={item} href="#about">About</a>
        <a className={item} href="#work">Work</a>
        <button
          ref={trigger}
          type="button"
          className={`${item} relative before:absolute before:-left-3 before:top-1/2 before:size-[5px] before:rounded-full before:bg-rose`}
          onClick={() => { setOpen(true); }}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          Contact
        </button>
      </nav>
      <ContactDrawer open={open} onClose={() => { setOpen(false); }} returnFocusTo={trigger} />
    </>
  );
}
