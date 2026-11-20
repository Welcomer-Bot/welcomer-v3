import type { Server } from "@repo/domain";

export interface ServerRepository {
  upsert(server: Server, joinedAt: Date): Promise<void>;
  update(id: string, changes: Pick<Server, "name" | "icon">): Promise<void>;
  addMembers(id: string, delta: 1 | -1): Promise<void>;
  remove(id: string): Promise<void>;
  removeMissing(
    shard: { id: number; count: number },
    presentIds: string[],
    joinedBefore: Date,
  ): Promise<void>;
}

export const createServerService = (
  repository: ServerRepository,
  clock: () => Date,
) => ({
  joined: (server: Server) => repository.upsert(server, clock()),
  updated: (id: string, changes: Pick<Server, "name" | "icon">) =>
    repository.update(id, changes),
  memberArrived: (id: string) => repository.addMembers(id, 1),
  memberLeft: (id: string) => repository.addMembers(id, -1),
  left: async (id: string, unavailable: boolean) => {
    if (!unavailable) await repository.remove(id);
  },
  shardReady: (shard: { id: number; count: number }, presentIds: string[]) => {
    // The consumer dispatches READY synchronously, so this clock reading precedes any later GUILD_CREATE.
    const readyAt = clock();
    return repository.removeMissing(shard, presentIds, readyAt);
  },
});

export type ServerService = ReturnType<typeof createServerService>;
