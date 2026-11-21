import { describe, expect, it } from "vitest";
import { botEnv, gatewayEnv, registerCommandsEnv, restEnv } from "./env.ts";

const processes = [
  {
    name: "gateway",
    required: "REST_PROXY_URL",
    schema: gatewayEnv,
    complete: {
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      RABBITMQ_URL: "amqp://guest:guest@localhost:5672",
      DISCORD_TOKEN: "t",
      REST_PROXY_URL: "http://localhost:8000",
      REST_PROXY_SECRET: "s",
    },
  },
  {
    name: "rest",
    required: "REST_PROXY_SECRET",
    schema: restEnv,
    complete: {
      DISCORD_TOKEN: "t",
      DISCORD_CLIENT_ID: "1",
      REST_PROXY_SECRET: "s",
    },
  },
  {
    name: "bot",
    required: "SUPPORT_SERVER_URL",
    schema: botEnv,
    complete: {
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      RABBITMQ_URL: "amqp://guest:guest@localhost:5672",
      REST_PROXY_URL: "http://localhost:8000",
      REST_PROXY_SECRET: "s",
      DISCORD_TOKEN: "t",
      SUPPORT_SERVER_URL: "https://discord.gg/x",
      DASHBOARD_URL: "http://localhost:3000/dashboard",
    },
  },
  {
    name: "register-commands",
    required: "DISCORD_CLIENT_ID",
    schema: registerCommandsEnv,
    complete: { DISCORD_TOKEN: "t", DISCORD_CLIENT_ID: "1" },
  },
];

describe.each(processes)("$name", ({ name, required, schema, complete }) => {
  it(`architecture 8.1: ${name} starts when every variable is set`, () => {
    expect(() => schema.parse(complete)).not.toThrow();
  });

  it(`architecture 8.1: ${name} stops when a variable is missing`, () => {
    const missing = { ...complete, [required]: undefined };

    expect(() => schema.parse(missing)).toThrow(new RegExp(required));
  });
});
