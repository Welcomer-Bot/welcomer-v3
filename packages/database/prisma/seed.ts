import { prisma } from "../src/client.ts";

const seededAt = new Date("2026-01-01T00:00:00Z");

async function main() {
  await prisma.server.upsert({
    where: { id: "81384788765712384" },
    update: {},
    create: {
      id: "81384788765712384",
      name: "Welcomer test server",
      memberCount: 42,
      icon: null,
      botJoinedAt: seededAt,
    },
  });
  await prisma.botStatus.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, startedAt: seededAt, shardCount: 2 },
  });
  for (const shard of [
    { shardId: 0, latencyMs: 40, serverCount: 1 },
    { shardId: 1, latencyMs: 60, serverCount: 0 },
  ]) {
    await prisma.shardStatus.upsert({
      where: { shardId: shard.shardId },
      update: {},
      create: { ...shard, state: "online", updatedAt: seededAt },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
