import {
  type CreateApplicationCommand,
  DiscordInteractionContextType,
} from "@discordeno/bot";

export const commandDefinitions = [
  {
    name: "help",
    description: "Learn how to set up Welcomer and which variables you can use",
    contexts: [DiscordInteractionContextType.Guild],
  },
  {
    name: "status",
    description:
      "See whether Welcomer is connected and which Discord connection serves this server",
    contexts: [DiscordInteractionContextType.Guild],
  },
] as const satisfies CreateApplicationCommand[];

export type CommandName = (typeof commandDefinitions)[number]["name"];
