#!/usr/bin/env node
/**
 * Snapshot prerender — runs after `vite build`.
 *
 * Serves dist/ locally, renders every route listed in public/sitemap.xml in
 * headless Chrome (puppeteer-core, system Chrome — preinstalled locally and on
 * GitHub runners), and writes the rendered DOM back into dist/ as per-route
 * static HTML (blog/index.html, blog/<slug>/index.html, …).
 *
 * Why: the SPA shell alone ships zero content to non-JS consumers (search
 * render queues, AI crawlers, archival fetches). All content is build-time
 * static Markdown, so real HTML per route is free. React hydrates on top
 * (see src/main.tsx) and the site keeps SPA navigation afterwards.
 *
 * Invariants:
 * - Routes come from public/sitemap.xml — the existing "add a route → add it
 *   to the sitemap" convention now also controls prerendering.
 * - Cookie consent is pre-seeded as 'declined' ONLY inside the snapshot
 *   browser so the banner never enters the captured DOM (it client-renders
 *   after a timer for real visitors — keeping snapshots equal to the initial
 *   client render avoids hydration mismatches). localStorage is not
 *   serialized into the HTML.
 * - Inline <script> text is preserved byte-for-byte by outerHTML
 *   serialization, so the CSP hashes in public/_headers stay valid.
 * - External requests are blocked during snapshotting (hermetic + fast); GA
 *   still loads normally for real visitors.
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const DIST = resolve(process.cwd(), 'dist');
const PORT = 45173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.woff2': 'font/woff2',
};

const routesFromSitemap = async () => {
  const xml = await readFile('public/sitemap.xml', 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  if (locs.length === 0) throw new Error('prerender: no <loc> entries found in public/sitemap.xml');
  return locs;
};

// Minimal static server over dist/ with SPA fallback — mirrors production.
const serveDist = () =>
  new Promise((resolveServer) => {
    const server = createServer(async (req, res) => {
      const path = new URL(req.url, `http://localhost:${PORT}`).pathname;
      let file = join(DIST, path);
      if (!extname(path)) file = join(DIST, 'index.html'); // SPA fallback
      try {
        const body = await readFile(file);
        res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    server.listen(PORT, () => resolveServer(server));
  });

// `<route>.html` (not `<route>/index.html`): Cloudflare Pages serves
// `/blog` from `blog.html` at the exact URL, while a directory index would
// 308-redirect `/blog` → `/blog/`, contradicting the canonicals + sitemap
// (both slash-less).
const outputPathFor = (route) =>
  route === '/' ? join(DIST, 'index.html') : join(DIST, `${route.replace(/^\//, '')}.html`);

const main = async () => {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('prerender: dist/index.html missing — run vite build first');
  }
  const routes = await routesFromSitemap();
  const server = await serveDist();
  const browser = await puppeteer.launch({ channel: 'chrome', headless: true });

  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const host = new URL(req.url()).hostname;
      if (host === 'localhost' || host === '127.0.0.1') req.continue();
      else req.abort(); // hermetic: no GA/external calls during snapshotting
    });
    await page.evaluateOnNewDocument(() => {
      // Keep the cookie banner out of the captured DOM (see header comment).
      window.localStorage.setItem('cookie-consent', 'declined');
    });

    const snapshots = new Map();
    for (const route of routes) {
      await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#root > *', { timeout: 15000 });
      const html = await page.evaluate((r) => {
        // Stamp the snapshot with its route: dist/index.html doubles as the
        // SPA fallback for unknown paths, so main.tsx must only hydrate when
        // the served snapshot actually matches location.pathname.
        document.getElementById('root').setAttribute('data-prerender-route', r);
        return '<!doctype html>\n' + document.documentElement.outerHTML;
      }, route);
      const title = await page.title();
      if (!title || title === 'not found') throw new Error(`prerender: ${route} rendered without a title`);
      snapshots.set(route, html);
      console.log(`prerendered ${route} (${(html.length / 1024).toFixed(0)} KB) — "${title}"`);
    }

    // Flush only after every route captured — overwriting dist/index.html
    // mid-run would change the SPA fallback the remaining routes render from.
    for (const [route, html] of snapshots) {
      const out = outputPathFor(route);
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, html);
    }
    console.log(`prerender: wrote ${snapshots.size} routes into dist/`);
  } finally {
    await browser.close();
    server.close();
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
