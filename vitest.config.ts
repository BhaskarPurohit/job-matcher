import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',  // API routes run in Node, not a browser
    globals: true,         // describe/it/expect without importing
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    // Mirror the @/ alias from tsconfig.json so imports resolve in tests
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
