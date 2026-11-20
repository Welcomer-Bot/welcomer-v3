import { prisma } from "@repo/database";
import { beforeEach, describe, expect, it } from "vitest";
import { aServer, resetServers } from "../../test/database.ts";
import { prismaServerRepository } from "./server-repository.ts";
import { createServerService } from "./server-service.ts";

const T1 = new Date("2026-11-20T10:00:00Z");
const T2 = new Date("2026-11-20T11:00:00Z");
const T3 = new Date("2026-11-20T12:00:00Z");

const serviceAt = (now: Date) =>
  createServerService(prismaServerRepository, () => now);
const findServer = (id: string) => prisma.server.findUnique({ where: { id } });

beforeEach(resetServers);

describe("servers", () => {
  it("R-SRV-3: records a server the bot joins", async () => {
    const server = aServer();

    await serviceAt(T1).joined(server);

    expect(await findServer(server.id)).toEqual({
      id: server.id,
      name: server.name,
      memberCount: server.memberCount,
      icon: server.icon,
      botJoinedAt: T1,
    });
  });

  it("R-SRV-3: a known server is updated, never reset", async () => {
    await serviceAt(T1).joined(aServer());

    await serviceAt(T2).joined(aServer({ name: "Renamed", memberCount: 20 }));

    expect(await findServer(aServer().id)).toMatchObject({
      name: "Renamed",
      memberCount: 20,
      botJoinedAt: T1,
    });
  });

  it("R-SRV-4: an arrival adds one member and a departure removes one", async () => {
    const service = serviceAt(T1);
    await service.joined(aServer({ memberCount: 10 }));

    await service.memberArrived(aServer().id);
    const afterArrival = await findServer(aServer().id);
    await service.memberLeft(aServer().id);
    const afterDeparture = await findServer(aServer().id);

    expect([afterArrival?.memberCount, afterDeparture?.memberCount]).toEqual([
      11, 10,
    ]);
  });

  it("R-SRV-5: leaving deletes the server; an unavailable server is kept", async () => {
    const service = serviceAt(T1);
    const kept = aServer({ id: "222078108985982976" });
    const left = aServer({ id: "222078108994371584" });
    await service.joined(kept);
    await service.joined(left);

    await service.left(kept.id, true);
    await service.left(left.id, false);

    expect([await findServer(kept.id), await findServer(left.id)]).toEqual([
      expect.objectContaining({ id: kept.id }),
      null,
    ]);
  });

  it("R-SRV-5: after READY, deletes the servers of that connection missing from it", async () => {
    const a = aServer({ id: "222078108977594368" });
    const b = aServer({ id: "222078108985982976" });
    const c = aServer({ id: "222078108981788672" });
    const d = aServer({ id: "222078108994371584" });
    for (const server of [a, b, c]) await serviceAt(T1).joined(server);
    await serviceAt(T3).joined(d);

    await serviceAt(T2).shardReady({ id: 0, count: 2 }, [b.id]);

    const remaining = await prisma.server.findMany({
      orderBy: { id: "asc" },
      select: { id: true },
    });
    expect(remaining.map(({ id }) => id)).toEqual([b.id, c.id, d.id].sort());
  });
});
