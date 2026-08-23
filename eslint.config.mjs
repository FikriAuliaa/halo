import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "supabase/.temp/**",
      "supabase/.branches/**",
    ],
  },
  {
    rules: {
      // AGENTS.md: "no `any` without an inline comment justifying it" —
      // this only bans *unexplained* any; an eslint-disable line with a
      // reason still satisfies the rule below.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // AGENTS.md: no direct Postgres/Supabase client construction outside
    // the two reserved wrapper modules — every repository and operation
    // imports its `sql`/`supabaseAdmin` handle from there, never
    // constructs its own connection or client.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/db/client.ts", "src/lib/supabase-admin.ts"],
    rules: {
      // `allowTypeImports`: repositories need `postgres.TransactionSql`
      // and friends pervasively for method signatures — only *value*
      // imports (constructing a client) are restricted.
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "postgres",
              message: "Postgres is only ever touched via src/server/db/client.ts. See AGENTS.md.",
              allowTypeImports: true,
            },
            {
              name: "@supabase/supabase-js",
              message:
                "Supabase Auth/Storage are only ever touched via src/lib/supabase-admin.ts. See AGENTS.md.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    // AGENTS.md: no console.log in the trusted tier — use the structured
    // logger (ADR-010) instead, so redaction rules are actually applied.
    // The logger's own implementation is the one legitimate exception.
    files: ["src/server/**/*.{ts,tsx}"],
    ignores: ["src/server/framework/logger.ts", "src/server/framework/logger.test.ts"],
    rules: {
      "no-console": "error",
    },
  },
];

export default eslintConfig;
