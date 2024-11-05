import { describe, expect, it } from "vitest";
import { baseGetTestData, normalizeCode, scopeGetTestData } from "./common.js";
import { emit } from "./test-host.js";

describe("model generation", () => {
  let getTestData = scopeGetTestData("model", baseGetTestData);

  it("handles simple models", async () => {
    const [input, expected] = await getTestData("basic");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });
});
