import { prisma } from "@repo/database";
import type { ServerRepository } from "./server-service.ts";

export const prismaServerRepository: ServerRepository = {
  async upsert(server, joinedAt) {
    const { id, name, memberCount, icon } = server;
    await prisma.server.upsert({
      where: { id },
      create: { id, name, memberCount, icon, botJoinedAt: joinedAt },
      update: { name, memberCount, icon },
    });
  },
  async update(id, { name, icon }) {
    await prisma.server.updateMany({ where: { id }, data: { name, icon } });
  },
  async addMembers(id, delta) {
    await prisma.server.updateMany({
      where: { id },
      data: { memberCount: { increment: delta } },
    });
  },
  async remove(id) {
    await prisma.server.deleteMany({ where: { id } });
  },
  async removeMissing(shard, presentIds, joinedBefore) {
    await prisma.$executeRaw`
      DELETE FROM "server"
      WHERE ("id"::bigint >> 22) % ${shard.count} = ${shard.id}
        AND NOT ("id" = ANY(${presentIds}))
        AND "bot_joined_at" < ${joinedBefore}`;
  },
};
