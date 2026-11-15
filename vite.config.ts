/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';

// Content-Security-Policy for the production build. GitHub Pages cannot send headers, so it goes in a
// <meta> tag (which cannot carry frame-ancestors). Build only: the dev server needs its HMR client.
// Fonts are self-hosted (Fontsource, npm), so no third-party origin is allowed anywhere. 'unsafe-inline'
// styles are needed for the style="" attributes in the string templates; scripts stay strictly same-origin.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const csp = (): Plugin => ({
  name: 'csp-meta',
  apply: 'build',
  // right after <meta charset>, before any resource the policy must cover
  transformIndexHtml: (html) => html.replace(/(<meta charset="utf-8" \/>)/, `$1\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

// CI sets BASE_PATH: / for main at https://aitakeoff.eu/ and /preview/<branch>/ for the other branches (see
// .github/workflows/deploy.yml and docs/DOMAIN.md). Local builds, e2e and a11y runs keep /takeoff-middle-power/.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/takeoff-middle-power/',
  plugins: [csp()],
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // type-only modules and the browser entry point (covered by the end-to-end test)
      exclude: ['src/engine/types.ts', 'src/engine/api.ts', 'src/data/schema.ts', 'src/main.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
});
