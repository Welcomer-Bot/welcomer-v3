import { prisma } from "@repo/database";
import type { StatusRepository } from "./status-service.ts";

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
    const { startedAt, shardCount } = await prisma.botStatus.findUniqueOrThrow({
      where: { id: 1 },
    });
    return { startedAt, shardCount };
  },
};
