"use client";

import { Button } from "@heroui/react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

// Better Auth checks callbackURL against its trusted origins, so it cannot redirect elsewhere.
export function SignInButton() {
  const callbackURL = useSearchParams().get("callbackURL") ?? "/dashboard";

  return (
    <Button
      onPress={() =>
        void authClient.signIn.social({ provider: "discord", callbackURL })
      }
    >
      Sign in with Discord
    </Button>
  );
}
