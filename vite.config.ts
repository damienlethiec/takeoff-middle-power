/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';

// Content-Security-Policy for the production build. GitHub Pages cannot send headers, so it goes in a
// <meta> tag (which cannot carry frame-ancestors). Build only: the dev server needs its HMR client and
// lets test harnesses stub the fonts. 'unsafe-inline' styles are needed for the style="" attributes
// in the string templates; scripts stay strictly same-origin.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
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

// GitHub Pages serves main at https://damienlethiec.github.io/takeoff-middle-power/
// and each other branch at .../takeoff-middle-power/preview/<branch>/ (BASE_PATH set by CI).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/takeoff-middle-power/',
  plugins: [csp()],
  test: { include: ['tests/**/*.test.ts'] },
});
