import {
  effectiveState,
  overallState,
  parseServerId,
  ServerNotFound,
  shardOf,
  type ShardStatus,
} from "@repo/domain";

export interface StatusRepository {
  shards(): Promise<ShardStatus[]>;
  botStatus(): Promise<{ startedAt: Date; shardCount: number } | null>;
  serverExists(id: string): Promise<boolean>;
}

export const createStatusService = (repository: StatusRepository) => ({
  async getStatus(now: Date) {
    const [shards, botStatus] = await Promise.all([
      repository.shards(),
      repository.botStatus(),
    ]);
    return {
      overall: overallState(shards, now),
      totalServers: shards.reduce(
        (total, shard) => total + shard.serverCount,
        0,
      ),
      startedAt: botStatus?.startedAt ?? null,
      shards: shards.map((shard) => ({
        ...shard,
        state: effectiveState(shard, now),
      })),
    };
  },

  async findShard(input: string) {
    const id = parseServerId(input);
    const [exists, botStatus] = await Promise.all([
      repository.serverExists(id),
      repository.botStatus(),
    ]);
    if (!exists || !botStatus) throw new ServerNotFound(id);
    return shardOf(id, botStatus.shardCount);
  },
});
