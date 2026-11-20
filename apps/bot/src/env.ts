import { z } from "zod";

const LOG_LEVEL = z
  .enum(["fatal", "error", "warn", "info", "debug", "trace"])
  .default("info");

export const gatewayEnv = z.object({
  DATABASE_URL: z.url(),
  RABBITMQ_URL: z.url(),
  DISCORD_TOKEN: z.string().min(1),
  LOG_LEVEL,
});

export const restEnv = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  REST_PROXY_SECRET: z.string().min(1),
  LOG_LEVEL,
});

export const botEnv = z.object({
  DATABASE_URL: z.url(),
  RABBITMQ_URL: z.url(),
  REST_PROXY_URL: z.url(),
  REST_PROXY_SECRET: z.string().min(1),
  SUPPORT_SERVER_URL: z.url(),
  LOG_LEVEL,
});

export const registerCommandsEnv = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  LOG_LEVEL,
});
