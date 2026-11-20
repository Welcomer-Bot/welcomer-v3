import { createRestManager } from "@discordeno/bot";
import { registerCommandsEnv } from "../env.ts";
import { commandDefinitions } from "./command-definitions.ts";

const env = registerCommandsEnv.parse(process.env);

const rest = createRestManager({
  token: env.DISCORD_TOKEN,
  applicationId: env.DISCORD_CLIENT_ID,
});

await rest.upsertGlobalApplicationCommands(commandDefinitions);

// We need to manually exit as the REST Manager has timeouts that will keep NodeJS alive
process.exit();
