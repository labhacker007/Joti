/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: 'e2e/tests',
  timeout: 30_000,
  expect: {
    timeout: 5000
  },
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry'
  },
  reporter: [['list']]
};

module.exports = config;
