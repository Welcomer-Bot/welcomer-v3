import { join as joinPath } from "node:path";
import { Worker } from "node:worker_threads";
import gatewayManager, { env, intents, logger } from "../gatewayManager.ts";
import type {
  ManagerMessage,
  WorkerCreateData,
  WorkerMessage,
} from "./types.ts";

export function createWorker(workerId: number): Worker {
  const workerFilePath = joinPath(import.meta.dirname, "./worker.ts");

  const worker = new Worker(workerFilePath, {
    workerData: {
      connectionData: {
        intents,
        token: env.DISCORD_TOKEN,
        totalShards: gatewayManager.totalShards,
        url: gatewayManager.url,
        version: gatewayManager.version,
      },
      workerId,
      logLevel: env.LOG_LEVEL,
      rabbitMQUrl: env.RABBITMQ_URL,
    } satisfies WorkerCreateData,
  });

  worker.on(
    "message",
    (message: ManagerMessage) => void handleWorkerMessage(message),
  );

  async function handleWorkerMessage(message: ManagerMessage) {
    if (message.type === "RequestIdentify") {
      logger.info({ shardId: message.shardId }, "Requesting identify");
      await gatewayManager.requestIdentify(message.shardId);

      worker.postMessage({
        type: "AllowIdentify",
        shardId: message.shardId,
      } satisfies WorkerMessage);

      return;
    }
    if (message.type === "ShardIdentified") {
      logger.info({ shardId: message.shardId }, "Shard identified");
    }
  }

  return worker;
}
