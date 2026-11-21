import { isManager, NoAccess, serverList, type UserGuild } from "@repo/domain";

export interface UserGuilds {
  /** Throws SignInRequired when Discord no longer accepts the user's authorization. */
  list(userId: string): Promise<UserGuild[]>;
}

export interface PresentServers {
  presentIds(ids: string[]): Promise<Set<string>>;
}

export const createAccessService = (
  guilds: UserGuilds,
  servers: PresentServers,
) => ({
  async listServers(userId: string) {
    const userGuilds = await guilds.list(userId);
    const present = await servers.presentIds(userGuilds.map(({ id }) => id));
    return serverList(userGuilds, present);
  },

  async requireServer(userId: string, serverId: string) {
    const guild = (await guilds.list(userId)).find(({ id }) => id === serverId);
    if (!guild || !isManager(guild)) throw new NoAccess(serverId);
    const present = await servers.presentIds([serverId]);
    if (!present.has(serverId)) throw new NoAccess(serverId);
    return { id: guild.id, name: guild.name, icon: guild.icon };
  },
});
