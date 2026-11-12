# Brevet Planner

Repository contains a planning app for long-distance cycling route planning.

- Requirements: [docs/design.md](docs/design.md)
- Architecture, UI decisions and iteration plan: [docs/plan.md](docs/plan.md)

## Development

Requires Node.js 24 (see `.nvmrc`).

```sh
npm install
npm run dev          # dev server at http://localhost:5173/brevet-planner/
npm test             # unit tests (Vitest)
npx playwright install chromium   # once
npm run test:e2e     # browser tests (Playwright, desktop + tablet viewport) against the production build
npm run build        # type check + production build into dist/
```

## Configuration

The app reads [`public/config.yaml`](public/config.yaml) at start-up: default language, map tiles, storage backend
and planning defaults (start time, tight-buffer threshold, time model and its parameters). See the comments in the
file and [docs/plan.md](docs/plan.md#configuration--configyaml).

## Deployment

Pushing to `main` runs the tests and deploys to GitHub Pages
(`.github/workflows/deploy.yml`); other branches and pull requests run `.github/workflows/ci.yml`.

One-time setup in the GitHub repository: **Settings → Pages → Source: GitHub Actions**.

The public URL is `site.url` in `config.yaml` (default `https://ultra-cycling.github.io/brevet-planner`). Its path is
used as base path for the build. To switch to a custom domain later, either change `site.url` or set the repository
variable `SITE_URL` (Settings → Variables → Actions), e.g. `https://brevet.example.org`; the build then serves from `/`
and emits the `CNAME` file. Configure the DNS records as described in the GitHub Pages documentation.
