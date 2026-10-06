import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: './e2e',
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:5174', viewport: { width: 1180, height: 820 }, screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm --prefix frontend run dev -- --host 127.0.0.1',
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
  },
});
