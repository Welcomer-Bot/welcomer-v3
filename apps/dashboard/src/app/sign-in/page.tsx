import { Suspense } from "react";
import { SignInButton } from "./sign-in-button";

export default function SignInPage() {
  return (
    <main>
      <h1>Sign in</h1>
      <Suspense fallback={null}>
        <SignInButton />
      </Suspense>
    </main>
  );
}
