import {
  effectiveState,
  overallState,
  parseServerId,
  ServerNotFound,
  shardOf,
} from "@repo/domain";
import { statusRepository } from "./status-repository";

export async function getStatus(now: Date) {
  const [shards, botStatus] = await Promise.all([
    statusRepository.shards(),
    statusRepository.botStatus(),
  ]);
  return {
    overall: overallState(shards, now),
    totalServers: shards.reduce((total, shard) => total + shard.serverCount, 0),
    startedAt: botStatus?.startedAt ?? null,
    shards: shards.map((shard) => ({
      ...shard,
      state: effectiveState(shard, now),
    })),
  };
}

export async function findShard(input: string) {
  const id = parseServerId(input);
  const [exists, botStatus] = await Promise.all([
    statusRepository.serverExists(id),
    statusRepository.botStatus(),
  ]);
  if (!exists || !botStatus) throw new ServerNotFound(id);
  return shardOf(id, botStatus.shardCount);
}
