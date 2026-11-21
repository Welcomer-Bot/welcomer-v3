import { prisma } from "@repo/database";
import type { PresentServers } from "./access-service";

export const prismaPresentServers: PresentServers = {
  async presentIds(ids) {
    const rows = await prisma.server.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return new Set(rows.map(({ id }) => id));
  },
};
