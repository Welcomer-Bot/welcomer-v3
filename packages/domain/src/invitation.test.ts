import { describe, expect, it } from "vitest";
import { inviteUrl } from "./invitation.ts";

const CLIENT_ID = "1300000000000000000";

describe("invitation link", () => {
  it("R-SRV-2: asks only for view channels, send messages, embed links and attach files", () => {
    const params = new URL(inviteUrl(CLIENT_ID)).searchParams;

    expect([
      params.get("client_id"),
      params.get("permissions"),
      params.get("scope"),
    ]).toEqual([CLIENT_ID, "52224", "bot applications.commands"]);
  });

  it("R-SRV-1: from the dashboard, preselects the chosen server", () => {
    const chosen = new URL(inviteUrl(CLIENT_ID, "81384788765712384"))
      .searchParams;
    const any = new URL(inviteUrl(CLIENT_ID)).searchParams;

    expect([
      chosen.get("guild_id"),
      chosen.get("disable_guild_select"),
      any.has("guild_id"),
      any.has("disable_guild_select"),
    ]).toEqual(["81384788765712384", "true", false, false]);
  });
});
