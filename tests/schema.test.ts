import { describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { links } from "@/content/links";
import { profile } from "@/content/profile";

describe("content model", () => {
  it("has six projects in scene order", () => {
    expect(projects.map((p) => p.index)).toEqual(["02", "03", "04", "05", "06", "07"]);
  });
  it("has unique slugs", () => {
    const slugs = projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("marks illustrative figures on the scenes that use them", () => {
    const withIllustrative = projects.filter((p) => p.illustrative.length > 0).map((p) => p.slug);
    expect(withIllustrative).toContain("reqtrace");
    expect(withIllustrative).toContain("affordability");
  });
  it("lists every metric with a source", () => {
    for (const p of projects) expect(p.sources.length).toBeGreaterThan(0);
  });
  it("uses one email everywhere", () => {
    const email = links.find((l) => l.label === "Email");
    expect(email?.href).toBe("mailto:anushaupadhyay1111@gmail.com");
  });
  it("has a location", () => {
    expect(profile.location).toMatch(/Raleigh/);
  });
  it("serves the résumé as a download and nothing else", () => {
    const resume = links.find((l) => l.label === "Résumé");
    // Ends with the public/ path, but may carry a deploy subpath in front.
    expect(resume?.href).toMatch(/\/resume\.pdf$/);
    // Without this the browser opens its own PDF viewer over the site.
    expect(resume?.download).toBe("Anusha-Upadhyay-Resume.pdf");
    // Every other link is a destination, not a file: a download attribute on
    // a mailto: or a cross-origin URL is ignored at best and confusing at
    // worst, so only the one local file carries it.
    const others = links.filter((l) => l.label !== "Résumé");
    expect(others.map((l) => l.download)).toEqual(others.map(() => undefined));
  });
});
