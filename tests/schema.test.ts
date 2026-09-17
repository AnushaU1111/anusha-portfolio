import { describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { links } from "@/content/links";
import { about } from "@/content/about";
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

  it("runs the timeline newest first", () => {
    // The formats differ on purpose ("Expected Dec 2026", "Feb 2026 – now"),
    // so order is checked on the last year each row names rather than by
    // parsing a date out of prose.
    const endYear = (when: string) => {
      const years = when.match(/\d{4}/g);
      const last = years?.[years.length - 1];
      expect(last, `no year in ${when}`).toBeDefined();
      return Number(last);
    };
    const years = about.timeline.map((m) => endYear(m.when));
    for (let i = 1; i < years.length; i++) {
      expect(years[i - 1] ?? 0, `row ${i} is out of order`).toBeGreaterThanOrEqual(years[i] ?? 0);
    }
  });

  it("carries all three kinds of milestone, with no row repeated", () => {
    expect(new Set(about.timeline.map((m) => m.kind))).toEqual(new Set(["study", "work", "project"]));
    const rows = about.timeline.map((m) => `${m.when}|${m.what}|${m.where}`);
    expect(new Set(rows).size).toBe(rows.length);
  });

  it("describes Temple as the single semester the timeline gives it", () => {
    // The copy used to say "a year of research at Temple"; the résumé has
    // January to May 2025. The two have to agree.
    const temple = about.timeline.find((m) => m.where.includes("Temple"));
    expect(temple?.when).toBe("Jan – May 2025");
    expect(about.body.join(" ")).not.toContain("a year of research");
  });
});
