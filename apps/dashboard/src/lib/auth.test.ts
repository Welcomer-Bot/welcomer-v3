import type { DiscordProfile } from "better-auth/social-providers";
import { expect, test } from "vitest";
import { discordUser } from "./auth";

test("R-PRV-2: a Discord profile is stored with a placeholder email, never its own", () => {
  const profile = {
    id: "81384788765712384",
    email: "alex@example.com",
  } as DiscordProfile;

  const user = discordUser(profile);

  expect(user).toEqual({
    email: "81384788765712384@discord.placeholder.invalid",
  });
});
