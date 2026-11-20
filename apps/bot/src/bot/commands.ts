import type { bot } from "./bot.ts";

export type Interaction = typeof bot.transformers.$inferredTypes.interaction;

export interface Command {
  /** Function to run when the interaction is executed */
  run: (interaction: Interaction) => Promise<void>;
}

export const commands = new Map<string, Command>();
