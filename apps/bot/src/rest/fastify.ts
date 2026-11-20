import fastifyMultipart, {
  type MultipartFile,
  type MultipartValue,
} from "@fastify/multipart";
import fastify, { type FastifyInstance } from "fastify";
import { timingSafeEqual } from "node:crypto";
import { env } from "./restManager.ts";

const secret = Buffer.from(env.REST_PROXY_SECRET);

// timingSafeEqual throws on buffers of different lengths, so the length is checked first.
const isAuthorized = (header: string | undefined) => {
  if (header === undefined) return false;
  const given = Buffer.from(header);
  return given.length === secret.length && timingSafeEqual(given, secret);
};

export function buildFastifyApp(): FastifyInstance {
  const app = fastify();

  app.register(fastifyMultipart, { attachFieldsToBody: true });

  // Authorization check
  app.addHook("onRequest", async (req, res) => {
    if (!isAuthorized(req.headers.authorization)) {
      return res.status(401).send({
        message: "Credentials not valid.",
      });
    }
  });

  return app;
}

export async function parseMultiformBody(body: unknown): Promise<FormData> {
  const form = new FormData();

  if (typeof body !== "object" || !body) return form;

  for (const objectValue of Object.values(body)) {
    const value = objectValue as MultipartFile | MultipartValue;

    if (value.type === "file") {
      form.append(
        value.fieldname,
        new Blob([new Uint8Array(await value.toBuffer())]),
        value.filename,
      );
    }
    if (value.type === "field" && typeof value.value === "string") {
      form.append(value.fieldname, value.value);
    }
  }

  return form;
}
