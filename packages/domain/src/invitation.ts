// View channels, send messages, embed links and attach files (R-SRV-2).
const BOT_PERMISSIONS = "52224";

export const inviteUrl = (clientId: string, serverId?: string): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "bot applications.commands",
    permissions: BOT_PERMISSIONS,
  });
  if (serverId !== undefined) {
    params.set("guild_id", serverId);
    params.set("disable_guild_select", "true");
  }
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
};
