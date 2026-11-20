import { expect, test } from "vitest";
import { dashboardEnv } from "./env";

const complete = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  DISCORD_CLIENT_ID: "1",
  DISCORD_CLIENT_SECRET: "s",
  REST_PROXY_URL: "http://localhost:8000",
  REST_PROXY_SECRET: "s",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  ADMIN_DISCORD_IDS: "1",
  SUPPORT_SERVER_URL: "https://discord.gg/x",
};

test("architecture 8.1: starts when every variable is set", () => {
  expect(() => dashboardEnv.parse(complete)).not.toThrow();
});

test("architecture 8.1: stops when a variable is missing", () => {
  const missing = { ...complete, DATABASE_URL: undefined };

  expect(() => dashboardEnv.parse(missing)).toThrow(/DATABASE_URL/);
});
