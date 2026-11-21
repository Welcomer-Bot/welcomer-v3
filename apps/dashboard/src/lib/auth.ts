import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { DiscordProfile } from "better-auth/social-providers";
import { prisma } from "@repo/database";

// Better Auth requires an email on every user; without the email scope, Discord sends none (R-PRV-2).
export const discordUser = (profile: DiscordProfile) => ({
  email: `${profile.id}@discord.placeholder.invalid`,
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Empty only during `next build`: instrumentation register() stops the server at start when a variable is missing.
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      // The provider's defaults are identify and email; only identify and guilds are asked (R-ACC-1, R-PRV-2).
      disableDefaultScope: true,
      scope: ["identify", "guilds"],
      mapProfileToUser: discordUser,
    },
  },
});
