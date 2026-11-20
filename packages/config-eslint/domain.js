import { config } from "./base.js";

/**
 * The dependency rule of development.md: the domain packages import no infrastructure.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const domainConfig = [
  ...config,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "@prisma/*",
            "prisma",
            "prisma/*",
            "pg",
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
