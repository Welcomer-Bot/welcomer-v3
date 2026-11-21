import type { UserGuild } from "./access.ts";

export const aGuild = (overrides: Partial<UserGuild> = {}): UserGuild => ({
  id: "81384788765712384",
  name: "Test server",
  icon: null,
  owner: false,
  permissions: "0",
  ...overrides,
});
