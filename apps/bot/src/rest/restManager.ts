import { createRestManager } from "@discordeno/bot";
import { restEnv } from "../env.ts";
import { createLogger } from "../logger.ts";

export const env = restEnv.parse(process.env);

const manager = createRestManager({
  token: env.DISCORD_TOKEN,
  applicationId: env.DISCORD_CLIENT_ID,
});

export const logger = createLogger("rest", env.LOG_LEVEL);

export default manager;
