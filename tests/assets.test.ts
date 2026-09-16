import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { links } from "@/content/links";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The files the site serves straight out of public/. Next copies these into the
 * export byte for byte and never parses them, so a broken one is invisible at
 * build time and only shows up as a blank page in a visitor's PDF viewer.
 */
describe("public assets", () => {
  /**
   * Every link that downloads a file has to have the file. Without this the
   * résumé link is a 404 that the download attribute happily saves under a
   * confident filename.
   */
  it("has a file behind every download link", () => {
    const downloads = links.filter((l) => l.download !== undefined);
    expect(downloads.length).toBeGreaterThan(0);
    for (const l of downloads) {
      // The href may carry a deploy subpath; the file sits at the tail of it.
      const name = l.href.slice(l.href.lastIndexOf("/") + 1);
      const file = path.join(root, "public", name);
      expect(() => readFileSync(file), `${l.label} -> public/${name} is missing`).not.toThrow();
    }
  });

  it("serves a résumé that is a real, undamaged PDF", () => {
    const bytes = readFileSync(path.join(root, "public", "resume.pdf"));

    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    // A truncated file loses its trailer, and a viewer shows nothing.
    expect(bytes.subarray(-1024).toString("latin1")).toContain("%%EOF");
    // A one-page PDF with embedded fonts does not come in under 10 kB, and a
    // file this size is either a placeholder or an error page renamed .pdf.
    expect(bytes.byteLength).toBeGreaterThan(10_000);

    // The important one. EF BF BD is U+FFFD, the replacement character a text
    // decoder substitutes for a byte it cannot read. A PDF is binary: if these
    // appear in any number, the file has been through an editor or a transfer
    // that treated it as text, and every compressed stream in it is destroyed.
    // The damage is silent (the header and trailer survive) and permanent, so
    // it is worth naming rather than discovering in a recruiter's browser.
    let replacements = 0;
    for (let i = 0; i + 2 < bytes.byteLength; i++) {
      if (bytes[i] === 0xef && bytes[i + 1] === 0xbf && bytes[i + 2] === 0xbd) replacements++;
    }
    expect(replacements, "PDF contains U+FFFD: it was re-encoded as text and must be re-copied").toBe(0);

    // A PDF's second line is a comment of high bytes, there precisely so that
    // tools can tell the file is binary. Text conversion is what flattens it.
    const marker = bytes.subarray(0, 64).indexOf(0x25, 5);
    expect(marker, "no binary marker comment").toBeGreaterThan(0);
    const high = bytes.subarray(marker, marker + 8).filter((b) => b > 0x7f).byteLength;
    expect(high, "binary marker has no high bytes left").toBeGreaterThan(0);
  });
});
