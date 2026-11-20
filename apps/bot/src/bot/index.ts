import type { DiscordGatewayPayload } from "@discordeno/bot";
import { connect as connectAmqp, type ConsumeMessage } from "amqplib";
import { bot, env, logger } from "./bot.ts";
import { dispatchAndWait } from "./dispatch.ts";
import { registerGuildEvents } from "./events/guilds.ts";
import { registerInteractionEvents } from "./events/interactions/create.ts";
import { registerMemberEvents } from "./events/members.ts";
import "./events/nodejs.ts";
import { prismaServerRepository } from "./servers/server-repository.ts";
import { createServerService } from "./servers/server-service.ts";
import { createCommands } from "./commands.ts";
import { prismaStatusRepository } from "./status/status-repository.ts";
import { createStatusService } from "./status/status-service.ts";

const QUEUE = "gateway-events";

const servers = createServerService(prismaServerRepository, () => new Date());
registerGuildEvents(servers);
registerMemberEvents(servers);
registerInteractionEvents(
  createCommands({
    status: createStatusService(prismaStatusRepository, () => new Date(), {
      startedAt: new Date(),
      memoryBytes: () => process.memoryUsage().rss,
    }),
  }),
);

await connectToRabbitMQ();

async function handleGatewayEvent(
  payload: DiscordGatewayPayload,
  shardId: number,
): Promise<void> {
  // If we don't have the event type we don't process it further
  const event = payload.t;
  if (!event) return;

  const results = await dispatchAndWait(() => {
    bot.events.raw?.(payload, shardId);
    bot.handlers[event](bot, payload, shardId);
  });

  for (const result of results) {
    if (result.status === "rejected") {
      logger.error(
        { err: result.reason, shardId, serverId: serverIdOf(payload), event },
        "Event handling failed",
      );
    }
  }
}

function serverIdOf({ t, d }: DiscordGatewayPayload): string | undefined {
  const data = d as { guild_id?: string; id?: string } | null;
  return data?.guild_id ?? (t?.startsWith("GUILD_") ? data?.id : undefined);
}

async function connectToRabbitMQ(): Promise<void> {
  const connection = await connectAmqp(env.RABBITMQ_URL).catch(
    (error: unknown) => {
      logger.error(
        { err: error },
        "Failed to connect to RabbitMQ, retrying in 1s.",
      );
      setTimeout(() => void connectToRabbitMQ(), 1000);
    },
  );

  if (!connection) return;

  // amqplib emits "close" after "error", so only "close" reconnects.
  connection.on("close", () => {
    setTimeout(() => void connectToRabbitMQ(), 1000);
  });
  connection.on("error", (error: unknown) => {
    logger.error(
      { err: error },
      "There was an error in the connection with RabbitMQ",
    );
  });

  const channel = await connection.createChannel().catch((error: unknown) => {
    logger.error(
      { err: error },
      "There was an error creating the RabbitMQ channel",
    );
  });

  if (!channel) return;

  const handleMessage = async (message: ConsumeMessage | null) => {
    if (!message) return;

    try {
      const messageBody = JSON.parse(
        message.content.toString(),
      ) as GatewayEvent;

      await handleGatewayEvent(messageBody.payload, messageBody.shardId);
    } catch (error) {
      logger.error(
        { err: error },
        "There was an error handling events received from RabbitMQ",
      );
    } finally {
      channel.ack(message);
    }
  };

  await channel.assertQueue(QUEUE, { durable: true });
  await channel.prefetch(100);
  await channel.consume(QUEUE, (message) => void handleMessage(message), {
    noAck: false,
  });
}

interface GatewayEvent {
  payload: DiscordGatewayPayload;
  shardId: number;
}
