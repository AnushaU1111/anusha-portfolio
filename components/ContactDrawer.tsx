"use client";

import { useEffect, useRef, type RefObject } from "react";
import { links } from "@/content/links";
import { profile } from "@/content/profile";
import { contact } from "@/content/about";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Ref to the element that opened the drawer; focus returns there on close. */
  returnFocusTo?: RefObject<HTMLElement | null>;
}

/**
 * Off-canvas contact panel. Slides over the current scene without moving
 * it. Focus is trapped while open, Escape and scrim click close it, and
 * focus returns to the trigger. Reads the same links module as the closing
 * scene, so the two can never disagree.
 */
export function ContactDrawer({ open, onClose, returnFocusTo }: Props) {
  const panel = useRef<HTMLElement>(null);

  const close = () => {
    onClose();
    returnFocusTo?.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const el = panel.current;
    if (!el) return;
    const focusable = () =>
      Array.from(el.querySelectorAll<HTMLElement>('a[href], button, [tabindex]:not([tabindex="-1"])'));
    focusable()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        returnFocusTo?.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const f = focusable();
      const first = f[0];
      const last = f[f.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (window.location.hash !== "#contact") history.pushState(null, "", "#contact");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (window.location.hash === "#contact") history.replaceState(null, "", window.location.pathname);
    };
  }, [open, onClose, returnFocusTo]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[rgba(6,4,5,0.72)]" onClick={close} aria-hidden="true" />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Contact"
        className="fixed inset-y-0 right-0 z-50 w-[470px] max-w-full border-l border-[rgba(196,110,120,0.4)] bg-[#0e090b] px-10 pt-24"
      >
        <button
          type="button"
          onClick={close}
          className="absolute right-6 top-6 font-mono text-[11.5px] uppercase tracking-[0.2em] text-mute"
        >
          esc &times;
        </button>
        <div className="font-mono text-[12px] uppercase tracking-[0.28em] text-rose">Contact</div>
        <h2 className="mt-4 font-serif text-[34px] font-light leading-[1.14] text-[#ede4de]">
          {contact.headline[0]}
          <br />
          {contact.headline[1]}
        </h2>
        <ul className="mt-8 border-t border-line">
          {links.map((l) => (
            <li key={l.label} className="border-b border-line">
              <a href={l.href} download={l.download} className="group flex items-baseline gap-3 py-3.5 no-underline">
                <span className="font-serif text-[23px] font-light text-[#cfc4be] group-hover:text-[#f4ece6]">{l.label}</span>
                <span className="flex-1 font-mono text-[10.5px] tracking-[0.12em] text-transparent group-hover:text-mute">{l.reveal}</span>
                <span className="font-mono text-[13.5px] text-[#6b5d60] group-hover:text-rose">&rarr;</span>
              </a>
            </li>
          ))}
        </ul>
        <dl className="mt-8 space-y-5">
          <div>
            <dt className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#6b5d60]">Based in</dt>
            <dd className="mt-2 font-serif text-[16px] font-light text-[#c8bcb6]">{profile.location}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#6b5d60]">Available</dt>
            <dd className="mt-2 font-serif text-[16px] font-light text-[#c8bcb6]">{profile.available}</dd>
          </div>
        </dl>
      </aside>
    </>
  );
}
