import {
  averageLatency,
  effectiveState,
  shardOf,
  type ShardStatus,
} from "@repo/domain";

export interface StatusRepository {
  shards(): Promise<ShardStatus[]>;
  botStatus(): Promise<{ startedAt: Date; shardCount: number } | null>;
}

export interface Runtime {
  startedAt: Date;
  memoryBytes(): number;
}

export const createStatusService = (
  repository: StatusRepository,
  clock: () => Date,
  runtime: Runtime,
) => ({
  async get(serverId: string) {
    const [shards, botStatus] = await Promise.all([
      repository.shards(),
      repository.botStatus(),
    ]);
    const now = clock();
    const shardId = botStatus && shardOf(serverId, botStatus.shardCount);
    const shard = shards.find((candidate) => candidate.shardId === shardId);
    return {
      connected: shard !== undefined && effectiveState(shard, now) === "online",
      averageLatencyMs: averageLatency(shards, now),
      runningSince: runtime.startedAt,
      memoryBytes: runtime.memoryBytes(),
      shardId,
    };
  },
});

export type StatusService = ReturnType<typeof createStatusService>;
