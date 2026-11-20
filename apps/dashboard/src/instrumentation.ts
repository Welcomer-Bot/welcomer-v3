import { dashboardEnv } from "./env";

export function register() {
  dashboardEnv.parse(process.env);
}
