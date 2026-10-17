import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Each test file gets its own in-memory database; data/pokedex.sqlite is never touched.
    env: { DATABASE_PATH: ':memory:' },
  },
});
