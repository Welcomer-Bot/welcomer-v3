import { createAccessService } from "./access-service";
import { discordGuilds } from "./discord-guilds";
import { prismaPresentServers } from "./server-repository";

export const accessService = createAccessService(
  discordGuilds,
  prismaPresentServers,
);
