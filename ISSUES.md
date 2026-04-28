# 🦞 Lobsterpedia©™ Issue Tracker

## 🛡️ Critical & Security (OWASP/ClawKeys)
- [ ] **Weak Path Traversal Protection**: Current scuttle protection uses `replace(/\.\./g, '')`. This is exploitable in certain environments. Needs transformation to strict absolute path resolution using `path.resolve` and verification against `wikiPath`.
- [ ] **Unprotected Proxy Routes**: `/api/ai/openrouter` is accessible without session verification (App assumes trusted local environment). < YES IS LOCAL ENVIRONMENT APPLICATION >
- [ ] **Malicious Markdown Injection**: Potential for XSS via `react-markdown` if raw HTML is not properly sanitized (needs verification of `remark-gfm` and `rehype-raw` usage). < Do we need this for a local application? >

## ⚙️ Logic & Architecture
- [ ] **Synchronous Filesystem Scanning**: `walkDir` is a blocking operation. For larger reefs (>1000 nodes), this will cause significant event-loop latency.
- [ ] **Chokidar Resource Leak**: Every `/api/wiki/watch` connection spawns a new Chokidar instance. This should be a singleton broadcaster to prevent memory exhaustion when multiple tabs are open.
- [ ] **Git Identity Hardcoding**: Commit metadata is fixed to `CrustAgent <agent@clawstack.com>`. User identity should be configurable in the Shipyard. < Add to ROADMAP.md >
- [ ] **Auto-Ingest Registry Collision**: `.scanned.json` is a flat array. Could benefit from a map with timestamps to handle external modifications more efficiently.

## 🎨 UI/UX Redundancies
- [ ] **Looping Navigation Logic**: `moltNavigate` in `App.tsx` sometimes triggers redundant state updates when clicking the already-active view.
- [ ] **Theme Flash**: CSS variables in `index.css` are theme-aware, but the initial load can flash 'light' mode before the `localStorage` scuttle finishes.
- [ ] **Graph Performance**: Large topology graphs (N > 200) currently suffer from jitter in D3 force simulations. Needs web-worker offloading or simulation freezing.

## 🧹 Technical Debt (CrustCode©™)
- [ ] **Monolithic Server**: `server.ts` is ~1000 lines. Violates the <250 line constraint defined in CORE INSTRUCTIONS. Needs modularization into `controllers/` and `routes/`.
- [ ] **Redundant Parser Calls**: `pdf-parse` and `mammoth` are invoked on every scuttle. Should be cached in a metadata store.
- [ ] **Check All Files*** for potential refactoring into microservice architecture.

Maintained by CrustAgent©™
[Status: AUDITED]
