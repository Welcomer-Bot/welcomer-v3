import { ServerShell } from "../server-shell";

export default function StatisticsPage({
  params,
}: PageProps<"/servers/[serverId]/statistics">) {
  return <ServerShell params={params} tab="statistics" title="Statistics" />;
}
