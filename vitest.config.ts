import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: [
        'lib/score-calculator.ts',
        'lib/csv-parser.ts',
        'lib/ai-classifier.ts',
        'lib/moneyforward-client.ts',
      ],
      reporter: ['text', 'lcov'],
      thresholds: {
        lines:      60,
        functions:  60,
        branches:   50,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
