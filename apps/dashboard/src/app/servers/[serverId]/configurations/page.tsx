import { ServerShell } from "../server-shell";

export default function ConfigurationsPage({
  params,
}: PageProps<"/servers/[serverId]/configurations">) {
  return (
    <ServerShell params={params} tab="configurations" title="Configurations" />
  );
}
