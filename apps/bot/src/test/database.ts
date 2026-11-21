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

export const resetUsers = async () => {
  await prisma.user.deleteMany();
};

let userCount = 0;

export const aUserWithSessions = async ({
  createdAt,
  sessionsEndingAt,
}: {
  createdAt: Date;
  sessionsEndingAt: Date[];
}) => {
  const n = String(++userCount);
  return prisma.user.create({
    data: {
      id: `user-${n}`,
      name: `User ${n}`,
      email: `user-${n}@example.test`,
      createdAt,
      sessions: {
        create: sessionsEndingAt.map((expiresAt, i) => ({
          id: `session-${n}-${String(i)}`,
          token: `token-${n}-${String(i)}`,
          expiresAt,
        })),
      },
    },
    include: { sessions: true },
  });
};
