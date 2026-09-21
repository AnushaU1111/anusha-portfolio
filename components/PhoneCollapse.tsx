"use client";

import { useEffect } from "react";

/**
 * Closes the project drawers on a phone, and opens them again if the window
 * stops being one.
 *
 * Every <PhoneDrawer> is `open` in the markup, so the page is whole before
 * this runs and whole for a reader with no JavaScript. This is the one place
 * that narrows it, and it narrows nothing above `md`: the drawer's summary is
 * display:none up there, so a drawer left closed on a phone that was then
 * rotated into a wide window would be prose with no way to reach it. Hence the
 * media-query listener rather than a one-shot on mount.
 *
 * Kept as a component with no output rather than an effect inside the page, so
 * the page itself stays a server component.
 */
const NARROW = "(max-width: 767.98px)";

export function PhoneCollapse() {
  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const apply = () => {
      const drawers = document.querySelectorAll<HTMLDetailsElement>("details[data-phone-drawer]");
      for (const d of drawers) d.open = mq.matches ? d.dataset.phoneDrawer === "open" : true;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
    };
  }, []);
  return null;
}
