import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', 
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:1420',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});