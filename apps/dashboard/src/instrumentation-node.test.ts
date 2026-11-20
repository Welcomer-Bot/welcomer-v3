import { afterEach, expect, test, vi } from "vitest";
import { checkEnvironment } from "./instrumentation-node";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("architecture 8.1: stops at start when a variable is missing", () => {
  vi.stubEnv("DATABASE_URL", undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const exit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

  checkEnvironment();

  expect(exit).toHaveBeenCalledWith(1);
});
