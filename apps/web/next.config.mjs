/**
 * Static export: `next build` writes plain files to out/, ready for
 * GitHub Pages or Cloudflare Pages. No server features (SSR, API routes)
 * are available, on purpose: the user's pool never leaves the browser (RN-20).
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Set NEXT_PUBLIC_BASE_PATH=/recom-tcg when serving from github.io/<user>/recom-tcg
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  // The engine is shipped as TypeScript source inside the monorepo.
  transpilePackages: ["@recom-tcg/engine"]
};

export default nextConfig;
