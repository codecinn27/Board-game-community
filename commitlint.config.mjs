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
        "refactor",
        "test",
        "chore",
        "ci",
        "build",
        "perf",
        "style",
      ],
    ],
    // Dependabot titles always start with a capital "Bump".
    "subject-case": [0],
  },
};

export default config;
