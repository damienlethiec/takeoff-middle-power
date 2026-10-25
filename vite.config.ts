import { defineConfig } from 'vite';

// GitHub Pages serves the site at https://damienlethiec.github.io/takeoff-middle-power/
export default defineConfig({
  base: '/takeoff-middle-power/',
  test: { include: ['tests/**/*.test.ts'] },
} as any);
