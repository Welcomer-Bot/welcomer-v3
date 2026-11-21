import { describe, expect, it } from "vitest";
import { countServers } from "./servers.ts";

describe("server count per connection", () => {
  it("R-PUB-6: counts each server once after READY and its GUILD_CREATE", () => {
    const ready = countServers(new Set(["1"]), {
      type: "ready",
      ids: ["1", "2"],
    });

    const created = countServers(ready, { type: "create", id: "1" });

    expect(created.size).toBe(2);
  });

  it("R-PUB-6: an unavailable server stays counted; a removed one does not", () => {
    const ids = new Set(["1", "2"]);

    const unavailable = countServers(ids, {
      type: "delete",
      id: "1",
      unavailable: true,
    });
    const removed = countServers(unavailable, {
      type: "delete",
      id: "2",
      unavailable: false,
    });

    expect([...removed]).toEqual(["1"]);
  });
});
