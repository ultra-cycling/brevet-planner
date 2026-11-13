# Brevet Planner

Repository contains a planning app for long-distance cycling route planning.

- Requirements and user stories (overview): [docs/design.md](docs/design.md)
- User stories with acceptance criteria and their tests: [docs/features/](docs/features)
- Iterations, UI decisions, architecture and configuration: [docs/plan.md](docs/plan.md)

## Developer setup

The CI workflows use **Node.js 26** (major version in [`.nvmrc`](.nvmrc), resolved to the latest 26.x) together with
the npm version bundled with it. Use the same locally so that `package-lock.json` is written the same way as CI reads
it. `package.json` declares `"engines": { "node": "^26" }`, so npm warns (`EBADENGINE`) when another major is used.

### Node.js via Homebrew (macOS)

The Homebrew formula `node` currently provides Node 26:

```sh
brew install node
node -v   # v26.x
npm -v    # npm bundled with Node 26
```

Keep Node and npm up to date with Homebrew – **don't** run `npm install -g npm@latest`: npm belongs to the Homebrew
installation and is updated together with Node. With the latest 26.x on both sides, local npm and CI npm are the
same version.

```sh
brew update && brew upgrade node
```

> **When Node 27 is released** (April 2027), the `node` formula will move to 27 while the project stays on 26 until
> `.nvmrc` is bumped. Then either switch to the versioned formula (`brew uninstall node && brew install node@26`;
> `node@26` is keg-only, add `$(brew --prefix node@26)/bin` to your `PATH`), or upgrade the project by changing
> `.nvmrc` and `engines.node` together.

### First-time project setup

```sh
npm ci                            # install exactly the versions from package-lock.json
npx playwright install chromium   # browser for the browser tests (again after Playwright updates)
```

## Local development

```sh
npm run dev          # dev server with hot reload: http://localhost:5173/brevet-planner/
npm test             # unit tests (Vitest); npm run test:watch for watch mode
npm run test:e2e     # browser tests (Playwright, desktop + tablet viewport) against the production build
npm run typecheck    # TypeScript check
npm run build        # type check + production build into dist/
npm run preview      # serve dist/ like GitHub Pages: http://localhost:4173/brevet-planner/
```

- The app is served under the base path from `site.url` – open `/brevet-planner/`, not `/`. To serve from the root
  locally: `SITE_URL=http://localhost npm run dev`.
- `public/config.yaml` is read at application start – reload the page after editing it.
- Dependencies: use `npm install <package>` (with Node 26's npm, see above) and commit the updated
  `package-lock.json`. CI runs `npm ci`, which fails if `package.json` and the lockfile are out of sync.
- The GPX fixture for the browser tests is generated: `node tooling/generate-sample-gpx.ts`.

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
