import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { PLAN_FILE_SUFFIX } from '../src/domain/planFile.ts';
import { buildPlansIndex, GPX_SUFFIX, type FolderFile } from '../src/storage/plansIndex.ts';

/** Reads the plan and GPX files of a folder (missing folder = empty) */
export function readPlansFolder(dir: string): FolderFile[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((name) => (name.endsWith(PLAN_FILE_SUFFIX) || name.toLowerCase().endsWith(GPX_SUFFIX)) && statSync(join(dir, name)).isFile())
    .map((name) => ({ name, content: readFileSync(join(dir, name), 'utf8') }));
}

/**
 * Serves `<base>plans/index.json` for the files in `public/plans/`: generated on every request by the dev server (so
 * manually added files show up after a reload) and written as a file into the build for static hosting.
 */
export function plansIndexPlugin(publicDir = 'public', folder = 'plans'): Plugin {
  const dir = join(publicDir, folder);
  const indexPath = `/${folder}/index.json`;
  return {
    name: 'plans-index',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0];
        if (!path.endsWith(indexPath)) return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(buildPlansIndex(readPlansFolder(dir))));
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: `${folder}/index.json`,
        source: JSON.stringify(buildPlansIndex(readPlansFolder(dir))),
      });
    },
  };
}
