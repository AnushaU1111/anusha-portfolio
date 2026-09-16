/**
 * The subpath the site is served from, or "" when it is served from the root.
 *
 * Next rewrites `<Link>` hrefs and its own `_next/` asset URLs out of
 * `basePath` in next.config.ts. What it cannot rewrite is a string that only
 * ever reaches `img.src` at runtime or sits in a raw `<a href>`, because those
 * never pass through the router. The two source images and the résumé are in
 * that position, so they prefix themselves from here.
 */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefixes a root-relative path with the subpath the site is served from. */
export const asset = (path: string): string => `${basePath}${path}`;
