import { InvalidServerId } from "./errors.ts";

export type ShardState = "online" | "connecting" | "offline";

export type OverallState = "operational" | "partial-outage" | "major-outage";

export interface ShardStatus {
  shardId: number;
  state: ShardState;
  latencyMs: number | null;
  serverCount: number;
  updatedAt: Date;
}

export const SILENCE_LIMIT_MS = 60_000;

export const effectiveState = (shard: ShardStatus, now: Date): ShardState =>
  now.getTime() - shard.updatedAt.getTime() > SILENCE_LIMIT_MS
    ? "offline"
    : shard.state;

export const overallState = (
  shards: ShardStatus[],
  now: Date,
): OverallState => {
  const online = shards.filter(
    (shard) => effectiveState(shard, now) === "online",
  ).length;
  if (online === 0) return "major-outage";
  return online === shards.length ? "operational" : "partial-outage";
};

export const shardOf = (serverId: string, shardCount: number): number =>
  Number((BigInt(serverId) >> 22n) % BigInt(shardCount));

export const parseServerId = (input: string): string => {
  const id = input.trim();
  if (!/^\d{17,20}$/.test(id)) throw new InvalidServerId(id);
  return id;
};

export const averageLatency = (
  shards: ShardStatus[],
  now: Date,
): number | null => {
  const latencies = shards
    .filter((shard) => effectiveState(shard, now) === "online")
    .flatMap((shard) => (shard.latencyMs === null ? [] : [shard.latencyMs]));
  if (latencies.length === 0) return null;
  return Math.round(
    latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length,
  );
};
