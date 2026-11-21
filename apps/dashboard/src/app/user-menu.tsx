"use client";

import { Avatar, Button, Link } from "@heroui/react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

// The browser's session request is the one that refreshes the session and its cookie.
export function UserMenu() {
  const { data, isPending } = authClient.useSession();
  const router = useRouter();

  if (isPending) return null;
  if (!data) return <Link href="/sign-in">Sign in</Link>;

  const signOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  return (
    <div className="ml-auto flex items-center gap-2">
      <Avatar size="sm">
        {data.user.image && <Avatar.Image alt="" src={data.user.image} />}
        <Avatar.Fallback>{data.user.name.charAt(0)}</Avatar.Fallback>
      </Avatar>
      <span>{data.user.name}</span>
      <Button variant="secondary" onPress={() => void signOut()}>
        Sign out
      </Button>
    </div>
  );
}
