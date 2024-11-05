import { describe, expect } from "vitest";
import { baseGetTestData, normalizeCode, scopeGetTestData } from "./common.js";
import { it } from "node:test";
import { emit } from "./test-host.js";


describe("model generation", () => {
    let getTestData = scopeGetTestData("model", baseGetTestData);

    it("handles simple models", async () => {
        const [input, expected] = await getTestData("basic");
        const results = await emit(input);
        expect(normalizeCode(results["mynamespace/models.go"])).toBe(
            normalizeCode(expected),
        );
    });
});