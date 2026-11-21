import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

export const signInPath = (path: string) =>
  `/sign-in?callbackURL=${encodeURIComponent(path)}`;

// Server Components cannot set cookies, so only the browser's session request refreshes the session.
export const currentUser = cache(async (path: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableRefresh: true },
  });
  if (!session) redirect(signInPath(path));
  return {
    id: session.user.id,
    name: session.user.name,
    image: session.user.image,
  };
});
