import { describe, expect, it } from "vitest";
import { isManager, serverList } from "./access.ts";
import { aGuild } from "./testing.ts";

describe("server manager", () => {
  it("R-ACC-5: the owner manages the server", () => {
    const guild = aGuild({ owner: true });

    expect(isManager(guild)).toBe(true);
  });

  it("R-ACC-5: Manage Server or Administrator makes a manager", () => {
    const guilds = ["32", "8", "40"].map((permissions) =>
      aGuild({ permissions }),
    );

    expect(guilds.map(isManager)).toEqual([true, true, true]);
  });

  it("R-ACC-5: any other permission does not", () => {
    const guild = aGuild({ permissions: "2048" });

    expect(isManager(guild)).toBe(false);
  });
});

describe("server list", () => {
  it("R-ACC-10: servers with the bot first, each group in alphabetical order", () => {
    const guilds = [
      aGuild({ id: "1", name: "Zeta", owner: true }),
      aGuild({ id: "2", name: "Beta", owner: true }),
      aGuild({ id: "3", name: "alpha", owner: true }),
      aGuild({ id: "4", name: "Alpha", owner: true }),
    ];

    const list = serverList(guilds, new Set(["1", "3"]));

    expect(list.map(({ name, botPresent }) => [name, botPresent])).toEqual([
      ["alpha", true],
      ["Zeta", true],
      ["Alpha", false],
      ["Beta", false],
    ]);
  });
});
