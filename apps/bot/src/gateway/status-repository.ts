import { prisma } from "@repo/database";
import type { ShardStatus } from "@repo/domain";

const dropShardsFrom = (shardCount: number) =>
  prisma.shardStatus.deleteMany({ where: { shardId: { gte: shardCount } } });

export const prismaStatusRepository = {
  async start(startedAt: Date, shardCount: number) {
    await prisma.$transaction([
      prisma.botStatus.upsert({
        where: { id: 1 },
        create: { id: 1, startedAt, shardCount },
        update: { startedAt, shardCount },
      }),
      dropShardsFrom(shardCount),
    ]);
  },
  async setShardCount(shardCount: number) {
    await prisma.$transaction([
      prisma.botStatus.update({ where: { id: 1 }, data: { shardCount } }),
      dropShardsFrom(shardCount),
    ]);
  },
  async save(statuses: Omit<ShardStatus, "updatedAt">[], updatedAt: Date) {
    await prisma.$transaction(
      statuses.map((status) =>
        prisma.shardStatus.upsert({
          where: { shardId: status.shardId },
          create: { ...status, updatedAt },
          update: { ...status, updatedAt },
        }),
      ),
    );
  },
};
