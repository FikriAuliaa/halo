import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Load .env variables for Vitest runs
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        process.env[key] ??= val;
      }
    }
  }
} catch {
  // Ignore if .env is missing
}

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
