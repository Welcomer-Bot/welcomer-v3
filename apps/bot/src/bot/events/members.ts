import { bot } from "../bot.ts";
import type { ServerService } from "../servers/server-service.ts";

export const registerMemberEvents = (servers: ServerService) => {
  bot.events.guildMemberAdd = async (member) => {
    if (member.guildId === undefined) return;
    await servers.memberArrived(member.guildId.toString());
  };
  bot.events.guildMemberRemove = async (_user, guildId) => {
    await servers.memberLeft(guildId.toString());
  };
};
