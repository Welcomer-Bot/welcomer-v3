export class InvalidServerId extends Error {
  override name = "InvalidServerId";
}

export class ServerNotFound extends Error {
  override name = "ServerNotFound";
}

export class NoAccess extends Error {
  override name = "NoAccess";
}

export class SignInRequired extends Error {
  override name = "SignInRequired";
}
