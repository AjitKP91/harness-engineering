# Harness Engineering — Interactive Study Guide Website

Static Vite + TypeScript web application powering the interactive textbook, 7-layer animated blueprint, 6 live harness simulators, zoomable Mermaid diagrams, Shiki syntax highlighting, and command-palette search.

## Architecture

- **Single Source of Truth:** All content is compiled at build time from [`../harness-engineering-study-guide/`](../harness-engineering-study-guide/README.md) by [`scripts/build-content.mjs`](./scripts/build-content.mjs).
- **Generated Data (gitignored):** `public/data/manifest.json`, `public/data/search-index.json`, `public/data/glossary.json`, and `public/data/chapters/*.json` are regenerated automatically whenever you run `npm run dev` or `npm run build`.
- **Static Hosting Ready:** Uses `base: './'` in `vite.config.ts` and hash routing (`#/chapter/...`, `#/labs`, `#/glossary`, `#/roadmap`) so it works on GitHub Pages without server-side rewrites.

## Local Development

```bash
npm install
npm run dev
```

## Production Build & Preview

```bash
npx tsc --noEmit
npm run build
npm run preview
```

## Deployment

Pushes to `main` touching `harness-engineering-study-guide/**` or `harness-engineering-site/**` automatically trigger [`../.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml) to build and publish `dist/` to GitHub Pages.
