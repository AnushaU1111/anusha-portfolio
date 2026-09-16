import type { NextConfig } from "next";

/**
 * GitHub Pages serves a project repository from a subpath, not the root, so
 * every route and every asset URL has to carry it. The prefix comes from the
 * environment rather than being hard-coded: `next dev` runs at the root, the
 * deploy workflow sets it to the repository name, and moving to a custom
 * domain later means changing one line of YAML rather than the code.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The site has no API routes, no server actions and no next/image, so there
  // is nothing here that needs a server at request time.
  output: "export",
  // Without this /colophon emits colophon.html, which Pages will not serve at
  // /colophon. With it the route lands as colophon/index.html.
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
};

export default config;
