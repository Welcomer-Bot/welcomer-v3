import { describe, expect, it } from "vitest";
import { dispatchAndWait, track } from "./dispatch.ts";

describe("event dispatch", () => {
  it("contracts, event queue: handling ends only when every tracked handler has settled", async () => {
    const finished: string[] = [];
    const slow = new Promise<void>((resolve) => setTimeout(resolve, 20)).then(
      () => {
        finished.push("slow");
      },
    );

    const results = await dispatchAndWait(() => {
      void track(slow);
      void track(Promise.reject(new Error("handler failed")));
    });

    expect(finished).toEqual(["slow"]);
    expect(results.map(({ status }) => status)).toEqual([
      "fulfilled",
      "rejected",
    ]);
  });
});
