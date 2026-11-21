import { ServerShell } from "../server-shell";

export default function ImagesPage({
  params,
}: PageProps<"/servers/[serverId]/images">) {
  return <ServerShell params={params} tab="images" title="Images" />;
}
