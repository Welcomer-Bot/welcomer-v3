import assert from "node:assert";
import { workerData as _workerData, parentPort } from "node:worker_threads";
import {
  DiscordenoShard,
  type DiscordGatewayPayload,
  type DiscordReady,
  type DiscordUnavailableGuild,
  ShardSocketCloseCodes,
  ShardState,
} from "@discordeno/bot";
import { countServers, type ShardState as StatusState } from "@repo/domain";
import { type Channel as amqpChannel, connect as connectAmqp } from "amqplib";
import { createLogger } from "../../logger.ts";
import type {
  ManagerMessage,
  WorkerCreateData,
  WorkerMessage,
} from "./types.ts";

assert(parentPort);

const workerData = _workerData as WorkerCreateData;

const logger = createLogger("gateway", workerData.logLevel).child({
  workerId: workerData.workerId,
});

const identifyPromises = new Map<number, () => void>();
const shards = new Map<number, DiscordenoShard>();
const pendingShards = new Map<number, DiscordenoShard>();

let totalShards = workerData.connectionData.totalShards;

const QUEUE = "gateway-events";
const QUEUED_EVENTS = new Set<string>([
  "READY",
  "GUILD_CREATE",
  "GUILD_UPDATE",
  "GUILD_DELETE",
  "GUILD_MEMBER_ADD",
  "GUILD_MEMBER_REMOVE",
  "INTERACTION_CREATE",
]);

const STATUS_INTERVAL_MS = 30_000;

let rabbitMQChannel: amqpChannel | undefined;
const serverIds = new Map<DiscordenoShard, Set<string>>();

await connectToRabbitMQ();

setInterval(() => {
  parentPort?.postMessage({
    type: "ShardStatuses",
    statuses: Array.from(shards.values(), (shard) => ({
      shardId: shard.id,
      state: statusState(shard.state),
      latencyMs: shard.heart.rtt ?? null,
      serverCount: serverIds.get(shard)?.size ?? 0,
    })),
  } satisfies ManagerMessage);
}, STATUS_INTERVAL_MS);

parentPort.on(
  "message",
  (message: WorkerMessage) => void handleManagerMessage(message),
);

async function handleManagerMessage(message: WorkerMessage) {
  assert(parentPort);

  if (message.type === "IdentifyShard") {
    logger.info({ shardId: message.shardId }, "Starting to identify shard");
    const shard = shards.get(message.shardId) ?? createShard(message.shardId);
    shards.set(message.shardId, shard);

    await shard.identify();

    parentPort.postMessage({
      type: "ShardIdentified",
      shardId: message.shardId,
    } satisfies ManagerMessage);

    return;
  }
  if (message.type === "PrepareShard") {
    logger.info({ shardId: message.shardId }, "Preparing shard");
    totalShards = message.totalShards;
    let shard = pendingShards.get(message.shardId);
    if (!shard) {
      shard = createShard(message.shardId);
      pendingShards.set(message.shardId, shard);
    }

    // Pending shards only count their servers until the switch.
    shard.events.message = countServerEvent;

    await shard.identify();

    parentPort.postMessage({
      type: "ShardPrepared",
      shardId: message.shardId,
    } satisfies ManagerMessage);

    return;
  }
  if (message.type === "SwitchShards") {
    logger.info("Switching shards");

    // Change the message event for all shards
    for (const shard of pendingShards.values()) {
      shard.events.message = handleShardMessageEvent;
    }

    // Old shards stop processing events
    for (const shard of shards.values()) {
      const oldHandler = shard.events.message;

      shard.events.message = function (_, message) {
        // Member checks need to continue but others can stop
        if (message.t === "GUILD_MEMBERS_CHUNK") {
          oldHandler?.(shard, message);
        }
      };
    }

    // Shutdown the old shards
    const shardsToShutdown = Array.from(shards.values());

    // Move the pending shards to the active shards
    shards.clear();
    for (const [shardId, shard] of pendingShards.entries()) {
      shards.set(shardId, shard);
      pendingShards.delete(shardId);
    }

    // Shutdown the old shards
    const promises = shardsToShutdown.map(async (shard) => {
      await shard.close(
        ShardSocketCloseCodes.Resharded,
        "Shard is being resharded",
      );
      serverIds.delete(shard);
      logger.info({ shardId: shard.id }, "Shard has been shutdown");
    });

    await Promise.all(promises);

    return;
  }
  identifyPromises.get(message.shardId)?.();
  identifyPromises.delete(message.shardId);
}

function createShard(shardId: number): DiscordenoShard {
  const shard = new DiscordenoShard({
    id: shardId,
    events: {},
    connection: {
      compress: false,
      intents: workerData.connectionData.intents,
      properties: {
        os: process.platform,
        browser: "Discordeno",
        device: "Discordeno",
      },
      token: workerData.connectionData.token,
      totalShards: totalShards,
      url: workerData.connectionData.url,
      version: workerData.connectionData.version,
      transportCompression: null,
    },
  });

  shard.requestIdentify = async () => {
    assert(parentPort);

    const { promise, resolve } = Promise.withResolvers<undefined>();

    parentPort.postMessage({
      type: "RequestIdentify",
      shardId,
    } satisfies ManagerMessage);

    identifyPromises.set(shardId, () => {
      resolve(undefined);
    });

    await promise;
  };

  shard.events.message = handleShardMessageEvent;

  return shard;
}

function statusState(state: ShardState): StatusState {
  switch (state) {
    case ShardState.Connected:
      return "online";
    case ShardState.Connecting:
    case ShardState.Unidentified:
    case ShardState.Identifying:
    case ShardState.Resuming:
      return "connecting";
    case ShardState.Disconnected:
    case ShardState.Offline:
      return "offline";
  }
}

function countServerEvent(
  shard: DiscordenoShard,
  payload: DiscordGatewayPayload,
) {
  const ids = serverIds.get(shard) ?? new Set<string>();
  if (payload.t === "READY") {
    const { guilds } = payload.d as DiscordReady;
    serverIds.set(
      shard,
      countServers(ids, {
        type: "ready",
        ids: guilds.map((guild) => guild.id),
      }),
    );
  } else if (payload.t === "GUILD_CREATE") {
    const { id } = payload.d as DiscordUnavailableGuild;
    serverIds.set(shard, countServers(ids, { type: "create", id }));
  } else if (payload.t === "GUILD_DELETE") {
    const { id, unavailable } = payload.d as DiscordUnavailableGuild;
    serverIds.set(
      shard,
      countServers(ids, {
        type: "delete",
        id,
        unavailable: unavailable ?? false,
      }),
    );
  }
}

function handleShardMessageEvent(
  shard: DiscordenoShard,
  payload: DiscordGatewayPayload,
) {
  countServerEvent(shard, payload);

  if (!payload.t || !QUEUED_EVENTS.has(payload.t)) return;

  if (!rabbitMQChannel) {
    logger.error(
      "The RabbitMQ channel has not been created. The event will be lost",
    );
    return;
  }

  const body = JSON.stringify({ payload, shardId: shard.id });

  rabbitMQChannel.sendToQueue(QUEUE, Buffer.from(body), {
    persistent: true,
    contentType: "application/json",
  });
}

async function connectToRabbitMQ(): Promise<void> {
  rabbitMQChannel = undefined;

  const connection = await connectAmqp(workerData.rabbitMQUrl).catch(
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
    rabbitMQChannel = undefined;
    setTimeout(() => void connectToRabbitMQ(), 1000);
  });
  connection.on("error", (error) => {
    logger.error(
      { err: error },
      "There was an error in the connection with RabbitMQ",
    );
  });

  // Any channel failure closes the connection, so its "close" handler reconnects.
  const closeConnection = () =>
    connection.close().catch((error: unknown) => {
      logger.debug(
        { err: error },
        "The RabbitMQ connection was already closed",
      );
    });

  try {
    const channel = await connection.createChannel();
    channel.on("error", (error: unknown) => {
      logger.error(
        { err: error },
        "There was an error in the RabbitMQ channel",
      );
    });
    channel.on("close", () => {
      rabbitMQChannel = undefined;
      void closeConnection();
    });

    await channel.assertQueue(QUEUE, { durable: true });

    rabbitMQChannel = channel;
  } catch (error) {
    logger.error({ err: error }, "Failed to set up the RabbitMQ channel");
    await closeConnection();
  }
}
