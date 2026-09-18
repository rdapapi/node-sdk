import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only the unit suite: tests/canary.ts hits production and is run separately.
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/version.ts"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
