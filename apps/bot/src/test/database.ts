import { prisma } from "@repo/database";
import type { Server } from "@repo/domain";

export const aServer = (overrides: Partial<Server> = {}): Server => ({
  id: "222078108977594368",
  name: "Test server",
  memberCount: 10,
  icon: "a1b2c3",
  ...overrides,
});

export const resetServers = async () => {
  await prisma.server.deleteMany();
};
