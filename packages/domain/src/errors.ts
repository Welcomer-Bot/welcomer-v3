export class InvalidServerId extends Error {
  override name = "InvalidServerId";
}

export class ServerNotFound extends Error {
  override name = "ServerNotFound";
}
