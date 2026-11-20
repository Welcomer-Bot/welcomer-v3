import { iconBigintToHash } from "@discordeno/bot";
import { bot } from "../bot.ts";
import { track } from "../dispatch.ts";
import type { ServerService } from "../servers/server-service.ts";

const iconHash = (icon: bigint | undefined) =>
  icon === undefined ? null : iconBigintToHash(icon);

export const registerGuildEvents = (servers: ServerService) => {
  bot.events.ready = ({ shardId, guilds, shard }) =>
    track(
      servers.shardReady(
        { id: shardId, count: shard?.[1] ?? 1 },
        guilds.map(String),
      ),
    );
  bot.events.guildCreate = (guild) =>
    track(
      servers.joined({
        id: guild.id.toString(),
        name: guild.name,
        memberCount: guild.memberCount,
        icon: iconHash(guild.icon),
      }),
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
