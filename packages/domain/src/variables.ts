export const VARIABLES = [
  { name: "member.mention", replacedBy: "mention of the member" },
  { name: "member.username", replacedBy: "the member's username" },
  {
    name: "member.displayName",
    replacedBy:
      "the member's nickname on the server, otherwise their display name, otherwise their username. On departure Discord no longer gives the nickname, so it starts from the display name",
  },
  { name: "member.id", replacedBy: "the member's identifier" },
  { name: "member.avatar", replacedBy: "link to the member's avatar" },
  { name: "server.name", replacedBy: "the server's name" },
  { name: "server.id", replacedBy: "the server's identifier" },
  { name: "server.memberCount", replacedBy: "number of members" },
  {
    name: "server.memberCountFormatted",
    replacedBy: "number of members, thousands separated (1,234)",
  },
  {
    name: "channel.name",
    replacedBy: "name of the channel where the message is posted",
  },
  {
    name: "channel.id",
    replacedBy: "identifier of the channel where the message is posted",
  },
] as const;
