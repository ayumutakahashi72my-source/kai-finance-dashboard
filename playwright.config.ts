// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="@playwright/test" />
import { defineConfig, devices } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// .env.local を手動で読み込み（Playwright は Next.js のenv自動読み込みを使わないため）
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}
loadEnvFile(path.resolve('.env.local'))
loadEnvFile(path.resolve('.env'))

const AUTH_FILE = 'e2e/.auth/user.json'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'chromium',
      testIgnore: ['**/dashboard.spec.ts', '**/api-security.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
    {
      name: 'dashboard',
      testMatch: '**/dashboard.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
    {
      name: 'api-security',
      testMatch: '**/api-security.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testMatch: '**/screens.spec.ts',
      use: {
        ...devices['iPhone 14'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
