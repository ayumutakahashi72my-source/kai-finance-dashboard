// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="@playwright/test" />
import { defineConfig, devices } from '@playwright/test'
import fs from 'fs'

const AUTH_FILE = 'e2e/.auth/user.json'
const hasAuthFile = fs.existsSync(AUTH_FILE)

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
    ...(!hasAuthFile ? [{
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    }] : []),
    {
      name: 'chromium',
      testIgnore: ['**/dashboard.spec.ts', '**/api-security.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        ...(hasAuthFile ? { storageState: AUTH_FILE } : {}),
      },
      ...(hasAuthFile ? {} : { dependencies: ['setup'] }),
    },
    {
      name: 'dashboard',
      testMatch: '**/dashboard.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        ...(hasAuthFile ? { storageState: AUTH_FILE } : {}),
      },
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
        ...(hasAuthFile ? { storageState: AUTH_FILE } : {}),
      },
      ...(hasAuthFile ? {} : { dependencies: ['setup'] }),
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
