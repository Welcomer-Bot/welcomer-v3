import { prisma } from "@repo/database";
import type { StatusRepository } from "./status-service";

export const prismaStatusRepository: StatusRepository = {
  async shards() {
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
  async botStatus() {
    const row = await prisma.botStatus.findUnique({ where: { id: 1 } });
    return row && { startedAt: row.startedAt, shardCount: row.shardCount };
  },
  async serverExists(id) {
    return (await prisma.server.count({ where: { id } })) > 0;
  },
};
