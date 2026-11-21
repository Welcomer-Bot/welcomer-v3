export interface UserGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface ManagedServer {
  id: string;
  name: string;
  icon: string | null;
  botPresent: boolean;
}

// BigInt() instead of a literal: the dashboard keeps create-next-app's ES2017 target.
const ADMINISTRATOR = BigInt(1) << BigInt(3);
const MANAGE_GUILD = BigInt(1) << BigInt(5);

export const isManager = (guild: UserGuild): boolean =>
  guild.owner ||
  (BigInt(guild.permissions) & (ADMINISTRATOR | MANAGE_GUILD)) !== BigInt(0);

export const serverList = (
  guilds: UserGuild[],
  presentIds: Set<string>,
): ManagedServer[] =>
  guilds
    .filter(isManager)
    .map(({ id, name, icon }) => ({
      id,
      name,
      icon,
      botPresent: presentIds.has(id),
    }))
    .sort(
      (a, b) =>
        Number(b.botPresent) - Number(a.botPresent) ||
        a.name.localeCompare(b.name, "en"),
    );
