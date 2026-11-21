import { Link } from "@heroui/react";
import { connection } from "next/server";
import { Suspense } from "react";
import { UserMenu } from "./user-menu";

async function SupportLink() {
  await connection();
  return <Link href={process.env.SUPPORT_SERVER_URL}>Support</Link>;
}

export function Header() {
  return (
    <header className="flex items-center gap-4 p-4">
      <Link href="/">Welcomer</Link>
      <Link href="/status">Status</Link>
      <Suspense fallback={null}>
        <SupportLink />
      </Suspense>
      <UserMenu />
    </header>
  );
}
