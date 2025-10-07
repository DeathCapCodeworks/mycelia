import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@mycelia/shared-kernel': new URL('../../packages/shared-kernel/src', import.meta.url).pathname,
    },
  },
});

