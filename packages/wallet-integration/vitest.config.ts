import { vitest } from 'vitest/config';

export default vitest.config({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
