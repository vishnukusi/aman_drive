import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * SEO files that depend on where the build is hosted (audit decision D7):
 *  - VITE_SITE_URL set   -> canonical + og:url tags, robots.txt that allows crawling, sitemap.xml with absolute URLs.
 *  - VITE_SITE_URL unset -> preview build: `noindex`, robots.txt disallows crawling, no sitemap
 *                          (so a demo deployment never competes with amanselfdrivecars.com in search results).
 */
function seo(env) {
  const site = (env.VITE_SITE_URL || '').replace(/\/+$/, '');
  return {
    name: 'aman-seo',
    transformIndexHtml(html) {
      const head = site
        ? `<link rel="canonical" href="${site}/" />\n    <meta property="og:url" content="${site}/" />`
        : '<meta name="robots" content="noindex, nofollow" />';
      return html.replace('<!--%SEO_HEAD%-->', head).replace('content="images/fleet/hero-thar-1400.webp"', `content="${site}/images/fleet/hero-thar-1400.webp"`);
    },
    generateBundle() {
      const robots = site ? `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n';
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
      if (site) {
        const today = new Date().toISOString().slice(0, 10);
        // Hash routes are not crawlable, so only the document URL is listed (see docs/FINAL_COMPLETION_REPORT.md, SEO notes).
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/</loc><lastmod>${today}</lastmod></url>\n</urlset>\n`;
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: xml });
      }
    },
  };
}

// Relative base so the build can be hosted from any sub-path or opened from a static host.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: './',
    plugins: [react(), seo(env)],
    // The DriveFlow API (npm run api) runs on :8787; proxying keeps the website and API on one origin, like production.
    server: { host: true, port: 5173, proxy: { '/api': 'http://localhost:8787' } },
    preview: { proxy: { '/api': 'http://localhost:8787' } },
    build: { target: 'es2020', cssCodeSplit: true },
  };
});
