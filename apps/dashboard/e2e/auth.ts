import type { BrowserContext } from "@playwright/test";
import { prisma } from "@repo/database";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { testUtils } from "better-auth/plugins";

// Test-only instance on the dashboard's database and secret, as Better Auth's test utils advise.
const testAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [testUtils()],
});

const IN_ONE_YEAR = () => new Date(Date.now() + 365 * 24 * 3600 * 1000);

/** Signs in a new user "Alex" whose Discord access token the Discord mock knows. */
export const signInAs = async (
  context: BrowserContext,
  token: "manager" | "none" | "revoked",
) => {
  const { test } = await testAuth.$context;
  const user = await test.saveUser(test.createUser({ name: "Alex" }));
  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      providerId: "discord",
      accountId: String(Date.now()) + String(Math.floor(Math.random() * 1e6)),
      accessToken: token,
      accessTokenExpiresAt: IN_ONE_YEAR(),
    },
  });
  await context.addCookies(
    await test.getCookies({ userId: user.id, domain: "localhost" }),
  );
  return user.id;
};
