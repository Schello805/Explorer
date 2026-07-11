import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: [
      "npm run build",
      `DATABASE_URL= PLAYWRIGHT_TEST=1 ALLOW_LOCAL_DATA_FALLBACK=true PLATZGUIDE_DATA_DIR=.playwright-data AUTH_SECRET=playwright-secret-with-more-than-thirty-two-characters ADMIN_EMAIL=admin@schellenberger.biz ADMIN_PASSWORD_HASH='$2b$10$oeJJYUyJWdzlhC8VwTW7BumvWisycj5UJpP99P/J90jpsDvVs6G1a' AUTH_COOKIE_SECURE=false NEXT_PUBLIC_BASE_URL=${baseURL} npm start -- --hostname 127.0.0.1 --port ${port}`
    ].join(" && "),
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } }
  ]
});
