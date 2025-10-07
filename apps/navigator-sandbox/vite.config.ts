import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 100
    }
  },
  resolve: {
    alias: {
      '@mycelia/shared-kernel': path.resolve(__dirname, '../../packages/shared-kernel/dist/src/index'),
      '@mycelia/vault-adapter-local': path.resolve(__dirname, '../../packages/vault-adapter-local/dist/src/index'),
      '@mycelia/oracle-agent': path.resolve(__dirname, '../../packages/oracle-agent/dist/src/index'),
      '@mycelia/workspaces-engine': path.resolve(__dirname, '../../packages/workspaces-engine/dist/index'),
      '@mycelia/bloom-rewards': path.resolve(__dirname, '../../packages/bloom-rewards/dist/src/index'),
      '@mycelia/social-graph': path.resolve(__dirname, '../../packages/social-graph/dist/src/index'),
      '@mycelia/ui-components': path.resolve(__dirname, '../../packages/ui-components/dist/src/index'),
    },
  },
});
