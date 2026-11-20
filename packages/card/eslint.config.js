import { config } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "@prisma/*",
            "@repo/database",
            "discordeno",
            "@discordeno/*",
            "next",
            "next/*",
            "react",
            "react-dom",
            "better-auth",
            "better-auth/*",
            "dashboard",
            "bot",
          ],
        },
      ],
    },
  },
];
