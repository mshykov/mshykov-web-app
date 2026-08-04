import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

// Prerendered routes (scripts/prerender.mjs) ship real HTML in #root, stamped
// with the route they were rendered for. Hydrate only when the snapshot
// matches the current path — dist/index.html (the Home snapshot) doubles as
// the SPA fallback for unknown routes, and hydrating Home's markup against a
// different location would mismatch. On mismatch, drop the stale markup and
// client-render from scratch (unknown routes end at the noindex 404).
if (container.getAttribute('data-prerender-route') === window.location.pathname) {
  hydrateRoot(container, app)
} else {
  container.replaceChildren()
  createRoot(container).render(app)
}
