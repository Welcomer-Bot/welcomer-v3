import { prisma } from "@repo/database";
import type { ShardStatus } from "@repo/domain";

export const statusRepository = {
  async shards(): Promise<ShardStatus[]> {
    const rows = await prisma.shardStatus.findMany({
      orderBy: { shardId: "asc" },
    });
    return rows.map(
      ({ shardId, state, latencyMs, serverCount, updatedAt }) => ({
        shardId,
        state,
        latencyMs,
        serverCount,
        updatedAt,
      }),
    );
  },
  async botStatus(): Promise<{ startedAt: Date; shardCount: number } | null> {
    const row = await prisma.botStatus.findUnique({ where: { id: 1 } });
    return row && { startedAt: row.startedAt, shardCount: row.shardCount };
  },
  async serverExists(id: string): Promise<boolean> {
    return (await prisma.server.count({ where: { id } })) > 0;
  },
};
