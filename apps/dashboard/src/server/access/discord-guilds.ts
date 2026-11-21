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

async function accessTokenOf(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "discord" },
    select: { id: true },
  });
  if (!account) throw new SignInRequired(userId);
  try {
    const { accessToken } = await auth.api.getAccessToken({
      body: { accountId: account.id, userId },
    });
    return accessToken;
  } catch (error) {
    if (error instanceof APIError) throw new SignInRequired(userId);
    throw error;
  }
}

// Rights are read again at most 60 seconds late (R-ACC-7); keyed by the user id only, never the token.
async function guildsOf(userId: string): Promise<UserGuild[]> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 59, expire: 60 });

  const response = await fetch(
    `${dashboardEnv.parse(process.env).DISCORD_API_URL}/users/@me/guilds`,
    {
      headers: { authorization: `Bearer ${await accessTokenOf(userId)}` },
    },
  );
  if (response.status === 401) throw new SignInRequired(userId);
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

export const discordGuilds: UserGuilds = { list: guildsOf };
