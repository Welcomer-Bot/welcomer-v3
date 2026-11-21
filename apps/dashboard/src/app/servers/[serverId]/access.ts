import "server-only";
import { NoAccess, SignInRequired } from "@repo/domain";
import { redirect } from "next/navigation";
import { accessService } from "@/server/access";
import { currentUser, signInPath } from "@/server/auth/session";

export async function requireServerPage(serverId: string, path: string) {
  const user = await currentUser(path);
  try {
    return await accessService.requireServer(user.id, serverId);
  } catch (error) {
    if (error instanceof NoAccess) redirect("/dashboard");
    if (error instanceof SignInRequired) redirect(signInPath(path));
    throw error;
  }
}
