import { InteractionTypes } from "@discordeno/bot";
import { bot, logger } from "../../bot.ts";
import { commands } from "../../commands.ts";

bot.events.interactionCreate = async (interaction) => {
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
  const command = commands.get(commandName);

  if (!command) {
    log.warn("Missing command");
    await interaction.respond(
      "❌ Something went wrong. I was not able to find this command.",
    );

    return;
  }

  try {
    await command.run(interaction);

    log.info("Command succeeded");
  } catch (error) {
    log.error({ err: error }, "Command failed");
    await interaction.respond(
      "❌ Something went wrong. The command execution has thrown an error.",
    );
  }
};
