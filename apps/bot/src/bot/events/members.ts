import { bot } from "../bot.ts";
import { track } from "../dispatch.ts";
import type { ServerService } from "../servers/server-service.ts";

export const registerMemberEvents = (servers: ServerService) => {
  bot.events.guildMemberAdd = (member) =>
    member.guildId === undefined
      ? undefined
      : track(servers.memberArrived(member.guildId.toString()));
  bot.events.guildMemberRemove = (_user, guildId) =>
    track(servers.memberLeft(guildId.toString()));
};
