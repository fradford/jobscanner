import { describe, expect, test } from "bun:test";
import { createFetchContext } from "../src/lib/context";

describe("createFetchContext", () => {
  test("merges request overrides", () => {
    const context = createFetchContext({
      timeoutMs: 2500,
      throttleMs: 0,
      userAgent: "jobscanner/test",
      maxPages: 2,
    });

    expect(context.request.timeoutMs).toBe(2500);
    expect(context.request.throttleMs).toBe(0);
    expect(context.request.userAgent).toBe("jobscanner/test");
    expect(context.request.maxPages).toBe(2);
  });
});
