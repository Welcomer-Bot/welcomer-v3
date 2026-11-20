import { InteractionTypes } from "@discordeno/bot";
import { bot, logger } from "../../bot.ts";
import type { CommandName } from "../../command-definitions.ts";
import type { Command, Interaction } from "../../commands.ts";
import { track } from "../../dispatch.ts";

export const registerInteractionEvents = (
  commands: Record<CommandName, Command>,
) => {
  const byName = new Map<string, Command>(Object.entries(commands));

  bot.events.interactionCreate = (interaction) => track(reply(interaction));

  async function reply(interaction: Interaction) {
    if (
      !interaction.data ||
      interaction.type !== InteractionTypes.ApplicationCommand
    )
      return;

    const commandName = interaction.data.name;
    const log = logger.child({
      serverId: interaction.guildId?.toString(),
      command: commandName,
    });
    const command = byName.get(commandName);

    await interaction.defer(true);

    try {
      if (!command) throw new Error("Unknown command");
      await command.run(interaction);
    } catch (error) {
      log.error({ err: error }, "Command failed");
      await interaction.edit("Something went wrong. Please try again later.");
    }
  }
};
