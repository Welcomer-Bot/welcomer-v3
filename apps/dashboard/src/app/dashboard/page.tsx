import { Link } from "@heroui/react";
import { inviteUrl, SignInRequired } from "@repo/domain";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { dashboardEnv } from "@/env";
import { accessService } from "@/server/access";
import { currentUser, signInPath } from "@/server/auth/session";
import { ServerAvatar } from "../server-avatar";

const PATH = "/dashboard";

async function listServers() {
  const user = await currentUser(PATH);
  try {
    return await accessService.listServers(user.id);
  } catch (error) {
    if (error instanceof SignInRequired) redirect(signInPath(PATH));
    throw error;
  }
}

async function Servers() {
  const servers = await listServers();
  if (servers.length === 0) return <p>You do not manage any server yet.</p>;
  const { DISCORD_CLIENT_ID } = dashboardEnv.parse(process.env);

  return (
    <ul>
      {servers.map((server) => (
        <li key={server.id} className="flex items-center gap-2">
          <ServerAvatar server={server} />
          {server.botPresent ? (
            <Link href={`/servers/${server.id}`}>{server.name}</Link>
          ) : (
            <>
              <span>{server.name}</span>
              <Link
                href={inviteUrl(DISCORD_CLIENT_ID, server.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Invite the bot
              </Link>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  return (
    <main>
      <h1>Your servers</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Servers />
      </Suspense>
    </main>
  );
}
