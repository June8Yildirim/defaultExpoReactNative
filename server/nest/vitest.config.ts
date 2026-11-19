import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // esbuild can't emit decorator metadata, which Nest's dependency injection needs.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: { globals: true, include: ['test/**/*.spec.ts', 'src/**/*.spec.ts'] },
});
