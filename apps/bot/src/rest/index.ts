import type { RequestMethods } from "@discordeno/bot";
import { buildFastifyApp, parseMultiformBody } from "./fastify.ts";
import restManager, { logger } from "./restManager.ts";

const app = buildFastifyApp();

app.get("/timecheck", async (_req, res) => {
  res.status(200).send({ message: Date.now() });
});

app.all("/*", async (req, res) => {
  let url = req.originalUrl;

  if (url.startsWith("/v")) {
    url = url.slice(url.indexOf("/", 2));
  }

  const isMultipart = req.headers["content-type"]?.startsWith(
    "multipart/form-data",
  );
  const hasBody = req.method !== "GET" && req.method !== "DELETE";
  const body = hasBody
    ? isMultipart
      ? await parseMultiformBody(req.body)
      : req.body
    : undefined;

  // Tie the request to the connection: when the client aborts, the request is dropped from the queue instead
  // of being executed with nobody waiting for the result anymore.
  // https://fastify.dev/docs/latest/Guides/Detecting-When-Clients-Abort/
  const controller = new AbortController();
  req.raw.on("close", () => {
    // Fastify's guide keeps `aborted` though Node deprecates it: "`destroyed` is not a suitable replacement".
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    if (req.raw.aborted) controller.abort();
  });

  try {
    const result = await restManager.makeRequest(
      req.method as RequestMethods,
      url,
      {
        body,
        signal: controller.signal,
      },
    );

    if (result) {
      res.status(200).send(result);
      return;
    }

    res.status(204).send({});
  } catch (error) {
    logger.error({ err: error }, "Discord REST request failed");

    res.status(500).send({
      message: error,
    });
  }
});

await app.listen({ host: "0.0.0.0", port: 8000 });

logger.info("REST Proxy listening on port 8000");
