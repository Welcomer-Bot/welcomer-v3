import type { bot } from "./bot.ts";
import type { CommandName } from "./command-definitions.ts";
import { help } from "./commands/help.ts";
import { status } from "./commands/status.ts";
import type { StatusService } from "./status/status-service.ts";

export type Interaction = typeof bot.transformers.$inferredTypes.interaction;

export interface Command {
  /** Function to run when the interaction is executed */
  run: (interaction: Interaction) => Promise<void>;
}

export const createCommands = (services: {
  status: StatusService;
}): Record<CommandName, Command> => ({
  help,
  status: status(services.status),
});
