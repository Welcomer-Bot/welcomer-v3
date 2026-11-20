import type { DiscordGatewayPayload } from "@discordeno/bot";
import { connect as connectAmqp, type ConsumeMessage } from "amqplib";
import { bot, env, logger } from "./bot.ts";
import "./events/interactions/create.ts";
import "./events/nodejs.ts";

await connectToRabbitMQ();

async function handleGatewayEvent(
  payload: DiscordGatewayPayload,
  shardId: number,
): Promise<void> {
  bot.events.raw?.(payload, shardId);

  // If we don't have the event type we don't process it further
  if (!payload.t) return;

  // Run the dispatch check
  await bot.events.dispatchRequirements?.(payload, shardId);

  bot.handlers[payload.t](bot, payload, shardId);
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

  connection.on("close", () => {
    setTimeout(() => void connectToRabbitMQ(), 1000);
  });
  connection.on("error", (error: unknown) => {
    logger.error(
      { err: error },
      "There was an error in the connection with RabbitMQ, reconnecting in 1s.",
    );
    setTimeout(() => void connectToRabbitMQ(), 1000);
  });

  const channel = await connection.createChannel().catch((error: unknown) => {
    logger.error(
      { err: error },
      "There was an error creating the RabbitMQ channel",
    );
  });

  if (!channel) return;

  const exchange = await channel
    .assertExchange("gatewayMessage", "x-message-deduplication", {
      durable: true,
      arguments: {
        "x-cache-size": 1000, // maximum number of entries
        "x-cache-ttl": 500, // 500ms
      },
    })
    .catch((error: unknown) => {
      logger.error({ err: error }, "There was an error asserting the exchange");
    });

  if (!exchange) return;

  const handleMessage = async (message: ConsumeMessage | null) => {
    if (!message) return;

    try {
      const messageBody = JSON.parse(
        message.content.toString(),
      ) as GatewayEvent;

      await handleGatewayEvent(messageBody.payload, messageBody.shardId);

      channel.ack(message);
    } catch (error) {
      logger.error(
        { err: error },
        "There was an error handling events received from RabbitMQ",
      );
    }
  };

  await channel.assertQueue("gatewayMessageQueue");
  await channel.bindQueue("gatewayMessageQueue", "gatewayMessage", "");
  await channel.consume(
    "gatewayMessageQueue",
    (message) => void handleMessage(message),
  );
}

interface GatewayEvent {
  payload: DiscordGatewayPayload;
  shardId: number;
}
