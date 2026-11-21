import { Suspense } from "react";
import { currentUser } from "@/server/auth/session";

async function Servers() {
  await currentUser("/dashboard");
  return null;
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
