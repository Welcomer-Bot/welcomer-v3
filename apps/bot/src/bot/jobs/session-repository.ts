import { prisma } from "@repo/database";
import type { SessionRepository } from "./session-service.ts";

export const prismaSessionRepository: SessionRepository = {
  async deleteEndedSessions(now) {
    await prisma.session.deleteMany({ where: { expiresAt: { lte: now } } });
  },
  async deleteUsersWithoutSession(createdBefore) {
    await prisma.user.deleteMany({
      where: { sessions: { none: {} }, createdAt: { lt: createdBefore } },
    });
  },
};
