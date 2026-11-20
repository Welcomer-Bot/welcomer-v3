import { iconBigintToHash } from "@discordeno/bot";
import { bot } from "../bot.ts";
import type { ServerService } from "../servers/server-service.ts";

const iconHash = (icon: bigint | undefined) =>
  icon === undefined ? null : iconBigintToHash(icon);

export const registerGuildEvents = (servers: ServerService) => {
  bot.events.ready = async ({ shardId, guilds, shard }) => {
    await servers.shardReady(
      { id: shardId, count: shard?.[1] ?? 1 },
      guilds.map(String),
    );
  };
  bot.events.guildCreate = async (guild) => {
    await servers.joined({
      id: guild.id.toString(),
      name: guild.name,
      memberCount: guild.memberCount,
      icon: iconHash(guild.icon),
    });
  };
  bot.events.guildUpdate = async (guild) => {
    await servers.updated(guild.id.toString(), {
      name: guild.name,
      icon: iconHash(guild.icon),
    });
  };
  bot.events.guildDelete = async ({ id, unavailable }) => {
    await servers.left(id.toString(), unavailable);
  };
};
