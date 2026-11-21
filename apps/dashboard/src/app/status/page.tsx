import {
  InvalidServerId,
  ServerNotFound,
  type OverallState,
} from "@repo/domain";
import Form from "next/form";
import { connection } from "next/server";
import { Suspense } from "react";
import { statusService } from "@/server/status";
import { AutoRefresh } from "./auto-refresh";

const OVERALL_LABELS: Record<OverallState, string> = {
  operational: "Operational",
  "partial-outage": "Partial outage",
  "major-outage": "Major outage",
};

function UtcTime({ date }: { date: Date }) {
  const iso = date.toISOString();
  return <time dateTime={iso}>{iso.replace("T", " ").slice(0, 19)} UTC</time>;
}

async function lookUp(input: string) {
  try {
    return `Discord connection ${String(await statusService.findShard(input))}`;
  } catch (error) {
    if (error instanceof InvalidServerId)
      return "Enter a server identifier of 17 to 20 digits";
    if (error instanceof ServerNotFound) return "Server not found";
    throw error;
  }
}

async function StatusDetails({
  searchParams,
}: Pick<PageProps<"/status">, "searchParams">) {
  await connection();
  const [status, { server }] = await Promise.all([
    statusService.getStatus(new Date()),
    searchParams,
  ]);
  const input = typeof server === "string" ? server : undefined;

  return (
    <>
      <section>
        <p>{OVERALL_LABELS[status.overall]}</p>
        <p>Total servers: {status.totalServers}</p>
        {status.startedAt && (
          <p>
            Running since <UtcTime date={status.startedAt} />
          </p>
        )}
      </section>
      <table>
        <thead>
          <tr>
            <th>Connection</th>
            <th>State</th>
            <th>Response time</th>
            <th>Servers</th>
            <th>Last update</th>
          </tr>
        </thead>
        <tbody>
          {status.shards.map((shard) => (
            <tr key={shard.shardId}>
              <td>{shard.shardId}</td>
              <td>{shard.state}</td>
              <td>
                {shard.latencyMs === null
                  ? "—"
                  : `${String(shard.latencyMs)} ms`}
              </td>
              <td>{shard.serverCount}</td>
              <td>
                <UtcTime date={shard.updatedAt} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Form action="/status">
        <label htmlFor="server">Server identifier</label>
        <input id="server" name="server" defaultValue={input} />
        <button type="submit">Find</button>
      </Form>
      {input !== undefined && <p>{await lookUp(input)}</p>}
    </>
  );
}

export default function StatusPage(props: PageProps<"/status">) {
  return (
    <main>
      <h1>Status</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <StatusDetails searchParams={props.searchParams} />
      </Suspense>
      <AutoRefresh />
    </main>
  );
}
