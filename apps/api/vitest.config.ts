import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    globalSetup: ["./test/setup/global-setup.ts"],
    fileParallelism: false,
    env: { DATABASE_URL: "postgres://cash:cash@localhost:5432/cash_test" },
  },
});
