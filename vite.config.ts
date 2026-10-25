import { defineConfig } from 'vite';

// GitHub Pages serves main at https://damienlethiec.github.io/takeoff-middle-power/
// and each other branch at .../takeoff-middle-power/preview/<branch>/ (BASE_PATH set by CI).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/takeoff-middle-power/',
  test: { include: ['tests/**/*.test.ts'] },
} as any);
