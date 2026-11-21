import { NoAccess, type UserGuild } from "@repo/domain";
import { aGuild } from "@repo/domain/testing";
import { describe, expect, it } from "vitest";
import { createAccessService } from "./access-service";

const USER_ID = "user-1";
const PRESENT_ID = "81384788765712384";

const serviceWith = (guilds: UserGuild[]) =>
  createAccessService(
    { list: () => Promise.resolve(guilds) },
    {
      presentIds: (ids) =>
        Promise.resolve(new Set(ids.filter((id) => id === PRESENT_ID))),
    },
  );

describe("opening a server", () => {
  it("R-ACC-8: a server without the bot cannot be opened", async () => {
    const absent = aGuild({ id: "222078108985982976", owner: true });

    const opening = serviceWith([absent]).requireServer(USER_ID, absent.id);

    await expect(opening).rejects.toThrow(NoAccess);
  });

  it("R-ACC-9: a server the user does not manage cannot be opened", async () => {
    const service = serviceWith([aGuild({ id: PRESENT_ID })]);

    const notManaged = service.requireServer(USER_ID, PRESENT_ID);
    const unknown = service.requireServer(USER_ID, "222078108994371584");

    await expect(notManaged).rejects.toThrow(NoAccess);
    await expect(unknown).rejects.toThrow(NoAccess);
  });
});
