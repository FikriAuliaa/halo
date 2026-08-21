const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "test",
        "refactor",
        "style",
        "chore",
        "security",
        "perf",
        "build",
        "ci",
        "revert",
      ],
    ],
  },
};

export default config;
