import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "tests/results.json" }]],
  use: {
    baseURL: "http://localhost:5245",
    headless: true,
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5245",
    reuseExistingServer: true,
    timeout: 30000,
  },
})
