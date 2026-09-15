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
});
