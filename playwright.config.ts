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
    // auth.json がない場合のみ認証セットアップを実行
    ...(!hasAuthFile ? [{
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    }] : []),
    {
      name: 'chromium',
      testIgnore: '**/dashboard.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        ...(hasAuthFile ? { storageState: AUTH_FILE } : {}),
      },
      ...(hasAuthFile ? {} : { dependencies: ['setup'] }),
    },
    // ダッシュボードテストは auth.json なしでも実行可（未認証リダイレクト検証など）
    // auth.json があれば storageState を使って認証済みテストも実行する
    {
      name: 'dashboard',
      testMatch: '**/dashboard.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        ...(hasAuthFile ? { storageState: AUTH_FILE } : {}),
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
