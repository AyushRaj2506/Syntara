import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', workers: 1, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:5175', channel: process.env.PLAYWRIGHT_CHANNEL === 'chromium' ? undefined : 'chrome', headless: true, screenshot: 'only-on-failure' },
  webServer: [
    { command: 'node src/server.js', cwd: '../server', url: 'http://127.0.0.1:4011/health', env: { PORT: '4011', CLIENT_ORIGIN: 'http://127.0.0.1:5175', MAX_ROOMS_PER_IP_PER_HOUR: '100' }, reuseExistingServer: false },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort', url: 'http://127.0.0.1:5175', env: { VITE_SERVER_URL: 'http://127.0.0.1:4011' }, reuseExistingServer: false },
  ],
});
