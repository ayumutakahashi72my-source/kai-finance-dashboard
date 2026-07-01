import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '.next/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      include: [
        'lib/score-calculator.ts',
        'lib/csv-parser.ts',
      ],
      reporter: ['text', 'lcov'],
      thresholds: {
        lines:      40,
        functions:  50,
        branches:   35,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
