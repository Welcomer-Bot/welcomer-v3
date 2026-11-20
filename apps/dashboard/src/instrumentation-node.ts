import { z } from "zod";
import { dashboardEnv } from "./env";

// Next.js only logs an error thrown from register() and keeps serving, so the check exits itself.
export function checkEnvironment() {
  const result = dashboardEnv.safeParse(process.env);
  if (!result.success) {
    console.error(z.prettifyError(result.error));
    process.exit(1);
  }
}
