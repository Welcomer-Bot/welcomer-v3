import { z } from "zod";

export const dashboardEnv = z.object({
  DATABASE_URL: z.url(),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  REST_PROXY_URL: z.url(),
  REST_PROXY_SECRET: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  ADMIN_DISCORD_IDS: z.string().min(1),
  SUPPORT_SERVER_URL: z.url(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DISCORD_API_URL: z.url().default("https://discord.com/api/v10"),
});
