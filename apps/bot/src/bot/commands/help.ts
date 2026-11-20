import { VARIABLES } from "@repo/domain";
import { env } from "../bot.ts";
import type { Command } from "../commands.ts";

const setup = [
  "1. Open the dashboard and sign in with Discord.",
  "2. Pick this server.",
  "3. Create a welcome or goodbye configuration: channel, text, embeds.",
  "4. Validate it, then activate it.",
  "5. Type `/test` to see it.",
].join("\n");

const variables = VARIABLES.map(
  ({ name, replacedBy }) => `\`{{${name}}}\` — ${replacedBy}`,
).join("\n");

export const help: Command = {
  async run(interaction) {
    await interaction.edit({
      embeds: [
        {
          title: "Welcomer help",
          fields: [
            { name: "Setup", value: setup },
            { name: "Variables", value: variables },
            {
              name: "Links",
              value: `[Dashboard](${env.DASHBOARD_URL}) · [Support server](${env.SUPPORT_SERVER_URL})`,
            },
          ],
        },
      ],
    });
  },
};
