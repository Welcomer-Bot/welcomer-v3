import { iconBigintToHash } from "@discordeno/bot";
import { bot } from "../bot.ts";
import { track } from "../dispatch.ts";
import type { ServerService } from "../servers/server-service.ts";

const iconHash = (icon: bigint | undefined) =>
  icon === undefined ? null : iconBigintToHash(icon);

export const registerGuildEvents = (servers: ServerService) => {
  // Without the shard pair, the shard count is unknown, so no server can be matched to this connection.
  bot.events.ready = ({ shardId, guilds, shard }) =>
    shard?.[1] === undefined
      ? undefined
      : track(
          servers.shardReady(
            { id: shardId, count: shard[1] },
            guilds.map(String),
          ),
        );
  bot.events.guildCreate = (guild) =>
    track(
      guild.joinedAt === undefined
        ? Promise.reject(new Error("GUILD_CREATE without joined_at"))
        : servers.joined(
            {
              id: guild.id.toString(),
              name: guild.name,
              memberCount: guild.memberCount,
              icon: iconHash(guild.icon),
            },
            new Date(guild.joinedAt),
          ),
    );
  bot.events.guildUpdate = (guild) =>
    track(
      servers.updated(guild.id.toString(), {
        name: guild.name,
        icon: iconHash(guild.icon),
      }),
    );
  bot.events.guildDelete = ({ id, unavailable }) =>
    track(servers.left(id.toString(), unavailable));
};
