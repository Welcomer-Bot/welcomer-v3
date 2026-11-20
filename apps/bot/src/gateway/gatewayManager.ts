import type { Worker } from "node:worker_threads";
import {
  createGatewayManager,
  createRestManager,
  Intents,
} from "@discordeno/bot";
import { gatewayEnv } from "../env.ts";
import { createLogger } from "../logger.ts";
import { createWorker } from "./worker/createWorker.ts";
import type { ManagerMessage, WorkerMessage } from "./worker/types.ts";

const SHARDS_PER_WORKER = 16;
const TOTAL_WORKERS = 4;

export const env = gatewayEnv.parse(process.env);
export const intents = Intents.Guilds | Intents.GuildMembers;
export const workers = new Map<number, Worker>();
export const logger = createLogger("gateway", env.LOG_LEVEL);

const restManager = createRestManager({
  token: env.DISCORD_TOKEN,
  proxy: {
    baseUrl: env.REST_PROXY_URL,
    authorization: env.REST_PROXY_SECRET,
  },
});

const gatewayBotConfig = await restManager.getGatewayBot();

const gatewayManager = createGatewayManager({
  token: env.DISCORD_TOKEN,
  intents,
  connection: gatewayBotConfig,
  shardsPerWorker: SHARDS_PER_WORKER,
  totalWorkers: TOTAL_WORKERS,
  resharding: {
    enabled: true,
    checkInterval: 28800000,
    shardsFullPercentage: 80,
    getSessionInfo: restManager.getGatewayBot,
  },
});

gatewayManager.resharding.tellWorkerToPrepare = async (
  workerId,
  shardId,
  bucketId,
) => {
  logger.info({ workerId, shardId, bucketId }, "Tell worker to prepare");

  let worker = workers.get(workerId);
  if (!worker) {
    worker = createWorker(workerId);
    workers.set(workerId, worker);
  }

  worker.postMessage({
    type: "PrepareShard",
    shardId,
    totalShards: gatewayManager.totalShards,
  } satisfies WorkerMessage);

  const { promise, resolve } = Promise.withResolvers<undefined>();

  const waitForShardPrepared = (message: ManagerMessage) => {
    if (message.type === "ShardPrepared" && message.shardId === shardId) {
      resolve(undefined);
    }
  };

  worker.on("message", waitForShardPrepared);

  await promise;

  worker.off("message", waitForShardPrepared);
};

gatewayManager.resharding.onReshardingSwitch = () => {
  logger.info(
    "Resharding switch triggered, telling workers to switch the shards",
  );

  for (const worker of workers.values()) {
    worker.postMessage({
      type: "SwitchShards",
    } satisfies WorkerMessage);
  }

  return Promise.resolve();
};

gatewayManager.tellWorkerToIdentify = async (workerId, shardId, bucketId) => {
  logger.info({ workerId, shardId, bucketId }, "Tell worker to identify");

  const worker = workers.get(workerId) ?? createWorker(workerId);
  workers.set(workerId, worker);

  worker.postMessage({
    type: "IdentifyShard",
    shardId,
  } satisfies WorkerMessage);

  const { promise, resolve } = Promise.withResolvers<undefined>();

  const waitForShardIdentified = (message: ManagerMessage) => {
    if (message.type === "ShardIdentified" && message.shardId === shardId) {
      resolve(undefined);
    }
  };

  worker.on("message", waitForShardIdentified);

  await promise;

  worker.off("message", waitForShardIdentified);
};

export default gatewayManager;
