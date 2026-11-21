import "server-only";
import { prisma } from "@repo/database";
import { SignInRequired, type UserGuild } from "@repo/domain";
import { APIError } from "better-auth/api";
import { cacheLife } from "next/cache";
import { auth } from "@/lib/auth";
import { dashboardEnv } from "@/env";
import type { UserGuilds } from "./access-service";

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

// `use cache` does not keep an error's class, so the cached function returns null when Discord
// refuses the authorization. Signing in again updates the account row: its updatedAt changes the key.
async function guildsOf(
  userId: string,
  account: { id: string; updatedAt: number },
): Promise<UserGuild[] | null> {
  "use cache";
  // Rights are read again at most 60 seconds late (R-ACC-7); the key never holds the token.
  cacheLife({ stale: 30, revalidate: 59, expire: 60 });

  let accessToken: string;
  try {
    ({ accessToken } = await auth.api.getAccessToken({
      body: { accountId: account.id, userId },
    }));
  } catch (error) {
    if (error instanceof APIError) return null;
    throw error;
  }
  const response = await fetch(
    `${dashboardEnv.parse(process.env).DISCORD_API_URL}/users/@me/guilds`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  if (response.status === 401) return null;
  if (!response.ok)
    throw new Error(`Discord guilds answered ${String(response.status)}`);
  const guilds = (await response.json()) as DiscordGuild[];
  return guilds.map(({ id, name, icon, owner, permissions }) => ({
    id,
    name,
    icon,
    owner,
    permissions,
  }));
}

export const discordGuilds: UserGuilds = {
  async list(userId) {
    const account = await prisma.account.findFirst({
      where: { userId, providerId: "discord" },
      select: { id: true, updatedAt: true },
    });
    const guilds =
      account &&
      (await guildsOf(userId, {
        id: account.id,
        updatedAt: account.updatedAt.getTime(),
      }));
    if (!guilds) throw new SignInRequired(userId);
    return guilds;
  },
};
