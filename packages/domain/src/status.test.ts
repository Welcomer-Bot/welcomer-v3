import { describe, expect, it } from "vitest";
import {
  averageLatency,
  effectiveState,
  overallState,
  parseServerId,
  shardOf,
  type ShardStatus,
} from "./status.ts";
import { InvalidServerId } from "./errors.ts";

const now = new Date("2026-11-20T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

const aShard = (overrides: Partial<ShardStatus> = {}): ShardStatus => ({
  shardId: 0,
  state: "online",
  latencyMs: 40,
  serverCount: 1,
  updatedAt: now,
  ...overrides,
});

describe("connection state", () => {
  it("R-PUB-7: a connection silent for exactly 1 minute is still shown with its state", () => {
    const shard = aShard({ updatedAt: ago(60_000) });

    const state = effectiveState(shard, now);

    expect(state).toBe("online");
  });

  it("R-PUB-7: a connection silent for more than 1 minute is shown offline", () => {
    const online = aShard({ updatedAt: ago(60_001) });
    const connecting = aShard({ state: "connecting", updatedAt: ago(60_001) });

    const states = [
      effectiveState(online, now),
      effectiveState(connecting, now),
    ];

    expect(states).toEqual(["offline", "offline"]);
  });
});

describe("overall state", () => {
  it("R-PUB-5: every connection online is Operational", () => {
    const shards = [aShard({ shardId: 0 }), aShard({ shardId: 1 })];

    const overall = overallState(shards, now);

    expect(overall).toBe("operational");
  });

  it("R-PUB-5: one connection offline or connecting is Partial outage", () => {
    const shards = [0, 1, 2, 3].map((shardId) =>
      aShard({ shardId, updatedAt: shardId === 2 ? ago(120_000) : now }),
    );
    const connecting = [
      aShard({ shardId: 0 }),
      aShard({ shardId: 1, state: "connecting" }),
    ];

    const overall = [overallState(shards, now), overallState(connecting, now)];

    expect(overall).toEqual(["partial-outage", "partial-outage"]);
  });

  it("R-PUB-5: no connection online is Major outage", () => {
    const silent = [
      aShard({ updatedAt: ago(120_000) }),
      aShard({ shardId: 1, state: "offline" }),
    ];

    const overall = [overallState(silent, now), overallState([], now)];

    expect(overall).toEqual(["major-outage", "major-outage"]);
  });
});

describe("server lookup", () => {
  it("R-PUB-8: finds the connection of a server with Discord's formula", () => {
    const shards = [
      shardOf("81384788765712384", 16),
      shardOf("81384788765712384", 1),
    ];

    expect(shards).toEqual([2, 0]);
  });

  it("R-PUB-8: accepts an identifier of 17 to 20 digits only", () => {
    const refused = ["1".repeat(16), "1".repeat(21), "8138478876571238a"];

    const accepted = [
      parseServerId(" 81384788765712384 "),
      parseServerId("1".repeat(20)),
    ];

    expect(accepted).toEqual(["81384788765712384", "1".repeat(20)]);
    for (const input of refused)
      expect(() => parseServerId(input)).toThrow(InvalidServerId);
  });
});

describe("response time", () => {
  it("R-CMD-2: response time is the average of the online connections", () => {
    const shards = [
      aShard({ shardId: 0, latencyMs: 40 }),
      aShard({ shardId: 1, latencyMs: 60 }),
      aShard({ shardId: 2, latencyMs: 500, state: "offline" }),
    ];

    const averages = [
      averageLatency(shards, now),
      averageLatency([shards[2] ?? aShard()], now),
    ];

    expect(averages).toEqual([50, null]);
  });
});
