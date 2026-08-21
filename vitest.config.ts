import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Two environments, per B028: a plain Node environment for domain/lib/server
// code (no DOM needed, and jsdom would be actively wrong for server-only
// code that must never run in a browser-like global scope), and jsdom for
// anything rendering React components.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/domain/**/*.{ts,tsx}",
        "src/lib/**/*.{ts,tsx}",
        "src/server/**/*.{ts,tsx}",
        "src/schemas/**/*.{ts,tsx}",
      ],
      exclude: ["**/*.test.{ts,tsx}"],
    },
    projects: [
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: "node",
          environment: "node",
          include: [
            "src/{domain,lib,server,schemas}/**/*.test.ts",
            "tests/**/*.test.ts",
            "scripts/**/*.test.ts",
            "*.config.test.ts",
          ],
          // Integration tests under src/server share one real Firestore
          // emulator instance and mutable documents (e.g. config/system).
          // Running test *files* in parallel worker processes against that
          // shared backend produces genuine read-after-write races that
          // have nothing to do with the code under test (B050 caught
          // exactly this). Domain/lib/schema unit tests pay a negligible
          // sequential-execution cost in exchange for that isolation.
          fileParallelism: false,
        },
      },
      {
        resolve: { tsconfigPaths: true },
        plugins: [react()],
        test: {
          name: "component",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: [
            "src/components/**/*.test.tsx",
            "src/app/**/*.test.tsx",
            "src/hooks/**/*.test.ts",
          ],
        },
      },
    ],
  },
});
