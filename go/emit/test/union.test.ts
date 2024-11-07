import { emit } from "./test-host.js";
import { beforeEach, describe, expect, it } from "vitest";

import { baseGetTestData, normalizeCode, scopeGetTestData } from "./common.js";

describe("union generation", () => {
  let getTestData: (prefix: string) => Promise<[string, string]>;

  beforeEach(() => {
    getTestData = scopeGetTestData("union", baseGetTestData);
  });

  describe("enum-like unions", () => {
    beforeEach(() => {
      getTestData = scopeGetTestData("enum", getTestData);
    });

    it("handles string enum-like unions that don't specify the base type", async () => {
      const [input, expected] = await getTestData("string-no-scalar");
      const results = await emit(input);
      expect(normalizeCode(results["mynamespace/models.go"])).toBe(normalizeCode(expected));
    });

    it("handles string enum-like unions that specify the base type", async () => {
      const [input, expected] = await getTestData("string-scalar");
      const results = await emit(input);
      expect(normalizeCode(results["mynamespace/models.go"])).toBe(normalizeCode(expected));
    });

    it("handles number enum-like unions that don't specify the base type", async () => {
      const [input, expected] = await getTestData("number-no-scalar");
      const results = await emit(input);
      expect(normalizeCode(results["mynamespace/models.go"])).toBe(normalizeCode(expected));
    });

    it("handles number enum-like unions that specify the base type", async () => {
      const [input, expected] = await getTestData("number-scalar");
      const results = await emit(input);
      expect(normalizeCode(results["mynamespace/models.go"])).toBe(normalizeCode(expected));
    });
  });

  describe("discriminated unions", () => {
    beforeEach(() => {
      getTestData = scopeGetTestData("discriminated", getTestData);
    });

    it("handles string discriminated unions", async () => {
      const [input, expected] = await getTestData("string-discriminator");
      const results = await emit(input);
      expect(normalizeCode(results["discriminator/models.go"])).toBe(normalizeCode(expected));
    });
  });
});
