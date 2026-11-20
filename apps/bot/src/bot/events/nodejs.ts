import { logger } from "../bot.ts";

process.on("unhandledRejection", (error) => {
  logger.error({ err: error }, "An unhandled rejection occurred");
});
