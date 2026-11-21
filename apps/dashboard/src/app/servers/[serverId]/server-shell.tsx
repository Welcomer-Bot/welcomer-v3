import { Link } from "@heroui/react";
import { Suspense, type ReactNode } from "react";
import { ServerAvatar } from "../../server-avatar";
import { requireServerPage } from "./access";
import { ServerTabs, type Tab } from "./server-tabs";

interface ShellProps {
  params: Promise<{ serverId: string }>;
  tab: Tab;
}

// In each page, not in a layout: layouts do not re-render on navigation and do not know the
// page's path, which the sign-in needs to come back to (Next.js, authentication guide).
// The page content renders here too, after the check: outside the boundary it would prerender
// into the static shell (authentication-with-cache-components guide).
async function ServerContent({
  params,
  tab,
  children,
}: ShellProps & { children?: ReactNode }) {
  const { serverId } = await params;
  const server = await requireServerPage(
    serverId,
    `/servers/${serverId}/${tab}`,
  );

  return (
    <>
      <Link href="/dashboard">All servers</Link>
      <div className="flex items-center gap-2">
        <ServerAvatar server={server} />
        <h1>{server.name}</h1>
      </div>
      <ServerTabs serverId={server.id} />
      {children}
    </>
  );
}

export function ServerShell({
  params,
  tab,
  title,
  children,
}: ShellProps & { title: string; children?: ReactNode }) {
  return (
    <main>
      <Suspense fallback={<p>Loading…</p>}>
        <ServerContent params={params} tab={tab}>
          <h2>{title}</h2>
          {children}
        </ServerContent>
      </Suspense>
    </main>
  );
}
