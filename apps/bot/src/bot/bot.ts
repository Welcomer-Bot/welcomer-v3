import { createBot, Intents } from "@discordeno/bot";
import { botEnv } from "../env.ts";
import { createLogger } from "../logger.ts";

export const env = botEnv.parse(process.env);
export const logger = createLogger("bot", env.LOG_LEVEL);

export const bot = createBot({
  token: env.DISCORD_TOKEN,
  intents: Intents.Guilds | Intents.GuildMembers,
  desiredProperties: {
    guild: {
      id: true,
      name: true,
      icon: true,
      memberCount: true,
    },
    member: {
      guildId: true,
    },
    interaction: {
      id: true,
      type: true,
      data: true,
      token: true,
      guildId: true,
    },
  },
  rest: {
    token: env.DISCORD_TOKEN,
    proxy: {
      baseUrl: env.REST_PROXY_URL,
      authorization: env.REST_PROXY_SECRET,
    },
  },
});

export type CustomBot = typeof bot;
