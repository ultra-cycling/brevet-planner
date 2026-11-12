import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { basePathFromSiteUrl, cnameFromSiteUrl } from './src/config/siteUrl.ts';
import { readSiteUrl } from './tooling/siteUrl.node.ts';

/** Emits a CNAME file for GitHub Pages when the site runs on a custom domain. */
function githubPagesCname(siteUrl: string): Plugin {
  return {
    name: 'github-pages-cname',
    apply: 'build',
    generateBundle() {
      const cname = cnameFromSiteUrl(siteUrl);
      if (cname) this.emitFile({ type: 'asset', fileName: 'CNAME', source: `${cname}\n` });
    },
  };
}

const siteUrl = readSiteUrl();

export default defineConfig({
  base: basePathFromSiteUrl(siteUrl),
  plugins: [react(), githubPagesCname(siteUrl)],
  css: {
    preprocessorOptions: {
      // Bootstrap 5 still uses @import and global Sass functions
      scss: { quietDeps: true, silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'] },
    },
  },
  test: {
    environment: 'jsdom',
    // Node ≥ 25 ships its own (file-backed) localStorage global that shadows jsdom's
    execArgv: ['--no-experimental-webstorage'],
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tooling/**/*.test.ts'],
    css: false,
  },
});
