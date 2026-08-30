/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

/**
 * Prerendering (scripts/prerender.mjs) snapshots a live DOM rather than running
 * React's server renderer, and `src/main.tsx` hydrates on top of that snapshot.
 * Two kinds of markup therefore cannot be reproduced, and each one costs the
 * whole tree: React discards the snapshot and client-renders from scratch,
 * flashing unstyled or empty content on the way.
 *
 * These are cheap guards against silently reintroducing either. If one fails,
 * read the reasoning in scripts/prerender.mjs before working around it.
 */
describe('hydration invariants', () => {
  it('keeps Suspense boundaries out of the app tree', () => {
    // React marks Suspense boundaries with SSR-only comment nodes (<!--$-->).
    // A DOM snapshot cannot carry them, so hydration reports the boundary as a
    // mismatch even when nothing actually suspends — which also rules out
    // React.lazy for routes, since lazy requires a boundary.
    const appSource = readProjectFile('src/App.tsx');

    expect(appSource).not.toContain('Suspense');
    expect(appSource).not.toContain('lazy(');
  });

  it('re-separates adjacent text nodes when serializing a snapshot', () => {
    // React renders `{a}{b}` as two text nodes and separates them with a
    // comment when server-rendering; serializing a live DOM concatenates them
    // instead. The prerender script reinserts the separators.
    const prerenderSource = readProjectFile('scripts/prerender.mjs');

    expect(prerenderSource).toContain('createComment');
    expect(prerenderSource).toContain('NodeFilter.SHOW_TEXT');
  });

  it('does not derive rendered markup from localStorage', () => {
    // Values read from localStorage during render differ between the snapshot
    // (taken in a fresh browser) and a returning visitor. The theme toggle used
    // to branch on a localStorage-derived `isDark`, which mismatched for every
    // dark-mode visitor; the `.dark` class on <html> drives the icon via CSS
    // instead.
    // Layout reads consent through getConsent() (src/lib/consent.ts) inside an
    // effect, which runs after hydration and is safe. Layout itself should
    // never reach for storage — writing on click is fine, reading is not.
    const layoutSource = readProjectFile('src/components/Layout.tsx');

    expect(layoutSource).not.toContain('localStorage.getItem');
  });
});
