import { createServer } from "node:http";

const guild = (
  id: string,
  name: string,
  permissions: string,
  owner = false,
) => ({
  id,
  name,
  icon: null,
  owner,
  permissions,
});

const GUILDS_BY_TOKEN: Record<string, unknown[]> = {
  "Bearer manager": [
    guild("81384788765712384", "Welcomer test server", "0", true),
    guild("222078108977594368", "Beta absent", "32"),
    guild("222078108985982976", "Alpha absent", "8"),
    guild("222078108994371584", "Not managed", "2048"),
  ],
  "Bearer none": [guild("222078108981788672", "Member only", "0")],
};

createServer((request, response) => {
  const token = request.headers.authorization ?? "";
  if (request.method !== "GET" || request.url !== "/users/@me/guilds") {
    response.writeHead(404).end();
  } else if (token === "Bearer revoked") {
    response.writeHead(401).end();
  } else if (token in GUILDS_BY_TOKEN) {
    response
      .writeHead(200, { "content-type": "application/json" })
      .end(JSON.stringify(GUILDS_BY_TOKEN[token]));
  } else {
    response.writeHead(404).end();
  }
}).listen(3001);
