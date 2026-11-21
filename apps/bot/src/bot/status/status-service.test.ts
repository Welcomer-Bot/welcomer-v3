import type { ShardStatus } from "@repo/domain";
import { describe, expect, it } from "vitest";
import {
  createStatusService,
  type StatusRepository,
} from "./status-service.ts";

const now = new Date("2026-11-20T12:00:00Z");
const twoMinutesAgo = new Date(now.getTime() - 120_000);
const startedAt = new Date("2026-11-20T08:00:00Z");
const serverOnConnection0 = "81384788765712384";

const aShard = (overrides: Partial<ShardStatus> = {}): ShardStatus => ({
  shardId: 0,
  state: "online",
  latencyMs: 40,
  serverCount: 1,
  updatedAt: now,
  ...overrides,
});

const serviceWith = (
  shards: ShardStatus[],
  botStatus: Awaited<ReturnType<StatusRepository["botStatus"]>> = {
    startedAt,
    shardCount: 2,
  },
) => {
  const repository: StatusRepository = {
    shards: () => Promise.resolve(shards),
    botStatus: () => Promise.resolve(botStatus),
  };
  return createStatusService(repository, () => now, {
    startedAt,
    memoryBytes: () => 64 * 1024 * 1024,
  });
};

describe("/status", () => {
  it("R-CMD-2: connected only when the connection serving this server is online", async () => {
    const fresh = serviceWith([
      aShard({ shardId: 0 }),
      aShard({ shardId: 1, updatedAt: twoMinutesAgo }),
    ]);
    const silent = serviceWith([
      aShard({ shardId: 0, updatedAt: twoMinutesAgo }),
      aShard({ shardId: 1 }),
    ]);

    const answers = [
      await fresh.get(serverOnConnection0),
      await silent.get(serverOnConnection0),
    ];

    expect(
      answers.map(({ connected, shardId }) => ({ connected, shardId })),
    ).toEqual([
      { connected: true, shardId: 0 },
      { connected: false, shardId: 0 },
    ]);
  });

  it("R-CMD-2: not connected, with no connection, before the gateway has ever run", async () => {
    const neverStarted = serviceWith([], null);

    const answer = await neverStarted.get(serverOnConnection0);

    expect(answer).toMatchObject({
      connected: false,
      averageLatencyMs: null,
      shardId: null,
    });
  });
});
