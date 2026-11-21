import { prisma } from "@repo/database";
import { beforeEach, describe, expect, it } from "vitest";
import { aUserWithSessions, resetUsers } from "../../test/database.ts";
import { prismaSessionRepository } from "./session-repository.ts";
import { createSessionJob } from "./session-service.ts";

const NOW = new Date("2026-03-08T00:05:00Z");
const ENDED = new Date("2026-03-08T00:00:00Z");
const LIVE = new Date("2026-03-15T00:00:00Z");
const A_DAY_BEFORE = new Date(NOW.getTime() - 24 * 3_600_000);
const SECONDS_BEFORE = new Date(NOW.getTime() - 30_000);

beforeEach(resetUsers);

describe("sessions", () => {
  it("R-PRV-3: deletes ended sessions, then the accounts left without a session", async () => {
    const alex = await aUserWithSessions({
      createdAt: A_DAY_BEFORE,
      sessionsEndingAt: [ENDED],
    });
    const sam = await aUserWithSessions({
      createdAt: A_DAY_BEFORE,
      sessionsEndingAt: [ENDED, LIVE],
    });
    const kim = await aUserWithSessions({
      createdAt: A_DAY_BEFORE,
      sessionsEndingAt: [LIVE],
    });
    const lee = await aUserWithSessions({
      createdAt: SECONDS_BEFORE,
      sessionsEndingAt: [],
    });

    await createSessionJob(prismaSessionRepository, () => NOW)();

    const users = await prisma.user.findMany({ include: { sessions: true } });
    expect(users.map((u) => [u.id, u.sessions.length]).sort()).toEqual(
      [
        [sam.id, 1],
        [kim.id, 1],
        [lee.id, 0],
      ].sort(),
    );
    expect(await prisma.session.count({ where: { userId: alex.id } })).toBe(0);
  });
});
