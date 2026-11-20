import type { Command } from "../commands.ts";
import type { StatusService } from "../status/status-service.ts";

const BYTES_PER_MB = 1024 * 1024;

export const status = (service: StatusService): Command => ({
  async run(interaction) {
    if (interaction.guildId === undefined) {
      await interaction.edit("Use /status in a server.");
      return;
    }

    const answer = await service.get(interaction.guildId.toString());

    await interaction.edit(
      [
        `Connected: ${answer.connected ? "yes" : "no"}`,
        `Response time: ${answer.averageLatencyMs === null ? "unknown" : `${String(answer.averageLatencyMs)} ms`}`,
        `Running since <t:${String(Math.floor(answer.runningSince.getTime() / 1000))}:R>`,
        `Memory: ${String(Math.round(answer.memoryBytes / BYTES_PER_MB))} MB`,
        `Discord connection: ${answer.shardId === null ? "not connected yet" : String(answer.shardId)}`,
      ].join("\n"),
    );
  },
});
